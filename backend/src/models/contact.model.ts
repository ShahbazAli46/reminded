import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type RelationStatus = 'pending' | 'accepted' | 'declined' | 'blocked' | 'muted';

export interface ContactRelationRow extends RowDataPacket {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: RelationStatus;
  created_at: Date;
  updated_at: Date;

  // Joined user profiles
  sender_name?: string | null;
  sender_phone?: string;
  sender_avatar?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string;
}

export class ContactModel {
  /**
   * Get relation status between two users
   */
  static async getRelation(senderId: number, receiverId: number): Promise<ContactRelationRow | null> {
    const [rows] = await pool.query<ContactRelationRow[]>(
      'SELECT * FROM contacts_relations WHERE sender_id = ? AND receiver_id = ? LIMIT 1',
      [senderId, receiverId]
    );

    return rows[0] || null;
  }

  /**
   * Create or update relation status (e.g. accept, decline, block, mute)
   */
  static async setRelation(senderId: number, receiverId: number, status: RelationStatus): Promise<void> {
    await pool.query(
      `INSERT INTO contacts_relations (sender_id, receiver_id, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
      [senderId, receiverId, status]
    );
  }

  /**
   * List all pending incoming contact requests for a user
   */
  static async getPendingRequests(receiverId: number): Promise<ContactRelationRow[]> {
    const [rows] = await pool.query<ContactRelationRow[]>(
      `SELECT r.*, u.name AS sender_name, u.phone_number AS sender_phone, u.avatar_url AS sender_avatar
       FROM contacts_relations r
       JOIN users u ON r.sender_id = u.id
       WHERE r.receiver_id = ? AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [receiverId]
    );

    return rows;
  }

  /**
   * List blocked senders for a receiver
   */
  static async getBlockedUsers(receiverId: number): Promise<ContactRelationRow[]> {
    const [rows] = await pool.query<ContactRelationRow[]>(
      `SELECT r.*, u.name AS sender_name, u.phone_number AS sender_phone, u.avatar_url AS sender_avatar
       FROM contacts_relations r
       JOIN users u ON r.sender_id = u.id
       WHERE r.receiver_id = ? AND r.status = 'blocked'
       ORDER BY r.updated_at DESC`,
      [receiverId]
    );

    return rows;
  }

  /**
   * Check if a sender is blocked by a receiver
   */
  static async isBlocked(senderId: number, receiverId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM contacts_relations WHERE sender_id = ? AND receiver_id = ? AND status = 'blocked' LIMIT 1",
      [senderId, receiverId]
    );

    return rows.length > 0;
  }
}
