import type { FastifyPluginAsync } from 'fastify';
import { SyncController } from '../controllers/sync.controller.js';
import { requireUserAuth } from '../middlewares/jwtAuth.middleware.js';

const syncRoutes: FastifyPluginAsync = async (fastify) => {
  // Sync requires JWT authentication
  fastify.addHook('preHandler', requireUserAuth);

  fastify.get('/', SyncController.getDeltaSync);
};

export default syncRoutes;
