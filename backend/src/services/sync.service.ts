import { TaskModel } from '../models/task.model.js';
import { CommentModel } from '../models/comment.model.js';
import { ContactModel } from '../models/contact.model.js';

export class SyncService {
  /**
   * Ultra-fast delta sync returning all modified entities since a given timestamp
   */
  static async getDelta(params: {
    userId: number;
    userPhone: string;
    since?: string | null;
  }): Promise<{
    serverTimestamp: string;
    tasks: any[];
    comments: any[];
    pendingRequests: any[];
  }> {
    const sinceDate = params.since ? new Date(params.since) : new Date(0);

    const [tasks, comments, pendingRequests] = await Promise.all([
      TaskModel.findDeltaTasks(params.userId, params.userPhone, sinceDate),
      CommentModel.findDeltaComments(params.userId, params.userPhone, sinceDate),
      ContactModel.getPendingRequests(params.userId),
    ]);

    return {
      serverTimestamp: new Date().toISOString(),
      tasks,
      comments,
      pendingRequests,
    };
  }
}
