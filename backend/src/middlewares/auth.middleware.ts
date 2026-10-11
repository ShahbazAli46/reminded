import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/env.js';

export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers['x-admin-api-key'] || request.headers['authorization'];

  if (!authHeader) {
    reply.code(401).send({
      success: false,
      error: 'Unauthorized: Missing Admin API Key (x-admin-api-key header required)',
    });
    return;
  }

  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (token !== config.adminApiKey) {
    reply.code(403).send({
      success: false,
      error: 'Forbidden: Invalid Admin API Key',
    });
    return;
  }
}
