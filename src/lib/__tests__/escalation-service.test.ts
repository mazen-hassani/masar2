/**
 * Escalation Service Tests
 * Tests for escalation policies, rules, and event tracking
 */

import { describe, it, expect, vi } from 'vitest';
import { EscalationService } from '../services/escalation-service';

// Mock Prisma if needed
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({})),
}));

describe('Escalation Service', () => {
  describe('createPolicy', () => {
    it('should create a new escalation policy', async () => {
      const request = {
        workflowTemplateId: 'template-1',
        name: 'Default Escalation Policy',
        description: 'Policy for standard workflows',
        warningThresholdPercent: 75,
        maxEscalationLevels: 3,
        cooldownBetweenEscalations: 60,
      };

      const policy = await EscalationService.createPolicy('tenant-1', request, 'user-123');

      expect(policy.workflowTemplateId).toBe('template-1');
      expect(policy.name).toBe('Default Escalation Policy');
      expect(policy.tenantId).toBe('tenant-1');
      expect(policy.warningThresholdPercent).toBe(75);
      expect(policy.maxEscalationLevels).toBe(3);
      expect(policy.isActive).toBe(true);
      expect(policy.createdBy).toBe('user-123');
    });

    it('should use default values for optional parameters', async () => {
      const request = {
        workflowTemplateId: 'template-1',
        name: 'Policy',
      };

      const policy = await EscalationService.createPolicy('tenant-1', request, 'user-123');

      expect(policy.warningThresholdPercent).toBe(75); // default
      expect(policy.maxEscalationLevels).toBe(3); // default
      expect(policy.cooldownBetweenEscalations).toBe(60); // default
      expect(policy.isDefault).toBe(false);
      expect(policy.description).toBeNull();
    });

    it('should assign policy ID at creation time', async () => {
      const request = {
        workflowTemplateId: 'template-1',
        name: 'Test Policy',
      };

      const policy = await EscalationService.createPolicy('tenant-1', request, 'user-123');

      expect(policy.id).toBeDefined();
      expect(policy.id).toContain('policy-');
    });
  });

  describe('createRule', () => {
    it('should create an escalation rule with actions', async () => {
      const request = {
        escalationPolicyId: 'policy-1',
        name: 'SLA Warning Rule',
        description: 'Trigger when SLA reaches warning',
        triggerType: 'SLAWarning',
        escalationLevel: 1,
        hoursInStage: 18,
        warningThresholdPercent: 75,
        minimumPriority: 'Medium',
        actions: [
          {
            actionType: 'Notify',
            notificationTemplate: 'SLAWarning',
            order: 0,
          },
          {
            actionType: 'Reassign',
            reassignToUserId: 'manager-1',
            order: 1,
          },
        ],
      };

      const rule = await EscalationService.createRule(request, 'user-123');

      expect(rule.escalationPolicyId).toBe('policy-1');
      expect(rule.name).toBe('SLA Warning Rule');
      expect(rule.triggerType).toBe('SLAWarning');
      expect(rule.escalationLevel).toBe(1);
      expect(rule.actions.length).toBe(2);
      expect(rule.actions[0].actionType).toBe('Notify');
      expect(rule.actions[1].actionType).toBe('Reassign');
      expect(rule.isActive).toBe(true);
      expect(rule.isRepeatable).toBe(true);
    });

    it('should set default cooldown minutes', async () => {
      const request = {
        escalationPolicyId: 'policy-1',
        name: 'Test Rule',
        triggerType: 'SLABreach',
        escalationLevel: 2,
        hoursInStage: 24,
        actions: [],
      };

      const rule = await EscalationService.createRule(request, 'user-123');

      expect(rule.cooldownMinutes).toBe(60); // default
    });

    it('should preserve action order', async () => {
      const request = {
        escalationPolicyId: 'policy-1',
        name: 'Test Rule',
        triggerType: 'SLABreach',
        escalationLevel: 1,
        hoursInStage: 24,
        actions: [
          {
            actionType: 'ChangePriority',
            newPriority: 'High',
            order: 0,
          },
          {
            actionType: 'AddComment',
            comment: 'Escalated due to SLA breach',
            order: 1,
          },
          {
            actionType: 'CreateAlert',
            order: 2,
          },
        ],
      };

      const rule = await EscalationService.createRule(request, 'user-123');

      expect(rule.actions[0].order).toBe(0);
      expect(rule.actions[1].order).toBe(1);
      expect(rule.actions[2].order).toBe(2);
    });

    it('should assign rule ID at creation time', async () => {
      const request = {
        escalationPolicyId: 'policy-1',
        name: 'Test Rule',
        triggerType: 'SLAWarning',
        escalationLevel: 1,
        hoursInStage: 18,
        actions: [],
      };

      const rule = await EscalationService.createRule(request, 'user-123');

      expect(rule.id).toBeDefined();
      expect(rule.id).toContain('rule-');
    });
  });

  describe('createChain', () => {
    it('should create escalation chain with multiple levels', async () => {
      const chain = await EscalationService.createChain(
        'policy-1',
        'Emergency Escalation',
        'For urgent situations',
        'manager-1',
        30,
        'director-1',
        60,
        'ceo-1',
        120,
        'user-123'
      );

      expect(chain.escalationPolicyId).toBe('policy-1');
      expect(chain.name).toBe('Emergency Escalation');
      expect(chain.description).toBe('For urgent situations');
      expect(chain.level1.roleOrUserId).toBe('manager-1');
      expect(chain.level1.escalationDelayMinutes).toBe(30);
      expect(chain.level2?.roleOrUserId).toBe('director-1');
      expect(chain.level2?.escalationDelayMinutes).toBe(60);
      expect(chain.level3?.roleOrUserId).toBe('ceo-1');
      expect(chain.level3?.escalationDelayMinutes).toBe(120);
      expect(chain.isActive).toBe(true);
    });

    it('should support two-level escalation chain', async () => {
      const chain = await EscalationService.createChain(
        'policy-1',
        'Two Level Chain',
        undefined,
        'manager-1',
        30,
        'director-1',
        60
      );

      expect(chain.level1).toBeDefined();
      expect(chain.level2).toBeDefined();
      expect(chain.level3).toBeUndefined();
    });

    it('should support one-level escalation chain', async () => {
      const chain = await EscalationService.createChain(
        'policy-1',
        'Single Level',
        undefined,
        'manager-1',
        30
      );

      expect(chain.level1).toBeDefined();
      expect(chain.level2).toBeUndefined();
      expect(chain.level3).toBeUndefined();
    });

    it('should use default escalation delays', async () => {
      const chain = await EscalationService.createChain(
        'policy-1',
        'Test Chain',
        undefined,
        'manager-1',
        30,
        'director-1'
        // level2DelayMinutes not specified
      );

      expect(chain.level2?.escalationDelayMinutes).toBe(120); // default
    });

    it('should assign chain ID at creation time', async () => {
      const chain = await EscalationService.createChain(
        'policy-1',
        'Test Chain',
        undefined,
        'manager-1',
        30
      );

      expect(chain.id).toBeDefined();
      expect(chain.id).toContain('chain-');
    });
  });

  describe('logEscalation', () => {
    it('should create escalation event', async () => {
      const event = await EscalationService.logEscalation(
        'workflow-1',
        'rule-1',
        'tenant-1',
        'SLA breached',
        2,
        'SLABreach',
        'user-1',
        'manager-1',
        'Medium',
        'High',
        'system'
      );

      expect(event.workflowInstanceId).toBe('workflow-1');
      expect(event.escalationRuleId).toBe('rule-1');
      expect(event.tenantId).toBe('tenant-1');
      expect(event.escalationLevel).toBe(2);
      expect(event.triggerType).toBe('SLABreach');
      expect(event.previousAssigneeId).toBe('user-1');
      expect(event.newAssigneeId).toBe('manager-1');
      expect(event.previousPriority).toBe('Medium');
      expect(event.newPriority).toBe('High');
      expect(event.reason).toBe('SLA breached');
      expect(event.triggeredByUserId).toBe('system');
      expect(event.triggeredBy).toBe('Manual');
    });

    it('should set triggeredBy to Rule when triggeredByUserId is undefined', async () => {
      const event = await EscalationService.logEscalation(
        'workflow-1',
        'rule-1',
        'tenant-1',
        'Automatic escalation',
        1,
        'SLAWarning'
      );

      expect(event.triggeredBy).toBe('Rule');
      expect(event.triggeredByUserId).toBeUndefined();
    });

    it('should include event details and timestamp', async () => {
      const event = await EscalationService.logEscalation(
        'workflow-1',
        'rule-1',
        'tenant-1',
        'Test escalation',
        1,
        'SLAWarning'
      );

      expect(event.details).toBeDefined();
      expect(event.details.ruleName).toBe('rule-1');
      expect(event.details.timestamp).toBeDefined();
      expect(event.createdAt).toBeDefined();
    });

    it('should assign event ID at creation time', async () => {
      const event = await EscalationService.logEscalation(
        'workflow-1',
        'rule-1',
        'tenant-1',
        'Test',
        1,
        'SLAWarning'
      );

      expect(event.id).toBeDefined();
      expect(event.id).toContain('escalation-');
    });
  });
});
