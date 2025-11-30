import { ObjectId } from 'mongodb';
import { ContentStatus, StatusChange } from '../models/Resource';

/**
 * Valid status transitions for resource lifecycle
 * Key: current status, Value: array of valid next statuses
 */
const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.DISCOVERED]: [ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED],
  [ContentStatus.PENDING_REVIEW]: [ContentStatus.APPROVED, ContentStatus.REJECTED],
  [ContentStatus.APPROVED]: [ContentStatus.PUBLISHED, ContentStatus.PENDING_REVIEW],
  [ContentStatus.PUBLISHED]: [ContentStatus.ARCHIVED],
  [ContentStatus.ARCHIVED]: [ContentStatus.PUBLISHED],
  [ContentStatus.REJECTED]: [ContentStatus.PENDING_REVIEW]
};

export class LifecycleService {
  /**
   * Validates if a status transition is allowed
   */
  isValidTransition(currentStatus: ContentStatus, newStatus: ContentStatus): boolean {
    const allowedStatuses = VALID_TRANSITIONS[currentStatus];
    return allowedStatuses.includes(newStatus);
  }

  /**
   * Get all valid next statuses for a given current status
   */
  getValidNextStatuses(currentStatus: ContentStatus): ContentStatus[] {
    return VALID_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Creates a status change entry for the history
   */
  createStatusChange(
    status: ContentStatus,
    changedBy: ObjectId,
    reason?: string
  ): StatusChange {
    return {
      status,
      changedAt: new Date(),
      changedBy,
      reason
    };
  }

  /**
   * Prepares the update fields when transitioning to a new status
   * Returns an object with fields to update in the database
   */
  prepareStatusUpdate(
    currentStatus: ContentStatus,
    newStatus: ContentStatus,
    changedBy: ObjectId,
    reason?: string
  ): {
    status: ContentStatus;
    statusHistory: { $push: StatusChange };
    updatedAt: Date;
    updatedBy: ObjectId;
    publishedAt?: Date;
    archivedAt?: Date | null;
    archivedReason?: string | null;
  } {
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${this.getValidNextStatuses(currentStatus).join(', ')}`
      );
    }

    const statusChange = this.createStatusChange(newStatus, changedBy, reason);
    const update: any = {
      status: newStatus,
      statusHistory: { $push: statusChange },
      updatedAt: new Date(),
      updatedBy: changedBy
    };

    // Set publishedAt when transitioning to published
    if (newStatus === ContentStatus.PUBLISHED) {
      update.publishedAt = new Date();
    }

    // Set archivedAt when transitioning to archived
    if (newStatus === ContentStatus.ARCHIVED) {
      update.archivedAt = new Date();
    }

    // Clear archivedAt when transitioning from archived back to published
    if (currentStatus === ContentStatus.ARCHIVED && newStatus === ContentStatus.PUBLISHED) {
      update.archivedAt = null;
      update.archivedReason = null;
    }

    return update;
  }

  /**
   * Validates a complete status transition and returns update fields
   */
  validateAndPrepareTransition(
    currentStatus: ContentStatus,
    newStatus: ContentStatus,
    changedBy: ObjectId,
    reason?: string
  ): {
    valid: boolean;
    error?: string;
    update?: any;
  } {
    try {
      const update = this.prepareStatusUpdate(currentStatus, newStatus, changedBy, reason);
      return { valid: true, update };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Checks if a status is a terminal status (requires special handling to move from)
   */
  isTerminalStatus(status: ContentStatus): boolean {
    return status === ContentStatus.PUBLISHED || status === ContentStatus.ARCHIVED;
  }

  /**
   * Checks if a status is publicly visible
   */
  isPublicStatus(status: ContentStatus): boolean {
    return status === ContentStatus.PUBLISHED;
  }
}

// Export singleton instance
export const lifecycleService = new LifecycleService();
