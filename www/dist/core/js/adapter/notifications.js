/**
 * notifications.js - Unified Notification & Alarm Adapter
 * Abstracts background scheduling across platforms.
 * 
 * FIXES APPLIED:
 * 1. Deterministic numeric ID generation (fixes duplicate notifications)
 * 2. ID mapping storage for reliable cancellation
 * 3. Uses 'on' scheduling for proper repeating notifications
 * 4. Adds allowWhileIdle for Doze mode compatibility
 * 5. Adds smallIcon configuration for proper notification icon
 * 6. Cancels existing notification before scheduling new one
 */

import { env } from './env.js';
import { storage } from './storage.js';

let webAlarms = [];
let webAlarmsInterval = null;

/**
 * Generates a deterministic numeric ID from any reminder ID.
 * This ensures the same reminder always gets the same numeric ID.
 * @param {string|number} id - Reminder ID (can be string or number)
 * @returns {number} A stable 32-bit integer ID
 */
function generateNumericId(id) {
    if (typeof id === 'number') {
        // Ensure it's within 32-bit signed integer range for Android
        return Math.abs(id) % 2147483647;
    }

    // Hash string to number using djb2 algorithm
    const str = String(id);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive and within Android's 32-bit int range
    return Math.abs(hash) % 2147483647;
}

export const notificationManager = {
    /**
     * Schedules a background alarm for a reminder.
     * @param {Object} reminder - Reminder object with timing info.
     */
    async schedule(reminder) {
        if (!reminder.timing || reminder.enabled === false) return;

        const alarmName = `reminder_${reminder.id}`;

        if (env.isMobile) {
            await this.scheduleMobile(reminder);
        } else if (env.isExtension) {
            await this.scheduleExtension(reminder, alarmName);
        } else if (env.isWeb) {
            await this.scheduleWeb(reminder);
        }
    },

    /**
     * Schedules a notification on mobile (Capacitor/Android/iOS).
     * @param {Object} reminder 
     */
    async scheduleMobile(reminder) {
        const { LocalNotifications } = window.Capacitor.Plugins;

        try {
            // Request permissions
            const permStatus = await LocalNotifications.requestPermissions();
            if (permStatus.display !== 'granted') {
                console.warn('[NotificationAdapter] Notification permission not granted');
                return;
            }

            // Generate deterministic numeric ID
            const numericId = generateNumericId(reminder.id);

            // Store the ID mapping for later cancellation
            await this.storeIdMapping(reminder.id, numericId);

            // Cancel any existing notification with this ID first (prevents duplicates)
            try {
                await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
            } catch (e) {
                // Ignore errors if notification doesn't exist
            }

            // Parse time
            const [hours, minutes] = (reminder.timing.time || '00:00').split(':').map(Number);

            // Build schedule options using 'on' for proper repeating
            let scheduleOptions;

            if (reminder.timing.frequency === 'weekly' && reminder.timing.day !== undefined) {
                // Weekly notification on specific weekday
                // Capacitor Weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
                // JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
                // So we need to add 1 to convert
                const capacitorWeekday = reminder.timing.day + 1;

                scheduleOptions = {
                    on: {
                        weekday: capacitorWeekday,
                        hour: hours,
                        minute: minutes
                    },
                    allowWhileIdle: true
                };
            } else {
                // Daily notification
                scheduleOptions = {
                    on: {
                        hour: hours,
                        minute: minutes
                    },
                    allowWhileIdle: true
                };
            }

            // Schedule the notification
            await LocalNotifications.schedule({
                notifications: [{
                    id: numericId,
                    title: "مُذكِّر الوِرد اليومي",
                    body: `حان وقت قراءة: ${reminder.name}`,
                    schedule: scheduleOptions,
                    sound: 'default',
                    smallIcon: 'ic_stat_notification',
                    autoCancel: true,
                    extra: {
                        reminderId: reminder.id,
                        reminderName: reminder.name
                    }
                }]
            });

            console.log(`[NotificationAdapter] Scheduled mobile notification: ${reminder.name} (ID: ${numericId}) at ${hours}:${minutes.toString().padStart(2, '0')}`);
        } catch (e) {
            console.error('[NotificationAdapter] Mobile notification failed:', e);
        }
    },

    /**
     * Schedules an alarm on browser extension (Chrome/Firefox).
     * @param {Object} reminder 
     * @param {string} alarmName 
     */
    async scheduleExtension(reminder, alarmName) {
        const api = typeof browser !== 'undefined' ? browser : chrome;
        const nextTime = this.calculateNextTime(reminder);
        const period = reminder.timing.frequency === 'daily' ? 1440 : 10080;

        // Clear existing alarm first
        await api.alarms.clear(alarmName);

        await api.alarms.create(alarmName, {
            when: nextTime,
            periodInMinutes: period
        });
        console.log(`[NotificationAdapter] Scheduled extension alarm: ${alarmName} at ${new Date(nextTime)}`);
    },

    /**
     * Schedules a web-based notification (for PWA).
     * @param {Object} reminder 
     */
    async scheduleWeb(reminder) {
        const nextTime = this.calculateNextTime(reminder);
        const period = reminder.timing.frequency === 'daily' ? 1440 : 10080;

        // Cancel existing first
        this.webCancel(reminder.id);

        webAlarms.push({
            id: reminder.id,
            name: reminder.name,
            nextTime: nextTime,
            period: period
        });
        this.startWebCheck();
        console.log(`[NotificationAdapter] Scheduled web alarm: ${reminder.name} at ${new Date(nextTime)}`);
    },

    /**
     * Cancels a scheduled alarm/notification.
     * @param {string|number} id - Reminder ID.
     */
    async cancel(id) {
        const alarmName = `reminder_${id}`;

        if (env.isMobile) {
            await this.cancelMobile(id);
        } else if (env.isExtension) {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            await api.alarms.clear(alarmName);
            console.log(`[NotificationAdapter] Cancelled extension alarm: ${alarmName}`);
        } else if (env.isWeb) {
            this.webCancel(id);
            console.log(`[NotificationAdapter] Cancelled web alarm: ${id}`);
        }
    },

    /**
     * Cancels a mobile notification using stored ID mapping.
     * @param {string|number} id 
     */
    async cancelMobile(id) {
        const { LocalNotifications } = window.Capacitor.Plugins;

        try {
            // Get the numeric ID from our mapping
            const numericId = await this.getNumericId(id);

            if (numericId !== null) {
                await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
                console.log(`[NotificationAdapter] Cancelled mobile notification: ${id} (numeric: ${numericId})`);

                // Remove the ID mapping
                await this.removeIdMapping(id);
            } else {
                // Fallback: try to cancel using generated ID
                const fallbackId = generateNumericId(id);
                await LocalNotifications.cancel({ notifications: [{ id: fallbackId }] });
                console.log(`[NotificationAdapter] Cancelled mobile notification (fallback): ${id} (numeric: ${fallbackId})`);
            }
        } catch (e) {
            console.error('[NotificationAdapter] Failed to cancel mobile notification:', e);
        }
    },

    /**
     * Stores the mapping between reminder ID and numeric ID.
     * @param {string|number} reminderId 
     * @param {number} numericId 
     */
    async storeIdMapping(reminderId, numericId) {
        const mappings = await storage.get('notification_id_mappings') || {};
        mappings[String(reminderId)] = numericId;
        await storage.set({ notification_id_mappings: mappings });
    },

    /**
     * Retrieves the numeric ID for a reminder.
     * @param {string|number} reminderId 
     * @returns {number|null}
     */
    async getNumericId(reminderId) {
        const mappings = await storage.get('notification_id_mappings') || {};
        const numericId = mappings[String(reminderId)];
        return numericId !== undefined ? numericId : null;
    },

    /**
     * Removes the ID mapping for a reminder.
     * @param {string|number} reminderId 
     */
    async removeIdMapping(reminderId) {
        const mappings = await storage.get('notification_id_mappings') || {};
        delete mappings[String(reminderId)];
        await storage.set({ notification_id_mappings: mappings });
    },

    /**
     * Cancels a web alarm.
     * @param {string|number} id 
     */
    webCancel(id) {
        webAlarms = webAlarms.filter(a => a.id !== id);
    },

    /**
     * Starts the web alarm check interval.
     */
    startWebCheck() {
        if (webAlarmsInterval) return;
        webAlarmsInterval = setInterval(() => {
            const now = Date.now();
            webAlarms.forEach(alarm => {
                if (now >= alarm.nextTime) {
                    this.triggerWebNotification(alarm);
                    // Reschedule for next period
                    alarm.nextTime += alarm.period * 60 * 1000;
                }
            });
        }, 30000); // Check every 30 seconds
    },

    /**
     * Triggers a web notification.
     * @param {Object} alarm 
     */
    triggerWebNotification(alarm) {
        if (!("Notification" in window)) {
            alert(`حان وقت وردك: ${alarm.name}`);
            return;
        }

        if (Notification.permission === "granted") {
            new Notification("مُذكِّر الوِرد اليومي", {
                body: `حان وقت قراءة: ${alarm.name}`,
                icon: 'core/assets/icons/icon128.png'
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.triggerWebNotification(alarm);
                }
            });
        }
    },

    /**
     * Calculates the next occurrence timestamp for a reminder.
     * Used for extension and web scheduling.
     * @param {Object} reminder 
     * @returns {number} Timestamp in ms
     */
    calculateNextTime(reminder) {
        if (!reminder.timing.time) return Date.now();

        const [hours, minutes] = reminder.timing.time.split(':').map(Number);
        let next = new Date();
        next.setHours(hours, minutes, 0, 0);

        if (next < Date.now()) {
            next.setDate(next.getDate() + 1);
        }

        if (reminder.timing.frequency === 'weekly' && reminder.timing.day !== undefined) {
            let diff = (reminder.timing.day - next.getDay() + 7) % 7;
            if (diff === 0 && next < Date.now()) diff = 7;
            next.setDate(next.getDate() + diff);
        }

        return next.getTime();
    },

    /**
     * Reschedules all active reminders.
     * Useful after app restart or permission changes.
     */
    async rescheduleAll() {
        if (!env.isMobile) return;

        try {
            const user_reminders = await storage.get('user_reminders') || [];
            const enabledReminders = user_reminders.filter(r => r.enabled !== false && r.timing);

            console.log(`[NotificationAdapter] Rescheduling ${enabledReminders.length} notifications...`);

            for (const reminder of enabledReminders) {
                await this.schedule(reminder);
            }

            console.log('[NotificationAdapter] All notifications rescheduled');
        } catch (e) {
            console.error('[NotificationAdapter] Failed to reschedule notifications:', e);
        }
    },

    /**
     * Lists all pending notifications (for debugging).
     */
    async listPending() {
        if (!env.isMobile) return [];

        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            const result = await LocalNotifications.getPending();
            console.log('[NotificationAdapter] Pending notifications:', result.notifications);
            return result.notifications;
        } catch (e) {
            console.error('[NotificationAdapter] Failed to list pending:', e);
            return [];
        }
    }
};
