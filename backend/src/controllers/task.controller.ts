import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TaskService } from '../services/task.service.js';
import { CommentService } from '../services/comment.service.js';

const createTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  details: z.string().optional(),
  note: z.string().optional(),
  assigneePhone: z.string().min(5).max(30).optional(),
  assigneeName: z.string().optional(),
  attachmentUrl: z.string().nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  audioNoteUrl: z.string().nullable().optional(),
  audioNoteDuration: z.string().nullable().optional(),
  encryptedTaskKeyForCreator: z.string().nullable().optional(),
  encryptedTaskKeyForAssignee: z.string().nullable().optional(),
  encryptedPayload: z.string().nullable().optional(),
  payloadIv: z.string().nullable().optional(),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent', 'Low', 'Medium', 'High', 'Urgent'])
    .optional(),
  dueAt: z.string().optional(),
  dueDateText: z.string().optional(),
  remindBefore: z.array(z.string()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['upcoming', 'pending', 'done_pending_confirmation', 'completed', 'cancelled']),
  systemMessageCiphertext: z.string().optional(),
  systemMessageIv: z.string().optional(),
});

const updateFieldsSchema = z.object({
  encryptedPayload: z.string().optional(),
  payloadIv: z.string().optional(),
  dueAt: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  systemMessageCiphertext: z.string().optional(),
  systemMessageIv: z.string().optional(),
});

const postCommentSchema = z.object({
  id: z.string().optional(),
  messageType: z.enum(['text', 'voice', 'image', 'system']).optional(),
  encryptedContent: z.string().min(1),
  contentIv: z.string().min(8),
  voiceDurationSeconds: z.number().nullable().optional(),
});

export class TaskController {
  /**
   * POST /api/v1/tasks & POST /api/v1/reminders
   * Save a reminder / task with full support for plaintext & E2EE fields
   */
  static async createTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const userPhone = request.user!.phoneNumber || '+923001234567';
      const parsed = createTaskSchema.parse(request.body);

      const title = parsed.title || 'Reminder';
      const note = parsed.note || parsed.details || '';
      const priorityNormalized = (parsed.priority
        ? parsed.priority.toLowerCase()
        : 'medium') as 'low' | 'medium' | 'high' | 'urgent';

      const assigneePhone = parsed.assigneePhone || userPhone;

      let dueAtDate: Date;
      if (parsed.dueAt) {
        dueAtDate = new Date(parsed.dueAt);
        if (isNaN(dueAtDate.getTime())) {
          dueAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
      } else {
        dueAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // If encryptedPayload was not provided, auto-pack payload for backward compatibility
      const encryptedPayload =
        parsed.encryptedPayload ||
        JSON.stringify({
          title,
          details: note,
          attachmentName: parsed.attachmentName || null,
          audioDuration: parsed.audioNoteDuration || null,
        });

      const payloadIv = parsed.payloadIv || 'plain_iv_00000000';
      const encryptedTaskKeyForCreator =
        parsed.encryptedTaskKeyForCreator || 'plain_task_key_hex';

      const result = await TaskService.createTask({
        id: parsed.id,
        creatorId: userId,
        assigneePhone,
        assigneeName: parsed.assigneeName || null,
        title,
        note,
        attachmentUrl: parsed.attachmentUrl || parsed.attachmentName || null,
        audioNoteUrl: parsed.audioNoteUrl || null,
        audioNoteDuration: parsed.audioNoteDuration || null,
        encryptedTaskKeyForCreator,
        encryptedTaskKeyForAssignee: parsed.encryptedTaskKeyForAssignee || null,
        encryptedPayload,
        payloadIv,
        priority: priorityNormalized,
        dueAt: dueAtDate,
        dueDateText: parsed.dueDateText || null,
        remindBefore: parsed.remindBefore || null,
      });

      reply.code(201).send({
        success: true,
        message: 'Reminder saved successfully',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to save reminder' });
    }
  }

  /**
   * GET /api/v1/tasks
   */
  static async getTasks(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const userPhone = request.user!.phoneNumber;
      const query = (request.query as any) || {};
      const segment = (query.segment as 'assigned' | 'created') || 'assigned';
      const filter = (query.filter as 'all' | 'upcoming' | 'pending' | 'completed') || 'all';
      const limit = query.limit ? parseInt(query.limit as string, 10) : 100;
      const offset = query.offset ? parseInt(query.offset as string, 10) : 0;

      const tasks = await TaskService.getUserTasks({
        userId,
        userPhone,
        segment,
        filter,
        limit,
        offset,
      });

      reply.code(200).send({
        success: true,
        data: tasks,
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * GET /api/v1/tasks/:id
   */
  static async getTaskDetails(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };
      const query = (request.query as any) || {};
      const limit = query.limit ? parseInt(query.limit as string, 10) : 50;
      const offset = query.offset ? parseInt(query.offset as string, 10) : 0;

      const result = await TaskService.getTaskDetails(taskId, userId, { limit, offset });

      reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      reply.code(404).send({ success: false, error: err.message || 'Task not found' });
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/status
   */
  static async updateStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };
      const { status, systemMessageCiphertext, systemMessageIv } = updateStatusSchema.parse(request.body);

      const task = await TaskService.updateTaskStatus({
        taskId,
        userId,
        newStatus: status,
        systemMessageCiphertext,
        systemMessageIv,
      });

      reply.code(200).send({
        success: true,
        message: 'Task status updated',
        data: task,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to update status' });
    }
  }

  /**
   * PUT /api/v1/tasks/:id
   */
  static async updateFields(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };
      const data = updateFieldsSchema.parse(request.body);

      const task = await TaskService.updateTaskFields({
        taskId,
        userId,
        ...data,
      });

      reply.code(200).send({
        success: true,
        message: 'Task updated successfully',
        data: task,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to update task' });
    }
  }

  /**
   * POST /api/v1/tasks/:id/comments
   */
  static async postComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };
      const data = postCommentSchema.parse(request.body);

      const comment = await CommentService.postComment({
        ...data,
        taskId,
        senderId: userId,
      });

      reply.code(201).send({
        success: true,
        message: 'Comment posted',
        data: comment,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ success: false, error: 'Validation failed', details: err.errors });
        return;
      }
      reply.code(400).send({ success: false, error: err.message || 'Failed to post comment' });
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/read
   */
  static async markRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };

      await TaskService.markTaskRead(taskId, userId);

      reply.code(200).send({
        success: true,
        message: 'Task marked as read',
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * POST /api/v1/tasks/:id/delivery-ack
   * Receiver device informs server that task was received (single tick -> double tick)
   */
  static async ackDelivered(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };

      await TaskService.ackTaskDelivered(taskId, userId);

      reply.code(200).send({
        success: true,
        message: 'Delivery acknowledged',
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * POST /api/v1/tasks/:id/notified-ack
   * Receiver device informs server that scheduled reminder popped up on screen (double tick -> triple tick)
   */
  static async ackNotified(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user!.userId;
      const { id: taskId } = request.params as { id: string };

      await TaskService.ackTaskNotified(taskId, userId);

      reply.code(200).send({
        success: true,
        message: 'Alarm notification acknowledged',
      });
    } catch (err: any) {
      throw err;
    }
  }
}
