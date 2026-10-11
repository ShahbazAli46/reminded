import type { FastifyPluginAsync } from 'fastify';
import { AppControlController } from '../controllers/appControl.controller.js';
import { requireAdminAuth } from '../middlewares/auth.middleware.js';

const appControlRoutes: FastifyPluginAsync = async (fastify) => {
  // Public: App launch status check (version + maintenance check)
  fastify.get('/', AppControlController.checkStatus);

  // Admin Protected: View & Update Remote Configuration
  fastify.get('/admin', { preHandler: [requireAdminAuth] }, AppControlController.getAdminConfig);
  fastify.post('/admin', { preHandler: [requireAdminAuth] }, AppControlController.updateAdminConfig);
};

export default appControlRoutes;
