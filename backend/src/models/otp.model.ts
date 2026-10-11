import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { normalizePhoneNumber } from '../utils/crypto.utils.js';

export interface OtpRow extends RowDataPacket {
  id: number;
  phone_number: string;
  otp_code: string;
  expires_at: Date;
  verified: number;
  attempts: number;
  created_at: Date;
}

export class OtpModel {
  /**
   * Find any recently sent OTP within the cooldown window (e.g. 5 minutes)
   */
  static async findActiveByPhone(phoneNumber: string, cooldownMinutes = 5): Promise<OtpRow | null> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const [rows] = await pool.query<OtpRow[]>(
      `SELECT * FROM otps 
       WHERE phone_number = ? AND created_at > NOW() - INTERVAL ? MINUTE
       ORDER BY id DESC LIMIT 1`,
      [normalized, cooldownMinutes]
    );
    return rows[0] || null;
  }

  /**
   * Generates a new OTP, guaranteeing at most 1 active OTP per phone number
   */
  static async createOtp(phoneNumber: string, otpCode: string, validityMinutes = 5): Promise<OtpRow> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    // 1. Pre-send cleanup: delete any existing/pending OTPs for this phone
    await this.deleteByPhoneNumber(normalized);

    // 2. Insert single new OTP
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO otps (phone_number, otp_code, expires_at, verified, attempts)
       VALUES (?, ?, ?, 0, 0)`,
      [normalized, otpCode, expiresAt]
    );

    const [rows] = await pool.query<OtpRow[]>(
      'SELECT * FROM otps WHERE id = ?',
      [result.insertId]
    );

    return rows[0];
  }

  /**
   * Find unexpired active OTP for verification
   */
  static async findLatestActiveOtp(phoneNumber: string): Promise<OtpRow | null> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const [rows] = await pool.query<OtpRow[]>(
      `SELECT * FROM otps 
       WHERE phone_number = ? AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [normalized]
    );

    return rows[0] || null;
  }

  /**
   * Immediately delete OTP for a specific phone number
   */
  static async deleteByPhoneNumber(phoneNumber: string): Promise<void> {
    const normalized = normalizePhoneNumber(phoneNumber);
    await pool.query('DELETE FROM otps WHERE phone_number = ?', [normalized]);
  }

  /**
   * Immediately delete OTP by row id
   */
  static async deleteOtp(id: number): Promise<void> {
    await pool.query('DELETE FROM otps WHERE id = ?', [id]);
  }

  /**
   * Backward-compatible alias for deleteOtp
   */
  static async markVerified(id: number): Promise<void> {
    await this.deleteOtp(id);
  }

  /**
   * Increment failed attempts and return new attempt count
   */
  static async incrementAttempts(id: number): Promise<number> {
    await pool.query(
      'UPDATE otps SET attempts = attempts + 1 WHERE id = ?',
      [id]
    );
    const [rows] = await pool.query<OtpRow[]>(
      'SELECT attempts FROM otps WHERE id = ?',
      [id]
    );
    return rows[0]?.attempts || 0;
  }

  /**
   * Cluster-safe purge of expired/orphaned OTPs using dedicated connection advisory lock
   */
  static async purgeExpiredOtps(): Promise<number> {
    const conn = await pool.getConnection();
    try {
      const [lockRes]: any = await conn.query('SELECT GET_LOCK("otp_purge_lock", 0) AS locked;');
      if (lockRes[0]?.locked === 1) {
        try {
          const [res] = await conn.query<ResultSetHeader>('DELETE FROM otps WHERE expires_at < NOW();');
          return res.affectedRows;
        } finally {
          await conn.query('SELECT RELEASE_LOCK("otp_purge_lock");');
        }
      }
      return 0;
    } finally {
      conn.release();
    }
  }
}
