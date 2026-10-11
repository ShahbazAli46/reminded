import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hashPhoneNumber, normalizePhoneNumber } from '../utils/crypto.utils.js';

export interface UserRow extends RowDataPacket {
  id: number;
  phone_number: string;
  phone_hash: string;
  public_key: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  static async findById(id: number): Promise<UserRow | null> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  static async findByPhoneNumber(phone: string): Promise<UserRow | null> {
    const normalized = normalizePhoneNumber(phone);
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE phone_number = ? LIMIT 1',
      [normalized]
    );
    return rows[0] || null;
  }

  static async findByPhoneHash(phoneHash: string): Promise<UserRow | null> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE phone_hash = ? LIMIT 1',
      [phoneHash]
    );
    return rows[0] || null;
  }

  static async create(data: {
    phoneNumber: string;
    publicKey: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<UserRow> {
    const normalized = normalizePhoneNumber(data.phoneNumber);
    const phoneHash = hashPhoneNumber(normalized);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (phone_number, phone_hash, public_key, name, avatar_url)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), updated_at = CURRENT_TIMESTAMP`,
      [normalized, phoneHash, data.publicKey, data.name || null, data.avatarUrl || null]
    );

    const userId = result.insertId || (await this.findByPhoneNumber(normalized))?.id;
    return (await this.findById(userId!))!;
  }

  static async updateProfile(
    id: number,
    data: { name?: string; avatarUrl?: string; publicKey?: string }
  ): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      values.push(data.avatarUrl);
    }
    if (data.publicKey !== undefined) {
      fields.push('public_key = ?');
      values.push(data.publicKey);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async findByPhoneNumbers(phoneNumbers: string[]): Promise<UserRow[]> {
    if (!phoneNumbers || phoneNumbers.length === 0) return [];
    const normalized = phoneNumbers.map(normalizePhoneNumber);
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, phone_number, name, avatar_url, public_key
       FROM users
       WHERE phone_number IN (?)`,
      [normalized]
    );
    return rows;
  }

  static async registerDevice(data: {
    userId: number;
    fcmToken: string;
    platform?: 'ios' | 'android' | 'web';
  }): Promise<void> {
    // 1. Invalidate any prior user association for this hardware token (prevent push leaks across shared devices)
    await pool.query('DELETE FROM user_devices WHERE fcm_token = ?', [data.fcmToken]);

    // 2. Insert token for the current user
    await pool.query(
      `INSERT INTO user_devices (user_id, fcm_token, platform)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE platform = VALUES(platform), updated_at = CURRENT_TIMESTAMP`,
      [data.userId, data.fcmToken, data.platform || 'android']
    );

    // 3. Keep at most 5 active devices per user using indexed scan
    await pool.query(
      `DELETE FROM user_devices
       WHERE user_id = ? AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM user_devices WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5
         ) AS recent
       )`,
      [data.userId, data.userId]
    );
  }

  static async unregisterDevice(userId: number, fcmToken?: string): Promise<void> {
    if (fcmToken) {
      await pool.query(
        'DELETE FROM user_devices WHERE user_id = ? AND fcm_token = ?',
        [userId, fcmToken]
      );
    } else {
      await pool.query(
        'DELETE FROM user_devices WHERE user_id = ?',
        [userId]
      );
    }
  }
}
