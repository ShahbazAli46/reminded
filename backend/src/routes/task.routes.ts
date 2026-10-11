import type { FastifyPluginAsync } from 'fastify';
import { TaskController } from '../controllers/task.controller.js';
import { requireUserAuth } from '../middlewares/jwtAuth.middleware.js';

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  // All task routes require JWT user authentication
  fastify.addHook('preHandler', requireUserAuth);

  // List & Create
  fastify.get('/', TaskController.getTasks);
  fastify.post('/', TaskController.createTask);

  // Detail & Modifications
  fastify.get('/:id', TaskController.getTaskDetails);
  fastify.put('/:id', TaskController.updateFields);
  fastify.patch('/:id/status', TaskController.updateStatus);
  fastify.patch('/:id/read', TaskController.markRead);
  fastify.post('/:id/delivery-ack', TaskController.ackDelivered);
  fastify.post('/:id/notified-ack', TaskController.ackNotified);

  // Comments
  fastify.post('/:id/comments', TaskController.postComment);
};

export default taskRoutes;
