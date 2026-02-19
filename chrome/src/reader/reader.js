import { fetchSurahVerses, fetchAyahRange, fetchJuzVerses, getSurahName } from '../core/js/api.js';
import { parseVersesToPages } from '../core/js/parser.js';
import { renderPages, showError, decorateReflections } from '../core/js/renderer.js';
import { storage } from '../core/js/adapter/storage.js';
import * as reminderLogic from '../core/js/logic/reminders.js';
import { ReflectionStorage } from '../core/js/adapter/storage.js';

let currentReminderId = null;
let targetAyahKey = null; // For scrolling to ayah

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    currentReminderId = params.get('reminderId');

    const surahId = params.get('surahId');
    const targetAyah = params.get('targetAyah');

    const container = document.getElementById('content-area');

    if (currentReminderId) {
        await loadReminderContent(currentReminderId, container);
    } else if (surahId) {
        targetAyahKey = `${surahId}:${targetAyah}`;
        await loadReflectionContext(surahId, container);
    } else {
        showError('لم يُحدد محتوى للعرض', container);
    }
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

        setupInteractionHandlers(container);
        await decorateReflections(container);

        await restoreBookmark(container);

    } catch (e) {
        console.error(e);
        showError('حدث خطأ أثناء تحميل المحتوى', container);
    }
}

function setupInteractionHandlers(container) {
    container.addEventListener('click', async (e) => {
        const wordEl = e.target.closest('.mushaf-word');
        if (wordEl) {
            const verseKey = wordEl.dataset.verseKey;
            const wordPosition = wordEl.dataset.wordPosition;

            const isCurrentlyBookmarked = wordEl.classList.contains('bookmarked');

            container.querySelectorAll('.mushaf-word.bookmarked').forEach(el => {
                el.classList.remove('bookmarked');
            });

            if (isCurrentlyBookmarked) {
                await removeBookmark();
            } else {
                wordEl.classList.add('bookmarked');
                await saveBookmark(verseKey, wordPosition);
            }
            return;
        }

        const symbolEl = e.target.closest('.ayah-symbol');
        if (symbolEl) {
            const verseKey = symbolEl.dataset.verseKey; // format "1:5"
            const [s, a] = verseKey.split(':');
            openReflectionModal(s, a, container);
        }
    });
}

async function openReflectionModal(surah, ayah, container) {
    const existing = await ReflectionStorage.getByAyah(surah, ayah);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content" dir="auto">
            <h2 style="font-family:Tajawal; font-size:1.1rem; margin-top:0; color:var(--primary-color)">
                ${existing ? 'عدّل تدبرك' : 'تدبر جديد'}: سورة ${surah}، آية ${ayah}
            </h2>
            <textarea id="ref-input" class="reflection-textarea" 
                placeholder="اكتب تدبرك هنا...">${existing ? existing.text : ''}</textarea>
            
            <div style="display:flex; gap:10px; justify-content:flex-end">
                <button class="mark-read-btn" id="save-ref" style="padding:8px 20px">حفظ</button>
                <button class="mark-read-btn" id="close-ref" style="border-color:#ccc; color:#666; padding:8px 20px">إلغاء</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#ref-input');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Save logic
    overlay.querySelector('#save-ref').onclick = async () => {
        const text = textarea.value.trim();
        if (text) {
            await ReflectionStorage.save({ surah, ayah, text });
        } else {
            // Delete if text removed and save button pressed
            await ReflectionStorage.delete(surah, ayah);
        }
        overlay.remove();
        await decorateReflections(container);
    };

    overlay.querySelector('#close-ref').onclick = () => overlay.remove();
}

async function findReminder(id) {
    const user_reminders = await storage.get('user_reminders');
    const url = chrome.runtime.getURL('src/core/data/presets.json');
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

async function logReadAction(reminderId, reminderName) {
    await reminderLogic.addReadMark(reminderId, reminderName);
}

async function removeReadAction(reminderId) {
    await reminderLogic.removeReadMark(reminderId);
}

async function isReadInCurrentPeriod(reminder) {
    const history = await storage.get('read_history') || [];
    const attempts = history.filter(h => h.reminderId === reminder.id);
    if (attempts.length === 0) return false;
    const lastReadTs = attempts[attempts.length - 1].timestamp;
    return reminderLogic.isReadInCurrentPeriod(reminder, lastReadTs);
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
        btn.innerHTML = isRead
            ? '✓ تمت القراءة <span class="btn-hint">(انقر لإلغاء)</span>'
            : '☐ تحديد كمقروء';

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
            btn.innerHTML = isNowRead
                ? '✓ تمت القراءة <span class="btn-hint">(انقر لإلغاء)</span>'
                : '☐ تحديد كمقروء';
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
// function setupBookmarkHandlers(container) {
//     const words = container.querySelectorAll('.mushaf-word');
//
//     words.forEach(word => {
//         word.addEventListener('click', async () => {
//             const verseKey = word.dataset.verseKey;
//             const wordPosition = word.dataset.wordPosition;
//
//             // Check if this word is already bookmarked
//             const isCurrentlyBookmarked = word.classList.contains('bookmarked');
//
//             // Remove any existing bookmark
//             container.querySelectorAll('.mushaf-word.bookmarked').forEach(el => {
//                 el.classList.remove('bookmarked');
//             });
//
//             if (isCurrentlyBookmarked) {
//                 // Toggle off - remove bookmark
//                 await removeBookmark();
//             } else {
//                 // Toggle on - add bookmark
//                 word.classList.add('bookmarked');
//                 await saveBookmark(verseKey, wordPosition);
//             }
//         });
//     });
// }

async function saveBookmark(verseKey, wordPosition) {
    const bookmarks = await storage.get('bookmarks') || {};
    bookmarks[currentReminderId] = { verseKey, wordPosition, timestamp: Date.now() };
    await storage.set({ bookmarks });
}

async function removeBookmark() {
    const bookmarks = await storage.get('bookmarks') || {};
    delete bookmarks[currentReminderId];
    await storage.set({ bookmarks });
}

async function restoreBookmark(container) {
    const bookmarks = await storage.get('bookmarks') || {};
    const bookmark = bookmarks[currentReminderId];
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

async function loadReflectionContext(surahId, container) {
    try {
        await renderSurah(surahId, container);
        
        setupInteractionHandlers(container);
        await decorateReflections(container);

        if (targetAyahKey) {
            scrollToTargetAyah(container);
        }
    } catch (e) {
        console.error(e);
        showError('حدث خطأ أثناء تحميل السورة', container);
    }
}

function scrollToTargetAyah(container) {
    setTimeout(() => {
        const ayahSymbol = container.querySelector(`.ayah-symbol[data-verse-key="${targetAyahKey}"]`);
        
        if (ayahSymbol) {
            ayahSymbol.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const parentPage = ayahSymbol.closest('.mushaf-page');
            if (parentPage) {
                const words = parentPage.querySelectorAll(`.mushaf-word[data-verse-key="${targetAyahKey}"]`);
                
                words.forEach(w => {
                    w.dataset.originalColor = w.style.color || ''; 
                    
                    w.style.transition = 'color 0.5s ease';
                    w.style.color = 'var(--primary-color)'; 
                    w.style.fontWeight = 'bold';
                });
                
                setTimeout(() => {
                    words.forEach(w => {
                        w.style.color = w.dataset.originalColor;
                        w.style.fontWeight = 'normal';
                    });
                }, 3000);
            }
        }
    }, 500);
}
