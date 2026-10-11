import crypto from 'crypto';
import { TaskModel, type TaskPriority, type TaskStatus, type TaskRow } from '../models/task.model.js';
import { CommentModel } from '../models/comment.model.js';
import { UserModel } from '../models/user.model.js';
import { ContactModel } from '../models/contact.model.js';
import { FcmService } from './fcm.service.js';
import { normalizePhoneNumber } from '../utils/crypto.utils.js';

export interface CreateTaskDTO {
  id?: string;
  creatorId: number;
  assigneePhone: string;
  assigneeName?: string | null;
  title?: string | null;
  note?: string | null;
  attachmentUrl?: string | null;
  audioNoteUrl?: string | null;
  audioNoteDuration?: string | null;
  encryptedTaskKeyForCreator?: string | null;
  encryptedTaskKeyForAssignee?: string | null;
  encryptedPayload?: string | null;
  payloadIv?: string | null;
  priority?: TaskPriority;
  dueAt: Date | string;
  dueDateText?: string | null;
  remindBefore?: string[] | null;
}

export class TaskService {
  /**
   * Create a new task/reminder and handle first-contact gating + unregistered number matching
   */
  static async createTask(data: CreateTaskDTO): Promise<{ task: TaskRow; isAssigneeRegistered: boolean }> {
    const taskId = data.id || `task_${crypto.randomUUID()}`;
    const normalizedAssigneePhone = normalizePhoneNumber(data.assigneePhone);

    // Check if assignee is already registered
    const assigneeUser = await UserModel.findByPhoneNumber(normalizedAssigneePhone);
    const assigneeId = assigneeUser ? assigneeUser.id : null;

    // Check if creator is blocked by assignee
    if (assigneeId) {
      const isBlocked = await ContactModel.isBlocked(data.creatorId, assigneeId);
      if (isBlocked) {
        throw new Error('Unable to send task to this recipient.');
      }

      // Check first-contact consent relation
      const existingRelation = await ContactModel.getRelation(data.creatorId, assigneeId);
      if (!existingRelation) {
        // Create initial pending request
        await ContactModel.setRelation(data.creatorId, assigneeId, 'pending');
      }
    }

    const dueAtDate = new Date(data.dueAt);

    const task = await TaskModel.create({
      id: taskId,
      creatorId: data.creatorId,
      assigneePhone: normalizedAssigneePhone,
      assigneeId,
      title: data.title || null,
      note: data.note || null,
      attachmentUrl: data.attachmentUrl || null,
      audioNoteUrl: data.audioNoteUrl || null,
      audioNoteDuration: data.audioNoteDuration || null,
      encryptedTaskKeyForCreator: data.encryptedTaskKeyForCreator || null,
      encryptedTaskKeyForAssignee: data.encryptedTaskKeyForAssignee || null,
      encryptedPayload: data.encryptedPayload || null,
      payloadIv: data.payloadIv || null,
      priority: data.priority || 'medium',
      dueAt: dueAtDate,
    });

    // Notify assignee if registered
    if (assigneeId) {
      const creator = await UserModel.findById(data.creatorId);
      const senderInitials = creator?.name
        ? creator.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'CO';
      const formattedPriority = data.priority
        ? data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase()
        : 'Medium';

      await FcmService.notifyNewTask({
        receiverId: assigneeId,
        taskId,
        title: data.title || 'New Reminder',
        note: data.note || null,
        senderName: creator?.name || 'A contact',
        senderPhone: creator?.phone_number || '',
        senderInitials,
        assigneeName: data.assigneeName || assigneeUser?.name || null,
        assigneePhone: normalizedAssigneePhone,
        priority: formattedPriority,
        dueAt: dueAtDate,
        dueDateText: data.dueDateText || null,
        remindBefore: data.remindBefore || ['15 min', '5 min'],
        attachmentName: data.attachmentUrl || null,
        audioNoteDuration: data.audioNoteDuration || null,
      });
    }

    return {
      task,
      isAssigneeRegistered: Boolean(assigneeId),
    };
  }

  /**
   * Fetch user tasks with segmented control & filter chips
   */
  static async getUserTasks(params: {
    userId: number;
    userPhone: string;
    segment: 'assigned' | 'created';
    filter?: 'all' | 'upcoming' | 'pending' | 'completed';
    limit?: number;
    offset?: number;
  }): Promise<TaskRow[]> {
    return TaskModel.findUserTasks(params);
  }

  /**
   * Get single task with full threaded comments
   */
  static async getTaskDetails(
    taskId: string,
    userId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<{ task: TaskRow; comments: any[] }> {
    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Permission check
    const user = await UserModel.findById(userId);
    const normalizedUserPhone = user ? normalizePhoneNumber(user.phone_number) : '';

    const isCreator = task.creator_id === userId;
    const isAssignee = task.assignee_id === userId || task.assignee_phone === normalizedUserPhone;

    if (!isCreator && !isAssignee) {
      throw new Error('Unauthorized to view this task');
    }

    // Fetch comments with pagination
    const comments = await CommentModel.findByTaskId(
      taskId,
      options?.limit || 50,
      options?.offset || 0
    );

    return { task, comments };
  }

  /**
   * Update task lifecycle status with automatic system audit messages
   */
  static async updateTaskStatus(params: {
    taskId: string;
    userId: number;
    newStatus: TaskStatus;
    systemMessageCiphertext?: string;
    systemMessageIv?: string;
  }): Promise<TaskRow> {
    const task = await TaskModel.findById(params.taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const user = await UserModel.findById(params.userId);
    const isCreator = task.creator_id === params.userId;
    const isAssignee = task.assignee_id === params.userId || task.assignee_phone === user?.phone_number;

    if (!isCreator && !isAssignee) {
      throw new Error('Unauthorized to modify this task');
    }

    // Validate state machine
    await TaskModel.updateStatus(params.taskId, params.newStatus);

    // If client supplied encrypted system message or default system log
    if (params.systemMessageCiphertext && params.systemMessageIv) {
      await CommentModel.create({
        id: `sys_${crypto.randomUUID()}`,
        taskId: params.taskId,
        senderId: params.userId,
        isSystem: true,
        messageType: 'system',
        encryptedContent: params.systemMessageCiphertext,
        contentIv: params.systemMessageIv,
      });
    }

    // Trigger push notification to other party
    const recipientId = isCreator ? task.assignee_id : task.creator_id;
    if (recipientId) {
      await FcmService.notifyTaskUpdate({
        receiverId: recipientId,
        taskId: params.taskId,
        title: 'Task Status Updated',
        body: `Task status changed to ${params.newStatus.replace(/_/g, ' ')}.`,
        newStatus: params.newStatus,
      });
    }

    const updated = await TaskModel.findById(params.taskId);
    return updated!;
  }

  /**
   * Update task fields (time, details) - Creator only
   */
  static async updateTaskFields(params: {
    taskId: string;
    userId: number;
    encryptedPayload?: string;
    payloadIv?: string;
    dueAt?: Date | string;
    priority?: TaskPriority;
    systemMessageCiphertext?: string;
    systemMessageIv?: string;
  }): Promise<TaskRow> {
    const task = await TaskModel.findById(params.taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.creator_id !== params.userId) {
      throw new Error('Only the creator can edit task details');
    }

    const dueAtDate = params.dueAt ? new Date(params.dueAt) : undefined;

    await TaskModel.updateFields(params.taskId, {
      encryptedPayload: params.encryptedPayload,
      payloadIv: params.payloadIv,
      dueAt: dueAtDate,
      priority: params.priority,
    });

    // Record system message in chat thread
    if (params.systemMessageCiphertext && params.systemMessageIv) {
      await CommentModel.create({
        id: `sys_${crypto.randomUUID()}`,
        taskId: params.taskId,
        senderId: params.userId,
        isSystem: true,
        messageType: 'system',
        encryptedContent: params.systemMessageCiphertext,
        contentIv: params.systemMessageIv,
      });
    }

    // Time/date edits re-trigger push notification
    if (dueAtDate && task.assignee_id) {
      await FcmService.notifyTaskUpdate({
        receiverId: task.assignee_id,
        taskId: params.taskId,
        title: 'Reminder Time Changed',
        body: 'The creator updated the scheduled reminder time.',
        newDueAt: dueAtDate.toISOString(),
      });
    }

    const updated = await TaskModel.findById(params.taskId);
    return updated!;
  }

  /**
   * Mark task as delivered on receiver's phone (single tick -> double tick)
   */
  static async ackTaskDelivered(taskId: string, userId: number): Promise<void> {
    const task = await TaskModel.findById(taskId);
    if (!task) return;

    await TaskModel.updateReadState(taskId, 'delivered');

    // Notify the assigner via silent push so their task card updates to 2 ticks (delivered)
    if (task.creator_id && task.creator_id !== userId) {
      await FcmService.notifyTaskTickUpdate({
        receiverId: task.creator_id,
        taskId,
        readState: 'delivered',
      });
    }
  }

  /**
   * Mark task as notified on receiver's phone at due time (double tick -> triple tick)
   */
  static async ackTaskNotified(taskId: string, userId: number): Promise<void> {
    const task = await TaskModel.findById(taskId);
    if (!task) return;

    await TaskModel.updateReadState(taskId, 'notified');

    // Notify the assigner via silent push so their task card updates to 3 ticks (notified)
    if (task.creator_id && task.creator_id !== userId) {
      await FcmService.notifyTaskTickUpdate({
        receiverId: task.creator_id,
        taskId,
        readState: 'notified',
      });
    }
  }

  /**
   * Mark task and its comments as opened (read-state handshake)
   */
  static async markTaskRead(taskId: string, userId: number): Promise<void> {
    const task = await TaskModel.findById(taskId);
    if (!task) return;

    if (task.assignee_id === userId || task.creator_id === userId) {
      await TaskModel.updateReadState(taskId, 'opened');
      await CommentModel.markOpened(taskId, userId);

      const notifyTargetId = task.creator_id === userId ? task.assignee_id : task.creator_id;
      if (notifyTargetId) {
        await FcmService.notifyTaskTickUpdate({
          receiverId: notifyTargetId,
          taskId,
          readState: 'opened',
        });
      }
    }
  }
}
