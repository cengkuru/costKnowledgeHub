import { ObjectId } from 'mongodb';
import { LifecycleService, lifecycleService } from '../../services/lifecycleService';
import { ContentStatus } from '../../models/Resource';

describe('LifecycleService', () => {
  let service: LifecycleService;
  const testUserId = new ObjectId();

  beforeEach(() => {
    service = new LifecycleService();
  });

  describe('isValidTransition', () => {
    it('should allow discovered -> pending_review', () => {
      const result = service.isValidTransition(
        ContentStatus.DISCOVERED,
        ContentStatus.PENDING_REVIEW
      );
      expect(result).toBe(true);
    });

    it('should allow discovered -> rejected', () => {
      const result = service.isValidTransition(
        ContentStatus.DISCOVERED,
        ContentStatus.REJECTED
      );
      expect(result).toBe(true);
    });

    it('should NOT allow discovered -> published', () => {
      const result = service.isValidTransition(
        ContentStatus.DISCOVERED,
        ContentStatus.PUBLISHED
      );
      expect(result).toBe(false);
    });

    it('should allow pending_review -> approved', () => {
      const result = service.isValidTransition(
        ContentStatus.PENDING_REVIEW,
        ContentStatus.APPROVED
      );
      expect(result).toBe(true);
    });

    it('should allow pending_review -> rejected', () => {
      const result = service.isValidTransition(
        ContentStatus.PENDING_REVIEW,
        ContentStatus.REJECTED
      );
      expect(result).toBe(true);
    });

    it('should NOT allow pending_review -> published', () => {
      const result = service.isValidTransition(
        ContentStatus.PENDING_REVIEW,
        ContentStatus.PUBLISHED
      );
      expect(result).toBe(false);
    });

    it('should allow approved -> published', () => {
      const result = service.isValidTransition(
        ContentStatus.APPROVED,
        ContentStatus.PUBLISHED
      );
      expect(result).toBe(true);
    });

    it('should allow approved -> pending_review', () => {
      const result = service.isValidTransition(
        ContentStatus.APPROVED,
        ContentStatus.PENDING_REVIEW
      );
      expect(result).toBe(true);
    });

    it('should allow published -> archived', () => {
      const result = service.isValidTransition(
        ContentStatus.PUBLISHED,
        ContentStatus.ARCHIVED
      );
      expect(result).toBe(true);
    });

    it('should NOT allow published -> rejected', () => {
      const result = service.isValidTransition(
        ContentStatus.PUBLISHED,
        ContentStatus.REJECTED
      );
      expect(result).toBe(false);
    });

    it('should allow archived -> published (with review)', () => {
      const result = service.isValidTransition(
        ContentStatus.ARCHIVED,
        ContentStatus.PUBLISHED
      );
      expect(result).toBe(true);
    });

    it('should allow rejected -> pending_review', () => {
      const result = service.isValidTransition(
        ContentStatus.REJECTED,
        ContentStatus.PENDING_REVIEW
      );
      expect(result).toBe(true);
    });

    it('should NOT allow rejected -> published', () => {
      const result = service.isValidTransition(
        ContentStatus.REJECTED,
        ContentStatus.PUBLISHED
      );
      expect(result).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return correct next statuses for discovered', () => {
      const nextStatuses = service.getValidNextStatuses(ContentStatus.DISCOVERED);
      expect(nextStatuses).toEqual([
        ContentStatus.PENDING_REVIEW,
        ContentStatus.REJECTED
      ]);
    });

    it('should return correct next statuses for pending_review', () => {
      const nextStatuses = service.getValidNextStatuses(ContentStatus.PENDING_REVIEW);
      expect(nextStatuses).toEqual([
        ContentStatus.APPROVED,
        ContentStatus.REJECTED
      ]);
    });

    it('should return correct next statuses for approved', () => {
      const nextStatuses = service.getValidNextStatuses(ContentStatus.APPROVED);
      expect(nextStatuses).toEqual([
        ContentStatus.PUBLISHED,
        ContentStatus.PENDING_REVIEW
      ]);
    });

    it('should return correct next statuses for published', () => {
      const nextStatuses = service.getValidNextStatuses(ContentStatus.PUBLISHED);
      expect(nextStatuses).toEqual([ContentStatus.ARCHIVED]);
    });

    it('should return correct next statuses for archived', () => {
      const nextStatuses = service.getValidNextStatuses(ContentStatus.ARCHIVED);
      expect(nextStatuses).toEqual([ContentStatus.PUBLISHED]);
    });

    it('should return correct next statuses for rejected', () => {
      const nextStatuses = service.getValidNextStatuses(ContentStatus.REJECTED);
      expect(nextStatuses).toEqual([ContentStatus.PENDING_REVIEW]);
    });
  });

  describe('createStatusChange', () => {
    it('should create status change without reason', () => {
      const statusChange = service.createStatusChange(
        ContentStatus.APPROVED,
        testUserId
      );

      expect(statusChange.status).toBe(ContentStatus.APPROVED);
      expect(statusChange.changedBy).toEqual(testUserId);
      expect(statusChange.changedAt).toBeInstanceOf(Date);
      expect(statusChange.reason).toBeUndefined();
    });

    it('should create status change with reason', () => {
      const reason = 'Content meets all quality standards';
      const statusChange = service.createStatusChange(
        ContentStatus.APPROVED,
        testUserId,
        reason
      );

      expect(statusChange.status).toBe(ContentStatus.APPROVED);
      expect(statusChange.changedBy).toEqual(testUserId);
      expect(statusChange.changedAt).toBeInstanceOf(Date);
      expect(statusChange.reason).toBe(reason);
    });
  });

  describe('prepareStatusUpdate', () => {
    it('should prepare update for valid transition', () => {
      const update = service.prepareStatusUpdate(
        ContentStatus.DISCOVERED,
        ContentStatus.PENDING_REVIEW,
        testUserId
      );

      expect(update.status).toBe(ContentStatus.PENDING_REVIEW);
      expect(update.updatedBy).toEqual(testUserId);
      expect(update.updatedAt).toBeInstanceOf(Date);
      expect(update.statusHistory).toBeDefined();
      expect(update.statusHistory.$push).toBeDefined();
      expect(update.statusHistory.$push.status).toBe(ContentStatus.PENDING_REVIEW);
    });

    it('should set publishedAt when transitioning to published', () => {
      const update = service.prepareStatusUpdate(
        ContentStatus.APPROVED,
        ContentStatus.PUBLISHED,
        testUserId
      );

      expect(update.publishedAt).toBeInstanceOf(Date);
    });

    it('should set archivedAt when transitioning to archived', () => {
      const update = service.prepareStatusUpdate(
        ContentStatus.PUBLISHED,
        ContentStatus.ARCHIVED,
        testUserId,
        'Outdated information'
      );

      expect(update.archivedAt).toBeInstanceOf(Date);
    });

    it('should clear archivedAt when transitioning from archived to published', () => {
      const update = service.prepareStatusUpdate(
        ContentStatus.ARCHIVED,
        ContentStatus.PUBLISHED,
        testUserId
      ) as any;

      expect(update.archivedAt).toBeNull();
      expect(update.archivedReason).toBeNull();
    });

    it('should throw error for invalid transition', () => {
      expect(() => {
        service.prepareStatusUpdate(
          ContentStatus.DISCOVERED,
          ContentStatus.PUBLISHED,
          testUserId
        );
      }).toThrow(/Invalid status transition/);
    });

    it('should include reason in status history', () => {
      const reason = 'Content approved after editorial review';
      const update = service.prepareStatusUpdate(
        ContentStatus.PENDING_REVIEW,
        ContentStatus.APPROVED,
        testUserId,
        reason
      );

      expect(update.statusHistory.$push.reason).toBe(reason);
    });
  });

  describe('validateAndPrepareTransition', () => {
    it('should return valid result for valid transition', () => {
      const result = service.validateAndPrepareTransition(
        ContentStatus.DISCOVERED,
        ContentStatus.PENDING_REVIEW,
        testUserId
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.update).toBeDefined();
      expect(result.update.status).toBe(ContentStatus.PENDING_REVIEW);
    });

    it('should return error for invalid transition', () => {
      const result = service.validateAndPrepareTransition(
        ContentStatus.DISCOVERED,
        ContentStatus.PUBLISHED,
        testUserId
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid status transition');
      expect(result.update).toBeUndefined();
    });

    it('should include reason in valid result', () => {
      const reason = 'Quality content';
      const result = service.validateAndPrepareTransition(
        ContentStatus.PENDING_REVIEW,
        ContentStatus.APPROVED,
        testUserId,
        reason
      );

      expect(result.valid).toBe(true);
      expect(result.update.statusHistory.$push.reason).toBe(reason);
    });
  });

  describe('isTerminalStatus', () => {
    it('should identify published as terminal status', () => {
      expect(service.isTerminalStatus(ContentStatus.PUBLISHED)).toBe(true);
    });

    it('should identify archived as terminal status', () => {
      expect(service.isTerminalStatus(ContentStatus.ARCHIVED)).toBe(true);
    });

    it('should not identify discovered as terminal status', () => {
      expect(service.isTerminalStatus(ContentStatus.DISCOVERED)).toBe(false);
    });

    it('should not identify pending_review as terminal status', () => {
      expect(service.isTerminalStatus(ContentStatus.PENDING_REVIEW)).toBe(false);
    });

    it('should not identify approved as terminal status', () => {
      expect(service.isTerminalStatus(ContentStatus.APPROVED)).toBe(false);
    });

    it('should not identify rejected as terminal status', () => {
      expect(service.isTerminalStatus(ContentStatus.REJECTED)).toBe(false);
    });
  });

  describe('isPublicStatus', () => {
    it('should identify published as public status', () => {
      expect(service.isPublicStatus(ContentStatus.PUBLISHED)).toBe(true);
    });

    it('should not identify discovered as public status', () => {
      expect(service.isPublicStatus(ContentStatus.DISCOVERED)).toBe(false);
    });

    it('should not identify pending_review as public status', () => {
      expect(service.isPublicStatus(ContentStatus.PENDING_REVIEW)).toBe(false);
    });

    it('should not identify approved as public status', () => {
      expect(service.isPublicStatus(ContentStatus.APPROVED)).toBe(false);
    });

    it('should not identify archived as public status', () => {
      expect(service.isPublicStatus(ContentStatus.ARCHIVED)).toBe(false);
    });

    it('should not identify rejected as public status', () => {
      expect(service.isPublicStatus(ContentStatus.REJECTED)).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(lifecycleService).toBeInstanceOf(LifecycleService);
    });

    it('should work with singleton instance', () => {
      const result = lifecycleService.isValidTransition(
        ContentStatus.DISCOVERED,
        ContentStatus.PENDING_REVIEW
      );
      expect(result).toBe(true);
    });
  });
});
