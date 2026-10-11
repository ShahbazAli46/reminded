import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { config } from '../config/env.js';
import type { RowDataPacket } from 'mysql2';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NewTaskPushParams {
  receiverId: number;
  taskId: string;
  title: string;
  note?: string | null;
  senderName: string;
  senderPhone?: string | null;
  senderInitials?: string | null;
  assigneeName?: string | null;
  assigneePhone?: string | null;
  priority?: string | null;
  dueAt: Date | string;
  dueDateText?: string | null;
  remindBefore?: string[] | null;
  attachmentName?: string | null;
  audioNoteDuration?: string | null;
}

// In-memory cache for Google OAuth2 access token
let _cachedAccessToken: string | null = null;
let _tokenExpiresAt = 0;

export class FcmService {
  /**
   * Obtain Google OAuth2 access token for FCM HTTP v1 using native node:crypto (Zero external SDK)
   */
  private static async getGoogleAccessToken(): Promise<string | null> {
    const { projectId, clientEmail, privateKey } = config.firebase;
    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (_cachedAccessToken && now < _tokenExpiresAt - 60) {
      return _cachedAccessToken;
    }

    try {
      const header = { alg: 'RS256', typ: 'JWT' };
      const claimSet = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      };

      const base64UrlEncode = (obj: any) =>
        Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');

      const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(claimSet)}`;
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(unsignedToken);
      const signature = signer
        .sign(privateKey, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const jwt = `${unsignedToken}.${signature}`;

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('[FCM] OAuth2 token request failed:', errText);
        return null;
      }

      const data = (await res.json()) as { access_token: string; expires_in: number };
      _cachedAccessToken = data.access_token;
      _tokenExpiresAt = now + (data.expires_in || 3600);
      return _cachedAccessToken;
    } catch (err: any) {
      console.warn('[FCM] Error generating Google OAuth token:', err.message);
      return null;
    }
  }

  /**
   * Dispatch push notification to a specific device push token (FCM HTTP v1 or Expo Push Gateway)
   */
  private static async sendToToken(token: string, payload: PushNotificationPayload, userId: number): Promise<void> {
    // 1. If Expo Push Token (ExponentPushToken[...] / ExpoPushToken[...])
    if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) {
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify({
            to: token,
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            sound: 'default',
            priority: 'high',
            channelId: 'reminders',
            _displayInForeground: true,
          }),
        });

        if (!res.ok) {
          console.warn('[Expo Push] Gateway error response:', await res.text());
        }
      } catch (err: any) {
        console.warn('[Expo Push] Dispatch error:', err.message);
      }
      return;
    }

    // 2. Native FCM Token (FCM HTTP v1)
    const { projectId } = config.firebase;
    if (!projectId) {
      return;
    }

    const accessToken = await this.getGoogleAccessToken();
    if (!accessToken) {
      return;
    }

    try {
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      const fcmBody = {
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'reminders',
              sound: 'default',
              default_vibrate_timings: true,
              default_sound: true,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                sound: 'default',
                badge: 1,
                'content-available': 1,
              },
            },
          },
        },
      };

      const res = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmBody),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as any;
        const errCode = errJson?.error?.details?.[0]?.errorCode || errJson?.error?.status;
        console.warn(`[FCM] Send error for token (${token.slice(0, 10)}...):`, errCode || res.status);

        // Prune dead tokens from user_devices
        if (
          errCode === 'UNREGISTERED' ||
          errCode === 'NOT_FOUND' ||
          res.status === 404
        ) {
          pool.query('DELETE FROM user_devices WHERE user_id = ? AND fcm_token = ?', [userId, token]).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('[FCM] Native dispatch error:', err.message);
    }
  }

  /**
   * Send push notification and silent sync payload to all registered devices of a user
   */
  static async sendToUser(userId: number, payload: PushNotificationPayload): Promise<void> {
    try {
      const [devices] = await pool.query<RowDataPacket[]>(
        'SELECT fcm_token, platform FROM user_devices WHERE user_id = ?',
        [userId]
      );

      if (!devices || devices.length === 0) {
        return;
      }

      const tokens = devices.map((d) => d.fcm_token).filter(Boolean);
      await Promise.allSettled(
        tokens.map((tok) => this.sendToToken(tok, payload, userId))
      );
    } catch (err: any) {
      console.warn(`[FCM] Notification dispatch error for user ${userId}:`, err.message);
    }
  }

  /**
   * Broadcast rich task assignment alert to the receiver's devices
   */
  static async notifyNewTask(params: NewTaskPushParams): Promise<void> {
    const dueAtDate = typeof params.dueAt === 'string' ? new Date(params.dueAt) : params.dueAt;
    const isoDueAt = isNaN(dueAtDate.getTime()) ? new Date().toISOString() : dueAtDate.toISOString();

    // Sanitize and cap note to 500 characters to stay safely within FCM 4KB limit
    const notePreview = (params.note || '').slice(0, 500);

    const taskTitle = params.title || 'New Reminder';
    const sender = params.senderName || 'A contact';

    const dataPayload: Record<string, string> = {
      type: 'new_task',
      taskId: params.taskId,
      title: taskTitle,
      note: notePreview,
      senderName: sender,
      senderPhone: params.senderPhone || '',
      senderInitials: params.senderInitials || '',
      assigneeName: params.assigneeName || '',
      assigneePhone: params.assigneePhone || '',
      priority: params.priority || 'Medium',
      dueAt: isoDueAt,
      dueDateText: params.dueDateText || '',
      remindBefore: JSON.stringify(params.remindBefore || ['15 min', '5 min']),
      attachmentName: params.attachmentName || '',
      audioNoteDuration: params.audioNoteDuration || '',
      createdAt: new Date().toISOString(),
    };

    await this.sendToUser(params.receiverId, {
      title: `New reminder from ${sender}`,
      body: `${taskTitle}${notePreview ? ` · ${notePreview}` : ''}`,
      data: dataPayload,
    });
  }

  /**
   * Broadcast comment / chat message in task thread
   */
  static async notifyNewComment(params: {
    receiverId: number;
    taskId: string;
    senderName: string;
    messageType: string;
  }): Promise<void> {
    const preview =
      params.messageType === 'voice'
        ? '🎤 Sent a voice note'
        : params.messageType === 'image'
        ? '📷 Shared an image'
        : '💬 Sent a message';

    await this.sendToUser(params.receiverId, {
      title: `${params.senderName} commented on task`,
      body: preview,
      data: {
        type: 'new_comment',
        taskId: params.taskId,
      },
    });
  }

  /**
   * Broadcast task mutation (e.g. time edited or completed)
   */
  static async notifyTaskUpdate(params: {
    receiverId: number;
    taskId: string;
    title: string;
    body: string;
    newStatus?: string;
    newDueAt?: string;
  }): Promise<void> {
    await this.sendToUser(params.receiverId, {
      title: params.title,
      body: params.body,
      data: {
        type: 'task_update',
        taskId: params.taskId,
        status: params.newStatus || '',
        dueAt: params.newDueAt || '',
      },
    });
  }

  /**
   * Broadcast silent data-only push to update task tick state (sent -> delivered -> notified -> opened)
   */
  static async notifyTaskTickUpdate(params: {
    receiverId: number;
    taskId: string;
    readState: 'delivered' | 'notified' | 'opened';
  }): Promise<void> {
    await this.sendToUser(params.receiverId, {
      title: '',
      body: '',
      data: {
        type: 'task_tick_update',
        taskId: params.taskId,
        readState: params.readState,
      },
    });
  }
}
