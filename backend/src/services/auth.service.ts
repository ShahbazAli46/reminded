import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { pool } from '../config/database.js';
import { OtpModel } from '../models/otp.model.js';
import { UserModel, type UserRow } from '../models/user.model.js';
import { normalizePhoneNumber, hashPhoneNumber } from '../utils/crypto.utils.js';

export interface SendOtpResult {
  phoneNumber: string;
  expiresInSeconds: number;
  devCode?: string;
}

export interface VerifyOtpResult {
  token: string;
  user: {
    id: number;
    phoneNumber: string;
    name: string | null;
    avatarUrl: string | null;
    publicKey: string;
  };
  isNewUser: boolean;
}

export class AuthService {
  /**
   * Generates and dispatches a 6-digit verification OTP
   * Enforces 5-minute cooldown between requests in production
   */
  static async sendOtp(phoneNumber: string): Promise<SendOtpResult> {
    const normalized = normalizePhoneNumber(phoneNumber);

    // 5-minute cooldown check (bypassed in development mode for rapid testing)
    const isDev = config.nodeEnv === 'development' || config.nodeEnv === 'test';
    if (!isDev) {
      const activeOtp = await OtpModel.findActiveByPhone(normalized, 5);
      if (activeOtp) {
        const elapsedSecs = Math.floor((Date.now() - new Date(activeOtp.created_at).getTime()) / 1000);
        const remainingSecs = Math.max(1, 300 - elapsedSecs);
        throw new Error(`Please wait ${remainingSecs} seconds before requesting a new code.`);
      }
    }

    // Generate random 6-digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB (5 min validity, pre-cleans previous code)
    await OtpModel.createOtp(normalized, otpCode, 5);

    return {
      phoneNumber: normalized,
      expiresInSeconds: 300,
      devCode: isDev ? otpCode : undefined,
    };
  }

  /**
   * Verifies OTP, handles E2EE Public Key registration, and creates/returns user session
   * Enforces 5-attempt brute-force lockout and immediate OTP destruction
   */
  static async verifyOtp(data: {
    phoneNumber: string;
    otpCode: string;
    publicKey: string;
    fcmToken?: string;
    platform?: 'ios' | 'android' | 'web';
  }): Promise<VerifyOtpResult> {
    const normalized = normalizePhoneNumber(data.phoneNumber);
    const enteredCode = data.otpCode.trim();

    // Dev bypass test code '123456' allowed in development
    const isDevBypass = (config.nodeEnv === 'development' || config.nodeEnv === 'test') && enteredCode === '123456';

    if (!isDevBypass) {
      const activeOtp = await OtpModel.findLatestActiveOtp(normalized);

      if (!activeOtp) {
        throw new Error('No active verification code found or code has expired. Please request a new one.');
      }

      if (activeOtp.otp_code !== enteredCode) {
        const attempts = await OtpModel.incrementAttempts(activeOtp.id);
        if (attempts >= 5) {
          // Lock out and invalidate code after 5 failed attempts
          await OtpModel.deleteByPhoneNumber(normalized);
          throw new Error('Too many failed attempts. This code has been invalidated. Please request a new one.');
        }
        const remaining = 5 - attempts;
        throw new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }
    }

    // Check if user already exists
    let user = await UserModel.findByPhoneNumber(normalized);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await UserModel.create({
        phoneNumber: normalized,
        publicKey: data.publicKey,
      });
    } else {
      // Update public key if the user has a new device keypair
      if (data.publicKey && user.public_key !== data.publicKey) {
        user = await UserModel.updateProfile(user.id, { publicKey: data.publicKey }) || user;
      }
      if (!user.name) {
        isNewUser = true;
      }
    }

    // Register FCM Device push token if provided
    if (data.fcmToken) {
      await UserModel.registerDevice({
        userId: user.id,
        fcmToken: data.fcmToken,
        platform: data.platform,
      });
    }

    // Sign JWT session token (valid for 90 days)
    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phone_number,
      },
      config.jwtSecret,
      { expiresIn: '90d' }
    );

    // Atomic destruction: Delete OTP immediately upon successful session issuance
    if (!isDevBypass) {
      await OtpModel.deleteByPhoneNumber(normalized);
    }

    return {
      token,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        avatarUrl: user.avatar_url,
        publicKey: user.public_key,
      },
      isNewUser,
    };
  }

  /**
   * Check if a contact phone number is registered and return their E2EE Public Key
   */
  static async checkPhoneNumber(phoneNumber: string): Promise<{
    isRegistered: boolean;
    user: { id: number; name: string | null; avatarUrl: string | null; publicKey: string } | null;
  }> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const user = await UserModel.findByPhoneNumber(normalized);

    if (!user) {
      return { isRegistered: false, user: null };
    }

    return {
      isRegistered: true,
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatar_url,
        publicKey: user.public_key,
      },
    };
  }

  /**
   * Batch check contact phone numbers using a single dedicated database connection
   * Iterates in 500-item chunks to avoid connection pool starvation and parameter limits
   */
  static async checkPhoneNumbers(phoneNumbers: string[]): Promise<
    Record<string, { id: number; name: string | null; avatarUrl: string | null; publicKey: string }>
  > {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return {};
    }

    const conn = await pool.getConnection();
    try {
      const result: Record<
        string,
        { id: number; name: string | null; avatarUrl: string | null; publicKey: string }
      > = {};

      const CHUNK_SIZE = 500;
      for (let i = 0; i < phoneNumbers.length; i += CHUNK_SIZE) {
        const chunk = phoneNumbers.slice(i, i + CHUNK_SIZE).map(normalizePhoneNumber);
        if (chunk.length === 0) continue;

        const [rows] = await conn.query<UserRow[]>(
          `SELECT id, phone_number, name, avatar_url, public_key
           FROM users
           WHERE phone_number IN (?)`,
          [chunk]
        );

        for (const u of rows) {
          result[u.phone_number] = {
            id: u.id,
            name: u.name,
            avatarUrl: u.avatar_url,
            publicKey: u.public_key,
          };
        }
      }

      return result;
    } finally {
      conn.release();
    }
  }

  /**
   * Update authenticated user profile
   */
  static async updateProfile(userId: number, data: { name?: string; avatarUrl?: string }): Promise<UserRow> {
    const updated = await UserModel.updateProfile(userId, data);
    if (!updated) {
      throw new Error('User not found');
    }
    return updated;
  }
}
