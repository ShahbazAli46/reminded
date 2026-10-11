import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error(error);

  if (error instanceof z.ZodError) {
    reply.code(400).send({
      success: false,
      error: 'Validation failed',
      details: error.errors,
    });
    return;
  }

  const statusCode = (error as any).statusCode || (error as any).status || 500;
  const message = error.message || 'Internal Server Error';

  reply.code(statusCode).send({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
