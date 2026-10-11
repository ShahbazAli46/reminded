import { ContactModel, type ContactRelationRow, type RelationStatus } from '../models/contact.model.js';

export class ContactService {
  /**
   * Get pending incoming requests
   */
  static async getPendingRequests(userId: number): Promise<ContactRelationRow[]> {
    return ContactModel.getPendingRequests(userId);
  }

  /**
   * Respond to incoming request
   */
  static async respondToRequest(
    userId: number,
    senderId: number,
    action: 'accept' | 'decline' | 'block' | 'mute'
  ): Promise<void> {
    let status: RelationStatus = 'accepted';
    if (action === 'decline') status = 'declined';
    if (action === 'block') status = 'blocked';
    if (action === 'mute') status = 'muted';

    await ContactModel.setRelation(senderId, userId, status);
  }

  /**
   * Get blocked users list
   */
  static async getBlockedUsers(userId: number): Promise<ContactRelationRow[]> {
    return ContactModel.getBlockedUsers(userId);
  }

  /**
   * Block a specific user
   */
  static async blockUser(userId: number, targetUserId: number): Promise<void> {
    await ContactModel.setRelation(targetUserId, userId, 'blocked');
  }

  /**
   * Unblock a specific user
   */
  static async unblockUser(userId: number, targetUserId: number): Promise<void> {
    await ContactModel.setRelation(targetUserId, userId, 'accepted');
  }
}
