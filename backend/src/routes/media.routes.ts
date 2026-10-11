import type { FastifyPluginAsync } from 'fastify';
import { MediaController } from '../controllers/media.controller.js';
import { requireUserAuth } from '../middlewares/jwtAuth.middleware.js';

const mediaRoutes: FastifyPluginAsync = async (fastify) => {
  // All media routes require JWT user authentication
  fastify.addHook('preHandler', requireUserAuth);

  // Upload single file (e.g. audio note)
  fastify.post('/upload', MediaController.uploadMedia);
};

export default mediaRoutes;
