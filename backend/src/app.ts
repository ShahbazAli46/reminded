import Fastify, { type FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { responseGatewayPlugin } from './middlewares/responseGateway.js';
import { config } from './config/env.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // Security and utility plugins
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: false,
  });

  await app.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-api-key', 'x-maintenance-bypass'],
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Central Outgoing Response Gateway Plugin
  await app.register(responseGatewayPlugin);

  // Serve uploaded media files statically
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  // Root info route
  app.get('/', async () => {
    return {
      message: 'Reminder++ API is running.',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        appControl: '/api/v1/app-control',
      },
    };
  });

  // API Routes
  await app.register(routes, { prefix: '/api' });

  // 404 Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: `Not Found: ${request.method} ${request.url}`,
    });
  });

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  return app;
}

export default buildApp;
