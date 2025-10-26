/**
 * Workflow Notification Integration
 * Handles sending notifications for workflow events (creation, transitions, approvals, etc.)
 */

import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notification-service';
import { AuditLogService } from './audit-log-service';

const prisma = new PrismaClient();

// ============================================================================
// WORKFLOW NOTIFICATION INTEGRATION
// ============================================================================

export class WorkflowNotificationIntegration {
  /**
   * Send notification when workflow is created
   */
  static async notifyWorkflowCreated(
    workflowInstanceId: string,
    tenantId: string,
    createdBy: string
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          currentStage: true,
          template: true,
        },
      });

      if (!instance) return;

      // Get all users responsible for the first stage
      const stageResponsibilities = await prisma.stageResponsibility.findMany({
        where: {
          stageId: instance.currentStageId,
          type: 'User', // Only get direct user assignments for now
        },
      });

      if (stageResponsibilities.length === 0) return;

      // Extract user IDs from responsibilities (value field contains userId for type='User')
      const userIds = stageResponsibilities.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'WorkflowAssigned',
        subject: `New Workflow: ${instance.template?.name || 'Untitled'}`,
        message: `A new workflow "${instance.template?.name}" has been assigned to you. Stage: ${instance.currentStage?.name}`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          stageName: instance.currentStage?.name,
          createdBy,
        },
        workflowInstanceId,
      });

      // Log audit entry
      await AuditLogService.logWorkflowAction(
        tenantId,
        workflowInstanceId,
        'WorkflowCreated',
        createdBy,
        {
          templateId: instance.workflowTemplateId,
          stageName: instance.currentStage?.name,
          assignedUsers: userIds.length,
        }
      );
    } catch (error) {
      // Log but don't throw - notifications failing shouldn't break workflow
      console.error(`Failed to send workflow created notification: ${error}`);
    }
  }

  /**
   * Send notification when workflow advances to next stage
   */
  static async notifyWorkflowAdvanced(
    workflowInstanceId: string,
    tenantId: string,
    nextStageId: string,
    previousStageId: string,
    actorId: string
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { template: true, currentStage: true },
      });

      const previousStage = await prisma.workflowStage.findUnique({
        where: { id: previousStageId },
      });

      if (!instance || !previousStage) return;

      // Get users assigned to next stage
      const nextStageResponsibilities = await prisma.stageResponsibility.findMany({
        where: {
          stageId: nextStageId,
          type: 'User',
        },
      });

      if (nextStageResponsibilities.length === 0) return;

      const userIds = nextStageResponsibilities.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'WorkflowAssigned',
        subject: `Workflow Advanced: ${instance.template?.name || 'Untitled'}`,
        message: `Workflow "${instance.template?.name}" has advanced from "${previousStage.name}" to your stage: "${instance.currentStage?.name}"`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          previousStage: previousStage.name,
          currentStage: instance.currentStage?.name,
        },
        workflowInstanceId,
      });

      // Log audit entry
      await AuditLogService.logWorkflowAction(
        tenantId,
        workflowInstanceId,
        'WorkflowAdvanced',
        actorId,
        {
          previousStage: previousStage.name,
          currentStage: instance.currentStage?.name,
          assignedUsers: userIds.length,
        }
      );
    } catch (error) {
      console.error(`Failed to send workflow advanced notification: ${error}`);
    }
  }

  /**
   * Send notification when workflow is approved
   */
  static async notifyWorkflowApproved(
    workflowInstanceId: string,
    tenantId: string,
    approvedBy: string
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { template: true },
      });

      if (!instance) return;

      // Get workflow creator and all stakeholders
      const stakeholders = await prisma.stageResponsibility.findMany({
        where: {
          stage: {
            workflowTemplateId: instance.workflowTemplateId,
          },
          type: 'User',
        },
        distinct: ['value'],
      });

      if (stakeholders.length === 0) return;

      const userIds = stakeholders.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'WorkflowApproved',
        subject: `Workflow Approved: ${instance.template?.name || 'Untitled'}`,
        message: `Workflow "${instance.template?.name}" has been APPROVED and is now complete.`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          approvedBy,
        },
        workflowInstanceId,
      });

      // Log audit entry
      await AuditLogService.logWorkflowAction(
        tenantId,
        workflowInstanceId,
        'WorkflowApproved',
        approvedBy,
        {
          templateName: instance.template?.name,
          notifiedUsers: userIds.length,
        }
      );
    } catch (error) {
      console.error(`Failed to send workflow approved notification: ${error}`);
    }
  }

  /**
   * Send notification when workflow is rejected
   */
  static async notifyWorkflowRejected(
    workflowInstanceId: string,
    tenantId: string,
    rejectedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { template: true, currentStage: true },
      });

      if (!instance) return;

      // Get all stakeholders
      const stageResponsibilities = await prisma.stageResponsibility.findMany({
        where: {
          stage: {
            workflowTemplateId: instance.workflowTemplateId,
          },
          type: 'User',
        },
        distinct: ['value'],
      });

      if (stageResponsibilities.length === 0) return;

      const userIds = stageResponsibilities.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'WorkflowRejected',
        subject: `Workflow Rejected: ${instance.template?.name || 'Untitled'}`,
        message: `Workflow "${instance.template?.name}" has been REJECTED at stage "${instance.currentStage?.name}". ${reason ? `Reason: ${reason}` : ''}`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          rejectedBy,
          reason: reason || 'No reason provided',
        },
        workflowInstanceId,
      });

      // Log audit entry
      await AuditLogService.logWorkflowAction(
        tenantId,
        workflowInstanceId,
        'WorkflowRejected',
        rejectedBy,
        {
          templateName: instance.template?.name,
          stageName: instance.currentStage?.name,
          reason: reason || 'No reason provided',
          notifiedUsers: userIds.length,
        }
      );
    } catch (error) {
      console.error(`Failed to send workflow rejected notification: ${error}`);
    }
  }

  /**
   * Send notification when workflow is returned to a previous stage
   */
  static async notifyWorkflowReturned(
    workflowInstanceId: string,
    tenantId: string,
    returnedBy: string,
    returnToStageName: string,
    reason?: string
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { template: true, currentStage: true },
      });

      if (!instance) return;

      // Get users assigned to return stage
      const returnStageResponsibilities = await prisma.stageResponsibility.findMany({
        where: {
          stage: { name: returnToStageName },
          type: 'User',
        },
      });

      if (returnStageResponsibilities.length === 0) return;

      const userIds = returnStageResponsibilities.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'WorkflowReturned',
        subject: `Workflow Returned: ${instance.template?.name || 'Untitled'}`,
        message: `Workflow "${instance.template?.name}" has been RETURNED to your stage "${returnToStageName}" for review. ${reason ? `Reason: ${reason}` : ''}`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          returnedBy,
          returnToStage: returnToStageName,
          reason: reason || 'No reason provided',
        },
        workflowInstanceId,
      });

      // Log audit entry
      await AuditLogService.logWorkflowAction(
        tenantId,
        workflowInstanceId,
        'WorkflowReturned',
        returnedBy,
        {
          templateName: instance.template?.name,
          returnedToStage: returnToStageName,
          reason: reason || 'No reason provided',
          notifiedUsers: userIds.length,
        }
      );
    } catch (error) {
      console.error(`Failed to send workflow returned notification: ${error}`);
    }
  }

  /**
   * Send notification for SLA warnings
   */
  static async notifySLAWarning(
    workflowInstanceId: string,
    tenantId: string,
    stageName: string,
    hoursRemaining: number
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { template: true, currentStage: true },
      });

      if (!instance) return;

      // Get users assigned to current stage
      const stageResponsibilities = await prisma.stageResponsibility.findMany({
        where: {
          stageId: instance.currentStageId,
          type: 'User',
        },
      });

      if (stageResponsibilities.length === 0) return;

      const userIds = stageResponsibilities.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'SLAWarning',
        subject: `SLA Warning: ${instance.template?.name || 'Untitled'}`,
        message: `Workflow "${instance.template?.name}" has ${hoursRemaining} hours remaining before SLA breach in stage "${stageName}".`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          stageName,
          hoursRemaining,
        },
        workflowInstanceId,
      });
    } catch (error) {
      console.error(`Failed to send SLA warning notification: ${error}`);
    }
  }

  /**
   * Send notification for SLA breaches
   */
  static async notifySLABreach(
    workflowInstanceId: string,
    tenantId: string,
    stageName: string,
    hoursBreach: number
  ): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: { template: true },
      });

      if (!instance) return;

      // Get all stakeholders to notify of breach
      const stageResponsibilities = await prisma.stageResponsibility.findMany({
        where: {
          stage: {
            workflowTemplateId: instance.workflowTemplateId,
          },
          type: 'User',
        },
        distinct: ['value'],
      });

      if (stageResponsibilities.length === 0) return;

      const userIds = stageResponsibilities.map((sr) => sr.value);

      await NotificationService.sendBulkNotifications(tenantId, {
        userIds,
        eventType: 'SLABreached',
        subject: `SLA BREACH: ${instance.template?.name || 'Untitled'}`,
        message: `CRITICAL: Workflow "${instance.template?.name}" has breached its SLA by ${hoursBreach} hours at stage "${stageName}". Immediate action required.`,
        data: {
          workflowInstanceId,
          templateName: instance.template?.name,
          stageName,
          hoursBreach,
        },
        workflowInstanceId,
      });
    } catch (error) {
      console.error(`Failed to send SLA breach notification: ${error}`);
    }
  }
}
