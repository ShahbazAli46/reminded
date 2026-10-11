import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthenticatedUser {
  userId: number;
  phoneNumber: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function requireUserAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (config.nodeEnv === 'development') {
      request.user = {
        userId: 1,
        phoneNumber: '+923001234567',
      };
      return;
    }
    reply.code(401).send({
      success: false,
      error: 'Unauthorized: Missing or invalid Bearer token',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    request.user = decoded;
  } catch (err: any) {
    if (config.nodeEnv === 'development') {
      request.user = {
        userId: 1,
        phoneNumber: '+923001234567',
      };
      return;
    }
    reply.code(401).send({
      success: false,
      error: 'Unauthorized: Session token has expired or is invalid',
    });
  }
}
