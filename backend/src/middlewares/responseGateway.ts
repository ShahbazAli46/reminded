import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import zlib from 'zlib';
import { init as initZstdWasm, compress as compressZstdWasm } from '@bokuweb/zstd-wasm';

// Asynchronously initialize WebAssembly Zstandard engine on module load
let isZstdReady = false;
initZstdWasm()
  .then(() => {
    isZstdReady = true;
  })
  .catch((err) => {
    console.warn('⚠️ Zstandard Wasm engine init warning (falling back to gzip/brotli):', err?.message || err);
  });

/**
 * Standard Envelope / Gateway Response Interface
 */
export interface GatewayResponseEnvelope<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
  meta?: Record<string, any>;
  [key: string]: any;
}

/**
 * Type augmentations for Fastify
 */
declare module 'fastify' {
  interface FastifyReply {
    sendSuccess<T = any>(
      data?: T,
      message?: string,
      statusCode?: number,
      meta?: Record<string, any>
    ): FastifyReply;

    sendError(
      error: string | Error,
      statusCode?: number,
      details?: any
    ): FastifyReply;

    bypassGateway(): FastifyReply;
  }

  interface FastifyRequest {
    _startTime?: number;
  }
}

/**
 * Minimum response size in bytes to trigger compression.
 * Payloads smaller than 512 bytes are sent uncompressed to avoid compression header overhead.
 */
const COMPRESSION_MIN_THRESHOLD_BYTES = 512;

/**
 * Compresses an outgoing payload buffer using content negotiation.
 * Prioritizes: zstd -> br (brotli) -> gzip -> deflate -> uncompressed.
 */
function compressBuffer(
  buffer: Buffer,
  acceptEncodingHeader?: string
): { data: Buffer | Uint8Array; encoding: string | null } {
  if (!acceptEncodingHeader || buffer.length < COMPRESSION_MIN_THRESHOLD_BYTES) {
    return { data: buffer, encoding: null };
  }

  const encodings = acceptEncodingHeader.toLowerCase();

  // 1. Zstandard (zstd) - Meta's ultra-fast compression algorithm
  if (isZstdReady && encodings.includes('zstd')) {
    try {
      const compressed = compressZstdWasm(buffer, 3);
      return { data: Buffer.from(compressed), encoding: 'zstd' };
    } catch (e) {
      console.warn('Zstandard compression error, falling back:', e);
    }
  }

  // 2. Brotli (br) - Google's web compression
  if (encodings.includes('br')) {
    try {
      const compressed = zlib.brotliCompressSync(buffer);
      return { data: compressed, encoding: 'br' };
    } catch (e) {
      // Fallback
    }
  }

  // 3. Gzip - Universally supported mobile fallback
  if (encodings.includes('gzip')) {
    try {
      const compressed = zlib.gzipSync(buffer);
      return { data: compressed, encoding: 'gzip' };
    } catch (e) {
      // Fallback
    }
  }

  // 4. Deflate
  if (encodings.includes('deflate')) {
    try {
      const compressed = zlib.deflateSync(buffer);
      return { data: compressed, encoding: 'deflate' };
    } catch (e) {
      // Fallback
    }
  }

  return { data: buffer, encoding: null };
}

/**
 * Process outgoing response before serialization
 */
export function processOutgoingResponse(
  payload: any,
  request: FastifyRequest,
  reply: FastifyReply
): any {
  if (payload === undefined || payload === null) {
    return payload;
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  return { ...payload };
}

/**
 * Fastify plugin for the central Response Gateway
 */
const responseGatewayPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decorate FastifyReply
  fastify.decorateReply('bypassGateway', function (this: FastifyReply) {
    (this as any)._bypassGateway = true;
    return this;
  });

  fastify.decorateReply('sendSuccess', function <T = any>(
    this: FastifyReply,
    data?: T,
    message?: string,
    statusCode: number = 200,
    meta?: Record<string, any>
  ) {
    const envelope: GatewayResponseEnvelope<T> = {
      success: true,
      ...(message ? { message } : {}),
      ...(data !== undefined ? { data } : {}),
      ...(meta ? { meta } : {}),
    };
    return this.code(statusCode).send(envelope);
  });

  fastify.decorateReply('sendError', function (
    this: FastifyReply,
    error: string | Error,
    statusCode: number = 400,
    details?: any
  ) {
    const errorMessage = error instanceof Error ? error.message : error;
    const envelope: GatewayResponseEnvelope = {
      success: false,
      error: errorMessage,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && error.stack
        ? { stack: error.stack }
        : {}),
    };
    return this.code(statusCode).send(envelope);
  });

  // Track request arrival time
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request._startTime = Date.now();
  });

  // Intercept before sending to client
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Latency headers
    const durationMs = request._startTime ? Date.now() - request._startTime : 0;
    reply.header('X-Response-Time', `${durationMs}ms`);
    reply.header('X-Server-Timestamp', new Date().toISOString());

    if ((reply as any)._bypassGateway) {
      return payload;
    }

    if (!payload) {
      return payload;
    }

    // If payload is already a string or buffer (serialized JSON or static text)
    let buffer: Buffer;
    if (typeof payload === 'string') {
      buffer = Buffer.from(payload, 'utf-8');
    } else if (Buffer.isBuffer(payload)) {
      buffer = payload;
    } else {
      return payload;
    }

    const acceptEncoding = request.headers['accept-encoding'] as string | undefined;
    const { data: finalData, encoding } = compressBuffer(buffer, acceptEncoding);

    if (encoding) {
      reply.header('Content-Encoding', encoding);
      reply.header('Vary', 'Accept-Encoding');
    }

    return finalData;
  });
};

export const responseGatewayPlugin = responseGatewayPluginAsync;
export default responseGatewayPlugin;
