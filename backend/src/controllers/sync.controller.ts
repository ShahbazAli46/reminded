import type { FastifyRequest, FastifyReply } from 'fastify';
import { SyncService } from '../services/sync.service.js';

export class SyncController {
  /**
   * GET /api/v1/sync
   * Fast delta sync endpoint for offline-first clients
   */
  static async getDeltaSync(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const userPhone = request.user!.phoneNumber;
      const since = ((request.query as any)?.since as string) || null;

      const delta = await SyncService.getDelta({
        userId,
        userPhone,
        since,
      });

      reply.code(200).send({
        success: true,
        data: delta,
      });
    } catch (err: any) {
      throw err;
    }
  }
}
