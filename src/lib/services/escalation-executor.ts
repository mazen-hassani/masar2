/**
 * Escalation Executor
 * Executes escalation rules and actions for workflow instances
 */

import { PrismaClient } from '@prisma/client';
import { SLAManagementService } from './sla-management-service';
import { EscalationService } from './escalation-service';
import { NotificationService } from './notification-service';
import { AuditLogService } from './audit-log-service';
import { EscalationActionType, EscalationTriggerType, EscalationEvent } from '@/types/escalation';

const prisma = new PrismaClient();

// ============================================================================
// ESCALATION EXECUTOR
// ============================================================================

export class EscalationExecutor {
  /**
   * Check if workflow needs escalation and execute if necessary
   */
  static async checkAndEscalate(
    workflowInstanceId: string,
    tenantId: string,
    escalationPolicyId: string,
    actorId: string
  ): Promise<EscalationEvent | null> {
    try {
      // Get workflow instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = (await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          currentStage: true,
          template: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any;

      if (!instance || instance.status !== 'InProgress') {
        return null;
      }

      // Get SLA compliance
      const slaCompliance = SLAManagementService.calculateSLACompliance(instance);

      // Check which rules should trigger
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let triggerType: EscalationTriggerType | null = null;

      if (slaCompliance.currentStatus === 'Breached') {
        triggerType = 'SLABreach';
      } else if (slaCompliance.currentStatus === 'Warning') {
        triggerType = 'SLAWarning';
      }

      if (!triggerType) {
        return null;
      }

      // Get applicable rules
      const applicableRules = await EscalationService.getApplicableRules(
        workflowInstanceId,
        escalationPolicyId,
        triggerType
      );

      if (applicableRules.length === 0) {
        return null;
      }

      // Execute first applicable rule (highest level)
      const rule = applicableRules[0];

      // Check cooldown
      const inCooldown = await EscalationService.isInCooldown(
        workflowInstanceId,
        rule.id,
        rule.cooldownMinutes || 60
      );

      if (inCooldown) {
        return null;
      }

      // Check max escalations
      if (rule.maxEscalations) {
        const maxReached = await EscalationService.hasReachedMaxEscalations(
          workflowInstanceId,
          rule.id,
          rule.maxEscalations
        );

        if (maxReached) {
          return null;
        }
      }

      // Execute escalation actions
      const escalationEvent = await this.executeEscalation(
        instance,
        rule,
        tenantId,
        triggerType,
        actorId,
        slaCompliance.hoursBreach || slaCompliance.hoursRemaining || 0
      );

      return escalationEvent;
    } catch (error) {
      console.error(`Failed to check and escalate workflow ${workflowInstanceId}: ${error}`);
      return null;
    }
  }

  /**
   * Execute escalation with all its actions
   */
  static async executeEscalation(
    instance: {
      id: string;
      currentStageId: string;
      status: string;
      template?: { id: string; name: string };
      currentStage?: { id: string; name: string };
      createdBy?: string;
    },
    rule: {
      id: string;
      name: string;
      escalationLevel: number;
      triggerType: string;
      actions: Array<{
        id: string;
        actionType: EscalationActionType;
        reassignToUserId?: string;
        reassignToRole?: string;
        notificationTemplate?: string;
        newPriority?: string;
        comment?: string;
      }>;
    },
    tenantId: string,
    triggerType: EscalationTriggerType,
    actorId: string,
    breachHours: number
  ): Promise<EscalationEvent> {
    try {
      // Create escalation event
      const escalationEvent = await EscalationService.logEscalation(
        instance.id,
        rule.id,
        tenantId,
        `Escalation triggered by ${triggerType}`,
        rule.escalationLevel,
        triggerType,
        undefined, // Will be set by actions
        undefined, // Will be set by actions
        undefined,
        undefined,
        actorId
      );

      // Execute all actions in order
      for (const action of rule.actions) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.executeAction(action, instance, tenantId, actorId, escalationEvent.id, breachHours);
      }

      // Log audit event
      await AuditLogService.logWorkflowAction(
        tenantId,
        instance.id,
        'WorkflowEscalated',
        actorId,
        {
          escalationLevel: rule.escalationLevel,
          triggerType,
          ruleName: rule.name,
          breachHours,
        }
      );

      return escalationEvent;
    } catch (error) {
      console.error(`Failed to execute escalation for workflow ${instance.id}: ${error}`);
      throw error;
    }
  }

  /**
   * Execute individual escalation action
   */
  static async executeAction(
    action: {
      actionType: EscalationActionType;
      reassignToUserId?: string;
      reassignToRole?: string;
      notificationTemplate?: string;
      newPriority?: string;
      comment?: string;
    },
    instance: {
      id: string;
      currentStageId: string;
      status: string;
      template?: { id: string; name: string };
      currentStage?: { id: string; name: string };
      createdBy?: string;
    },
    tenantId: string,
    actorId: string,
    escalationEventId: string,
    breachHours: number
  ): Promise<void> {
    try {
      switch (action.actionType) {
        case 'Reassign':
          await this.performReassign(instance.id, action.reassignToUserId, tenantId, actorId);
          break;

        case 'Notify':
          await this.performNotification(
            instance,
            tenantId,
            action.notificationTemplate || 'EscalationNotification',
            breachHours
          );
          break;

        case 'ChangePriority':
          await this.performChangePriority(instance.id, action.newPriority, tenantId, actorId);
          break;

        case 'AddComment':
          await this.performAddComment(instance.id, action.comment || 'Escalation action', actorId);
          break;

        case 'CreateAlert':
          await this.performCreateAlert(instance.id, tenantId, escalationEventId);
          break;

        case 'TriggerWebhook':
          // Placeholder for webhook trigger
          console.log(`Would trigger webhook for escalation event ${escalationEventId}`);
          break;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.actionType}: ${error}`);
      // Continue with other actions even if one fails
    }
  }

  /**
   * Perform reassignment action
   */
  private static async performReassign(
    workflowInstanceId: string,
    newAssigneeId: string | undefined,
    tenantId: string,
    actorId: string
  ): Promise<void> {
    if (!newAssigneeId) return;

    try {
      // In production, update workflow assignment in database
      console.log(`Reassigning workflow ${workflowInstanceId} to user ${newAssigneeId}`);
    } catch (error) {
      console.error(`Failed to reassign workflow ${workflowInstanceId}: ${error}`);
    }
  }

  /**
   * Perform notification action
   */
  private static async performNotification(
    instance: {
      id: string;
      currentStageId: string;
      template?: { id: string; name: string };
      currentStage?: { id: string; name: string };
    },
    tenantId: string,
    notificationTemplate: string,
    breachHours: number
  ): Promise<void> {
    try {
      const message = `⚠️ ESCALATION: Workflow "${instance.template?.name}" has been escalated. SLA breach: ${breachHours} hours. Immediate action required.`;

      // Get stage users to notify
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stageResponsibilities = (await prisma.stageResponsibility.findMany({
        where: {
          stageId: instance.currentStageId,
          type: 'User',
        },
        distinct: ['value'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];

      const userIds = stageResponsibilities.map((sr) => sr.value);

      if (userIds.length === 0) return;

      // Send notifications
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'WorkflowEscalated',
        subject: `⚠️ ESCALATION: ${instance.template?.name || 'Workflow'}`,
        message,
        data: {
          workflowInstanceId: instance.id,
          templateName: instance.template?.name,
          stageName: instance.currentStage?.name,
          breachHours,
        },
        workflowInstanceId: instance.id,
      });
    } catch (error) {
      console.error(`Failed to send escalation notification: ${error}`);
    }
  }

  /**
   * Perform priority change action
   */
  private static async performChangePriority(
    workflowInstanceId: string,
    newPriority: string | undefined,
    tenantId: string,
    actorId: string
  ): Promise<void> {
    if (!newPriority) return;

    try {
      // In production, update priority in database
      console.log(`Changed priority of workflow ${workflowInstanceId} to ${newPriority}`);

      await AuditLogService.logWorkflowAction(
        tenantId,
        workflowInstanceId,
        'WorkflowPriorityChanged',
        actorId,
        {
          newPriority,
          reason: 'Escalation action',
        }
      );
    } catch (error) {
      console.error(`Failed to change priority for workflow ${workflowInstanceId}: ${error}`);
    }
  }

  /**
   * Perform add comment action
   */
  private static async performAddComment(
    workflowInstanceId: string,
    comment: string,
    actorId: string
  ): Promise<void> {
    try {
      // In production, add comment to workflow
      console.log(`Added comment to workflow ${workflowInstanceId}: ${comment}`);
    } catch (error) {
      console.error(`Failed to add comment to workflow ${workflowInstanceId}: ${error}`);
    }
  }

  /**
   * Perform create alert action
   */
  private static async performCreateAlert(
    workflowInstanceId: string,
    tenantId: string,
    escalationEventId: string
  ): Promise<void> {
    try {
      // In production, create an alert/incident in the system
      console.log(
        `Created alert for workflow ${workflowInstanceId} due to escalation ${escalationEventId}`
      );
    } catch (error) {
      console.error(`Failed to create alert for workflow ${workflowInstanceId}: ${error}`);
    }
  }

  /**
   * Manually trigger escalation (admin action)
   */
  static async manualEscalate(
    workflowInstanceId: string,
    escalationRuleId: string,
    tenantId: string,
    actorId: string,
    reason: string
  ): Promise<EscalationEvent | null> {
    try {
      // Get rule
      const rule = await EscalationService.getRule(escalationRuleId);
      if (!rule) {
        console.error(`Rule ${escalationRuleId} not found`);
        return null;
      }

      // Get instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = (await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          currentStage: true,
          template: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any;

      if (!instance) {
        console.error(`Instance ${workflowInstanceId} not found`);
        return null;
      }

      // Log and execute
      const escalationEvent = await EscalationService.logEscalation(
        workflowInstanceId,
        escalationRuleId,
        tenantId,
        reason,
        rule.escalationLevel,
        rule.triggerType,
        undefined,
        undefined,
        undefined,
        undefined,
        actorId
      );

      // Execute actions
      const slaCompliance = SLAManagementService.calculateSLACompliance(instance);
      for (const action of rule.actions) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.executeAction(
          action,
          instance,
          tenantId,
          actorId,
          escalationEvent.id,
          slaCompliance.hoursBreach || 0
        );
      }

      return escalationEvent;
    } catch (error) {
      console.error(`Failed to manually escalate workflow ${workflowInstanceId}: ${error}`);
      return null;
    }
  }

  /**
   * Get escalation status for workflow
   */
  static async getEscalationStatus(workflowInstanceId: string): Promise<{
    isEscalated: boolean;
    escalationLevel: number;
    lastEscalationAt: Date | null;
    escalationCount: number;
  }> {
    try {
      const { events } = await EscalationService.getEscalationHistory(workflowInstanceId, 0, 1);

      if (events.length === 0) {
        return {
          isEscalated: false,
          escalationLevel: 0,
          lastEscalationAt: null,
          escalationCount: 0,
        };
      }

      const latestEscalation = events[0];

      return {
        isEscalated: true,
        escalationLevel: latestEscalation.escalationLevel,
        lastEscalationAt: latestEscalation.createdAt,
        escalationCount: (await EscalationService.getEscalationHistory(workflowInstanceId, 0, 1000))
          .total,
      };
    } catch (error) {
      console.error(`Failed to get escalation status for ${workflowInstanceId}: ${error}`);
      return {
        isEscalated: false,
        escalationLevel: 0,
        lastEscalationAt: null,
        escalationCount: 0,
      };
    }
  }
}
