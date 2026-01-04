// src/background/notifications.js

export async function showNotification(reminderId, notificationId) {
    const { user_reminders } = await browser.storage.local.get('user_reminders');

    // Fetch presets
    const url = browser.runtime.getURL('src/data/presets.json');
    const response = await fetch(url);
    const presets = await response.json();

    let reminder = user_reminders?.find(r => r.id === reminderId);
    if (!reminder) {
        reminder = presets.find(r => r.id === reminderId);
    }

    if (reminder) {
        browser.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: browser.runtime.getURL('src/assets/icons/icon128.png'),
            title: 'Wird Reminder',
            message: `Time to read: ${reminder.name}`,
            priority: 2,
            buttons: [{ title: 'اقرأ الآن' }] // Add Read Now button
        });
    } else {
        browser.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: browser.runtime.getURL('src/assets/icons/icon128.png'),
            title: 'Wird Reminder',
            message: 'Time for your daily Wird!',
            priority: 2,
            buttons: [{ title: 'اقرأ الآن' }]
        });
    }
}
