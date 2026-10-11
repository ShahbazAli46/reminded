import type { FastifyReply } from 'fastify';
import type { GatewayResponseEnvelope } from '../middlewares/responseGateway.js';

/**
 * Standardized API Response Helper Class for Fastify
 * 
 * Provides static helper methods to send consistent, formatted responses
 * that pass through the central response gateway.
 */
export class ApiResponse {
  /**
   * Send a successful response
   */
  static success<T = any>(
    reply: FastifyReply,
    data?: T,
    message?: string,
    statusCode: number = 200,
    meta?: Record<string, any>
  ): FastifyReply {
    if (reply.sendSuccess) {
      return reply.sendSuccess(data, message, statusCode, meta);
    }
    const payload: GatewayResponseEnvelope<T> = {
      success: true,
      ...(message ? { message } : {}),
      ...(data !== undefined ? { data } : {}),
      ...(meta ? { meta } : {}),
    };
    return reply.code(statusCode).send(payload);
  }

  /**
   * Send an error response
   */
  static error(
    reply: FastifyReply,
    error: string | Error,
    statusCode: number = 400,
    details?: any
  ): FastifyReply {
    if (reply.sendError) {
      return reply.sendError(error, statusCode, details);
    }
    const errorMessage = error instanceof Error ? error.message : error;
    const payload: GatewayResponseEnvelope = {
      success: false,
      error: errorMessage,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && error.stack
        ? { stack: error.stack }
        : {}),
    };
    return reply.code(statusCode).send(payload);
  }

  /**
   * Send a paginated list response
   */
  static paginated<T = any>(
    reply: FastifyReply,
    items: T[],
    pagination: {
      page: number;
      limit: number;
      totalItems?: number;
      totalPages?: number;
      hasNext?: boolean;
    },
    message?: string,
    statusCode: number = 200
  ): FastifyReply {
    return ApiResponse.success(
      reply,
      items,
      message,
      statusCode,
      { pagination }
    );
  }

  /**
   * Send a custom payload with explicit status code
   */
  static send(
    reply: FastifyReply,
    payload: any,
    statusCode: number = 200
  ): FastifyReply {
    return reply.code(statusCode).send(payload);
  }
}
