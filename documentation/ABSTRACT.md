# Multi-Platform Abstraction & Code Sync Architecture

This document explains the architecture of the **Wird Reminder** project, focusing on how it maintains a unified codebase across four platforms: **Chrome Extension**, **Firefox Extension**, **PWA (Web)**, and **Android (Capacitor/Native)**.

## Core Principle: "Write Once, Sync Everywhere"

The project minimizes platform-specific code by centralizing all business logic, UI assets, and data in a root `core/` directory. This directory is then "synchronized" (copied) into each platform's source folder during development or build time.

---

## 1. Directory Structure

```text
WirdReminder/
├── core/                # SINGLE SOURCE OF TRUTH (Originals)
│   ├── assets/          # Fonts, Icons
│   ├── css/             # Shared Design System
│   ├── data/            # Presets, Metadata
│   └── js/              # Shared logic (Adapters, API, Parser, Logic)
├── chrome/              # Chrome Extension Wrapper
│   └── src/core/        # SYNCED COPY (Do not edit directly)
├── firefox/             # Firefox Extension Wrapper
│   └── src/core/        # SYNCED COPY (Do not edit directly)
├── www/                 # PWA & Capacitor Host
│   └── core/            # SYNCED COPY (Do not edit directly)
├── android/             # Android/Capacitor Native Shell
└── scripts/             # The Synchronization Engine
```

---

## 2. Synchronization Mechanism

### `scripts/sync.js`
This script is the heart of the "Write Once" philosophy. It recursively copies the contents of the root `core/` directory into:
- `chrome/src/core/`
- `firefox/src/core/`
- `www/core/`

**Key Command:** `npm run sync`

### `scripts/build.js`
The master orchestrator that:
1.  Runs `version-sync.js` to align all manifests and adapters with the root `package.json`.
2.  Runs `sync.js` to ensure every platform has the latest core code.
3.  Packages browser extensions into `.zip` artifacts.
4.  Syncs Capacitor for Android and triggers the Gradle build.
5.  Patches Proguard for AGP 8.13+ compatibility.
6.  Collects all final artifacts (ZIPs, APK, AAB) into a root `build/` folder.

**Key Command:** `npm run build`

---

## 3. The Abstraction Layer (Adapters)

To handle differences in platform APIs (e.g., how to schedule a notification or store data), the project uses a **Unified Adapter Pattern** located in `core/js/adapter/`.

### Unified Storage (`storage.js`)
Instead of calling `chrome.storage` or `localStorage` directly, the code calls `storage.get()` or `storage.set()`.
- **Extensions**: Uses `chrome.storage.local` (asynchronous).
- **Web/Mobile**: Uses `localStorage` (wrapped in a Promise for consistency).

### Unified Notifications & Alarms (`notifications.js`)
Handles the complex differences in background scheduling:
- **Extensions**: Uses `chrome.alarms` and `chrome.notifications`.
- **Mobile (Android)**: Uses `Capacitor Local Notifications`.
- **Web**: Uses `setInterval` and `Desktop Notifications` for active sessions.

### Environment Context (`env.js`)
A simple utility to detect the current platform and provide the current version:
```javascript
export const env = {
    isExtension: typeof chrome !== 'undefined' && !!chrome.runtime,
    isMobile: window.Capacitor?.isNative,
    isWeb: !window.Capacitor?.isNative && !isExtension,
    version: '1.1.0' // Synced automatically
};
```

---

## 4. Cache Invalidation & Persistence

When the application is updated, we must ensure the UI and metadata are refreshed without losing user bookmarks or reminders.

### Service Worker Versioning (PWA/Android)
The `CACHE_NAME` in `sw.js` is automatically updated to `wird-reminder-v{version}` during the build process. When the new Service Worker activates, it detects the name change and:
1.  Purges all old asset caches.
2.  Clears the `quran-api-cache` to force fresh data fetching.

### Metadata Version Handshake
In `app.js` and extension background scripts, a "Version Handshake" occurs on startup:
1.  The app compares the current code version (`env.version`) with `last_app_version` in storage.
2.  If they differ, it clears the `surah_metadata` (cached surah names/counts).
3.  `user_reminders` and `read_history` are **preserved** as they are user-generated.

---

## 5. Mobile Specifics: Android (Capacitor)

The Android app is a native shell around the PWA, enhanced by specific mobile behaviors.

### Build & Testing
- **JDK Support**: Fully compatible with **JDK 17, 21, and 25** (using Gradle 9.2.1).
- **Testing**: Use `npm run android:refresh`. This command syncs the core, updates Capacitor web assets, and launches the app directly on a connected device or emulator.

### Hardware Back Button Logic
To provide a native feel, the hardware back button in `app.js` is intercepted via Capacitor:
1.  **Context Aware**: If the Reader is open, it closes the reader first.
2.  **Modal Management**: It dismisses open modals (Calendar, Delete, Alert) in order.
3.  **Navigation**: If on a sub-tab, it returns to the main "Reminders" list.
4.  **Double-Back to Exit**: If on the main screen, the user must tap "Back" twice within 2 seconds to exit the app.

---

## 6. Notification Handling Strategy

### Extensions (Chrome/Firefox)
Notifications are triggered by the **Service Worker (Background Script)** listening to `chrome.alarms`. This works even if the browser popup is closed.

### Android (Capacitor)
Uses the `@capacitor/local-notifications` plugin. Reminders are scheduled directly into the Android system alarm manager. Tapping a notification triggers the `localNotificationActionPerformed` listener, which opens the app and navigates directly to the specific `reminderId` in the Reader.

### Web (PWA)
Standard web notifications are used when the app is active. Due to browser limitations, persistent background alarms are less reliable than native/extension counterparts.

---

## 7. Minimal Platform-Specific Editing

### Extension Cross-Browser Bridge
Firefox and Chrome share 99% of their code. To handle the `browser` vs `chrome` prefix difference without code duplication, we use a global `api` constant:

```javascript
const api = typeof browser !== 'undefined' ? browser : chrome;
api.runtime.onInstalled.addListener(...);
```

### Manifest Versioning
Manifest files (`manifest.json` for extensions, `package.json` for web, and `build.gradle` for Android) are kept in sync automatically via `scripts/version-sync.js`.

---

## 8. Summary of Development Workflow

1.  **Modify Shared Logic**: Edit files in root `/core/`.
2.  **Sync**: Run `npm run sync`.
3.  **Validate**: Test the Web version (`www/`) or run `npm run android:refresh` for mobile.
4.  **Build**: Run `npm run build` to generate all production-ready packages for all platforms.
5.  **Minimal Native Tweaks**: Only touch `/chrome`, `/firefox`, or `/android` for platform-specific configurations (like native permissions or Gradle setup).
