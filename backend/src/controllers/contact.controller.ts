import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ContactService } from '../services/contact.service.js';

const respondSchema = z.object({
  senderId: z.number().int().positive(),
  action: z.enum(['accept', 'decline', 'block', 'mute']),
});

const blockSchema = z.object({
  targetUserId: z.number().int().positive(),
});

export class ContactController {
  /**
   * GET /api/v1/contacts/requests
   */
  static async getRequests(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const requests = await ContactService.getPendingRequests(userId);

      reply.code(200).send({
        success: true,
        data: requests,
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * POST /api/v1/contacts/respond
   */
  static async respond(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { senderId, action } = respondSchema.parse(request.body);

      await ContactService.respondToRequest(userId, senderId, action);

      reply.code(200).send({
        success: true,
        message: `Contact request ${action}ed successfully`,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to respond to request' });
    }
  }

  /**
   * GET /api/v1/contacts/blocked
   */
  static async getBlocked(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const blocked = await ContactService.getBlockedUsers(userId);

      reply.code(200).send({
        success: true,
        data: blocked,
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * POST /api/v1/contacts/block
   */
  static async blockUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { targetUserId } = blockSchema.parse(request.body);

      await ContactService.blockUser(userId, targetUserId);

      reply.code(200).send({
        success: true,
        message: 'User blocked successfully',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to block user' });
    }
  }

  /**
   * POST /api/v1/contacts/unblock
   */
  static async unblockUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { targetUserId } = blockSchema.parse(request.body);

      await ContactService.unblockUser(userId, targetUserId);

      reply.code(200).send({
        success: true,
        message: 'User unblocked successfully',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to unblock user' });
    }
  }
}
