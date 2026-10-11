import axios, { type AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as fzstd from 'fzstd';

// In development: adb reverse forwards 127.0.0.1:5001 to the Mac host
export const DEFAULT_API_URL = Platform.select({
  android: 'http://127.0.0.1:5001/api',
  ios: 'http://127.0.0.1:5001/api',
  web: 'http://127.0.0.1:5001/api',
  default: 'http://127.0.0.1:5001/api',
});

/**
 * ============================================================================
 * 📱 CENTRAL FRONTEND API CLIENT & RESPONSE GATEWAY
 * ============================================================================
 * 
 * This class is the single central gateway in the frontend for all HTTP API calls.
 * All UI screens and components call methods on the exported `api` singleton.
 * 
 * Features:
 * - Central request interceptor: Automatically injects Auth token & Accept-Encoding headers (zstd, gzip).
 * - Central response interceptor: Handles zstd decompression, telemetry, and unified error parsing.
 * - Clean methods mapped to every backend route.
 */
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: DEFAULT_API_URL,
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'zstd, gzip, deflate',
      },
    });

    // Request Interceptor (Gateway Out)
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor (Gateway In)
    this.client.interceptors.response.use(
      (response) => {
        // Handle zstd compressed payload if binary/raw string is returned
        const contentEncoding = response.headers?.['content-encoding'];
        if (contentEncoding === 'zstd' && response.data) {
          try {
            if (response.data instanceof Uint8Array) {
              const decompressed = fzstd.decompress(response.data);
              response.data = JSON.parse(new TextDecoder().decode(decompressed));
            } else if (typeof response.data === 'string' && response.data.startsWith('{')) {
              // Already parsed text JSON
              response.data = JSON.parse(response.data);
            }
          } catch (err) {
            console.warn('Frontend zstd decompression warning:', err);
          }
        }
        return response;
      },
      (error) => {
        // Centralized error normalization
        const serverError = error.response?.data?.error || error.response?.data?.message;
        const status = error.response?.status;
        const normalizedMessage = serverError || error.message || 'Network request failed';

        const customError = new Error(normalizedMessage);
        (customError as any).status = status;
        (customError as any).data = error.response?.data;
        return Promise.reject(customError);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.client.defaults.baseURL = url;
  }

  // App Control & Remote Configuration
  async checkAppControl(platform: 'ios' | 'android' | 'web', version: string) {
    const response = await this.client.get('/v1/app-control', {
      params: { platform, version },
    });
    return response.data;
  }

  // Auth: Send OTP
  async sendOtp(phoneNumber: string) {
    const response = await this.client.post('/v1/auth/send-otp', { phoneNumber });
    return response.data;
  }

  // Auth: Verify OTP
  async verifyOtp(params: {
    phoneNumber: string;
    otpCode: string;
    publicKey: string;
    platform?: 'ios' | 'android' | 'web';
    fcmToken?: string;
  }) {
    const response = await this.client.post('/v1/auth/verify-otp', params);
    if (response.data?.success && response.data?.data?.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  // Auth: Update Profile
  async updateProfile(params: { name?: string; avatarUrl?: string }) {
    const response = await this.client.post('/v1/auth/profile', params);
    return response.data;
  }

  // Auth: Get Current Profile
  async getMe() {
    const response = await this.client.get('/v1/auth/me');
    return response.data;
  }

  // Check if contact phone number is registered & get public key
  async checkNumber(phoneNumber: string) {
    const response = await this.client.post('/v1/auth/check-number', { phoneNumber });
    return response.data;
  }

  // Batch check contact phone numbers
  async checkNumbers(phoneNumbers: string[]) {
    const response = await this.client.post('/v1/auth/check-numbers', { phoneNumbers });
    return response.data;
  }

  // Device & Push Notifications: Register FCM token
  async registerFcmToken(fcmToken: string, platform?: 'ios' | 'android' | 'web') {
    const response = await this.client.post('/v1/auth/fcm-token', { fcmToken, platform });
    return response.data;
  }

  // Device & Push Notifications: Unregister FCM token on logout
  async unregisterFcmToken(fcmToken?: string) {
    const response = await this.client.delete('/v1/auth/fcm-token', { data: { fcmToken } });
    return response.data;
  }

  // Push Notification: Dispatch test notification
  async sendTestNotification(params?: { title?: string; body?: string; data?: Record<string, any> }) {
    const response = await this.client.post('/v1/auth/test-notification', params || {});
    return response.data;
  }

  // Tasks: Create Task (Supports direct fields & Zero-Knowledge E2EE)
  async createTask(data: {
    id?: string;
    title?: string;
    note?: string;
    details?: string;
    assigneePhone?: string;
    assigneeName?: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    audioNoteUrl?: string | null;
    audioNoteDuration?: string | null;
    encryptedTaskKeyForCreator?: string;
    encryptedTaskKeyForAssignee?: string | null;
    encryptedPayload?: string;
    payloadIv?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueAt?: string;
    dueDateText?: string;
    remindBefore?: string[];
  }) {
    const response = await this.client.post('/v1/tasks', data);
    return response.data;
  }

  // Alias: Save Reminder API
  async saveReminder(data: {
    id?: string;
    title: string;
    note?: string;
    details?: string;
    assigneePhone?: string;
    assigneeName?: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    audioNoteUrl?: string | null;
    audioNoteDuration?: string | null;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueAt?: string;
  }) {
    const response = await this.client.post('/v1/reminders', data);
    return response.data;
  }

  // Tasks: List Tasks with Segmented Control & Filters
  async getTasks(params?: {
    segment?: 'assigned' | 'created';
    filter?: 'all' | 'upcoming' | 'pending' | 'completed';
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get('/v1/tasks', { params });
    return response.data;
  }

  // Tasks: Get Task Details + Comments
  async getTaskDetails(taskId: string) {
    const response = await this.client.get(`/v1/tasks/${taskId}`);
    return response.data;
  }

  // Tasks: Update Status (Lifecycle Handshake)
  async updateTaskStatus(
    taskId: string,
    data: {
      status: 'upcoming' | 'pending' | 'done_pending_confirmation' | 'completed' | 'cancelled';
      systemMessageCiphertext?: string;
      systemMessageIv?: string;
    }
  ) {
    const response = await this.client.patch(`/v1/tasks/${taskId}/status`, data);
    return response.data;
  }

  // Tasks: Edit Task Details (Time/Date/Title)
  async updateTaskFields(
    taskId: string,
    data: {
      encryptedPayload?: string;
      payloadIv?: string;
      dueAt?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      systemMessageCiphertext?: string;
      systemMessageIv?: string;
    }
  ) {
    const response = await this.client.put(`/v1/tasks/${taskId}`, data);
    return response.data;
  }

  // Tasks: Mark Read / Opened (3 ticks / opened)
  async markTaskRead(taskId: string) {
    const response = await this.client.patch(`/v1/tasks/${taskId}/read`);
    return response.data;
  }

  // Tasks: Acknowledge Delivery (2 ticks)
  async ackTaskDelivered(taskId: string) {
    const response = await this.client.post(`/v1/tasks/${taskId}/delivery-ack`);
    return response.data;
  }

  // Tasks: Acknowledge Alarm Notification at Due Time (3 ticks)
  async ackTaskNotified(taskId: string) {
    const response = await this.client.post(`/v1/tasks/${taskId}/notified-ack`);
    return response.data;
  }

  // Comments: Post Comment in Task Thread
  async postComment(
    taskId: string,
    data: {
      id?: string;
      messageType?: 'text' | 'voice' | 'image' | 'system';
      encryptedContent: string;
      contentIv: string;
      voiceDurationSeconds?: number | null;
    }
  ) {
    const response = await this.client.post(`/v1/tasks/${taskId}/comments`, data);
    return response.data;
  }

  // Contacts: Pending First-Contact Requests
  async getContactRequests() {
    const response = await this.client.get('/v1/contacts/requests');
    return response.data;
  }

  // Contacts: Respond (Accept / Decline / Block / Mute)
  async respondContactRequest(senderId: number, action: 'accept' | 'decline' | 'block' | 'mute') {
    const response = await this.client.post('/v1/contacts/respond', { senderId, action });
    return response.data;
  }

  // Sync: Delta Synchronization
  async getDeltaSync(since?: string) {
    const response = await this.client.get('/v1/sync', { params: { since } });
    return response.data;
  }

  // Media: Upload File (e.g. voice notes)
  async uploadMedia(uri: string, mimeType: string = 'audio/m4a') {
    const formData = new FormData();
    // React Native's FormData expects this format for files
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: `audio_${Date.now()}.m4a`,
      type: mimeType,
    } as any);

    const response = await this.client.post('/v1/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const api = new ApiClient();
