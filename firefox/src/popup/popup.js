// src/popup/popup.js

// State
let allSurahs = [];
let presets = [];

// DOM Elements
const tabs = document.querySelectorAll('.tab-trigger');
const tabContents = document.querySelectorAll('.tab-content');
const myRemindersList = document.getElementById('my-reminders-list');
const presetsList = document.getElementById('presets-list');
const addForm = document.getElementById('add-reminder-form');
const targetSelect = document.getElementById('target-select');
const editIdInput = document.getElementById('edit-id');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Modal Elements
const alertModal = document.getElementById('alert-modal');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');
const alertOkBtn = document.getElementById('alert-ok');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await loadPresetsData();
    initTabs();
    await loadAllReminders();
    fetchSurahs();

    cancelEditBtn.addEventListener('click', () => {
        resetForm();
        tabs[0].click();
    });
});

async function loadPresetsData() {
    try {
        const response = await fetch('../data/presets.json');
        presets = await response.json();
    } catch (e) {
        console.error('Failed to load presets:', e);
    }
}

// --- Tabs ---
function initTabs() {
    console.log('Initializing tabs...', tabs.length);
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            console.log('Tab clicked:', tab.dataset.tab);
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.dataset.tab;
            const targetEl = document.getElementById(target);
            if (targetEl) {
                targetEl.classList.add('active');
            }

            // If switching AWAY from add-new while editing, reset form
            if (target !== 'add-new' && editIdInput?.value) {
                resetForm();
            }
        });
    });
}

// --- Data Loading ---

async function loadAllReminders() {
    const { user_reminders, read_history, bookmarks } = await browser.storage.local.get(['user_reminders', 'read_history', 'bookmarks']);
    const history = read_history || [];
    const activeReminders = user_reminders || [];
    const savedBookmarks = bookmarks || {};

    // 1. Render Active Reminders List
    renderActiveList(activeReminders, history, savedBookmarks);

    // 2. Render Presets Templates List
    renderPresetsList(activeReminders, history, savedBookmarks);
}

function renderActiveList(reminders, history, bookmarks) {
    myRemindersList.innerHTML = '';

    // Filter to include only enabled reminders (including enabled presets)
    const enabledReminders = reminders.filter(r => r.enabled !== false);

    if (enabledReminders.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        const icon = document.createElement('div');
        icon.className = 'empty-state-icon';
        icon.textContent = '📖';
        const text = document.createElement('p');
        text.className = 'empty-state-text';
        text.textContent = 'لا توجد تذكيرات نشطة حالياً.';
        emptyDiv.appendChild(icon);
        emptyDiv.appendChild(text);
        myRemindersList.appendChild(emptyDiv);
        return;
    }

    enabledReminders.forEach(reminder => {
        const attempts = history.filter(h => h.reminderId === reminder.id);
        const lastRead = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
        const hasBookmark = !!bookmarks[reminder.id];
        const el = createReminderCard(reminder, lastRead, true, hasBookmark); // true = is active/set
        myRemindersList.appendChild(el);
    });
}

function renderPresetsList(activeReminders, history, bookmarks) {
    presetsList.innerHTML = '';

    // Build a set of enabled preset IDs to exclude from this list
    const enabledPresetIds = new Set(
        activeReminders
            .filter(r => r.enabled !== false && presets.some(p => p.id === r.id))
            .map(r => r.id)
    );

    // Only show presets that are NOT enabled (not in قائمتي)
    const disabledPresets = presets.filter(p => !enabledPresetIds.has(p.id));

    if (disabledPresets.length === 0) {
        // All presets are enabled, show a message
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        const icon = document.createElement('div');
        icon.className = 'empty-state-icon';
        icon.textContent = '✨';
        const text = document.createElement('p');
        text.className = 'empty-state-text';
        text.textContent = 'جميع تذكيرات السنن مفعّلة في قائمتك!';
        emptyDiv.appendChild(icon);
        emptyDiv.appendChild(text);
        presetsList.appendChild(emptyDiv);
        return;
    }

    disabledPresets.forEach(preset => {
        const attempts = history.filter(h => h.reminderId === preset.id);
        const lastRead = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
        const hasBookmark = !!bookmarks[preset.id];

        // Show the preset template as disabled
        const el = createReminderCard(preset, lastRead, false, hasBookmark);
        presetsList.appendChild(el);
    });
}

/**
 * Checks if a reminder was read in the current period based on frequency
 * @param {Object} reminder - Reminder with timing info
 * @param {Number} lastReadTs - Last read timestamp
 * @returns {Boolean} True if read in current period
 */
function isReadInCurrentPeriod(reminder, lastReadTs) {
    if (!lastReadTs || !reminder.timing) return false;

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
 * Unified Card Creation
 * @param {Object} reminder 
 * @param {Number} lastReadTs 
 * @param {Boolean} isActive 
 * @param {Boolean} hasBookmark
 */
function createReminderCard(reminder, lastReadTs, isActive, hasBookmark = false) {
    const div = document.createElement('div');
    div.className = 'reminder-card';

    const freqLabel = reminder.timing ? getFrequencyLabel(reminder.timing) : 'مسبق الضبط';
    const timeLabel = reminder.timing ? `${reminder.timing.time} - ${freqLabel}` : 'غير محدد';

    const bookmarkBadge = hasBookmark ? '<span style="margin-right:0.5rem; font-size:1rem;" title="لديك علامة محفوظة">🔖</span>' : '';

    // Checkbox state - only consider reads valid within current period
    const isRead = isReadInCurrentPeriod(reminder, lastReadTs);
    const checkboxLabel = isRead ? 'مقروء' : 'غير مقروء';

    div.innerHTML = `
        <div class="card-header">
            <div>
                <div class="card-title"></div>
                <div class="card-description"></div>
            </div>
            <div class="card-header-actions">
                <button class="btn btn-ghost calendar-btn" title="سجل الإنجاز">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </button>
                <button class="switch" role="switch">
                    <span class="switch-thumb"></span>
                </button>
            </div>
        </div>
        <div class="card-actions">
            <div class="btn-group">
                <button class="btn btn-primary read-btn">اقرأ</button>
                <button class="btn btn-outline edit-btn">تعديل</button>
            </div>
            <div class="checkbox-container"></div>
            <button class="btn btn-ghost btn-destructive delete-btn">حذف</button>
        </div>
    `;

    const switchBtn = div.querySelector('.switch');
    switchBtn.dataset.id = reminder.id;

    // Set dynamic text safely
    const cardTitle = div.querySelector('.card-title');
    if (hasBookmark) {
        const badge = document.createElement('span');
        badge.style.marginRight = '0.5rem';
        badge.style.fontSize = '1rem';
        badge.title = 'لديك علامة محفوظة';
        badge.textContent = '🔖';
        cardTitle.appendChild(badge);
    }
    cardTitle.appendChild(document.createTextNode(reminder.name || reminder.description));

    div.querySelector('.card-description').textContent = timeLabel;

    // Set switch state
    switchBtn.setAttribute('aria-checked', (isActive && reminder.enabled !== false).toString());

    // Setup Edit/Delete visibility
    const editBtn = div.querySelector('.edit-btn');
    const delBtn = div.querySelector('.delete-btn');
    if (!isActive) {
        editBtn.style.display = 'none';
        delBtn.style.display = 'none';
    }

    // Set up checkbox if active
    if (isActive) {
        const checkboxContainer = div.querySelector('.checkbox-container');
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper mark-read-checkbox';
        wrapper.dataset.id = reminder.id;

        const btn = document.createElement('button');
        btn.className = 'checkbox';
        btn.setAttribute('role', 'checkbox');
        btn.setAttribute('aria-checked', isRead.toString());

        const indicator = document.createElement('span');
        indicator.className = 'checkbox-indicator';
        indicator.textContent = '✓';
        btn.appendChild(indicator);

        const label = document.createElement('span');
        label.className = 'checkbox-label';
        label.textContent = checkboxLabel;

        wrapper.appendChild(btn);
        wrapper.appendChild(label);
        checkboxContainer.appendChild(wrapper);
    }


    // Calendar Button
    const calendarBtn = div.querySelector('.calendar-btn');
    calendarBtn.addEventListener('click', () => {
        showCalendarModal(reminder);
    });

    // Toggle
    switchBtn.addEventListener('click', async () => {
        const currentlyChecked = switchBtn.getAttribute('aria-checked') === 'true';
        const newVal = !currentlyChecked;

        if (newVal) {
            // Adding/Enabling
            if (!isActive) {
                // It was a template preset, add it to user_reminders
                await addReminder(reminder);
            } else {
                await toggleReminderLoacal(reminder.id, true);
            }
        } else {
            // Disabling/Removing
            // For presets in the template list, "disable" means remove from active list entirely?
            // Or just set enabled: false. Let's stick to toggleReminderLoacal if it's already active.
            if (reminder.id.toString().startsWith('custom_')) {
                await toggleReminderLoacal(reminder.id, false);
            } else {
                // For presets, usually we can just remove them or disable them.
                // Let's remove them to keep active list clean.
                await removeReminder(reminder.id);
            }
        }
        await loadAllReminders();
    });

    // Read
    div.querySelector('.read-btn').addEventListener('click', () => {
        const url = browser.runtime.getURL(`src/reader/reader.html?reminderId=${reminder.id}`);
        browser.tabs.create({ url });
    });

    // Mark Read Checkbox (only exists if isActive)
    const checkboxWrapper = div.querySelector('.mark-read-checkbox');
    if (checkboxWrapper) {
        checkboxWrapper.addEventListener('click', async () => {
            const checkbox = checkboxWrapper.querySelector('.checkbox');
            const isCurrentlyChecked = checkbox.getAttribute('aria-checked') === 'true';

            if (isCurrentlyChecked) {
                // Remove read mark
                await removeReadMark(reminder.id);
            } else {
                // Add read mark
                await addReadMark(reminder.id, reminder.name || reminder.description);
            }

            await loadAllReminders();
        });
    }

    // Edit
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            startEditing(reminder);
        });
    }

    // Delete
    if (delBtn) {
        delBtn.addEventListener('click', () => {
            showDeleteModal(reminder.id);
        });
    }

    return div;
}

/**
 * Adds a read mark to history
 */
async function addReadMark(reminderId, reminderName) {
    const { read_history } = await browser.storage.local.get('read_history');
    const history = read_history || [];
    history.push({ reminderId, reminderName, timestamp: Date.now() });
    await browser.storage.local.set({ read_history: history.slice(-1000) });
}

/**
 * Removes the most recent read mark for a reminder
 */
async function removeReadMark(reminderId) {
    const { read_history } = await browser.storage.local.get('read_history');
    if (!read_history) return;

    // Remove the most recent read for this reminder
    const lastIndex = read_history.map(h => h.reminderId).lastIndexOf(reminderId);
    if (lastIndex !== -1) {
        read_history.splice(lastIndex, 1);
        await browser.storage.local.set({ read_history });
    }
}

function startEditing(reminder) {
    console.log('Editing reminder:', reminder);
    editIdInput.value = reminder.id;
    submitBtn.textContent = 'تعديل التذكير';
    cancelEditBtn.style.display = 'block';

    // Update tab text
    if (tabs[1]) tabs[1].textContent = 'تعديل الورد';

    document.getElementById('reminder-type').value = reminder.type || 'surah';
    document.getElementById('reminder-name').value = reminder.name || '';

    if (reminder.timing) {
        document.getElementById('time-select').value = reminder.timing.time || '';
        document.getElementById('frequency').value = reminder.timing.frequency || 'daily';
    }

    // Trigger changes for UI visibility
    document.getElementById('reminder-type').dispatchEvent(new Event('change'));
    document.getElementById('frequency').dispatchEvent(new Event('change'));

    // Populate Day if weekly
    if (reminder.timing?.frequency === 'weekly') {
        document.getElementById('day-select').value = reminder.timing.day;
    }

    // Populate Target
    const trySetTarget = () => {
        const targetId = reminder.target?.surahId || reminder.target?.juzId;
        if (targetSelect.options.length > 1 && targetId) {
            targetSelect.value = targetId;
            if (reminder.type === 'ayah_range') {
                document.getElementById('start-ayah').value = reminder.target.startAyah || '';
                document.getElementById('end-ayah').value = reminder.target.endAyah || '';
            }
        } else {
            console.log('Target select not ready, retrying...');
            setTimeout(trySetTarget, 300);
        }
    };
    trySetTarget();

    // Switch to form tab
    if (tabs[1]) tabs[1].click();
}

function resetForm() {
    editIdInput.value = '';
    submitBtn.textContent = 'حفظ التذكير';
    cancelEditBtn.style.display = 'none';

    // Reset tab text
    if (tabs[1]) tabs[1].textContent = 'إضافة جديد';

    addForm.reset();

    // Clear ayah range error
    const errorEl = document.getElementById('ayah-range-error');
    if (errorEl) errorEl.style.display = 'none';

    document.getElementById('reminder-type').dispatchEvent(new Event('change'));
    document.getElementById('frequency').dispatchEvent(new Event('change'));
}

function showDeleteModal(id) {
    const modal = document.getElementById('delete-modal');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    modal.style.display = 'flex';

    confirmBtn.onclick = async () => {
        await removeReminder(id);
        await loadAllReminders();
        modal.style.display = 'none';
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

function showAlert(title, message) {
    alertTitle.textContent = title || 'تنبيه';
    alertMessage.textContent = message;
    alertModal.style.display = 'flex';

    alertOkBtn.onclick = () => {
        alertModal.style.display = 'none';
    };

    alertModal.onclick = (e) => {
        if (e.target === alertModal) alertModal.style.display = 'none';
    };
}

// --- Calendar Modal ---

let currentCalendarMonth = new Date();
let currentCalendarReminder = null;

async function showCalendarModal(reminder) {
    currentCalendarReminder = reminder;
    currentCalendarMonth = new Date();

    const modal = document.getElementById('calendar-modal');
    const closeBtn = document.getElementById('calendar-close');
    const prevBtn = document.getElementById('calendar-prev');
    const nextBtn = document.getElementById('calendar-next');
    const reminderNameEl = document.getElementById('calendar-reminder-name');

    reminderNameEl.textContent = reminder.name || reminder.description;

    await renderCalendar();
    modal.style.display = 'flex';

    prevBtn.onclick = async () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
        await renderCalendar();
    };

    nextBtn.onclick = async () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
        await renderCalendar();
    };

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

async function renderCalendar() {
    const { read_history } = await browser.storage.local.get('read_history');
    const history = read_history || [];

    const reminder = currentCalendarReminder;
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    // Update title
    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    document.getElementById('calendar-title').textContent = `${months[month]} ${year}`;

    // Get completion dates for this reminder
    const completedDates = new Set();
    history
        .filter(h => h.reminderId === reminder.id)
        .forEach(h => {
            const date = new Date(h.timestamp);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            completedDates.add(key);
        });

    // Build calendar grid
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const today = new Date();

    // Calculate which days this reminder is scheduled for
    const timing = reminder.timing;
    const scheduledDays = getScheduledDaysInMonth(timing, year, month);

    // Add empty cells for padding
    for (let i = 0; i < startPadding; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell empty';
        grid.appendChild(cell);
    }

    // Add day cells
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        const dateKey = `${year}-${month}-${day}`;
        const cellDate = new Date(year, month, day);
        const isToday = cellDate.toDateString() === today.toDateString();
        const isFuture = cellDate > today;
        const isScheduled = scheduledDays.has(day);
        const isCompleted = completedDates.has(dateKey);

        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;

        const statusIcon = document.createElement('span');
        statusIcon.className = 'status-icon';

        if (isFuture) {
            cell.classList.add('future');
            statusIcon.textContent = '';
        } else if (isCompleted) {
            cell.classList.add('completed');
            statusIcon.textContent = '✓';
        } else if (isScheduled) {
            cell.classList.add('missed');
            const circle = document.createElement('span');
            circle.className = 'circle';
            statusIcon.appendChild(circle);
        } else {
            cell.classList.add('not-scheduled');
        }

        if (isToday) {
            cell.classList.add('today');
        }

        cell.appendChild(dayNumber);
        cell.appendChild(statusIcon);
        grid.appendChild(cell);
    }
}

/**
 * Returns a Set of day numbers (1-31) that are scheduled in the given month
 */
function getScheduledDaysInMonth(timing, year, month) {
    const scheduledDays = new Set();

    if (!timing) return scheduledDays;

    const freq = timing.frequency;
    const scheduledWeekDay = timing.day; // 0-6 for weekly

    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);

        if (freq === 'daily') {
            scheduledDays.add(day);
        } else if (freq === 'weekly' && scheduledWeekDay !== undefined) {
            if (date.getDay() === scheduledWeekDay) {
                scheduledDays.add(day);
            }
        }
    }

    return scheduledDays;
}

// --- Actions ---

async function toggleReminderLoacal(id, enabled) {
    // If it's a custom reminder, we just update the 'enabled' flag.
    // If it's a preset we copied into custom, same deal.
    const { user_reminders } = await browser.storage.local.get('user_reminders');
    const index = user_reminders.findIndex(r => r.id === id);
    if (index !== -1) {
        user_reminders[index].enabled = enabled;
        await browser.storage.local.set({ user_reminders });

        // Sync alarms
        if (enabled) {
            createAlarm(user_reminders[index]);
        } else {
            browser.alarms.clear(`reminder_${id}`);
        }
    }
}

async function addReminder(reminder) {
    const { user_reminders } = await browser.storage.local.get('user_reminders');
    const list = user_reminders || [];

    // prevent dupe
    if (!list.find(r => r.id === reminder.id)) {
        list.push({ ...reminder, enabled: true });
        await browser.storage.local.set({ user_reminders: list });
        createAlarm(reminder);
    }
}

async function updateReminder(id, data) {
    const { user_reminders } = await browser.storage.local.get('user_reminders');
    const index = user_reminders.findIndex(r => r.id === id);
    if (index !== -1) {
        user_reminders[index] = { ...user_reminders[index], ...data };
        await browser.storage.local.set({ user_reminders });

        // Re-create alarm if enabled
        if (user_reminders[index].enabled !== false) {
            createAlarm(user_reminders[index]);
        }
    }
}

async function removeReminder(id) {
    const { user_reminders } = await browser.storage.local.get('user_reminders');
    const list = user_reminders || [];
    const newList = list.filter(r => r.id !== id);
    await browser.storage.local.set({ user_reminders: newList });
    browser.alarms.clear(`reminder_${id}`);
}

function createAlarm(reminder) {
    // Simple wrapper to call background logic or create here
    // Alarms can be created from popup
    // Logic for timing needs parsing.
    // For now:
    console.log('Creating alarm for:', reminder.name);

    // Parse time "HH:MM"
    const [hours, minutes] = reminder.timing.time.split(':').map(Number);

    let when = new Date();
    when.setHours(hours, minutes, 0, 0);

    if (when < Date.now()) {
        when.setDate(when.getDate() + 1);
    }

    // If specific day of week (0-6)
    if (reminder.timing.frequency === 'weekly' && reminder.timing.day !== undefined) {
        let diff = (reminder.timing.day - when.getDay() + 7) % 7;
        if (diff === 0 && when < Date.now()) diff = 7;
        when.setDate(when.getDate() + diff);
    }

    browser.alarms.create(`reminder_${reminder.id}`, {
        when: when.getTime(),
        periodInMinutes: reminder.timing.frequency === 'daily' ? 1440 : 10080
    });
}

// --- Add New Form ---

// Elements already declared at top: targetSelect
const reminderTypeSelect = document.getElementById('reminder-type');
const ayahRangeGroup = document.getElementById('ayah-range-group');
const startAyahInput = document.getElementById('start-ayah');
const endAyahInput = document.getElementById('end-ayah');
const ayahRangeError = document.getElementById('ayah-range-error');

/**
 * Updates the max attribute for ayah inputs based on selected surah
 */
function updateAyahMaxValues() {
    const selectedSurahId = parseInt(targetSelect.value);
    const selectedSurah = allSurahs.find(s => s.id === selectedSurahId);
    const maxVerses = selectedSurah ? selectedSurah.verses_count : 286; // Default to Al-Baqarah's count

    startAyahInput.max = maxVerses;
    endAyahInput.max = maxVerses;

    // Update placeholders to show max value
    startAyahInput.placeholder = '1';
    endAyahInput.placeholder = maxVerses.toString();

    // Clear any values that exceed the new max
    if (startAyahInput.value && parseInt(startAyahInput.value) > maxVerses) {
        startAyahInput.value = maxVerses;
    }
    if (endAyahInput.value && parseInt(endAyahInput.value) > maxVerses) {
        endAyahInput.value = maxVerses;
    }

    // Re-validate after updating
    validateAyahRange();
}

/**
 * Validates the ayah range inputs and shows/hides error message
 * @returns {boolean} True if valid, false if there's an error
 */
function validateAyahRange() {
    const start = parseInt(startAyahInput.value);
    const end = parseInt(endAyahInput.value);

    // Only validate if both values are present
    if (!startAyahInput.value || !endAyahInput.value) {
        ayahRangeError.style.display = 'none';
        return true;
    }

    if (start > end) {
        ayahRangeError.textContent = 'آية البداية يجب أن تكون أقل من أو تساوي آية النهاية';
        ayahRangeError.style.display = 'block';
        return false;
    }

    // Check against max verses
    const selectedSurahId = parseInt(targetSelect.value);
    const selectedSurah = allSurahs.find(s => s.id === selectedSurahId);
    if (selectedSurah) {
        const maxVerses = selectedSurah.verses_count;
        if (start > maxVerses || end > maxVerses) {
            ayahRangeError.textContent = `السورة المختارة تحتوي على ${maxVerses} آية فقط`;
            ayahRangeError.style.display = 'block';
            return false;
        }
    }

    ayahRangeError.style.display = 'none';
    return true;
}

// Event listener for surah/juz selection change to update max values
targetSelect.addEventListener('change', () => {
    const type = reminderTypeSelect.value;
    if (type === 'ayah_range') {
        updateAyahMaxValues();
    }
});

// Event listeners for ayah input validation
startAyahInput.addEventListener('input', validateAyahRange);
endAyahInput.addEventListener('input', validateAyahRange);

reminderTypeSelect.addEventListener('change', async (e) => {
    const type = e.target.value;
    targetSelect.textContent = '';
    const loadingOpt = document.createElement('option');
    loadingOpt.value = '';
    loadingOpt.disabled = true;
    loadingOpt.selected = true;
    loadingOpt.textContent = 'جاري التحميل...';
    targetSelect.appendChild(loadingOpt);

    // Clear ayah range inputs and error when changing type
    startAyahInput.value = '';
    endAyahInput.value = '';
    ayahRangeError.style.display = 'none';

    if (type === 'surah' || type === 'ayah_range') {
        ayahRangeGroup.style.display = type === 'ayah_range' ? 'block' : 'none';
        await fetchSurahs(); // Re-populate with Surahs
    } else if (type === 'juz') {
        ayahRangeGroup.style.display = 'none';
        populateJuz();
    }
});

function populateJuz() {
    targetSelect.textContent = '';
    const juzOpt = document.createElement('option');
    juzOpt.value = '';
    juzOpt.disabled = true;
    juzOpt.selected = true;
    juzOpt.textContent = 'اختر الجزء';
    targetSelect.appendChild(juzOpt);
    for (let i = 1; i <= 30; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `الجزء ${i}`;
        targetSelect.appendChild(option);
    }
}

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = editIdInput.value;
    const type = document.getElementById('reminder-type').value;
    const targetId = document.getElementById('target-select').value;
    const name = document.getElementById('reminder-name').value;
    const time = document.getElementById('time-select').value;
    const frequency = document.getElementById('frequency').value;
    const day = document.getElementById('day-select').value;

    if (!targetId) {
        showAlert('خطأ', 'الرجاء اختيار السورة أو الجزء');
        return;
    }

    let target = {};
    if (type === 'surah') target = { surahId: parseInt(targetId) };
    else if (type === 'juz') target = { juzId: parseInt(targetId) };
    else if (type === 'ayah_range') {
        const start = parseInt(document.getElementById('start-ayah').value);
        const end = parseInt(document.getElementById('end-ayah').value);

        if (!start || !end) {
            showAlert('خطأ', 'الرجاء إدخال نطاق الآيات');
            return;
        }

        // Use the validation function to check for errors
        if (!validateAyahRange()) {
            // Error message is already displayed by validateAyahRange
            return;
        }

        target = { surahId: parseInt(targetId), startAyah: start, endAyah: end };
    }

    const reminderData = {
        name,
        type,
        target,
        timing: {
            frequency,
            time,
            ...(frequency === 'weekly' && { day: parseInt(day) })
        }
    };

    if (editId) {
        await updateReminder(editId, reminderData);
    } else {
        await addReminder({
            id: 'custom_' + Date.now(),
            ...reminderData,
            enabled: true
        });
    }

    resetForm();
    tabs[0].click();
    loadAllReminders();
});

// Form Dynamic Inputs
const frequencySelect = document.getElementById('frequency');
const daySelectGroup = document.getElementById('day-select-group');

frequencySelect.addEventListener('change', (e) => {
    if (e.target.value === 'weekly') {
        daySelectGroup.style.display = 'block';
    } else {
        daySelectGroup.style.display = 'none';
    }
});

// --- API ---

async function fetchSurahs() {
    // We can fetch from quran.com API without auth for the list if public, 
    // OR use the one we set up.
    // The prompt says "use this api for quran text", implying usage.
    // We'll try the public endpoint first for simplicity in popup or use cached data.

    try {
        const response = await fetch('https://api.quran.com/api/v4/chapters');
        const data = await response.json();
        allSurahs = data.chapters.map(c => ({
            id: c.id,
            name_arabic: c.name_arabic,
            verses_count: c.verses_count
        }));

        targetSelect.textContent = '';
        const defaultSurahOpt = document.createElement('option');
        defaultSurahOpt.value = '';
        defaultSurahOpt.disabled = true;
        defaultSurahOpt.selected = true;
        defaultSurahOpt.textContent = 'اختر السورة';
        targetSelect.appendChild(defaultSurahOpt);
        allSurahs.forEach(surah => {
            const option = document.createElement('option');
            option.value = surah.id;
            // Use Arabic name
            option.text = `${surah.id}. ${surah.name_arabic}`;
            targetSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to fetch surahs', err);
        targetSelect.textContent = '';
        const failOpt = document.createElement('option');
        failOpt.value = '';
        failOpt.textContent = 'فشل التحميل';
        targetSelect.appendChild(failOpt);
    }
}

function getFrequencyLabel(timing) {
    if (timing.frequency === 'daily') return 'يومياً';
    if (timing.frequency === 'weekly') {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return `كل ${days[timing.day] || ''}`;
    }
    return '';
}

// --- Export / Import Data ---

const exportBtn = document.getElementById('export-data');
const importBtn = document.getElementById('import-data');
const importFileInput = document.getElementById('import-file-input');

/**
 * Exports all user data as a JSON file
 */
async function exportData() {
    try {
        const { user_reminders, read_history, bookmarks } = await browser.storage.local.get([
            'user_reminders',
            'read_history',
            'bookmarks'
        ]);

        const exportObj = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                user_reminders: user_reminders || [],
                read_history: read_history || [],
                bookmarks: bookmarks || {}
            }
        };

        const jsonStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const date = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `wird-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert('تم التصدير', 'تم تصدير بياناتك بنجاح.');
    } catch (err) {
        console.error('Export failed:', err);
        showAlert('خطأ', 'فشل تصدير البيانات.');
    }
}

/**
 * Imports user data from a JSON file
 */
async function importData(file) {
    try {
        const text = await file.text();
        const importObj = JSON.parse(text);

        // Validate structure
        if (!importObj.data || typeof importObj.data !== 'object') {
            throw new Error('Invalid backup format: missing data object');
        }

        const { user_reminders, read_history, bookmarks } = importObj.data;

        // Type validations
        if (user_reminders !== undefined && !Array.isArray(user_reminders)) {
            throw new Error('Invalid format: user_reminders should be an array');
        }
        if (read_history !== undefined && !Array.isArray(read_history)) {
            throw new Error('Invalid format: read_history should be an array');
        }
        if (bookmarks !== undefined && typeof bookmarks !== 'object') {
            throw new Error('Invalid format: bookmarks should be an object');
        }

        // Store all data
        await browser.storage.local.set({
            user_reminders: user_reminders || [],
            read_history: read_history || [],
            bookmarks: bookmarks || {}
        });

        // Re-create alarms for imported reminders
        if (user_reminders && user_reminders.length > 0) {
            for (const reminder of user_reminders) {
                if (reminder.enabled !== false && reminder.timing) {
                    createAlarm(reminder);
                }
            }
        }

        showAlert('تم الاستيراد', 'تم استيراد بياناتك بنجاح.');
        await loadAllReminders();

    } catch (err) {
        console.error('Import failed:', err);
        if (err instanceof SyntaxError) {
            showAlert('خطأ', 'الملف غير صالح. تأكد من أنه ملف JSON صحيح.');
        } else {
            showAlert('خطأ', err.message || 'فشل استيراد البيانات.');
        }
    }
}

// Event Listeners for Export/Import
if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
}

if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importData(file);
            // Reset input so the same file can be selected again
            importFileInput.value = '';
        }
    });
}

// --- Clear Progress History ---

const clearHistoryBtn = document.getElementById('clear-history');

/**
 * Clears all read history data
 */
async function clearProgressHistory() {
    try {
        await browser.storage.local.set({ read_history: [] });
        showAlert('تم المسح', 'تم مسح سجل الإنجاز بنجاح.');
        await loadAllReminders();
    } catch (err) {
        console.error('Clear history failed:', err);
        showAlert('خطأ', 'فشل مسح سجل الإنجاز.');
    }
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        showConfirmModal(
            'مسح سجل الإنجاز',
            'هل أنت متأكد من رغبتك في مسح سجل الإنجاز؟ سيتم حذف جميع بيانات التقدم.',
            clearProgressHistory
        );
    });
}

// --- Reset Extension ---

const resetExtensionBtn = document.getElementById('reset-extension');

/**
 * Resets the extension to default state by clearing all stored data
 */
async function resetExtension() {
    try {
        // Clear all alarms first
        await browser.alarms.clearAll();

        // Clear all storage data
        await browser.storage.local.clear();

        showAlert('تم إعادة الضبط', 'تم إعادة ضبط الإضافة بنجاح. سيتم تحديث الصفحة.');

        // Reload the popup after a short delay
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (err) {
        console.error('Reset extension failed:', err);
        showAlert('خطأ', 'فشل إعادة ضبط الإضافة.');
    }
}

if (resetExtensionBtn) {
    resetExtensionBtn.addEventListener('click', () => {
        showConfirmModal(
            'إعادة ضبط الإضافة',
            'هل أنت متأكد من رغبتك في إعادة ضبط الإضافة؟ سيتم حذف جميع التذكيرات وسجل الإنجاز والعلامات المرجعية. هذا الإجراء لا يمكن التراجع عنه.',
            resetExtension
        );
    });
}

// --- Confirmation Modal Helper ---

/**
 * Shows a confirmation modal with custom title, message, and callback
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} onConfirm - Callback when confirmed
 */
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('delete-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalDescription = modal.querySelector('.modal-description');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    // Update modal content
    modalTitle.textContent = title;
    modalDescription.textContent = message;

    modal.style.display = 'flex';

    confirmBtn.onclick = async () => {
        modal.style.display = 'none';
        // Reset modal content back to original
        modalTitle.textContent = 'تأكيد الحذف';
        modalDescription.textContent = 'هل أنت متأكد من رغبتك في حذف هذا التذكير؟ لا يمكن التراجع عن هذه الخطوة.';
        await onConfirm();
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
        // Reset modal content back to original
        modalTitle.textContent = 'تأكيد الحذف';
        modalDescription.textContent = 'هل أنت متأكد من رغبتك في حذف هذا التذكير؟ لا يمكن التراجع عن هذه الخطوة.';
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            // Reset modal content back to original
            modalTitle.textContent = 'تأكيد الحذف';
            modalDescription.textContent = 'هل أنت متأكد من رغبتك في حذف هذا التذكير؟ لا يمكن التراجع عن هذه الخطوة.';
        }
    };
}
