import { storage } from '../core/js/adapter/storage.js';

export async function showNotification(reminderId, notificationId) {
    try {
        const user_reminders = await storage.get('user_reminders');

        // Fetch presets
        const url = chrome.runtime.getURL('src/core/data/presets.json');
        const response = await fetch(url);
        const presets = await response.json();

        let reminder = user_reminders?.find(r => r.id === reminderId);
        if (!reminder) {
            reminder = presets.find(r => r.id === reminderId);
        }

        const notificationOptions = {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('src/core/assets/icons/icon128.png'),
            title: 'مُذكِّر الوِرد اليومي',
            message: reminder ? `حان وقت قراءة: ${reminder.name}` : 'حان وقت وردك اليومي!',
            priority: 2,
            requireInteraction: true,
            buttons: [{ title: 'اقرأ الآن' }]
        };

        chrome.notifications.create(notificationId, notificationOptions, (createdId) => {
            if (chrome.runtime.lastError) {
                console.error('Notification creation failed:', chrome.runtime.lastError.message);
            } else {
                console.log('Notification created:', createdId);
            }
        });
    } catch (e) {
        console.error('Error in showNotification:', e);
    }
}
