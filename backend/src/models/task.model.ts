import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { normalizePhoneNumber } from '../utils/crypto.utils.js';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus =
  | 'upcoming'
  | 'pending'
  | 'done_pending_confirmation'
  | 'completed'
  | 'cancelled';
export type ReadState = 'sent' | 'delivered' | 'notified' | 'opened';

export interface TaskRow extends RowDataPacket {
  id: string;
  creator_id: number;
  assignee_phone: string;
  assignee_id: number | null;
  title?: string | null;
  note?: string | null;
  attachment_url?: string | null;
  audio_note_url?: string | null;
  audio_note_duration?: string | null;
  encrypted_task_key_for_creator: string | null;
  encrypted_task_key_for_assignee: string | null;
  encrypted_payload: string | null;
  payload_iv: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: Date;
  read_state: ReadState;
  created_at: Date;
  updated_at: Date;

  // Joined user metadata
  creator_name?: string | null;
  creator_phone?: string;
  creator_avatar?: string | null;
  creator_public_key?: string;
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  assignee_public_key?: string;
}

export class TaskModel {
  /**
   * Insert a new task (supports both direct fields and Zero-Knowledge encryption)
   */
  static async create(data: {
    id: string;
    creatorId: number;
    assigneePhone: string;
    assigneeId?: number | null;
    title?: string | null;
    note?: string | null;
    attachmentUrl?: string | null;
    audioNoteUrl?: string | null;
    audioNoteDuration?: string | null;
    encryptedTaskKeyForCreator?: string | null;
    encryptedTaskKeyForAssignee?: string | null;
    encryptedPayload?: string | null;
    payloadIv?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueAt: Date;
  }): Promise<TaskRow> {
    const normalizedPhone = normalizePhoneNumber(data.assigneePhone);

    await pool.query<ResultSetHeader>(
      `INSERT INTO tasks (
        id, creator_id, assignee_phone, assignee_id,
        title, note, attachment_url, audio_note_url, audio_note_duration,
        encrypted_task_key_for_creator, encrypted_task_key_for_assignee,
        encrypted_payload, payload_iv, priority, status, due_at, read_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [
        data.id,
        data.creatorId,
        normalizedPhone,
        data.assigneeId || null,
        data.title || null,
        data.note || null,
        data.attachmentUrl || null,
        data.audioNoteUrl || null,
        data.audioNoteDuration || null,
        data.encryptedTaskKeyForCreator || null,
        data.encryptedTaskKeyForAssignee || null,
        data.encryptedPayload || null,
        data.payloadIv || null,
        data.priority || 'medium',
        data.status || 'upcoming',
        data.dueAt,
      ]
    );

    const created = await this.findById(data.id);
    return created!;
  }

  /**
   * Find task by ID with joined creator & assignee profiles
   */
  static async findById(id: string): Promise<TaskRow | null> {
    const [rows] = await pool.query<TaskRow[]>(
      `SELECT 
        t.*,
        uc.name AS creator_name,
        uc.phone_number AS creator_phone,
        uc.avatar_url AS creator_avatar,
        uc.public_key AS creator_public_key,
        ua.name AS assignee_name,
        ua.avatar_url AS assignee_avatar,
        ua.public_key AS assignee_public_key
      FROM tasks t
      LEFT JOIN users uc ON t.creator_id = uc.id
      LEFT JOIN users ua ON t.assignee_id = ua.id
      WHERE t.id = ? LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * Fetch tasks for a specific user with segmented filters
   */
  static async findUserTasks(params: {
    userId: number;
    userPhone: string;
    segment: 'assigned' | 'created';
    filter?: 'all' | 'upcoming' | 'pending' | 'completed';
    limit?: number;
    offset?: number;
  }): Promise<TaskRow[]> {
    const normalizedPhone = normalizePhoneNumber(params.userPhone);
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.segment === 'assigned') {
      conditions.push('(t.assignee_id = ? OR t.assignee_phone = ?)');
      values.push(params.userId, normalizedPhone);
    } else {
      conditions.push('t.creator_id = ?');
      values.push(params.userId);
    }

    if (params.filter && params.filter !== 'all') {
      if (params.filter === 'upcoming') {
        conditions.push("t.status = 'upcoming'");
      } else if (params.filter === 'pending') {
        conditions.push("t.status = 'pending'");
      } else if (params.filter === 'completed') {
        conditions.push("t.status IN ('completed', 'done_pending_confirmation')");
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 100;
    const offset = params.offset || 0;

    values.push(limit, offset);

    const [rows] = await pool.query<TaskRow[]>(
      `SELECT 
        t.*,
        uc.name AS creator_name,
        uc.phone_number AS creator_phone,
        uc.avatar_url AS creator_avatar,
        uc.public_key AS creator_public_key,
        ua.name AS assignee_name,
        ua.avatar_url AS assignee_avatar,
        ua.public_key AS assignee_public_key
      FROM tasks t
      LEFT JOIN users uc ON t.creator_id = uc.id
      LEFT JOIN users ua ON t.assignee_id = ua.id
      ${whereClause}
      ORDER BY t.due_at ASC, t.created_at DESC
      LIMIT ? OFFSET ?`,
      values
    );

    return rows;
  }

  /**
   * Update task status (lifecycle transitions)
   */
  static async updateStatus(id: string, status: TaskStatus): Promise<void> {
    await pool.query(
      'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
  }

  /**
   * Update task details (creator edits)
   */
  static async updateFields(
    id: string,
    data: {
      encryptedPayload?: string;
      payloadIv?: string;
      dueAt?: Date;
      priority?: TaskPriority;
      encryptedTaskKeyForAssignee?: string | null;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.encryptedPayload) {
      fields.push('encrypted_payload = ?');
      values.push(data.encryptedPayload);
    }
    if (data.payloadIv) {
      fields.push('payload_iv = ?');
      values.push(data.payloadIv);
    }
    if (data.dueAt) {
      fields.push('due_at = ?');
      values.push(data.dueAt);
    }
    if (data.priority) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.encryptedTaskKeyForAssignee !== undefined) {
      fields.push('encrypted_task_key_for_assignee = ?');
      values.push(data.encryptedTaskKeyForAssignee);
    }

    if (fields.length === 0) return;

    values.push(id);
    await pool.query(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }

  /**
   * Mark task read/delivery state with strictly monotonic forward progression:
   * sent (1) -> delivered (2) -> notified (3) -> opened (4)
   */
  static async updateReadState(id: string, readState: ReadState): Promise<void> {
    await pool.query(
      `UPDATE tasks 
       SET read_state = CASE 
         WHEN ? = 'opened' THEN 'opened'
         WHEN ? = 'notified' AND read_state IN ('sent', 'delivered') THEN 'notified'
         WHEN ? = 'delivered' AND read_state = 'sent' THEN 'delivered'
         ELSE read_state
       END,
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [readState, readState, readState, id]
    );
  }

  /**
   * Associate previously created tasks with a newly registered user account
   */
  static async claimUnregisteredTasks(phone: string, userId: number): Promise<number> {
    const normalized = normalizePhoneNumber(phone);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tasks 
       SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE assignee_phone = ? AND assignee_id IS NULL`,
      [userId, normalized]
    );
    return result.affectedRows;
  }

  /**
   * Fetch delta changes since timestamp for fast sync
   */
  static async findDeltaTasks(
    userId: number,
    userPhone: string,
    since: Date
  ): Promise<TaskRow[]> {
    const normalized = normalizePhoneNumber(userPhone);

    const [rows] = await pool.query<TaskRow[]>(
      `SELECT 
        t.*,
        uc.name AS creator_name,
        uc.phone_number AS creator_phone,
        uc.avatar_url AS creator_avatar,
        uc.public_key AS creator_public_key,
        ua.name AS assignee_name,
        ua.avatar_url AS assignee_avatar,
        ua.public_key AS assignee_public_key
      FROM tasks t
      LEFT JOIN users uc ON t.creator_id = uc.id
      LEFT JOIN users ua ON t.assignee_id = ua.id
      WHERE (t.creator_id = ? OR t.assignee_id = ? OR t.assignee_phone = ?)
        AND t.updated_at > ?
      ORDER BY t.updated_at ASC`,
      [userId, userId, normalized, since]
    );

    return rows;
  }
}
