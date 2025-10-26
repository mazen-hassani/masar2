/**
 * Escalation Management Tests
 * Tests for SLA tracking, escalation rules, and escalation execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock services (but not Prisma to avoid enum issues)
vi.mock('@/lib/services/notification-service');
vi.mock('@/lib/services/audit-log-service');

import { SLAManagementService } from '@/lib/services/sla-management-service';
import { EscalationService } from '@/lib/services/escalation-service';
import { EscalationExecutor } from '@/lib/services/escalation-executor';

describe('Escalation Management System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SLA Management Service', () => {
    it('should have SLA calculation methods', () => {
      expect(SLAManagementService.calculateSLACompliance).toBeDefined();
      expect(SLAManagementService.getSLACompliance).toBeDefined();
      expect(SLAManagementService.checkSLAWarnings).toBeDefined();
      expect(SLAManagementService.querySLAMetrics).toBeDefined();
    });

    it('should calculate SLA compliance correctly', () => {
      const now = new Date();
      const stageStarted = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const slaDue = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

      const instance = {
        id: 'instance-1',
        currentStageId: 'stage-1',
        currentStageStarted: stageStarted,
        slaDue,
        currentStage: {
          id: 'stage-1',
          name: 'Review',
          slaHours: 6,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.workflowInstanceId).toBe('instance-1');
      expect(compliance.stageName).toBe('Review');
      expect(compliance.totalSLAHours).toBe(6);
      expect(compliance.hoursUsed).toBe(2);
      expect(compliance.hoursRemaining).toBe(4);
      expect(compliance.percentageUsed).toBe(33);
      expect(compliance.currentStatus).toBe('Compliant');
      expect(compliance.isOverdue).toBe(false);
    });

    it('should detect SLA warning threshold', () => {
      const now = new Date();
      const stageStarted = new Date(now.getTime() - 4.5 * 60 * 60 * 1000); // 4.5 hours ago
      const slaDue = new Date(now.getTime() + 1.5 * 60 * 60 * 1000); // 1.5 hours remaining

      const instance = {
        id: 'instance-1',
        currentStageId: 'stage-1',
        currentStageStarted: stageStarted,
        slaDue,
        currentStage: {
          id: 'stage-1',
          name: 'Review',
          slaHours: 6,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.percentageUsed).toBe(75);
      expect(compliance.currentStatus).toBe('Warning');
      expect(compliance.isWarning).toBe(true);
    });

    it('should detect SLA breach', () => {
      const now = new Date();
      const stageStarted = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago
      const slaDue = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours overdue

      const instance = {
        id: 'instance-1',
        currentStageId: 'stage-1',
        currentStageStarted: stageStarted,
        slaDue,
        currentStage: {
          id: 'stage-1',
          name: 'Review',
          slaHours: 6,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);

      expect(compliance.currentStatus).toBe('Breached');
      expect(compliance.isOverdue).toBe(true);
      expect(compliance.hoursBreach).toBe(2);
      expect(compliance.hoursRemaining).toBeUndefined();
    });
  });

  describe('Escalation Service', () => {
    it('should have policy management methods', () => {
      expect(EscalationService.createPolicy).toBeDefined();
      expect(EscalationService.getPolicy).toBeDefined();
      expect(EscalationService.listPolicies).toBeDefined();
      expect(EscalationService.updatePolicy).toBeDefined();
      expect(EscalationService.deletePolicy).toBeDefined();
    });

    it('should have rule management methods', () => {
      expect(EscalationService.createRule).toBeDefined();
      expect(EscalationService.getRule).toBeDefined();
      expect(EscalationService.listRulesForPolicy).toBeDefined();
      expect(EscalationService.updateRule).toBeDefined();
      expect(EscalationService.deleteRule).toBeDefined();
    });

    it('should have chain management methods', () => {
      expect(EscalationService.createChain).toBeDefined();
      expect(EscalationService.getChain).toBeDefined();
      expect(EscalationService.listChainsForPolicy).toBeDefined();
      expect(EscalationService.updateChain).toBeDefined();
      expect(EscalationService.deleteChain).toBeDefined();
    });

    it('should have event tracking methods', () => {
      expect(EscalationService.logEscalation).toBeDefined();
      expect(EscalationService.getEscalationHistory).toBeDefined();
      expect(EscalationService.resolveEscalation).toBeDefined();
    });

    it('should create escalation policy', async () => {
      const policy = await EscalationService.createPolicy(
        'tenant-1',
        {
          workflowTemplateId: 'template-1',
          name: 'Critical Escalation',
          description: 'Policy for critical workflows',
          warningThresholdPercent: 75,
          maxEscalationLevels: 3,
        },
        'admin-1'
      );

      expect(policy).toBeDefined();
      expect(policy.name).toBe('Critical Escalation');
      expect(policy.workflowTemplateId).toBe('template-1');
      expect(policy.warningThresholdPercent).toBe(75);
      expect(policy.maxEscalationLevels).toBe(3);
      expect(policy.isActive).toBe(true);
    });

    it('should create escalation rule', async () => {
      const rule = await EscalationService.createRule(
        {
          escalationPolicyId: 'policy-1',
          name: 'SLA Breach Escalation',
          triggerType: 'SLABreach',
          escalationLevel: 2,
          isRepeatable: false,
          maxEscalations: 1,
          actions: [
            {
              actionType: 'Notify',
              notificationTemplate: 'EscalationAlert',
            },
            {
              actionType: 'ChangePriority',
              newPriority: 'Critical',
            },
          ],
        },
        'admin-1'
      );

      expect(rule).toBeDefined();
      expect(rule.name).toBe('SLA Breach Escalation');
      expect(rule.triggerType).toBe('SLABreach');
      expect(rule.escalationLevel).toBe(2);
      expect(rule.actions).toHaveLength(2);
    });

    it('should create escalation chain', async () => {
      const chain = await EscalationService.createChain(
        'policy-1',
        'Management Escalation',
        'Escalate to management hierarchy',
        'manager-1',
        60,
        'director-1',
        120,
        'ceo-1',
        240
      );

      expect(chain).toBeDefined();
      expect(chain.name).toBe('Management Escalation');
      expect(chain.level1.roleOrUserId).toBe('manager-1');
      expect(chain.level2?.roleOrUserId).toBe('director-1');
      expect(chain.level3?.roleOrUserId).toBe('ceo-1');
    });
  });

  describe('Escalation Executor', () => {
    it('should have escalation execution methods', () => {
      expect(EscalationExecutor.checkAndEscalate).toBeDefined();
      expect(EscalationExecutor.executeEscalation).toBeDefined();
      expect(EscalationExecutor.manualEscalate).toBeDefined();
      expect(EscalationExecutor.getEscalationStatus).toBeDefined();
    });

    it('should get escalation status for workflow', async () => {
      const status = await EscalationExecutor.getEscalationStatus('instance-1');

      expect(status).toBeDefined();
      expect(status.isEscalated).toBe(false);
      expect(status.escalationLevel).toBe(0);
      expect(status.escalationCount).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should have all escalation services available', () => {
      expect(SLAManagementService).toBeDefined();
      expect(EscalationService).toBeDefined();
      expect(EscalationExecutor).toBeDefined();
    });

    it('should support complete escalation workflow', async () => {
      // 1. Create policy
      const policy = await EscalationService.createPolicy(
        'tenant-1',
        {
          workflowTemplateId: 'template-1',
          name: 'Default Policy',
        },
        'admin-1'
      );

      expect(policy).toBeDefined();

      // 2. Create rule
      const rule = await EscalationService.createRule(
        {
          escalationPolicyId: policy.id,
          name: 'Test Rule',
          triggerType: 'SLABreach',
          escalationLevel: 1,
          actions: [
            {
              actionType: 'Notify',
            },
          ],
        },
        'admin-1'
      );

      expect(rule).toBeDefined();

      // 3. Check SLA status
      const now = new Date();
      const instance = {
        id: 'instance-1',
        currentStageId: 'stage-1',
        currentStageStarted: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        slaDue: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        currentStage: {
          id: 'stage-1',
          name: 'Review',
          slaHours: 6,
        },
      };

      const compliance = SLAManagementService.calculateSLACompliance(instance);
      expect(compliance.currentStatus).toBe('Breached');

      // 4. Check escalation status
      const escalationStatus = await EscalationExecutor.getEscalationStatus('instance-1');
      expect(escalationStatus.isEscalated).toBe(false);
    });
  });
});
