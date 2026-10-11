import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { UserModel } from '../models/user.model.js';
import { FcmService } from '../services/fcm.service.js';

const sendOtpSchema = z.object({
  phoneNumber: z.string().min(6).max(30),
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(6).max(30),
  otpCode: z.string().min(4).max(10),
  publicKey: z.string().min(10).max(256),
  fcmToken: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().max(500).optional(),
});

const checkNumberSchema = z.object({
  phoneNumber: z.string().min(6).max(30),
});

export class AuthController {
  /**
   * POST /api/v1/auth/send-otp
   */
  static async sendOtp(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { phoneNumber } = sendOtpSchema.parse(request.body);
      const result = await AuthService.sendOtp(phoneNumber);

      reply.code(200).send({
        success: true,
        message: 'Verification code sent successfully.',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/auth/verify-otp
   */
  static async verifyOtp(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const data = verifyOtpSchema.parse(request.body);
      const result = await AuthService.verifyOtp(data);

      reply.code(200).send({
        success: true,
        message: 'Phone number verified successfully.',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({
        success: false,
        error: err.message || 'OTP verification failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/profile
   */
  static async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const data = profileUpdateSchema.parse(request.body);
      const updated = await AuthService.updateProfile(userId, data);

      reply.code(200).send({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          id: updated.id,
          phoneNumber: updated.phone_number,
          name: updated.name,
          avatarUrl: updated.avatar_url,
          publicKey: updated.public_key,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      throw err;
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const user = await UserModel.findById(userId);

      if (!user) {
        reply.code(404).send({ success: false, error: 'User not found' });
        return;
      }

      reply.code(200).send({
        success: true,
        data: {
          id: user.id,
          phoneNumber: user.phone_number,
          name: user.name,
          avatarUrl: user.avatar_url,
          publicKey: user.public_key,
        },
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * POST /api/v1/auth/check-number
   */
  static async checkNumber(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { phoneNumber } = checkNumberSchema.parse(request.body);
      const result = await AuthService.checkPhoneNumber(phoneNumber);

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/auth/check-numbers
   * Batch check multiple phone numbers in one fast indexed query
   */
  static async checkNumbers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { phoneNumbers } = z
        .object({
          phoneNumbers: z.array(z.string().min(5).max(30)).max(5000),
        })
        .parse(request.body);

      const result = await AuthService.checkPhoneNumbers(phoneNumbers);

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/auth/fcm-token
   * Register or update user device push token (FCM / APNs)
   */
  static async registerFcmToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { fcmToken, platform } = z
        .object({
          fcmToken: z.string().min(5),
          platform: z.enum(['ios', 'android', 'web']).optional(),
        })
        .parse(request.body);

      await UserModel.registerDevice({
        userId,
        fcmToken,
        platform: platform || 'android',
      });

      reply.code(200).send({
        success: true,
        message: 'FCM device token registered successfully.',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      throw err;
    }
  }

  /**
   * DELETE /api/v1/auth/fcm-token
   * Unregister user device push token on logout
   */
  static async unregisterFcmToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { fcmToken } = z
        .object({
          fcmToken: z.string().optional(),
        })
        .parse(request.body || {});

      await UserModel.unregisterDevice(userId, fcmToken);

      reply.code(200).send({
        success: true,
        message: 'Device push token unregistered successfully.',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/auth/test-notification
   * Dispatch a test push notification to user's registered devices
   */
  static async sendTestNotification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { title, body, data } = (request.body as any) || {};

      await FcmService.sendToUser(userId, {
        title: title || 'Reminder Alert',
        body: body || 'Your notification receiving service is active!',
        data: data || { type: 'test' },
      });

      reply.code(200).send({
        success: true,
        message: 'Test notification triggered.',
      });
    } catch (err: any) {
      throw err;
    }
  }
}
