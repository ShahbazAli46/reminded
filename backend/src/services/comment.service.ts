import crypto from 'crypto';
import { CommentModel, type CommentRow, type MessageType } from '../models/comment.model.js';
import { TaskModel } from '../models/task.model.js';
import { UserModel } from '../models/user.model.js';
import { FcmService } from './fcm.service.js';

export interface CreateCommentDTO {
  id?: string;
  taskId: string;
  senderId: number;
  messageType?: MessageType;
  encryptedContent: string;
  contentIv: string;
  voiceDurationSeconds?: number | null;
}

export class CommentService {
  /**
   * Post a new encrypted comment and dispatch push notifications
   */
  static async postComment(data: CreateCommentDTO): Promise<CommentRow> {
    const task = await TaskModel.findById(data.taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const commentId = data.id || `msg_${crypto.randomUUID()}`;

    const comment = await CommentModel.create({
      id: commentId,
      taskId: data.taskId,
      senderId: data.senderId,
      isSystem: false,
      messageType: data.messageType || 'text',
      encryptedContent: data.encryptedContent,
      contentIv: data.contentIv,
      voiceDurationSeconds: data.voiceDurationSeconds || null,
    });

    // Notify the other party
    const sender = await UserModel.findById(data.senderId);
    const recipientId = task.creator_id === data.senderId ? task.assignee_id : task.creator_id;

    if (recipientId) {
      await FcmService.notifyNewComment({
        receiverId: recipientId,
        taskId: data.taskId,
        senderName: sender?.name || 'A contact',
        messageType: data.messageType || 'text',
      });
    }

    return comment;
  }

  /**
   * Mark comment thread as opened
   */
  static async markThreadOpened(taskId: string, viewerId: number): Promise<void> {
    await CommentModel.markOpened(taskId, viewerId);
  }
}
