import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppControlService } from '../services/appControl.service.js';

const appControlQuerySchema = z.object({
  platform: z.enum(['ios', 'android', 'web']).optional(),
  version: z.string().optional(),
});

const updateConfigSchema = z.object({
  maintenance_mode: z.number().int().min(0).max(1).optional(),
  maintenance_title: z.string().max(255).optional(),
  maintenance_message: z.string().optional(),
  maintenance_bypass_key: z.string().max(255).optional(),

  min_version_android: z.string().max(50).optional(),
  latest_version_android: z.string().max(50).optional(),
  store_url_android: z.string().url().or(z.string().max(500)).optional(),

  min_version_ios: z.string().max(50).optional(),
  latest_version_ios: z.string().max(50).optional(),
  store_url_ios: z.string().url().or(z.string().max(500)).optional(),

  min_version_web: z.string().max(50).optional(),
  latest_version_web: z.string().max(50).optional(),

  force_update_title: z.string().max(255).optional(),
  force_update_message: z.string().optional(),
  soft_update_title: z.string().max(255).optional(),
  soft_update_message: z.string().optional(),

  announcement_enabled: z.number().int().min(0).max(1).optional(),
  announcement_type: z.enum(['info', 'warning', 'urgent']).optional(),
  announcement_title: z.string().max(255).optional(),
  announcement_message: z.string().optional(),

  features_json: z.record(z.boolean()).optional(),
});

export class AppControlController {
  /**
   * Public endpoint called on mobile / client launch
   * GET /api/v1/app-control?platform=ios&version=1.0.0
   */
  static async checkStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = appControlQuerySchema.parse(request.query);
      const bypassKey =
        (request.headers['x-maintenance-bypass'] as string) ||
        (request.query as any)?.bypass_key;

      const status = await AppControlService.evaluateAppStatus({
        platform: parsed.platform,
        version: parsed.version,
        bypassKey,
      });

      reply.code(200).send({
        success: true,
        data: status,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      throw err;
    }
  }

  /**
   * Admin endpoint to get current raw configuration
   * GET /api/v1/app-control/admin
   */
  static async getAdminConfig(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const config = await AppControlService.getRawConfig();
      reply.code(200).send({
        success: true,
        data: config,
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Admin endpoint to update remote app configuration
   * POST /api/v1/app-control/admin
   */
  static async updateAdminConfig(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const validatedData = updateConfigSchema.parse(request.body);
      const updated = await AppControlService.updateConfig(validatedData as any);

      reply.code(200).send({
        success: true,
        message: 'App configuration updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      throw err;
    }
  }
}
