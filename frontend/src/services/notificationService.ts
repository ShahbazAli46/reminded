import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './apiClient';
import { StorageService } from './storageService';
import type { TaskItem } from '../components/tasks/TaskRowCard';

let _notificationsEnabled = true;
let _notificationListener: Notifications.Subscription | null = null;
let _responseListener: Notifications.Subscription | null = null;
let _cachedFcmToken: string | null = null;

// 1. Configure OS notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: _notificationsEnabled,
    shouldPlaySound: _notificationsEnabled,
    shouldSetBadge: _notificationsEnabled,
  }),
});

export interface NotificationHandlers {
  onReceived?: (notification: Notifications.Notification) => void;
  onResponse?: (response: Notifications.NotificationResponse) => void;
}

/**
 * Helper: Formats an absolute UTC Date / ISO string into a friendly local timezone string
 * e.g. "Today · 5:00 PM", "Tomorrow · 10:00 AM", or "Fri, Oct 24 · 3:30 PM"
 */
export function formatLocalDueDate(dueAtInput: string | Date | undefined, fallbackText?: string): string {
  if (!dueAtInput) return fallbackText || 'Today · 5:00 PM';
  const d = typeof dueAtInput === 'string' ? new Date(dueAtInput) : dueAtInput;
  if (isNaN(d.getTime())) return fallbackText || 'Today · 5:00 PM';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today · ${timeStr}`;
  if (isTomorrow) return `Tomorrow · ${timeStr}`;

  const dayName = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayName} · ${timeStr}`;
}

/**
 * Helper: Converts offset strings like "15 min", "5 min", "1 hour" into milliseconds
 */
function parseOffsetToMilliseconds(offsetStr: string): number {
  const clean = offsetStr.toLowerCase().trim();
  const match = clean.match(/^(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days)?/);
  if (!match) return 15 * 60 * 1000;

  const val = parseInt(match[1], 10);
  const unit = match[2] || 'm';

  if (unit.startsWith('h')) return val * 60 * 60 * 1000;
  if (unit.startsWith('d')) return val * 24 * 60 * 60 * 1000;
  return val * 60 * 1000;
}

export const NotificationService = {
  /**
   * Sync active notification preference
   */
  setNotificationsEnabled(enabled: boolean) {
    _notificationsEnabled = enabled;
  },

  isNotificationsEnabled(): boolean {
    return _notificationsEnabled;
  },

  getFcmToken(): string | null {
    return _cachedFcmToken;
  },

  /**
   * Setup Android notification channel (required for Android 8.0+)
   */
  async setupAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders & Tasks',
          description: 'High-priority alerts for incoming tasks, deadlines, and messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5B61D6',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (err) {
        console.warn('[NotificationService] Error setting up Android notification channel:', err);
      }
    }
  },

  /**
   * Request system notification permissions from iOS / Android
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('[NotificationService] Error requesting notification permissions:', err);
      return false;
    }
  },

  /**
   * Register for push notifications with intelligent Delta-Sync
   */
  async registerForPushNotifications(options?: { forceSync?: boolean }): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      await this.setupAndroidNotificationChannel();

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      let pushToken: string | null = null;
      try {
        const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
        if (deviceTokenResult && deviceTokenResult.data) {
          pushToken =
            typeof deviceTokenResult.data === 'string'
              ? deviceTokenResult.data
              : JSON.stringify(deviceTokenResult.data);
        }
      } catch {
        try {
          const expoTokenResult = await Notifications.getExpoPushTokenAsync();
          if (expoTokenResult && expoTokenResult.data) {
            pushToken = expoTokenResult.data;
          }
        } catch {
          pushToken = `dev_fcm_${Platform.OS}_${Date.now()}`;
        }
      }

      if (!pushToken) {
        pushToken = `fcm_${Platform.OS}_${Date.now()}`;
      }

      _cachedFcmToken = pushToken;

      const session = await StorageService.loadSession();
      const lastSyncedToken = session?.lastSyncedFcmToken;
      const isTokenChanged = lastSyncedToken !== pushToken;

      await StorageService.saveSession({ fcmToken: pushToken });

      if (!options?.forceSync && !isTokenChanged && lastSyncedToken) {
        console.log('⚡ [NotificationService] FCM token unchanged. Skipped server sync.');
        return pushToken;
      }

      console.log('🔄 [NotificationService] Syncing new/updated FCM token to backend...');
      const platformName = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      await api.registerFcmToken(pushToken, platformName).catch((apiErr) => {
        console.warn('[NotificationService] Backend FCM sync note:', apiErr.message);
      });

      await StorageService.saveSession({ lastSyncedFcmToken: pushToken });
      console.log('✅ [NotificationService] FCM token synced with server successfully.');

      return pushToken;
    } catch (err: any) {
      console.warn('[NotificationService] registerForPushNotifications note:', err.message);
      return _cachedFcmToken;
    }
  },

  /**
   * Schedule multi-trigger local reminder alarms:
   * 1. Exact due alarm at dueAt timestamp.
   * 2. Pre-reminder notifications for each remindBefore offset (e.g. 15m, 5m before).
   * 3. Prevents duplicates and guards against past timestamps.
   */
  async scheduleTaskReminders(
    task: TaskItem,
    customDueAt?: Date | string,
    customRemindBefore?: string[]
  ): Promise<string[]> {
    if (!_notificationsEnabled || Platform.OS === 'web') {
      return [];
    }

    try {
      // 1. Cancel any previous alarms for this task first (preventing duplicates)
      await this.cancelTaskReminders(task.id);

      // 2. Resolve due timestamp
      let dueTimestamp: number | null = null;
      if (customDueAt) {
        dueTimestamp = new Date(customDueAt).getTime();
      } else if (task.dueAt) {
        dueTimestamp = new Date(task.dueAt).getTime();
      }

      if (!dueTimestamp || isNaN(dueTimestamp)) {
        return [];
      }

      const now = Date.now();
      const scheduledIds: string[] = [];

      // 3. Schedule Exact Due Alarm (if in the future)
      if (dueTimestamp > now) {
        try {
          const dueAlarmId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Reminder: ${task.title}`,
              body: `Assigned by ${task.assignerName || 'a contact'}. Due right now!`,
              data: { taskId: task.id, type: 'reminder_alarm' },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: new Date(dueTimestamp),
          });
          if (dueAlarmId) scheduledIds.push(dueAlarmId);
        } catch (err) {
          console.warn('[NotificationService] Error scheduling exact due alarm:', err);
        }
      }

      // 4. Schedule Pre-Reminder Offsets (e.g., 15 min, 5 min before)
      const offsets = customRemindBefore || task.remindBefore || ['15 min', '5 min'];
      for (const offsetStr of offsets) {
        const offsetMs = parseOffsetToMilliseconds(offsetStr);
        const triggerTime = dueTimestamp - offsetMs;

        if (triggerTime > now) {
          try {
            const preAlarmId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `⏰ Upcoming: ${task.title} (in ${offsetStr})`,
                body: `Assigned by ${task.assignerName || 'a contact'}. Due at ${task.dueDateText || 'scheduled time'}.`,
                data: { taskId: task.id, type: 'reminder_alarm' },
                sound: 'default',
              },
              trigger: new Date(triggerTime),
            });
            if (preAlarmId) scheduledIds.push(preAlarmId);
          } catch (err) {
            console.warn(`[NotificationService] Error scheduling pre-alarm (${offsetStr}):`, err);
          }
        }
      }

      // 5. Persist scheduled notification IDs mapped to task.id
      if (scheduledIds.length > 0) {
        await StorageService.saveScheduledReminder(task.id, scheduledIds);
        console.log(`🔔 [NotificationService] Scheduled ${scheduledIds.length} alarms for task "${task.title}".`);
      }

      return scheduledIds;
    } catch (err) {
      console.warn('[NotificationService] Error in scheduleTaskReminders:', err);
      return [];
    }
  },

  /**
   * Cancel all pending scheduled reminder alarms for a specific taskId
   */
  async cancelTaskReminders(taskId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const scheduledIds = await StorageService.removeScheduledReminder(taskId);
      if (scheduledIds && scheduledIds.length > 0) {
        await Promise.allSettled(
          scheduledIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
        );
        console.log(`🔕 [NotificationService] Cancelled ${scheduledIds.length} alarms for task ${taskId}.`);
      }
    } catch (err) {
      console.warn('[NotificationService] Error cancelling task reminders:', err);
    }
  },

  /**
   * Reconcile local scheduled reminders on app boot:
   * Prunes past triggers and verifies active upcoming tasks have scheduled alarms.
   */
  async reconcileScheduledReminders(tasks: TaskItem[]): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const allReminders = await StorageService.loadScheduledReminders();
      const now = Date.now();

      for (const task of tasks) {
        const isUpcoming = task.status === 'Upcoming';
        const hasDueTime = task.dueAt ? new Date(task.dueAt).getTime() > now : false;

        if (isUpcoming && hasDueTime) {
          const existingIds = allReminders[task.id];
          if (!existingIds || existingIds.length === 0) {
            // Reschedule missing alarms
            await this.scheduleTaskReminders(task);
          }
        } else if (!isUpcoming) {
          // Cancel alarms for completed/cancelled tasks
          if (allReminders[task.id]) {
            await this.cancelTaskReminders(task.id);
          }
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error reconciling reminders:', err);
    }
  },

  /**
   * Core Handler: Ingests incoming push notification payload:
   * 1. Reconstructs TaskItem with local timezone formatting.
   * 2. Commits task to local persistent database.
   * 3. Dispatches to active Zustand store.
   * 4. Schedules local OS reminder alarms.
   */
  async handleIncomingTaskNotification(
    data: Record<string, any>,
    fallbackTitle?: string | null,
    fallbackBody?: string | null
  ): Promise<TaskItem | null> {
    try {
      const taskId = data.taskId || `task_${Date.now()}`;
      const title = data.title || fallbackTitle || 'New Reminder';
      const note = data.note || fallbackBody || '';
      const assignerName = data.senderName || 'A contact';
      const assignerInitials = data.senderInitials || assignerName.slice(0, 2).toUpperCase();

      let remindBeforeList: string[] = ['15 min', '5 min'];
      if (typeof data.remindBefore === 'string') {
        try {
          remindBeforeList = JSON.parse(data.remindBefore);
        } catch {}
      } else if (Array.isArray(data.remindBefore)) {
        remindBeforeList = data.remindBefore;
      }

      const isoDueAt = data.dueAt || undefined;
      const formattedDueText = formatLocalDueDate(isoDueAt, data.dueDateText);

      const taskItem: TaskItem = {
        id: taskId,
        title,
        note: note || undefined,
        assignerName,
        assignerInitials,
        assigneeName: data.assigneeName || 'Me',
        assigneeInitials: 'ME',
        isCreatedByMe: false,
        dueDateText: formattedDueText,
        dueAt: isoDueAt,
        remindBefore: remindBeforeList,
        priority: (data.priority as any) || 'Medium',
        status: 'Upcoming',
        deliveryStatus: 'delivered', // 2 ticks
        attachmentName: data.attachmentName || undefined,
        audioNoteDuration: data.audioNoteDuration || undefined,
      };

      // 1. Commit to persistent local database
      await StorageService.upsertLocalTask(taskItem);

      // 2. Send Delivery Acknowledgment back to backend (single tick -> double tick)
      api.ackTaskDelivered(taskId).catch(() => {
        StorageService.savePendingAck(taskId, 'delivered');
      });

      // 3. Schedule local reminder alarms
      await this.scheduleTaskReminders(taskItem);

      return taskItem;
    } catch (err) {
      console.warn('[NotificationService] Error handling incoming task push:', err);
      return null;
    }
  },

  /**
   * Drain any queued offline ACKs to the server
   */
  async flushPendingAcks(): Promise<void> {
    try {
      const pending = await StorageService.loadPendingAcks();
      const entries = Object.entries(pending);
      if (entries.length === 0) return;

      console.log(`📤 [NotificationService] Flushing ${entries.length} pending offline ACKs...`);
      for (const [taskId, ackType] of entries) {
        try {
          if (ackType === 'delivered') {
            await api.ackTaskDelivered(taskId);
          } else if (ackType === 'notified') {
            await api.ackTaskNotified(taskId);
          } else if (ackType === 'opened') {
            await api.markTaskRead(taskId);
          }
          await StorageService.removePendingAck(taskId);
        } catch {
          // Still offline, will retry on next check
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error flushing pending ACKs:', err);
    }
  },

  /**
   * Catch up on any scheduled reminder alarms that elapsed while phone was asleep/offline
   */
  async reconcileDueAlarms(tasks: TaskItem[]): Promise<void> {
    try {
      const now = Date.now();
      for (const task of tasks) {
        if (!task.isCreatedByMe && task.dueAt) {
          const dueTime = new Date(task.dueAt).getTime();
          if (
            !isNaN(dueTime) &&
            dueTime <= now &&
            task.deliveryStatus !== 'notified' &&
            task.deliveryStatus !== 'opened'
          ) {
            // Task has fired! Acknowledge notified state (3 ticks)
            task.deliveryStatus = 'notified';
            await StorageService.upsertLocalTask(task);
            api.ackTaskNotified(task.id).catch(() => {
              StorageService.savePendingAck(task.id, 'notified');
            });
          }
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error in reconcileDueAlarms:', err);
    }
  },

  /**
   * Initialize notification listeners
   */
  setupNotificationListeners(handlers?: NotificationHandlers): () => void {
    this.removeNotificationListeners();

    _notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = content.data as Record<string, any> | undefined;
      console.log('📩 [NotificationService] Received notification:', content.title, data);

      // If local reminder alarm fired on screen, immediately acknowledge notified state (3 ticks)
      if (data?.type === 'reminder_alarm' && data?.taskId) {
        api.ackTaskNotified(data.taskId).catch(() => {
          StorageService.savePendingAck(data.taskId, 'notified');
        });
      }

      if (!_notificationsEnabled) {
        return;
      }

      if (handlers?.onReceived) {
        handlers.onReceived(notification);
      }
    });

    _responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 [NotificationService] User tapped notification:', response.notification.request.content.title);

      if (handlers?.onResponse) {
        handlers.onResponse(response);
      }
    });

    return () => {
      this.removeNotificationListeners();
    };
  },

  removeNotificationListeners() {
    if (_notificationListener) {
      Notifications.removeNotificationSubscription(_notificationListener);
      _notificationListener = null;
    }
    if (_responseListener) {
      Notifications.removeNotificationSubscription(_responseListener);
      _responseListener = null;
    }
  },

  async presentNotification(params: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<string | null> {
    if (!_notificationsEnabled) {
      return null;
    }

    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data,
          sound: 'default',
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('[NotificationService] Could not present notification:', err);
      return null;
    }
  },

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (err) {
      console.warn('[NotificationService] Error cancelling notifications:', err);
    }
  },
};
