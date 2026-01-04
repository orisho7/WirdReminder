// src/reader/reader.js
// Coordinator - orchestrates data flow between layers

import { fetchSurahVerses, fetchAyahRange, fetchJuzVerses, getSurahName } from './api.js';
import { parseVersesToPages } from './parser.js';
import { renderPages, showError } from './renderer.js';

let currentReminderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentReminderId = params.get('reminderId');
    const container = document.getElementById('content-area');

    if (!currentReminderId) {
        showError('لم يتم تحديد الورد', container);
        return;
    }

    await loadReminderContent(currentReminderId, container);
});

/**
 * Loads and renders reminder content based on type
 * @param {string} id - Reminder ID
 * @param {HTMLElement} container - Container element
 */
async function loadReminderContent(id, container) {
    try {
        const reminder = await findReminder(id);

        if (!reminder) {
            showError('لم يتم العثور على الورد', container);
            return;
        }

        await renderByType(reminder, container);

        // Only show mark read buttons if the reminder has notifications enabled
        if (reminder.enabled !== false && reminder.timing) {
            await renderMarkReadButtons(container, reminder);
        }

        setupBookmarkHandlers(container);
        await restoreBookmark(container);
        // Note: logReadAction is now triggered manually via button

    } catch (e) {
        console.error(e);
        showError('حدث خطأ أثناء تحميل المحتوى', container);
    }
}

/**
 * Finds a reminder by ID in user reminders or presets
 * @param {string} id - Reminder ID
 * @returns {Promise<Object|null>} Reminder object or null
 */
async function findReminder(id) {
    const { user_reminders } = await browser.storage.local.get('user_reminders');
    const url = browser.runtime.getURL('src/data/presets.json');
    const presetsRes = await fetch(url);
    const presets = await presetsRes.json();

    let reminder = user_reminders?.find(r => r.id === id);
    if (!reminder) {
        reminder = presets.find(r => r.id === id);
    }

    return reminder || null;
}

/**
 * Routes to appropriate render function based on reminder type
 * @param {Object} reminder - Reminder object
 * @param {HTMLElement} container - Container element
 */
async function renderByType(reminder, container) {
    const { type, target } = reminder;

    switch (type) {
        case 'surah':
            await renderSurah(target.surahId, container);
            break;
        case 'ayah_range':
            await renderAyahRange(target.surahId, target.startAyah, target.endAyah, container);
            break;
        case 'juz':
            await renderJuz(target.juzId, container);
            break;
        default:
            showError('نوع الورد غير مدعوم', container);
    }
}

/**
 * Fetch, parse, and render a complete surah
 */
async function renderSurah(surahId, container) {
    const verses = await fetchSurahVerses(surahId);
    const pages = parseVersesToPages(verses);
    const surahName = await getSurahName(surahId);
    renderPages(pages, surahName, container);
}

/**
 * Fetch, parse, and render an ayah range
 */
async function renderAyahRange(surahId, start, end, container) {
    const verses = await fetchAyahRange(surahId, start, end);
    const pages = parseVersesToPages(verses);
    const surahName = await getSurahName(surahId);
    renderPages(pages, `${surahName} (${start}-${end})`, container);
}

/**
 * Fetch, parse, and render a juz
 */
async function renderJuz(juzId, container) {
    const verses = await fetchJuzVerses(juzId);
    const pages = parseVersesToPages(verses);
    renderPages(pages, `الجزء ${juzId}`, container);
}

/**
 * Logs the read action to history
 */
async function logReadAction(reminderId, reminderName) {
    const { read_history } = await browser.storage.local.get('read_history');
    const history = read_history || [];
    history.push({ reminderId, reminderName, timestamp: Date.now() });
    await browser.storage.local.set({ read_history: history.slice(-1000) });
}

/**
 * Removes the read action from history
 */
async function removeReadAction(reminderId) {
    const { read_history } = await browser.storage.local.get('read_history');
    if (!read_history) return;

    // Remove the most recent read for this reminder
    const lastIndex = read_history.map(h => h.reminderId).lastIndexOf(reminderId);
    if (lastIndex !== -1) {
        read_history.splice(lastIndex, 1);
        await browser.storage.local.set({ read_history });
    }
}

/**
 * Checks if the reminder was read in the current period based on frequency
 * @param {Object} reminder - Reminder with timing info
 * @returns {Promise<Boolean>} True if read in current period
 */
async function isReadInCurrentPeriod(reminder) {
    const { read_history } = await browser.storage.local.get('read_history');
    if (!read_history || !reminder.timing) return false;

    const attempts = read_history.filter(h => h.reminderId === reminder.id);
    if (attempts.length === 0) return false;

    const lastReadTs = attempts[attempts.length - 1].timestamp;
    const now = new Date();
    const lastRead = new Date(lastReadTs);
    const freq = reminder.timing.frequency;
    const [hours, minutes] = (reminder.timing.time || '00:00').split(':').map(Number);

    if (freq === 'daily') {
        // Reset daily at the scheduled time
        const resetTime = new Date(now);
        resetTime.setHours(hours, minutes, 0, 0);

        // If we haven't passed today's reset time, use yesterday's reset
        if (now < resetTime) {
            resetTime.setDate(resetTime.getDate() - 1);
        }

        return lastRead >= resetTime;
    } else if (freq === 'weekly') {
        // Reset weekly on the scheduled day at the scheduled time
        const scheduledDay = reminder.timing.day ?? 5; // default Friday
        const resetTime = new Date(now);
        resetTime.setHours(hours, minutes, 0, 0);

        // Find the most recent occurrence of the scheduled day
        const currentDay = now.getDay();
        let daysDiff = currentDay - scheduledDay;
        if (daysDiff < 0) daysDiff += 7;

        // If today is the scheduled day but we haven't passed the time, go back a week
        if (daysDiff === 0 && now < resetTime) {
            daysDiff = 7;
        }

        resetTime.setDate(resetTime.getDate() - daysDiff);

        return lastRead >= resetTime;
    }

    // No frequency info, treat as always valid if read recently (within 24h)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return lastRead >= oneDayAgo;
}

/**
 * Creates and renders mark read/unread buttons at start and end of content
 * @param {HTMLElement} container - Container element
 * @param {Object} reminder - Full reminder object with timing info
 */
async function renderMarkReadButtons(container, reminder) {
    const isRead = await isReadInCurrentPeriod(reminder);
    const reminderId = reminder.id;
    const reminderName = reminder.name;

    const createButton = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mark-read-wrapper';

        const btn = document.createElement('button');
        btn.className = isRead ? 'mark-read-btn marked' : 'mark-read-btn';
        if (isRead) {
            btn.textContent = '✓ تمت القراءة';
            btn.classList.add('marked');
            const hint = document.createElement('span');
            hint.className = 'btn-hint';
            hint.textContent = ' (انقر لإلغاء)';
            btn.appendChild(hint);
        } else {
            btn.textContent = '☐ تحديد كمقروء';
            btn.classList.remove('marked');
        }

        btn.addEventListener('click', async () => {
            const currentlyRead = btn.classList.contains('marked');

            if (currentlyRead) {
                await removeReadAction(reminderId);
            } else {
                await logReadAction(reminderId, reminderName);
            }

            // Update all buttons on page
            updateAllMarkButtons(!currentlyRead);
        });

        wrapper.appendChild(btn);
        return wrapper;
    };

    const updateAllMarkButtons = (isNowRead) => {
        container.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.classList.toggle('marked', isNowRead);
            btn.classList.toggle('marked', isNowRead);
            if (isNowRead) {
                btn.textContent = '✓ تمت القراءة';
                const hint = document.createElement('span');
                hint.className = 'btn-hint';
                hint.textContent = ' (انقر لإلغاء)';
                btn.appendChild(hint);
            } else {
                btn.textContent = '☐ تحديد كمقروء';
            }
        });
    };

    // Insert button at the beginning (after title)
    const title = container.querySelector('h1');
    if (title) {
        title.after(createButton());
    }

    // Insert button at the end
    container.appendChild(createButton());
}

// ===============================
// Bookmark Management
// ===============================

/**
 * Sets up click handlers for all mushaf words to enable bookmarking
 * @param {HTMLElement} container - Container element
 */
function setupBookmarkHandlers(container) {
    const words = container.querySelectorAll('.mushaf-word');

    words.forEach(word => {
        word.addEventListener('click', async () => {
            const verseKey = word.dataset.verseKey;
            const wordPosition = word.dataset.wordPosition;

            // Check if this word is already bookmarked
            const isCurrentlyBookmarked = word.classList.contains('bookmarked');

            // Remove any existing bookmark
            container.querySelectorAll('.mushaf-word.bookmarked').forEach(el => {
                el.classList.remove('bookmarked');
            });

            if (isCurrentlyBookmarked) {
                // Toggle off - remove bookmark
                await removeBookmark();
            } else {
                // Toggle on - add bookmark
                word.classList.add('bookmarked');
                await saveBookmark(verseKey, wordPosition);
            }
        });
    });
}

/**
 * Saves a bookmark to browser.storage.local
 * @param {string} verseKey - Verse key (e.g., "2:255")
 * @param {string} wordPosition - Word position in verse
 */
async function saveBookmark(verseKey, wordPosition) {
    const { bookmarks } = await browser.storage.local.get('bookmarks');
    const allBookmarks = bookmarks || {};

    allBookmarks[currentReminderId] = {
        verseKey,
        wordPosition,
        timestamp: Date.now()
    };

    await browser.storage.local.set({ bookmarks: allBookmarks });
}

/**
 * Removes the bookmark for the current reminder
 */
async function removeBookmark() {
    const { bookmarks } = await browser.storage.local.get('bookmarks');
    const allBookmarks = bookmarks || {};

    delete allBookmarks[currentReminderId];

    await browser.storage.local.set({ bookmarks: allBookmarks });
}

/**
 * Restores a saved bookmark and scrolls to it
 * @param {HTMLElement} container - Container element
 */
async function restoreBookmark(container) {
    const { bookmarks } = await browser.storage.local.get('bookmarks');
    const bookmark = bookmarks?.[currentReminderId];

    if (!bookmark) return;

    const { verseKey, wordPosition } = bookmark;

    // Find the bookmarked word
    const word = container.querySelector(
        `.mushaf-word[data-verse-key="${verseKey}"][data-word-position="${wordPosition}"]`
    );

    if (word) {
        word.classList.add('bookmarked');

        // Scroll to the bookmarked word after a brief delay for DOM stability
        setTimeout(() => {
            word.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

