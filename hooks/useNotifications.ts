/**
 * @file useNotifications.ts
 * @description
 * Capacitor 本地通知鉤子，支援自訂圖示與高重要性頻道。
 * - **【圖示】** 通知物件中新增了 `largeIcon` 屬性，並將 `smallIcon` 指向自訂的單色圖示 `ic_notification`，以符合 Android 規範並優化視覺。
 * - **【頻道】** 通知物件中新增了 `channelId: 'reminders'`，將所有提醒都發送到我們在 App.tsx 中定義好的高重要性頻道，以觸發橫幅彈出式通知。
 * - **【核心修正】** 為了提高在部分 Android 系統上的相容性，`scheduleDailyReminder` 函式已改回一次僅排程未來一天的通知。App 會在每次啟動時重新排程，確保提醒不中斷。
 * - **【最佳化】** `cancelDailyReminder` 函式會先取得所有待處理的通知，然後將它們全部取消，確保不會有舊的排程殘留。
 */
import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus, ActionPerformed } from '@capacitor/local-notifications';
import { DAILY_NOTIFICATION_QUOTES } from '../data.ts';

const NOTIFICATION_ID = 100; // The base ID for our notifications

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const useNotifications = () => {
    const notificationListener = useRef<any>(null);

    const checkPermissions = useCallback(async (): Promise<PermissionStatus> => {
        if (!Capacitor.isPluginAvailable('LocalNotifications')) return { display: 'denied' };
        return await LocalNotifications.checkPermissions();
    }, []);

    const requestPermissions = useCallback(async (): Promise<PermissionStatus> => {
        if (!Capacitor.isPluginAvailable('LocalNotifications')) return { display: 'denied' };
        return await LocalNotifications.requestPermissions();
    }, []);

    const cancelDailyReminder = useCallback(async () => {
        if (!Capacitor.isPluginAvailable('LocalNotifications')) return;
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                 await LocalNotifications.cancel({ 
                    notifications: pending.notifications.map(n => ({ id: n.id }))
                });
                console.log('Cancelled all pending notifications.');
            }
        } catch (error) {
             console.error('Error canceling notifications:', error);
        }
    }, []);

    const scheduleDailyReminder = useCallback(async (hour: number, minute: number): Promise<boolean> => {
        if (!Capacitor.isPluginAvailable('LocalNotifications')) return false;

        try {
            // First, clear any previously scheduled notifications
            await cancelDailyReminder();
            
            // Determine the starting date for the schedule
            const now = new Date();
            let scheduleDate = new Date();
            scheduleDate.setHours(hour, minute, 0, 0);

            // If the time has already passed for today, the first notification is for tomorrow
            if (scheduleDate <= now) {
                scheduleDate.setDate(scheduleDate.getDate() + 1);
            }

            await LocalNotifications.schedule({
                notifications: [{
                    id: NOTIFICATION_ID, // Use the base ID
                    title: '來自「好厝邊」的早安問候！',
                    body: getRandomItem(DAILY_NOTIFICATION_QUOTES),
                    schedule: {
                        at: scheduleDate,
                        allowWhileIdle: true,
                    },
                    smallIcon: 'res://drawable/ic_notification',
                    largeIcon: 'res://mipmap/ic_launcher',
                    channelId: 'reminders',
                }]
            });
            console.log(`Successfully scheduled a notification for: ${scheduleDate.toLocaleString()}`);
            return true;
        } catch (error) {
            console.error('Error scheduling daily reminder:', error);
            return false;
        }
    }, [cancelDailyReminder]);

    const reaffirmDailyReminder = useCallback(async (settings: { enabled: boolean; time: string; }) => {
        if (settings.enabled && Capacitor.isPluginAvailable('LocalNotifications')) {
            const permissions = await checkPermissions();
            if (permissions.display === 'granted') {
                console.log('Reaffirming daily reminder on app start...');
                const [hour, minute] = settings.time.split(':').map(Number);
                await scheduleDailyReminder(hour, minute);
            }
        }
    }, [scheduleDailyReminder, checkPermissions]);

    const removeNotificationListeners = useCallback(() => {
        if (notificationListener.current) {
            notificationListener.current.remove();
            notificationListener.current = null;
        }
    }, []);

    const initNotificationListeners = useCallback((callback: () => void) => {
        if (!Capacitor.isPluginAvailable('LocalNotifications')) return;
        removeNotificationListeners();
        LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
            if (callback) {
                callback();
            }
        }).then(handle => {
            notificationListener.current = handle;
        });
    }, [removeNotificationListeners]);

    return {
        checkPermissions,
        requestPermissions,
        scheduleDailyReminder,
        cancelDailyReminder,
        reaffirmDailyReminder,
        initNotificationListeners,
        removeNotificationListeners,
    };
};