import type { FastifyPluginAsync } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { requireUserAuth } from '../middlewares/jwtAuth.middleware.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Public auth endpoints
  fastify.post('/send-otp', AuthController.sendOtp);
  fastify.post('/verify-otp', AuthController.verifyOtp);

  // Protected endpoints (requires Bearer token)
  fastify.post('/check-number', { preHandler: [requireUserAuth] }, AuthController.checkNumber);
  fastify.post('/check-numbers', { preHandler: [requireUserAuth] }, AuthController.checkNumbers);
  fastify.get('/me', { preHandler: [requireUserAuth] }, AuthController.getMe);
  fastify.post('/profile', { preHandler: [requireUserAuth] }, AuthController.updateProfile);
  fastify.post('/fcm-token', { preHandler: [requireUserAuth] }, AuthController.registerFcmToken);
  fastify.delete('/fcm-token', { preHandler: [requireUserAuth] }, AuthController.unregisterFcmToken);
  fastify.post('/test-notification', { preHandler: [requireUserAuth] }, AuthController.sendTestNotification);
};

export default authRoutes;
