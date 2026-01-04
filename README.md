# Wird Reminder | مُذكِّر الوِرد

A humble companion for your journey with the Holy Quran. **Wird Reminder** is a Chrome extension designed to help you maintain a consistent daily or weekly Quran reading habit through gentle reminders and a beautiful reading experience.

---

## 🌟 What is Wird Reminder?

In our busy lives, consistency can be a challenge. This project was born out of a simple need: a tool that stays out of the way but reminds us of our most important daily goal—connecting with the Words of Allah.

We've tried to make it as simple, privacy-focused, and beautiful as possible. It is completely free, open-source, and contains no advertisements.

## ✨ Key Features

- **Personalized Reminders**: Set reading goals for specific Surahs, Ayah ranges, or an entire Juz.
- **Smart Scheduling**: Choose between daily reminders or weekly sessions (like Surah Al-Kahf on Fridays).
- **Beautiful Reader**: A focused, Mushaf-style reading view using the traditional Uthmani script.
- **Progress Tracking**: A simple calendar view to visualize your consistency and history.
- **Smart Bookmarking**: Remembers exactly where you left off in each wird.
- **Sunnah Presets**: One-click setup for recommended readings (Al-Mulk before sleep, etc.).
- **Privacy-First**: All your data—reminders, bookmarks, and history—stays strictly on your local machine.
- **Offline Capable**: Works without an internet connection once the Quran text is cached.
- **Firefox Port**: A dedicated version for Firefox users in the `/firefox` directory.

## 📖 Documentation

This project is built with simplicity and performance in mind:
- **Core**: Vanilla JavaScript (ES6+), HTML5, and CSS3.
- **Framework**: Chrome Manifest V3.
- **API**: Powered by the wonderful [Quran.com API](https://quran.com/).
- **Fonts**: Custom Uthmanic Hafs and SurahNames fonts for an authentic experience.

---

## 🚀 Getting Started (Installation)

If you are a developer or a tester, you can load the extension manually:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/WirdReminder.git
   ```
2. **Open Chrome Extensions**:
   Navigate to `chrome://extensions/` in your Google Chrome browser.
3. **Enable Developer Mode**:
   Toggle the switch in the top-right corner.
4. **Load Unpacked**:
   Click the "Load unpacked" button and select the `WirdReminder` root directory (containing the main `manifest.json`).

### For Firefox:
1. **Open Firefox Add-ons Settings**:
   Navigate to `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on**:
   Click the "Load Temporary Add-on..." button and select the `manifest.json` file inside the `firefox/` directory.

## 🧪 How to Test

We recommend the following steps to verify the extension is working correctly:

### 1. Manual Feature Testing
- **Create a Reminder**: Open the popup, go to the "Add" tab, and create a reminder for a short Surah (e.g., Al-Ikhlas) for a time 1-2 minutes from now.
- **Verify Notification**: Wait for the set time. A Chrome notification should appear.
- **Test the Reader**: Click "اقرأ الآن" (Read Now) on the notification. The reader should open and display the correct verses.
- **Mark as Read**: After reading, click the "Mark as Read" button. Verify the status updates in the popup list and calendar.
- **Bookmark Check**: While reading, click on a word to set a bookmark. Close the tab and reopen it; the page should scroll back to your bookmark.

### 2. Debugging Tools
- **Background Processes**: Inspect the "Service Worker" from `chrome://extensions/` to see alarm logs.
- **Storage**: Use the DevTools Console to check `chrome.storage.local.get(null, console.log)` to verify your data is being saved correctly.
- **UI Responsiveness**: Right-click the popup and select "Inspect" to test the UI in different states.

---

## 🏗️ Architecture Overview

The project follows a modular architecture:
- **`src/background/`**: Handles the alarms and notification lifecycle.
- **`src/popup/`**: The main management interface for reminders and settings.
- **`src/reader/`**: A coordinator-based reading engine that fetches, parses, and renders Quranic text.
- **`src/styles/`**: A design system built using CSS variables for high flexibility and consistency.

## 🤝 Contribution

We welcome any humble contributions to this project. Whether it's a bug fix, a new feature, or an improvement to the Arabic translations, feel free to open a Pull Request.