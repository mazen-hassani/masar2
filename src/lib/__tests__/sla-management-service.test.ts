/**
 * SLA Management Service Tests
 * Tests for SLA compliance calculations and metrics
 */

import { describe, it, expect } from 'vitest';
import { SLAManagementService } from '../services/sla-management-service';

describe('SLA Management Service', () => {
  describe('calculateSLACompliance', () => {
    it('should calculate compliant status when within SLA', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twentyHoursFromNow = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: oneHourAgo,
        slaDue: twentyHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.currentStatus).toBe('Compliant');
      expect(compliance.isWarning).toBe(false);
      expect(compliance.isOverdue).toBe(false);
      expect(compliance.hoursUsed).toBeGreaterThan(0);
      expect(compliance.hoursRemaining).toBeGreaterThan(0);
      expect(compliance.percentageUsed).toBeLessThan(75);
    });

    it('should calculate warning status at 75% threshold', () => {
      const now = new Date();
      const eighteenHoursAgo = new Date(now.getTime() - 18 * 60 * 60 * 1000);
      const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: eighteenHoursAgo,
        slaDue: sixHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.currentStatus).toBe('Warning');
      expect(compliance.isWarning).toBe(true);
      expect(compliance.isOverdue).toBe(false);
      expect(compliance.percentageUsed).toBeGreaterThanOrEqual(75);
    });

    it('should calculate breached status when SLA is exceeded', () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: twentyFiveHoursAgo,
        slaDue: oneHourAgo,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.currentStatus).toBe('Breached');
      expect(compliance.isOverdue).toBe(true);
      expect(compliance.hoursBreach).toBeGreaterThan(0);
      expect(compliance.hoursRemaining).toBeUndefined();
    });

    it('should use default 24 hours SLA when stage hours not specified', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twentyHoursFromNow = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: oneHourAgo,
        slaDue: twentyHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          // slaHours not specified
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.totalSLAHours).toBe(24);
    });

    it('should calculate correct percentage used', () => {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const eighteenHoursFromNow = new Date(now.getTime() + 18 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: sixHoursAgo,
        slaDue: eighteenHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      // 6 hours used out of 24 = 25%
      expect(compliance.percentageUsed).toBe(25);
      expect(compliance.hoursUsed).toBe(6);
    });

    it('should handle unknown stage gracefully', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twentyHoursFromNow = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: oneHourAgo,
        slaDue: twentyHoursFromNow,
        // currentStage not specified
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.stageName).toBe('Unknown');
      expect(compliance.totalSLAHours).toBe(24);
      expect(compliance.currentStatus).toBe('Compliant');
    });

    it('should round hours to one decimal place', () => {
      const now = new Date();
      // 90 minutes = 1.5 hours
      const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);
      const twentyTwoHoursFromNow = new Date(now.getTime() + 22 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: ninetyMinutesAgo,
        slaDue: twentyTwoHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      // Should be rounded to 1 decimal place
      expect(compliance.hoursUsed.toString()).toMatch(/^\d+(\.\d)?$/);
    });
  });

  describe('SLA Status Determination', () => {
    it('should set correct SLA status fields', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const twentyTwoHoursFromNow = new Date(now.getTime() + 22 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: twoHoursAgo,
        slaDue: twentyTwoHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.warningThresholdPercent).toBe(75);
      expect(compliance.workflowInstanceId).toBe('workflow-1');
      expect(compliance.stageId).toBe('stage-1');
      expect(compliance.stageName).toBe('Approval');
      expect(compliance.stageStartedAt).toEqual(twoHoursAgo);
      expect(compliance.slaDueAt).toEqual(twentyTwoHoursFromNow);
    });

    it('should not set hoursBreach for compliant status', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twentyHoursFromNow = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: oneHourAgo,
        slaDue: twentyHoursFromNow,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.hoursBreach).toBeUndefined();
    });

    it('should not set hoursRemaining for breached status', () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const instance = {
        id: 'workflow-1',
        currentStageId: 'stage-1',
        currentStageStarted: twentyFiveHoursAgo,
        slaDue: oneHourAgo,
        currentStage: {
          id: 'stage-1',
          name: 'Approval',
          slaHours: 24,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.hoursRemaining).toBeUndefined();
    });
  });
});
