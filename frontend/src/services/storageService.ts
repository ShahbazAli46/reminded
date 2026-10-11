import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TaskItem } from '../components/tasks/TaskRowCard';

const SESSION_STORAGE_KEY = 'remindd_user_session_v1';
const LOCAL_TASKS_STORAGE_KEY = 'remindd_local_tasks_db_v1';
const SCHEDULED_REMINDERS_KEY = 'remindd_scheduled_reminders_v1';
const PENDING_ACKS_STORAGE_KEY = 'remindd_pending_acks_v1';

export interface StoredSession {
  authToken: string | null;
  phoneNumber: string;
  profileName: string;
  currentUser: any | null;
  notificationsEnabled: boolean;
  fcmToken?: string | null;
  lastSyncedFcmToken?: string | null;
}

const memoryFallback: Record<string, string> = {};

const universalStorage = {
  getItem: async (k: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(k);
        }
      } else {
        // Native platforms: use SecureStore for small items or memoryFallback
        try {
          return await SecureStore.getItemAsync(k);
        } catch {
          return memoryFallback[k] || null;
        }
      }
    } catch {}
    return memoryFallback[k] || null;
  },
  setItem: async (k: string, v: string): Promise<void> => {
    try {
      memoryFallback[k] = v;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(k, v);
          return;
        }
      } else {
        try {
          await SecureStore.setItemAsync(k, v);
        } catch (err) {
          // If SecureStore hits size quota on native Android, fallback to in-memory/fallback
          memoryFallback[k] = v;
        }
      }
    } catch {}
  },
  removeItem: async (k: string): Promise<void> => {
    try {
      delete memoryFallback[k];
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(k);
          return;
        }
      } else {
        try {
          await SecureStore.deleteItemAsync(k);
        } catch {}
      }
    } catch {}
  },
};

export const StorageService = {
  // ==========================================
  // 1. User Session & Cryptographic Secrets
  // ==========================================
  async saveSession(session: Partial<StoredSession>): Promise<void> {
    try {
      const existing = await this.loadSession();
      const merged: StoredSession = {
        authToken: session.authToken !== undefined ? session.authToken : existing?.authToken || null,
        phoneNumber: session.phoneNumber !== undefined ? session.phoneNumber : existing?.phoneNumber || '',
        profileName: session.profileName !== undefined ? session.profileName : existing?.profileName || '',
        currentUser: session.currentUser !== undefined ? session.currentUser : existing?.currentUser || null,
        notificationsEnabled:
          session.notificationsEnabled !== undefined
            ? session.notificationsEnabled
            : existing?.notificationsEnabled ?? true,
        fcmToken: session.fcmToken !== undefined ? session.fcmToken : existing?.fcmToken || null,
        lastSyncedFcmToken:
          session.lastSyncedFcmToken !== undefined
            ? session.lastSyncedFcmToken
            : existing?.lastSyncedFcmToken || null,
      };

      const serialized = JSON.stringify(merged);
      await universalStorage.setItem(SESSION_STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('Could not save user session to storage:', e);
    }
  },

  async loadSession(): Promise<StoredSession | null> {
    try {
      const raw = await universalStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as StoredSession;
      }
    } catch (e) {
      console.warn('Could not load user session from storage:', e);
    }
    return null;
  },

  async clearSession(): Promise<void> {
    try {
      await universalStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not clear user session:', e);
    }
  },

  // ==========================================
  // 2. Local Database for Assigned & Created Tasks
  // ==========================================
  async saveLocalTasks(tasks: TaskItem[]): Promise<void> {
    try {
      const serialized = JSON.stringify(tasks);
      await universalStorage.setItem(LOCAL_TASKS_STORAGE_KEY, serialized);
    } catch (err) {
      console.warn('[StorageService] Error saving local tasks database:', err);
    }
  },

  async loadLocalTasks(): Promise<TaskItem[]> {
    try {
      const raw = await universalStorage.getItem(LOCAL_TASKS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as TaskItem[];
        }
      }
    } catch (err) {
      console.warn('[StorageService] Error loading local tasks database:', err);
    }
    return [];
  },

  /**
   * Idempotently insert or update a task record in the local database
   */
  async upsertLocalTask(task: TaskItem): Promise<TaskItem[]> {
    try {
      const currentTasks = await this.loadLocalTasks();
      const existingIndex = currentTasks.findIndex((t) => t.id === task.id);

      let updatedTasks: TaskItem[];
      if (existingIndex >= 0) {
        // Update in-place
        updatedTasks = [...currentTasks];
        updatedTasks[existingIndex] = {
          ...updatedTasks[existingIndex],
          ...task,
        };
      } else {
        // Prepend new incoming task to top of list
        updatedTasks = [task, ...currentTasks];
      }

      await this.saveLocalTasks(updatedTasks);
      return updatedTasks;
    } catch (err) {
      console.warn('[StorageService] Error upserting local task:', err);
      return [];
    }
  },

  /**
   * Auto-prune completed/cancelled tasks older than retentionDays (defaults to 7 days)
   */
  async pruneExpiredCompletedTasks(retentionDays: number = 7): Promise<TaskItem[]> {
    try {
      const currentTasks = await this.loadLocalTasks();
      if (currentTasks.length === 0) return [];

      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      const retainedTasks = currentTasks.filter((t) => {
        const isDone = t.status === 'Completed' || t.status === 'Cancelled';
        if (!isDone) return true; // keep all active tasks

        // Check completion timestamp
        if (t.completedAt) {
          const completedTimestamp = new Date(t.completedAt).getTime();
          if (!isNaN(completedTimestamp) && completedTimestamp < cutoffTime) {
            return false; // Prune expired task!
          }
        }
        return true;
      });

      if (retainedTasks.length !== currentTasks.length) {
        console.log(`🧹 [StorageService] Pruned ${currentTasks.length - retainedTasks.length} expired completed tasks (>7 days).`);
        await this.saveLocalTasks(retainedTasks);
      }
      return retainedTasks;
    } catch (err) {
      console.warn('[StorageService] Error pruning expired completed tasks:', err);
      return [];
    }
  },

  // ==========================================
  // 3. Local Scheduled Reminder Alarms Mappings
  // ==========================================
  async saveScheduledReminder(taskId: string, notificationIds: string[]): Promise<void> {
    try {
      const allReminders = await this.loadScheduledReminders();
      allReminders[taskId] = notificationIds;
      await universalStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(allReminders));
    } catch (err) {
      console.warn('[StorageService] Error saving scheduled reminder mapping:', err);
    }
  },

  async loadScheduledReminders(): Promise<Record<string, string[]>> {
    try {
      const raw = await universalStorage.getItem(SCHEDULED_REMINDERS_KEY);
      if (raw) {
        return JSON.parse(raw) as Record<string, string[]>;
      }
    } catch (err) {
      console.warn('[StorageService] Error loading scheduled reminders:', err);
    }
    return {};
  },

  async removeScheduledReminder(taskId: string): Promise<string[]> {
    try {
      const allReminders = await this.loadScheduledReminders();
      const ids = allReminders[taskId] || [];
      delete allReminders[taskId];
      await universalStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(allReminders));
      return ids;
    } catch (err) {
      console.warn('[StorageService] Error removing scheduled reminder mapping:', err);
      return [];
    }
  },

  // ==========================================
  // 4. Offline ACK Outbox & Retry Queue
  // ==========================================
  async savePendingAck(taskId: string, ackType: 'delivered' | 'notified' | 'opened'): Promise<void> {
    try {
      const allAcks = await this.loadPendingAcks();
      allAcks[taskId] = ackType;
      await universalStorage.setItem(PENDING_ACKS_STORAGE_KEY, JSON.stringify(allAcks));
    } catch (err) {
      console.warn('[StorageService] Error saving pending ACK:', err);
    }
  },

  async loadPendingAcks(): Promise<Record<string, 'delivered' | 'notified' | 'opened'>> {
    try {
      const raw = await universalStorage.getItem(PENDING_ACKS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as Record<string, 'delivered' | 'notified' | 'opened'>;
      }
    } catch (err) {
      console.warn('[StorageService] Error loading pending ACKs:', err);
    }
    return {};
  },

  async removePendingAck(taskId: string): Promise<void> {
    try {
      const allAcks = await this.loadPendingAcks();
      delete allAcks[taskId];
      await universalStorage.setItem(PENDING_ACKS_STORAGE_KEY, JSON.stringify(allAcks));
    } catch (err) {
      console.warn('[StorageService] Error removing pending ACK:', err);
    }
  },

  // ==========================================
  // 5. Global Teardown (On Logout)
  // ==========================================
  async clearAllLocalData(): Promise<void> {
    try {
      await universalStorage.removeItem(SESSION_STORAGE_KEY);
      await universalStorage.removeItem(LOCAL_TASKS_STORAGE_KEY);
      await universalStorage.removeItem(SCHEDULED_REMINDERS_KEY);
      await universalStorage.removeItem(PENDING_ACKS_STORAGE_KEY);
    } catch (err) {
      console.warn('[StorageService] Error during complete local data clear:', err);
    }
  },
};
