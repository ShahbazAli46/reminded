import type { FastifyPluginAsync } from 'fastify';
import { ContactController } from '../controllers/contact.controller.js';
import { requireUserAuth } from '../middlewares/jwtAuth.middleware.js';

const contactRoutes: FastifyPluginAsync = async (fastify) => {
  // All contact routes require JWT user authentication
  fastify.addHook('preHandler', requireUserAuth);

  fastify.get('/requests', ContactController.getRequests);
  fastify.post('/respond', ContactController.respond);
  fastify.get('/blocked', ContactController.getBlocked);
  fastify.post('/block', ContactController.blockUser);
  fastify.post('/unblock', ContactController.unblockUser);
};

export default contactRoutes;
