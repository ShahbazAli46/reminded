import type { FastifyPluginAsync } from 'fastify';
import appControlRoutes from './appControl.routes.js';
import authRoutes from './auth.routes.js';
import taskRoutes from './task.routes.js';
import contactRoutes from './contact.routes.js';
import syncRoutes from './sync.routes.js';
import mediaRoutes from './media.routes.js';

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // Health Check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'reminder-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // App Control & Remote Configuration
  await fastify.register(appControlRoutes, { prefix: '/v1/app-control' });

  // Authentication & E2EE Identity
  await fastify.register(authRoutes, { prefix: '/v1/auth' });

  // Tasks & Threaded Comments (E2EE Zero-Knowledge)
  await fastify.register(taskRoutes, { prefix: '/v1/tasks' });
  await fastify.register(taskRoutes, { prefix: '/v1/reminders' });

  // Contacts & Consent Gates (First-Contact, Block, Mute)
  await fastify.register(contactRoutes, { prefix: '/v1/contacts' });

  // Fast Offline Delta Sync
  await fastify.register(syncRoutes, { prefix: '/v1/sync' });

  // Media Uploads
  await fastify.register(mediaRoutes, { prefix: '/v1/media' });
};

export default apiRoutes;
