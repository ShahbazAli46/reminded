import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type MessageType = 'text' | 'voice' | 'image' | 'system';
export type MessageReadState = 'sent' | 'delivered' | 'opened';

export interface CommentRow extends RowDataPacket {
  id: string;
  task_id: string;
  sender_id: number | null;
  is_system: number;
  message_type: MessageType;
  encrypted_content: string;
  content_iv: string;
  voice_duration_seconds: number | null;
  read_state: MessageReadState;
  created_at: Date;
  updated_at: Date;

  // Joined sender profile
  sender_name?: string | null;
  sender_avatar?: string | null;
}

export class CommentModel {
  /**
   * Create a new chat comment or system message
   */
  static async create(data: {
    id: string;
    taskId: string;
    senderId?: number | null;
    isSystem?: boolean;
    messageType?: MessageType;
    encryptedContent: string;
    contentIv: string;
    voiceDurationSeconds?: number | null;
  }): Promise<CommentRow> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO task_comments (
        id, task_id, sender_id, is_system, message_type,
        encrypted_content, content_iv, voice_duration_seconds, read_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [
        data.id,
        data.taskId,
        data.senderId || null,
        data.isSystem ? 1 : 0,
        data.messageType || 'text',
        data.encryptedContent,
        data.contentIv,
        data.voiceDurationSeconds || null,
      ]
    );

    const [rows] = await pool.query<CommentRow[]>(
      `SELECT c.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM task_comments c
       LEFT JOIN users u ON c.sender_id = u.id
       WHERE c.id = ? LIMIT 1`,
      [data.id]
    );

    return rows[0];
  }

  /**
   * Fetch comments for a task ordered chronologically with default limit of 50
   */
  static async findByTaskId(taskId: string, limit = 50, offset = 0): Promise<CommentRow[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const safeOffset = Math.max(0, offset);

    const [rows] = await pool.query<CommentRow[]>(
      `SELECT c.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM task_comments c
       LEFT JOIN users u ON c.sender_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [taskId, safeLimit, safeOffset]
    );

    return rows;
  }

  /**
   * Mark all unread comments in a task as opened by receiver
   */
  static async markOpened(taskId: string, viewerId: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE task_comments 
       SET read_state = 'opened', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = ? AND (sender_id != ? OR sender_id IS NULL) AND read_state != 'opened'`,
      [taskId, viewerId]
    );

    return result.affectedRows;
  }

  /**
   * Fetch delta comments for tasks assigned or created by the user since timestamp
   */
  static async findDeltaComments(
    userId: number,
    userPhone: string,
    since: Date
  ): Promise<CommentRow[]> {
    const [rows] = await pool.query<CommentRow[]>(
      `SELECT c.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM task_comments c
       INNER JOIN tasks t ON c.task_id = t.id
       LEFT JOIN users u ON c.sender_id = u.id
       WHERE (t.creator_id = ? OR t.assignee_id = ? OR t.assignee_phone = ?)
         AND c.updated_at > ?
       ORDER BY c.updated_at ASC`,
      [userId, userId, userPhone, since]
    );

    return rows;
  }
}
