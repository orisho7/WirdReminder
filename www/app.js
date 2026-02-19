import {
  fetchAllSurahs,
  fetchSurahVerses,
  fetchAyahRange,
  fetchJuzVerses,
  getSurahName,
} from "./core/js/api.js";
import { storage } from "./core/js/adapter/storage.js";
import { parseVersesToPages } from "./core/js/parser.js";
import * as reminderLogic from "./core/js/logic/reminders.js";
import { env } from "./core/js/adapter/env.js";
import { notificationManager } from "./core/js/adapter/notifications.js";
import { createI18n } from "./core/i18n/i18n.js";

const i18n = createI18n();

// Logic Delegates
const addReminder = reminderLogic.addReminder;
const updateReminder = reminderLogic.updateReminder;
const removeReminder = reminderLogic.removeReminder;
const toggleReminder = reminderLogic.toggleReminder;
const addReadMark = reminderLogic.addReadMark;
const removeReadMark = reminderLogic.removeReadMark;
const isReadInCurrentPeriod = reminderLogic.isReadInCurrentPeriod;
const getFrequencyLabel = reminderLogic.getFrequencyLabel;

// ============================================
// STATE
// ============================================
let allSurahs = [];
let presets = [];
let currentReminder = null;
let currentCalendarMonth = new Date();
let currentCalendarReminder = null;
let lastBackPress = 0;

async function loadPresets() {
  try {
    const response = await fetch("./core/data/presets.json");
    presets = await response.json();
  } catch (e) {
    console.error("Failed to load presets:", e);
  }
}

// ============================================
// DOM ELEMENTS (Same IDs as extension)
// ============================================
const tabs = document.querySelectorAll(".tab-trigger");
const tabContents = document.querySelectorAll(".tab-content");
const myRemindersList = document.getElementById("my-reminders-list");
const presetsListEl = document.getElementById("presets-list");
const addForm = document.getElementById("add-reminder-form");
const targetSelect = document.getElementById("target-select");
const editIdInput = document.getElementById("edit-id");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

// Modal Elements
const alertModal = document.getElementById("alert-modal");
const alertTitle = document.getElementById("alert-title");
const alertMessage = document.getElementById("alert-message");
const alertOkBtn = document.getElementById("alert-ok");

// Reader Elements
const readerView = document.getElementById("reader-view");
const readerContent = document.getElementById("reader-content");
const appContainer = document.getElementById("app-container");

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  await i18n.init();
  await checkAppVersionUpdate();
  initTabs();
  await loadPresets();
  await loadAllReminders();
  await fetchSurahs();
  initFormListeners();
  initSettingsListeners();
  initSmoothScroll();
  initCapacitor();
  checkAppMode();

  cancelEditBtn.addEventListener("click", () => {
    resetForm();
    tabs[0].click();
  });
});

/**
 * Checks if the app has been updated and clears specific caches if needed.
 */
async function checkAppVersionUpdate() {
  const lastVersion = await storage.get("last_app_version");
  const currentVersion = env.version;

  if (lastVersion && lastVersion !== currentVersion) {
    console.log(
      `[App] Version change detected: ${lastVersion} -> ${currentVersion}. Invalidating cache...`,
    );
    // We only clear surah_metadata, user_reminders and read_history are preserved.
    await storage.remove("surah_metadata");
  }

  await storage.set({ last_app_version: currentVersion });
}

// ============================================
// MOBILE CAPACITOR INIT
// ============================================
async function initCapacitor() {
  if (window.Capacitor && window.Capacitor.isNativePlatform) {
    const { LocalNotifications } = window.Capacitor.Plugins;

    try {
      // Request permissions on startup
      const status = await LocalNotifications.requestPermissions();
      console.log("[Capacitor] Notification permission status:", status);

      // Check and request exact alarm permission (Android 12+)
      try {
        const exactAlarmStatus =
          await LocalNotifications.checkExactNotificationSetting();
        console.log("[Capacitor] Exact alarm setting:", exactAlarmStatus);

        if (exactAlarmStatus.exact_alarm !== "granted") {
          console.warn(
            "[Capacitor] Exact alarms not granted. Notifications may not fire on time.",
          );
        }
      } catch (e) {
        // Older Android versions don't support this
        console.log(
          "[Capacitor] Exact alarm check not available (older Android)",
        );
      }

      // Reschedule all notifications on app startup
      // This ensures notifications persist after app updates or device restarts
      await notificationManager.rescheduleAll();

      // Handle notification clicks
      LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (notificationAction) => {
          const extra = notificationAction.notification.extra || {};
          const reminderId = extra.reminderId;
          console.log(
            "[Capacitor] Notification clicked for reminder:",
            reminderId,
          );

          if (reminderId) {
            // Give a small delay for data to load if app was totally cold-started
            setTimeout(async () => {
              const user_reminders =
                (await storage.get("user_reminders")) || [];
              const reminder =
                user_reminders.find((r) => r.id === reminderId) ||
                presets.find((r) => r.id === reminderId);
              if (reminder) {
                openReader(reminder);
              }
            }, 500);
          }
        },
      );

      // Listen for notification received while app is open
      LocalNotifications.addListener(
        "localNotificationReceived",
        (notification) => {
          console.log("[Capacitor] Notification received:", notification.title);
        },
      );
    } catch (e) {
      console.error("[Capacitor] Initialization failed:", e);
    }
  }

  // Handle Hardware Back Button
  if (window.Capacitor && window.Capacitor.isNativePlatform) {
    const { App } = window.Capacitor.Plugins;
    App.addListener("backButton", () => {
      handleHardwareBack();
    });
  }
}

/**
 * Handles the Android hardware back button.
 * - Closes Reader if open.
 * - Closes any open Modals.
 * - Switches to main tab if on sub-tabs.
 * - Exits app on double-tap within 2s.
 */
function handleHardwareBack() {
  // 1. If Reader is open, close it
  if (readerView.style.display === "flex") {
    document.getElementById("back-btn").click();
    return;
  }

  // 2. If any Modal is open, close it
  const openModals = Array.from(
    document.querySelectorAll(".modal-overlay"),
  ).filter((m) => m.style.display === "flex");

  if (openModals.length > 0) {
    const activeModal = openModals[openModals.length - 1];
    if (activeModal.id === "calendar-modal") {
      document.getElementById("calendar-close").click();
    } else if (activeModal.id === "delete-modal") {
      document.getElementById("cancel-delete").click();
    } else if (activeModal.id === "alert-modal") {
      document.getElementById("alert-ok").click();
    } else {
      activeModal.style.display = "none";
    }
    return;
  }

  // 3. If on a sub-tab (Add New or Settings), go back to main tab
  const activeTab = Array.from(tabs).find((t) =>
    t.classList.contains("active"),
  );
  if (activeTab && activeTab.dataset.tab !== "reminders-tab") {
    tabs[0].click();
    return;
  }

  // 4. Double back to exit
  const now = Date.now();
  if (now - lastBackPress < 2000) {
    window.Capacitor.Plugins.App.exitApp();
  } else {
    lastBackPress = now;
  }
}

// ============================================
// ENVIRONMENT / APP MODE
// ============================================
function checkAppMode() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;
  const isMobile = env.isMobile;

  if (isMobile || isStandalone) {
    document.body.classList.add("is-app");
  }

  // Only show the "Downloads" tab on standard Web (PWA)
  // We hide it on Mobile App because you already HAVE the app.
  if (env.isWeb && !isMobile) {
    const downloadsTrigger = document.getElementById("pwa-downloads-trigger");
    if (downloadsTrigger) {
      downloadsTrigger.style.display = "inline-flex";
    }
  }
}

// ============================================
// TABS (Same as extension)
// ============================================
function initTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      const target = tab.dataset.tab;
      const targetEl = document.getElementById(target);
      if (targetEl) {
        targetEl.classList.add("active");
      }

      // If switching AWAY from add-new while editing, reset form
      if (target !== "add-new" && editIdInput?.value) {
        resetForm();
      }
    });
  });
}

// ============================================
// DATA LOADING
// ============================================
async function loadAllReminders() {
  const user_reminders = (await storage.get("user_reminders")) || [];
  const read_history = (await storage.get("read_history")) || [];
  const bookmarks = (await storage.get("bookmarks")) || {};

  renderActiveList(user_reminders, read_history, bookmarks);
  renderPresetsList(user_reminders, read_history, bookmarks);
}

function renderActiveList(reminders, history, bookmarks) {
  myRemindersList.innerHTML = "";

  const enabledReminders = reminders.filter((r) => r.enabled !== false);

  if (enabledReminders.length === 0) {
    myRemindersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📖</div>
                <p class="empty-state-text" data-i18n="demo.card.emptyState">${i18n.t("demo.card.emptyState")}</p>
            </div>`;
    return;
  }

  enabledReminders.forEach((reminder) => {
    const attempts = history.filter((h) => h.reminderId === reminder.id);
    const lastRead =
      attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
    const hasBookmark = !!bookmarks[reminder.id];
    const el = createReminderCard(reminder, lastRead, true, hasBookmark);
    myRemindersList.appendChild(el);
  });
}

function renderPresetsList(activeReminders, history, bookmarks) {
  presetsListEl.innerHTML = "";

  const enabledPresetIds = new Set(
    activeReminders
      .filter((r) => r.enabled !== false && presets.some((p) => p.id === r.id))
      .map((r) => r.id),
  );

  const disabledPresets = presets.filter((p) => !enabledPresetIds.has(p.id));

  if (disabledPresets.length === 0) {
    presetsListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <p class="empty-state-text">جميع تذكيرات السنن مفعّلة في قائمتك!</p>
            </div>`;
    return;
  }

  disabledPresets.forEach((preset) => {
    const attempts = history.filter((h) => h.reminderId === preset.id);
    const lastRead =
      attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
    const hasBookmark = !!bookmarks[preset.id];
    const el = createReminderCard(preset, lastRead, false, hasBookmark);
    presetsListEl.appendChild(el);
  });
}

// ============================================
// REMINDER CARD (Same logic as extension)
// ============================================
// isReadInCurrentPeriod and getFrequencyLabel are imported from reminderLogic

function createReminderCard(
  reminder,
  lastReadTs,
  isActive,
  hasBookmark = false,
) {
  const div = document.createElement("div");
  div.className = "reminder-card";

  const freqLabel = reminder.timing
    ? getFrequencyLabel(reminder.timing)
    : i18n.t("frequency.preset");
  const timeLabel = reminder.timing
    ? `${reminder.timing.time} - ${freqLabel}`
    : i18n.t("card.notScheduled");
  const isRead = isReadInCurrentPeriod(reminder, lastReadTs);

  // Card Header
  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";

  const headerLeft = document.createElement("div");

  const cardTitle = document.createElement("div");
  cardTitle.className = "card-title";
  if (hasBookmark) {
    const bookmarkSpan = document.createElement("span");
    bookmarkSpan.style.marginRight = "0.5rem";
    bookmarkSpan.style.fontSize = "1rem";
    bookmarkSpan.title = i18n.t("card.bookmarkTitle");
    bookmarkSpan.textContent = "🔖";
    cardTitle.appendChild(bookmarkSpan);
  }
  cardTitle.appendChild(
    document.createTextNode(reminder.name || reminder.description),
  );

  const cardDesc = document.createElement("div");
  cardDesc.className = "card-description";
  cardDesc.textContent = timeLabel;

  headerLeft.appendChild(cardTitle);
  headerLeft.appendChild(cardDesc);

  const headerActions = document.createElement("div");
  headerActions.className = "card-header-actions";

  const calendarBtn = document.createElement("button");
  calendarBtn.className = "btn btn-ghost calendar-btn";
  calendarBtn.title = i18n.t("card.progressHistory");
  calendarBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

  const switchBtn = document.createElement("button");
  switchBtn.className = "switch";
  switchBtn.role = "switch";
  switchBtn.setAttribute(
    "aria-checked",
    isActive && reminder.enabled !== false,
  );
  switchBtn.dataset.id = reminder.id;
  const switchThumb = document.createElement("span");
  switchThumb.className = "switch-thumb";
  switchBtn.appendChild(switchThumb);

  headerActions.appendChild(calendarBtn);
  headerActions.appendChild(switchBtn);

  cardHeader.appendChild(headerLeft);
  cardHeader.appendChild(headerActions);

  // Card Actions
  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group";

  const readBtn = document.createElement("button");
  readBtn.className = "btn btn-primary read-btn";
  readBtn.textContent = i18n.t("card.readBtn");

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-outline edit-btn";
  editBtn.textContent = i18n.t("card.edit");
  if (!isActive) editBtn.style.display = "none";

  btnGroup.appendChild(readBtn);
  btnGroup.appendChild(editBtn);

  cardActions.appendChild(btnGroup);

  if (isActive) {
    const checkboxWrapper = document.createElement("div");
    checkboxWrapper.className = "checkbox-wrapper mark-read-checkbox";
    checkboxWrapper.dataset.id = reminder.id;

    const checkbox = document.createElement("button");
    checkbox.className = "checkbox";
    checkbox.role = "checkbox";
    checkbox.setAttribute("aria-checked", isRead);

    const checkboxIndicator = document.createElement("span");
    checkboxIndicator.className = "checkbox-indicator";
    checkboxIndicator.textContent = "✓";
    checkbox.appendChild(checkboxIndicator);

    const checkboxLabel = document.createElement("span");
    checkboxLabel.className = "checkbox-label";
    checkboxLabel.textContent = isRead
      ? i18n.t("card.read")
      : i18n.t("card.unread");

    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(checkboxLabel);
    cardActions.appendChild(checkboxWrapper);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-ghost btn-destructive delete-btn";
  deleteBtn.textContent = i18n.t("card.delete");
  if (!isActive) deleteBtn.style.display = "none";

  cardActions.appendChild(deleteBtn);

  div.appendChild(cardHeader);
  div.appendChild(cardActions);

  // Calendar Button
  calendarBtn.addEventListener("click", () => {
    showCalendarModal(reminder);
  });

  // Toggle Switch
  switchBtn.addEventListener("click", async () => {
    const currentlyChecked = switchBtn.getAttribute("aria-checked") === "true";
    const newVal = !currentlyChecked;

    if (newVal) {
      if (!isActive) {
        await addReminder(reminder);
      } else {
        await toggleReminder(reminder.id, true);
      }
    } else {
      if (reminder.id.toString().startsWith("custom_")) {
        await toggleReminder(reminder.id, false);
      } else {
        await removeReminder(reminder.id);
      }
    }
    await loadAllReminders();
  });

  // Read Button
  readBtn.addEventListener("click", () => {
    openReader(reminder);
  });

  // Mark Read Checkbox
  const checkboxWrapper = div.querySelector(".mark-read-checkbox");
  if (checkboxWrapper) {
    checkboxWrapper.addEventListener("click", async () => {
      const checkbox = checkboxWrapper.querySelector(".checkbox");
      const isCurrentlyChecked =
        checkbox.getAttribute("aria-checked") === "true";

      if (isCurrentlyChecked) {
        await removeReadMark(reminder.id, reminder);
      } else {
        await addReadMark(
          reminder.id,
          reminder.name || reminder.description,
          reminder,
        );
      }

      await loadAllReminders();
    });
  }

  // Edit Button
  if (isActive) {
    editBtn.addEventListener("click", () => {
      startEditing(reminder);
    });
  }

  // Delete Button
  if (isActive) {
    deleteBtn.addEventListener("click", () => {
      showDeleteModal(reminder.id);
    });
  }

  return div;
}

// ============================================
// READER
// ============================================
async function openReader(reminder) {
  currentReminder = reminder;
  document.getElementById("reader-title").textContent =
    reminder.name || reminder.description;

  readerView.style.display = "flex";
  appContainer.style.display = "none";

  readerContent.innerHTML =
    '<div class="loading-state"><div class="spinner"></div></div>';

  try {
    let verses;
    const target = reminder.target;

    if (reminder.type === "surah") {
      verses = await fetchSurahVerses(target.surahId);
    } else if (reminder.type === "ayah_range") {
      verses = await fetchAyahRange(
        target.surahId,
        target.startAyah,
        target.endAyah,
      );
    } else if (reminder.type === "juz") {
      verses = await fetchJuzVerses(target.juzId);
    }

    const pages = parseVersesToPages(verses);
    renderReaderContent(pages);
    restoreBookmark();
  } catch (e) {
    console.error("Failed to load:", e);
    readerContent.innerHTML =
      '<div class="empty-state"><p class="empty-state-text" style="color: hsl(var(--destructive));">فشل تحميل الآيات</p></div>';
  }

  // Back button
  document.getElementById("back-btn").onclick = () => {
    readerView.style.display = "none";
    appContainer.style.display = "flex";
    currentReminder = null;
  };

  // Mark as read/unread button - with state tracking
  const markReadBtn = document.getElementById("mark-read-btn");
  await updateMarkReadButton(reminder, markReadBtn);

  markReadBtn.onclick = async () => {
    const read_history = (await storage.get("read_history")) || [];
    const attempts = read_history.filter((h) => h.reminderId === reminder.id);
    const lastReadTs =
      attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
    const isCurrentlyRead = isReadInCurrentPeriod(reminder, lastReadTs);

    if (isCurrentlyRead) {
      await removeReadMark(reminder.id, reminder);
    } else {
      await addReadMark(
        reminder.id,
        reminder.name || reminder.description,
        reminder,
      );
    }

    await loadAllReminders();
    await updateMarkReadButton(reminder, markReadBtn);
  };
}

async function updateMarkReadButton(reminder, btn) {
  const read_history = (await storage.get("read_history")) || [];
  const attempts = read_history.filter((h) => h.reminderId === reminder.id);
  const lastReadTs =
    attempts.length > 0 ? attempts[attempts.length - 1].timestamp : null;
  const isRead = isReadInCurrentPeriod(reminder, lastReadTs);

  if (isRead) {
    btn.textContent = "✗ إلغاء القراءة";
    btn.style.backgroundColor = "hsl(var(--muted))";
    btn.style.color = "hsl(var(--foreground))";
  } else {
    btn.textContent = "✓ تحديد كمقروء";
    btn.style.backgroundColor = "hsl(var(--quran-green))";
    btn.style.color = "white";
  }
}

function renderReaderContent(pagesData) {
  readerContent.innerHTML = "";

  pagesData.forEach((pageData) => {
    const { pageNumber, lines, surahStarts } = pageData;
    const pageDiv = document.createElement("div");
    pageDiv.className = "mushaf-page";
    pageDiv.dataset.page = pageNumber;

    for (let i = 1; i <= 15; i++) {
      const lineWords = lines.get(i);

      if (lineWords) {
        const isLast = i === 15 || !lines.has(i + 1);
        const isCentered = isLast && lineWords.length < 5;

        const lineDiv = document.createElement("div");
        lineDiv.className = isCentered ? "mushaf-line centered" : "mushaf-line";

        lineWords.forEach((word) => {
          const span = document.createElement("span");
          span.textContent = word.text_qpc_hafs || word.text_uthmani;

          if (word.char_type_name === "end") {
            span.className = "ayah-symbol";
          } else {
            span.className = "mushaf-word";
            span.dataset.verseKey = word.verse_key;
            span.dataset.wordPosition = word.position;

            span.addEventListener("click", async () => {
              const isCurrentBookmark = span.classList.contains("bookmarked");

              // Remove highlight from all words first
              readerContent
                .querySelectorAll(".mushaf-word.bookmarked")
                .forEach((w) => w.classList.remove("bookmarked"));

              if (isCurrentBookmark) {
                // Toggle off - remove bookmark
                await removeBookmark();
              } else {
                // Set new bookmark
                span.classList.add("bookmarked");
                await saveBookmark(word.verse_key, word.position);
              }
            });
          }

          lineDiv.appendChild(span);
        });

        pageDiv.appendChild(lineDiv);
      } else {
        let nextLine = i;
        while (nextLine <= 15 && !lines.has(nextLine)) nextLine++;

        if (nextLine <= 15) {
          const surahId = surahStarts[nextLine];
          const gap = nextLine - i;

          if (surahId && gap === 2) {
            const header = document.createElement("div");
            header.className = "surah-header";
            header.innerHTML = `<span>surah</span><span>${String(surahId).padStart(3, "0")}</span>`;
            pageDiv.appendChild(header);
          } else if (surahId && gap === 1 && surahId !== "9") {
            const basmala = document.createElement("div");
            basmala.className = "basmala";
            basmala.textContent = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
            pageDiv.appendChild(basmala);
          }
        }
      }
    }

    const footer = document.createElement("div");
    footer.className = "page-footer";
    footer.textContent = `صفحة ${pageNumber}`;
    pageDiv.appendChild(footer);

    readerContent.appendChild(pageDiv);
  });
}

async function saveBookmark(verseKey, wordPosition) {
  if (!currentReminder) return;
  const bookmarks = (await storage.get("bookmarks")) || {};
  bookmarks[currentReminder.id] = {
    verseKey,
    wordPosition,
    timestamp: Date.now(),
  };
  await storage.set({ bookmarks: bookmarks });
}

async function removeBookmark() {
  if (!currentReminder) return;
  const bookmarks = (await storage.get("bookmarks")) || {};
  delete bookmarks[currentReminder.id];
  await storage.set({ bookmarks: bookmarks });
}

async function restoreBookmark() {
  if (!currentReminder) return;
  const bookmarks = (await storage.get("bookmarks")) || {};
  const bm = bookmarks[currentReminder.id];
  if (!bm) return;

  const word = readerContent.querySelector(
    `.mushaf-word[data-verse-key="${bm.verseKey}"][data-word-position="${bm.wordPosition}"]`,
  );
  if (word) {
    word.classList.add("bookmarked");
    setTimeout(
      () => word.scrollIntoView({ behavior: "smooth", block: "center" }),
      100,
    );
  }
}

// ============================================
// CALENDAR MODAL
// ============================================
function showCalendarModal(reminder) {
  currentCalendarReminder = reminder;
  currentCalendarMonth = new Date();

  document.getElementById("calendar-reminder-name").textContent =
    reminder.name || reminder.description;
  renderCalendar();
  document.getElementById("calendar-modal").style.display = "flex";

  document.getElementById("calendar-prev").onclick = () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
    renderCalendar();
  };

  document.getElementById("calendar-next").onclick = () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
    renderCalendar();
  };

  document.getElementById("calendar-close").onclick = () => {
    document.getElementById("calendar-modal").style.display = "none";
  };

  document.getElementById("calendar-modal").onclick = (e) => {
    if (e.target.id === "calendar-modal") {
      document.getElementById("calendar-modal").style.display = "none";
    }
  };
}

async function renderCalendar() {
  const history = (await storage.get("read_history")) || [];
  const reminder = currentCalendarReminder;
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();

  const months =
    i18n.getLanguage() === "ar"
      ? [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
  document.getElementById("calendar-title").textContent =
    `${months[month]} ${year}`;

  const completedDates = new Set();
  history
    .filter((h) => h.reminderId === reminder.id)
    .forEach((h) => {
      const date = new Date(h.timestamp);
      completedDates.add(
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      );
    });

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const today = new Date();

  const timing = reminder.timing;
  const scheduledDays = getScheduledDaysInMonth(timing, year, month);

  for (let i = 0; i < startPadding; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell empty";
    grid.appendChild(cell);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    const dateKey = `${year}-${month}-${day}`;
    const cellDate = new Date(year, month, day);
    const isToday = cellDate.toDateString() === today.toDateString();
    const isFuture = cellDate > today;
    const isScheduled = scheduledDays.has(day);
    const isCompleted = completedDates.has(dateKey);

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = day;

    const statusIcon = document.createElement("span");
    statusIcon.className = "status-icon";

    if (isFuture) {
      cell.classList.add("future");
    } else if (isCompleted) {
      cell.classList.add("completed");
      statusIcon.textContent = "✓";
    } else if (isScheduled) {
      cell.classList.add("missed");
      statusIcon.innerHTML = '<span class="circle"></span>';
    } else {
      cell.classList.add("not-scheduled");
    }

    if (isToday) cell.classList.add("today");

    cell.appendChild(dayNumber);
    cell.appendChild(statusIcon);
    grid.appendChild(cell);
  }
}

function getScheduledDaysInMonth(timing, year, month) {
  const scheduledDays = new Set();
  if (!timing) return scheduledDays;

  const freq = timing.frequency;
  const scheduledWeekDay = timing.day;
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    if (freq === "daily") {
      scheduledDays.add(day);
    } else if (freq === "weekly" && scheduledWeekDay !== undefined) {
      if (date.getDay() === scheduledWeekDay) {
        scheduledDays.add(day);
      }
    }
  }

  return scheduledDays;
}

// ============================================
// MODALS
// ============================================
function showAlert(title, message) {
  alertTitle.textContent = title || i18n.t("alert.title") || "تنبيه";
  alertMessage.textContent = message;
  alertModal.style.display = "flex";

  alertOkBtn.onclick = () => {
    alertModal.style.display = "none";
  };

  alertModal.onclick = (e) => {
    if (e.target === alertModal) alertModal.style.display = "none";
  };
}

function showDeleteModal(id) {
  const modal = document.getElementById("delete-modal");
  const confirmBtn = document.getElementById("confirm-delete");
  const cancelBtn = document.getElementById("cancel-delete");

  modal.style.display = "flex";

  confirmBtn.onclick = async () => {
    await removeReminder(id);
    await loadAllReminders();
    modal.style.display = "none";
  };

  cancelBtn.onclick = () => {
    modal.style.display = "none";
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

// ============================================
// ADD/EDIT FORM
// ============================================
async function fetchSurahs() {
  try {
    allSurahs = await fetchAllSurahs();
    populateTargetSelect();
  } catch (e) {
    console.error("Failed to load surahs:", e);
  }
}

function populateTargetSelect() {
  const type = document.getElementById("reminder-type").value;
  targetSelect.innerHTML = "";

  if (type === "juz") {
    targetSelect.innerHTML = `<option value="" disabled selected>${i18n.t("form.selectJuz")}</option>`;
    for (let i = 1; i <= 30; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent =
        i18n.getLanguage() === "ar" ? `الجزء ${i}` : `Juz ${i}`;
      targetSelect.appendChild(option);
    }
  } else {
    targetSelect.innerHTML = `<option value="" disabled selected>${i18n.t("form.selectSurah")}</option>`;
    allSurahs.forEach((surah) => {
      const option = document.createElement("option");
      option.value = surah.id;
      option.textContent = `${surah.id}. ${surah.name_arabic}`;
      targetSelect.appendChild(option);
    });
  }
}

function initFormListeners() {
  const reminderTypeSelect = document.getElementById("reminder-type");
  const frequencySelect = document.getElementById("frequency");
  const ayahRangeGroup = document.getElementById("ayah-range-group");
  const daySelectGroup = document.getElementById("day-select-group");

  reminderTypeSelect.addEventListener("change", () => {
    populateTargetSelect();
    ayahRangeGroup.style.display =
      reminderTypeSelect.value === "ayah_range" ? "block" : "none";
  });

  frequencySelect.addEventListener("change", () => {
    daySelectGroup.style.display =
      frequencySelect.value === "weekly" ? "block" : "none";
  });

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = reminderTypeSelect.value;
    const targetId = parseInt(targetSelect.value);
    const name = document.getElementById("reminder-name").value.trim();
    const time = document.getElementById("time-select").value;
    const frequency = frequencySelect.value;
    const day = parseInt(document.getElementById("day-select").value);

    if (!targetId || !name || !time) {
      showAlert("خطأ", "الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    const target = type === "juz" ? { juzId: targetId } : { surahId: targetId };

    if (type === "ayah_range") {
      target.startAyah =
        parseInt(document.getElementById("start-ayah").value) || 1;
      target.endAyah = parseInt(document.getElementById("end-ayah").value) || 1;
    }

    const timing = { frequency, time };
    if (frequency === "weekly") timing.day = day;

    const editId = editIdInput.value;

    if (editId) {
      await updateReminder(editId, { name, type, target, timing });
      showAlert("تم", "تم تعديل التذكير بنجاح ✓");
    } else {
      const reminder = {
        id: `custom_${Date.now()}`,
        name,
        type,
        target,
        timing,
        enabled: true,
      };
      await addReminder(reminder);
      showAlert("تم", "تم حفظ التذكير بنجاح ✓");
    }

    await loadAllReminders();
    resetForm();
    tabs[0].click();
  });
}

function startEditing(reminder) {
  editIdInput.value = reminder.id;
  submitBtn.textContent = "تعديل التذكير";
  cancelEditBtn.style.display = "block";

  if (tabs[1]) {
    document.getElementById("add-new-btn").textContent = "تعديل الورد";
    document.getElementById("add-new-icon").style.display = "none";
    document.getElementById("edit-new-icon").style.display = "block";
  }

  document.getElementById("reminder-type").value = reminder.type || "surah";
  document.getElementById("reminder-name").value = reminder.name || "";

  if (reminder.timing) {
    document.getElementById("time-select").value = reminder.timing.time || "";
    document.getElementById("frequency").value =
      reminder.timing.frequency || "daily";
  }

  document.getElementById("reminder-type").dispatchEvent(new Event("change"));
  document.getElementById("frequency").dispatchEvent(new Event("change"));

  if (reminder.timing?.frequency === "weekly") {
    document.getElementById("day-select").value = reminder.timing.day;
  }

  const trySetTarget = () => {
    const targetId = reminder.target?.surahId || reminder.target?.juzId;
    if (targetSelect.options.length > 1 && targetId) {
      targetSelect.value = targetId;
      if (reminder.type === "ayah_range") {
        document.getElementById("start-ayah").value =
          reminder.target.startAyah || "";
        document.getElementById("end-ayah").value =
          reminder.target.endAyah || "";
      }
    } else {
      setTimeout(trySetTarget, 300);
    }
  };
  trySetTarget();

  if (tabs[1]) tabs[1].click();
}

function resetForm() {
  editIdInput.value = "";
  submitBtn.textContent = "حفظ التذكير";
  cancelEditBtn.style.display = "none";

  if (tabs[1]) {
    document.getElementById("add-new-btn").textContent = "إضافة جديد";
    document.getElementById("add-new-icon").style.display = "block";
    document.getElementById("edit-new-icon").style.display = "none";
  }

  addForm.reset();
  document.getElementById("reminder-type").dispatchEvent(new Event("change"));
  document.getElementById("frequency").dispatchEvent(new Event("change"));
}

// ============================================
// SETTINGS
// ============================================
function initSettingsListeners() {
  const { Filesystem, Share } = window.Capacitor.Plugins;
  // Export
  document.getElementById("export-data").addEventListener("click", async () => {
    let platform = window.Capacitor.getPlatform();

    if (platform == "android") {
      const data = {
        user_reminders: (await storage.get("user_reminders")) || [],
        read_history: (await storage.get("read_history")) || [],
        bookmarks: (await storage.get("bookmarks")) || {},
      };
      const result = await Filesystem.writeFile({
        path:
          "wird-backup-" +
          new Date().getDate() +
          "-" +
          new Date().getMonth() +
          "-" +
          new Date().getFullYear() +
          "-" +
          new Date().getHours() +
          "-" +
          new Date().getMinutes() +
          "-" +
          new Date().getSeconds() +
          ".json",
        directory: "DOCUMENTS",
        data: JSON.stringify(data, null, 2),
        encoding: "utf8",
      });
      showAlert("تم", " تم تصدير البيانات بنجاح الى المستندات");
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await delay(2000);
      await Share.share({
        title: "مذكر الورد اليومي",
        text: "مذكر الورد اليومي",
        url: result.uri,
      });
    } else {
      const data = {
        user_reminders: (await storage.get("user_reminders")) || [],
        read_history: (await storage.get("read_history")) || [],
        bookmarks: (await storage.get("bookmarks")) || {},
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wird-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showAlert("تم", "تم تصدير البيانات بنجاح");
    }
  });

  // Import
  const importFile = document.getElementById("import-file-input");
  document.getElementById("import-data").addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.user_reminders)
        await storage.set({ user_reminders: data.user_reminders });
      if (data.read_history)
        await storage.set({ read_history: data.read_history });
      if (data.bookmarks) await storage.set({ bookmarks: data.bookmarks });

      await loadAllReminders();
      showAlert("تم", "تم استيراد البيانات بنجاح");
    } catch (err) {
      showAlert("خطأ", "فشل قراءة الملف");
    }

    importFile.value = "";
  });

  // Clear history
  document
    .getElementById("clear-history")
    .addEventListener("click", async () => {
      if (confirm("هل أنت متأكد من مسح سجل الإنجاز؟")) {
        await storage.set({ read_history: [] });
        await loadAllReminders();
        showAlert("تم", "تم مسح سجل الإنجاز");
      }
    });

  // Reset all
  document
    .getElementById("reset-extension")
    .addEventListener("click", async () => {
      if (
        confirm(
          "هل أنت متأكد من إعادة ضبط كل البيانات؟ لا يمكن التراجع عن هذه الخطوة.",
        )
      ) {
        await storage.set({ user_reminders: [] });
        await storage.set({ read_history: [] });
        await storage.set({ bookmarks: {} });
        await loadAllReminders();
        showAlert("تم", "تم إعادة ضبط الإضافة");
      }
    });
}

// ============================================
// SMOOTH SCROLL
// ============================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}
