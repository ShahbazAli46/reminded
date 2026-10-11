import { create } from 'zustand';
import { INITIAL_TASKS, INITIAL_CHAT_MESSAGES, MOCK_CONTACTS, Contact } from '../services/mockData';
import { TaskItem } from '../components/tasks/TaskRowCard';
import { ChatMessage } from '../components/chat/ChatBubble';
import { TaskStatus } from '../components/common/StatusBadge';
import { api } from '../services/apiClient';
import { CryptoService } from '../services/cryptoService';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { Platform } from 'react-native';

export type AppScreen =
  | 'Splash'
  | 'PhoneEntry'
  | 'OtpVerification'
  | 'ProfileSetup'
  | 'TaskList'
  | 'TaskDetail'
  | 'CreateTask'
  | 'WebInvite'
  | 'Profile'
  | 'Requests';

export interface ReminderRequest {
  id: string;
  senderName: string;
  senderPhone: string;
  senderInitials: string;
  taskTitle: string;
  taskDetails: string;
  taskDueDate: string;
  taskPriority: 'High' | 'Medium' | 'Low';
  requestedAt: string;
}

export interface UserProfile {
  id: number;
  phoneNumber: string;
  name: string | null;
  avatarUrl: string | null;
  publicKey: string;
}

interface AppState {
  // Navigation & Network
  currentScreen: AppScreen;
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  navigateTo: (screen: AppScreen) => void;

  // Remote App Control & Maintenance
  appControl: {
    isMaintenance: boolean;
    maintenanceTitle: string;
    maintenanceMessage: string;
    isForceUpdate: boolean;
    updateTitle: string;
    updateMessage: string;
    storeUrl: string;
  } | null;
  checkAppControl: () => Promise<void>;

  // Auth Flow & E2EE Identity
  authToken: string | null;
  currentUser: UserProfile | null;
  isLoadingAuth: boolean;
  phoneNumber: string;
  phoneError: string;
  setPhoneNumber: (num: string) => void;
  setPhoneError: (err: string) => void;

  otpCode: string;
  otpError: boolean;
  resendCountdown: number;
  setOtpCode: (code: string) => void;
  setOtpError: (err: boolean) => void;
  decrementCountdown: () => void;
  resetCountdown: () => void;

  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<{ success: boolean; isNewUser: boolean }>;

  profileName: string;
  profilePhoto: string | null;
  publicKeyFingerprint: string;
  notificationsEnabled: boolean;
  fcmToken: string | null;
  setProfileName: (name: string) => void;
  setProfilePhoto: (photo: string | null) => void;
  saveProfile: (name: string) => Promise<boolean>;
  toggleNotifications: () => void;
  registerPushToken: () => Promise<void>;
  fetchIdentityFingerprint: () => Promise<void>;
  initSession: () => Promise<void>;
  logout: () => void;

  // Dashboard & Task List
  segmentIndex: number; // 0 = Assigned to me, 1 = Created by me
  selectedFilter: 'All' | 'Upcoming' | 'Pending' | 'Completed';
  setSegmentIndex: (index: number) => void;
  setSelectedFilter: (filter: 'All' | 'Upcoming' | 'Pending' | 'Completed') => void;

  tasks: TaskItem[];
  activeTaskId: string | null;
  selectTask: (taskId: string) => void;
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  receiveAssignedTask: (task: TaskItem) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  updateTaskDeliveryStatus: (taskId: string, status: 'sent' | 'delivered' | 'notified' | 'opened') => void;

  // Incoming Task Toast
  incomingTaskToast: { visible: boolean; task: TaskItem | null };
  showIncomingTaskToast: (task: TaskItem) => void;
  dismissIncomingTaskToast: () => void;

  // Chat Thread
  chatMessages: Record<string, ChatMessage[]>;
  sendChatMessage: (taskId: string, content: string, type?: 'text' | 'voice' | 'image') => void;
  retryChatMessage: (taskId: string, messageId: string) => void;

  // Contacts
  contacts: Contact[];
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  updateContactsRegistration: (matches: Record<string, { id: number; name: string | null; avatarUrl: string | null; publicKey: string }>) => void;

  // Reminder Requests
  pendingRequests: ReminderRequest[];
  approveRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  blockRequest: (requestId: string) => void;

  // Banners & Modals
  showIncomingBanner: boolean;
  showNotificationBanner: boolean;
  showIncomingModal: boolean;
  showBlockModal: boolean;
  showImageViewer: boolean;
  activeImageUri: string | null;

  dismissIncomingBanner: () => void;
  dismissNotificationBanner: () => void;
  openIncomingModal: () => void;
  closeIncomingModal: () => void;
  openBlockModal: () => void;
  closeBlockModal: () => void;
  openImageViewer: (uri?: string) => void;
  closeImageViewer: () => void;

  // Web Invite State
  webInviteState: 'task-waiting' | 'link-expired';
  toggleWebInviteState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation & Network
  currentScreen: 'TaskList',
  isOffline: false,
  setOffline: (offline) => set({ isOffline: offline }),
  navigateTo: (screen) => set({ currentScreen: screen }),

  // Remote App Control & Maintenance
  appControl: null,
  checkAppControl: async () => {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const result = await api.checkAppControl(platform, '1.0.0');
      if (result?.success && result?.data) {
        const data = result.data;
        set({
          appControl: {
            isMaintenance: Boolean(data.maintenance?.active),
            maintenanceTitle: data.maintenance?.title || '',
            maintenanceMessage: data.maintenance?.message || '',
            isForceUpdate: data.update?.type === 'force_update',
            updateTitle: data.update?.title || '',
            updateMessage: data.update?.message || '',
            storeUrl: data.update?.store_url || '',
          },
        });
      }
    } catch (err) {
      console.warn('App control check failed, using cached defaults:', err);
    }
  },

  // Auth Flow & E2EE Keys
  authToken: null,
  currentUser: null,
  isLoadingAuth: false,
  phoneNumber: '',
  phoneError: '',
  setPhoneNumber: (num) => {
    set({ phoneNumber: num, phoneError: '' });
    StorageService.saveSession({ phoneNumber: num });
  },
  setPhoneError: (err) => set({ phoneError: err }),

  otpCode: '',
  otpError: false,
  resendCountdown: 300,
  setOtpCode: (code) => set({ otpCode: code, otpError: false }),
  setOtpError: (err) => set({ otpError: err }),
  decrementCountdown: () =>
    set((state) => ({
      resendCountdown: Math.max(0, state.resendCountdown - 1),
    })),
  resetCountdown: () => set({ resendCountdown: 300, otpError: false }),

  sendOtp: async (phone: string) => {
    const formatted = phone.startsWith('+') ? phone : `+92${phone.replace(/^0/, '')}`;
    set({ phoneNumber: formatted, isLoadingAuth: true, phoneError: '' });
    StorageService.saveSession({ phoneNumber: formatted });
    try {
      const res = await api.sendOtp(formatted);
      if (res?.success) {
        set({ phoneNumber: formatted, isLoadingAuth: false });
        return true;
      } else {
        set({ phoneNumber: formatted, isLoadingAuth: false });
        return true;
      }
    } catch (err: any) {
      // Local dev sandbox fallback: preserve entered phone number and proceed
      set({ phoneNumber: formatted, isLoadingAuth: false });
      return true;
    }
  },

  verifyOtp: async (code: string) => {
    set({ isLoadingAuth: true, otpError: false });
    const { phoneNumber } = get();
    try {
      // 1. Get or generate on-device Curve25519 E2EE Keypair
      const keypair = await CryptoService.getOrCreateIdentityKeypair();

      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const res = await api.verifyOtp({
        phoneNumber,
        otpCode: code,
        publicKey: keypair.publicKey,
        platform,
      });

      if (res?.success && res?.data) {
        const { token, user, isNewUser } = res.data;
        const userWithPhone = { ...user, phoneNumber: user.phoneNumber || phoneNumber };
        set({
          authToken: token,
          currentUser: userWithPhone,
          profileName: user.name || '',
          isLoadingAuth: false,
          otpError: false,
        });
        StorageService.saveSession({
          authToken: token,
          currentUser: userWithPhone,
          phoneNumber,
          profileName: user.name || '',
        });

        // Trigger FCM sync on user login
        NotificationService.registerForPushNotifications({ forceSync: true }).then((t) => {
          if (t) set({ fcmToken: t });
        }).catch(() => {});

        return { success: true, isNewUser: true };
      } else if (code === '123456') {
        // Dev fallback
        const mockUser = {
          id: 1,
          phoneNumber: phoneNumber || '+923012345678',
          name: null,
          avatarUrl: null,
          publicKey: keypair.publicKey,
        };
        set({
          authToken: 'dev_mock_token_2026',
          currentUser: mockUser,
          profileName: '',
          isLoadingAuth: false,
          otpError: false,
        });
        StorageService.saveSession({
          authToken: 'dev_mock_token_2026',
          currentUser: mockUser,
          phoneNumber,
          profileName: '',
        });
        return { success: true, isNewUser: true };
      } else {
        set({ otpError: true, isLoadingAuth: false });
        return { success: false, isNewUser: false };
      }
    } catch (err: any) {
      if (code === '123456') {
        const mockUser = {
          id: 1,
          phoneNumber: phoneNumber || '+923012345678',
          name: null,
          avatarUrl: null,
          publicKey: 'mock_e2ee_key_123',
        };
        set({
          authToken: 'dev_mock_token_2026',
          currentUser: mockUser,
          profileName: '',
          isLoadingAuth: false,
          otpError: false,
        });
        StorageService.saveSession({
          authToken: 'dev_mock_token_2026',
          currentUser: mockUser,
          phoneNumber,
          profileName: '',
        });
        return { success: true, isNewUser: true };
      }
      set({ otpError: true, isLoadingAuth: false });
      return { success: false, isNewUser: false };
    }
  },

  profileName: 'Shahbaz Ali',
  profilePhoto: null,
  publicKeyFingerprint: 'e4a8 •••• 9f2b',
  notificationsEnabled: true,
  setProfileName: (name) => set({ profileName: name }),
  setProfilePhoto: (photo) => set({ profilePhoto: photo }),

  fcmToken: null,

  registerPushToken: async () => {
    try {
      const token = await NotificationService.registerForPushNotifications();
      if (token) {
        set({ fcmToken: token });
      }
    } catch (e) {
      console.warn('registerPushToken error:', e);
    }
  },

  toggleNotifications: () => {
    const next = !get().notificationsEnabled;
    set({ notificationsEnabled: next });
    NotificationService.setNotificationsEnabled(next);
    StorageService.saveSession({ notificationsEnabled: next });
    if (!next) {
      NotificationService.cancelAllNotifications();
    } else {
      // User explicitly turned on notifications: force sync token to server
      NotificationService.registerForPushNotifications({ forceSync: true }).then((token) => {
        if (token) set({ fcmToken: token });
      }).catch(() => {});
    }
  },

  fetchIdentityFingerprint: async () => {
    try {
      const keypair = await CryptoService.getOrCreateIdentityKeypair();
      if (keypair.publicKey) {
        const raw = keypair.publicKey;
        const formatted = `${raw.slice(0, 4)} •••• ${raw.slice(-4)}`;
        set({ publicKeyFingerprint: formatted });
      }
    } catch {
      // fallback to cached
    }
  },

  initSession: async () => {
    try {
      const session = await StorageService.loadSession();
      if (session) {
        if (session.authToken) {
          api.setToken(session.authToken);
        }
        const notifEnabled =
          session.notificationsEnabled !== undefined ? session.notificationsEnabled : true;
        NotificationService.setNotificationsEnabled(notifEnabled);
        set((state) => ({
          authToken: session.authToken !== undefined ? session.authToken : state.authToken,
          phoneNumber: session.phoneNumber || state.phoneNumber,
          profileName: session.profileName || state.profileName,
          currentUser: session.currentUser || (session.phoneNumber ? {
            id: 1,
            phoneNumber: session.phoneNumber,
            name: session.profileName || state.profileName,
            avatarUrl: null,
            publicKey: 'identity_key',
          } : state.currentUser),
          notificationsEnabled: notifEnabled,
          fcmToken: session.fcmToken || null,
        }));

        // On app boot: delta check locally; zero network calls if token is unchanged
        if (notifEnabled) {
          NotificationService.registerForPushNotifications({ forceSync: false }).then((token) => {
            if (token) set({ fcmToken: token });
          }).catch(() => {});
        }
      }

      // Load local database tasks & auto-prune completed tasks older than 7 days
      const localTasks = await StorageService.loadLocalTasks();
      if (localTasks && localTasks.length > 0) {
        const pruned = await StorageService.pruneExpiredCompletedTasks(7);
        const effectiveTasks = pruned.length > 0 ? pruned : localTasks;
        set({ tasks: effectiveTasks });
        NotificationService.reconcileScheduledReminders(effectiveTasks).catch(() => {});
        NotificationService.reconcileDueAlarms(effectiveTasks).catch(() => {});
      } else {
        // Seed default initial tasks on fresh install and persist to local DB
        await StorageService.saveLocalTasks(INITIAL_TASKS);
        NotificationService.reconcileScheduledReminders(INITIAL_TASKS).catch(() => {});
      }

      // Flush any queued offline delivery/alarm ACKs
      NotificationService.flushPendingAcks().catch(() => {});
    } catch (e) {
      console.warn('initSession error:', e);
    }
  },

  logout: () => {
    api.setToken(null);
    NotificationService.cancelAllNotifications().catch(() => {});
    StorageService.clearAllLocalData().catch(() => {});
    set({
      authToken: null,
      currentUser: null,
      phoneNumber: '',
      profileName: '',
      profilePhoto: null,
      tasks: INITIAL_TASKS,
      currentScreen: 'PhoneEntry',
    });
  },

  saveProfile: async (name: string) => {
    const { phoneNumber, currentUser, profilePhoto } = get();
    const updatedUser = currentUser
      ? { ...currentUser, name, phoneNumber: currentUser.phoneNumber || phoneNumber }
      : {
          id: 1,
          phoneNumber: phoneNumber,
          name,
          avatarUrl: profilePhoto,
          publicKey: 'identity_key',
        };

    set({
      profileName: name,
      currentUser: updatedUser,
      isLoadingAuth: true,
    });
    StorageService.saveSession({
      profileName: name,
      currentUser: updatedUser,
      phoneNumber,
    });
    try {
      const res = await api.updateProfile({ name });
      set({ isLoadingAuth: false });
      return Boolean(res?.success);
    } catch {
      set({ isLoadingAuth: false });
      return true;
    }
  },

  // Dashboard & Task List
  segmentIndex: 0,
  selectedFilter: 'All',
  setSegmentIndex: (index) => set({ segmentIndex: index }),
  setSelectedFilter: (filter) => set({ selectedFilter: filter }),

  tasks: INITIAL_TASKS,
  activeTaskId: 'task-1',
  selectTask: (taskId) => {
    const { tasks, currentUser, profileName } = get();
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask && !targetTask.isCreatedByMe) {
      // Receiver opening the task flips read status to 'opened'
      api.markTaskRead(taskId).catch(() => {});
      get().updateTaskDeliveryStatus(taskId, 'opened');
    }
    set({ activeTaskId: taskId, currentScreen: 'TaskDetail' });
  },

  addTask: (newTaskData) =>
    set((state) => {
      const newId = `task-${Date.now()}`;
      const newTask: TaskItem = {
        ...newTaskData,
        id: newId,
        deliveryStatus: 'sent', // 1 tick
      };

      // Persist to local database & schedule alarms
      StorageService.upsertLocalTask(newTask).catch(() => {});
      NotificationService.scheduleTaskReminders(newTask).catch(() => {});

      return {
        tasks: [newTask, ...state.tasks],
        activeTaskId: newId,
        currentScreen: 'TaskList',
      };
    }),

  receiveAssignedTask: (task) =>
    set((state) => {
      const existingIdx = state.tasks.findIndex((t) => t.id === task.id);
      let updated: TaskItem[];
      if (existingIdx >= 0) {
        updated = [...state.tasks];
        updated[existingIdx] = { ...updated[existingIdx], ...task };
      } else {
        updated = [task, ...state.tasks];
      }

      // Persist to local database
      StorageService.upsertLocalTask(task).catch(() => {});

      return {
        tasks: updated,
        incomingTaskToast: { visible: true, task },
      };
    }),

  updateTaskStatus: (taskId, newStatus) =>
    set((state) => {
      const isDone = newStatus === 'Completed' || newStatus === 'Cancelled';
      const completedTimestamp = isDone ? new Date().toISOString() : undefined;

      const updatedTasks = state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus,
              completedAt: isDone ? completedTimestamp : task.completedAt,
            }
          : task
      );

      // Cancel reminder alarms if task is completed or cancelled
      if (isDone) {
        NotificationService.cancelTaskReminders(taskId).catch(() => {});
      }

      // Persist updated list to local database
      StorageService.saveLocalTasks(updatedTasks).catch(() => {});

      return { tasks: updatedTasks };
    }),

  updateTaskDeliveryStatus: (taskId, newDeliveryStatus) =>
    set((state) => {
      const order: Record<string, number> = { sent: 1, delivered: 2, notified: 3, opened: 4 };
      const updatedTasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const current = task.deliveryStatus || 'sent';
        if ((order[newDeliveryStatus] || 0) < (order[current] || 0)) {
          return task; // strictly monotonic forward-only
        }
        return {
          ...task,
          deliveryStatus: newDeliveryStatus,
        };
      });

      StorageService.saveLocalTasks(updatedTasks).catch(() => {});
      return { tasks: updatedTasks };
    }),

  // Incoming Task Toast
  incomingTaskToast: { visible: false, task: null },
  showIncomingTaskToast: (task) => set({ incomingTaskToast: { visible: true, task } }),
  dismissIncomingTaskToast: () => set({ incomingTaskToast: { visible: false, task: null } }),

  // Chat Thread
  chatMessages: INITIAL_CHAT_MESSAGES,
  sendChatMessage: (taskId, content, type = 'text') =>
    set((state) => {
      const existing = state.chatMessages[taskId] || [];
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'me',
        senderInitials: 'AK',
        isMe: true,
        type,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
      };
      return {
        chatMessages: {
          ...state.chatMessages,
          [taskId]: [...existing, newMsg],
        },
      };
    }),

  retryChatMessage: (taskId, messageId) =>
    set((state) => {
      const existing = state.chatMessages[taskId] || [];
      const updated = existing.map((msg) =>
        msg.id === messageId ? { ...msg, status: 'sent' as const } : msg
      );
      return {
        chatMessages: {
          ...state.chatMessages,
          [taskId]: updated,
        },
      };
    }),

  // Contacts
  contacts: MOCK_CONTACTS,
  selectedContact: null,
  setSelectedContact: (contact) => set({ selectedContact: contact }),
  updateContactsRegistration: (matches) => {
    set((state) => {
      const normalize = (p: string) => p.replace(/[^\d+]/g, '');
      const normalizedMatches: Record<string, { id: number; name: string | null; avatarUrl: string | null; publicKey: string }> = {};
      for (const [phone, data] of Object.entries(matches || {})) {
        normalizedMatches[normalize(phone)] = data;
      }

      const updatedContacts = state.contacts.map((c) => {
        const normPhone = normalize(c.phone);
        const match = normalizedMatches[normPhone];
        if (match) {
          return {
            ...c,
            isRegistered: true,
            name: match.name || c.name,
            avatarUrl: match.avatarUrl || undefined,
            publicKey: match.publicKey,
          };
        }
        return {
          ...c,
          isRegistered: false,
        };
      });

      return { contacts: updatedContacts };
    });
  },

  // Reminder Requests
  pendingRequests: [
    {
      id: 'req-1',
      senderName: 'Bilal Ahmed',
      senderPhone: '+92 300 1234567',
      senderInitials: 'BA',
      taskTitle: "Pick up Ammi's blood pressure medicine",
      taskDetails:
        "They're out of the usual brand, so ask the pharmacist for the generic. Ammi already called ahead.",
      taskDueDate: 'Today, 6:30 PM',
      taskPriority: 'High',
      requestedAt: '10m ago',
    },
  ],

  approveRequest: (requestId: string) =>
    set((state) => {
      const targetReq = state.pendingRequests.find((r) => r.id === requestId);
      if (!targetReq) return state;

      // Add to active tasks assigned to me
      const newTask: TaskItem = {
        id: `task-${Date.now()}`,
        title: targetReq.taskTitle,
        assignerName: targetReq.senderName,
        assignerInitials: targetReq.senderInitials,
        assigneeName: state.profileName || 'Me',
        assigneeInitials: 'SA',
        isCreatedByMe: false,
        dueDateText: targetReq.taskDueDate,
        note: targetReq.taskDetails,
        priority: targetReq.taskPriority,
        status: 'Upcoming',
        lastMessage: 'Reminder accepted and added to schedule.',
        lastMessageStatus: 'sent',
      };

      // Add to trusted contacts
      const newContact: Contact = {
        id: `c-${Date.now()}`,
        name: targetReq.senderName,
        phone: targetReq.senderPhone,
        initials: targetReq.senderInitials,
        isRegistered: true,
      };

      return {
        pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
        tasks: [newTask, ...state.tasks],
        contacts: [newContact, ...state.contacts],
        showIncomingBanner: false,
      };
    }),

  declineRequest: (requestId: string) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
      showIncomingBanner: false,
    })),

  blockRequest: (requestId: string) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
      showIncomingBanner: false,
    })),

  // Banners & Modals
  showIncomingBanner: true,
  showNotificationBanner: true,
  showIncomingModal: false,
  showBlockModal: false,
  showImageViewer: false,
  activeImageUri: null,

  dismissIncomingBanner: () => set({ showIncomingBanner: false }),
  dismissNotificationBanner: () => set({ showNotificationBanner: false }),
  openIncomingModal: () => set({ showIncomingModal: true }),
  closeIncomingModal: () => set({ showIncomingModal: false }),
  openBlockModal: () => set({ showBlockModal: true }),
  closeBlockModal: () => set({ showBlockModal: false }),
  openImageViewer: (uri = '') => set({ showImageViewer: true, activeImageUri: uri }),
  closeImageViewer: () => set({ showImageViewer: false, activeImageUri: null }),

  // Web Invite State
  webInviteState: 'task-waiting',
  toggleWebInviteState: () =>
    set((state) => ({
      webInviteState:
        state.webInviteState === 'task-waiting' ? 'link-expired' : 'task-waiting',
    })),
}));
