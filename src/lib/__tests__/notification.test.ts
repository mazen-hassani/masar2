/**
 * Notification & Audit Log Service Tests
 * Tests for notification delivery and audit trail tracking
 */

import { describe, it, expect } from 'vitest';
import { NotificationService } from '@/lib/services/notification-service';
import { AuditLogService } from '@/lib/services/audit-log-service';

// ============================================================================
// NOTIFICATION SERVICE TESTS
// ============================================================================

describe('NotificationService', () => {
  const tenantId = 'test-tenant-1';
  const userId = 'user-123';
  const email = 'user@example.com';

  describe('sendNotification', () => {
    it('should create notification with valid data', async () => {
      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'New Workflow Assigned',
        message: 'You have a new workflow to approve',
      });

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(userId);
      expect(notification.email).toBe(email);
      expect(notification.eventType).toBe('WorkflowAssigned');
      expect(notification.status).toBe('Pending');
    });

    it('should use user preference for delivery method', async () => {
      // Set user preference
      await NotificationService.setPreference(
        tenantId,
        userId,
        'WorkflowApproved',
        'Email',
        true
      );

      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowApproved',
        subject: 'Workflow Approved',
        message: 'Your workflow was approved',
      });

      expect(notification.deliveryMethod).toBe('Email');
    });

    it('should include notification data', async () => {
      const notificationData = {
        projectName: 'Test Project',
        approvalCount: '2',
        budgetAmount: '50000',
      };

      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'New workflow {{projectName}}',
        message: 'Please review {{projectName}}',
        data: notificationData,
      });

      expect(notification.data).toEqual(notificationData);
    });

    it('should store workflow instance reference', async () => {
      const workflowInstanceId = 'workflow-123';

      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'Workflow Assigned',
        message: 'New workflow',
        workflowInstanceId,
      });

      expect(notification.workflowInstanceId).toBe(workflowInstanceId);
    });
  });

  describe('markAsSent', () => {
    it('should update notification status to Sent', async () => {
      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'Test',
        message: 'Test message',
      });

      const updated = await NotificationService.markAsSent(notification.id);

      expect(updated.status).toBe('Sent');
      expect(updated.sentAt).toBeDefined();
    });

    it('should mark notification as failed with reason', async () => {
      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'Test',
        message: 'Test message',
      });

      const updated = await NotificationService.markAsFailed(
        notification.id,
        'Email service unavailable'
      );

      expect(updated.status).toBe('Failed');
      expect(updated.failureReason).toBe('Email service unavailable');
    });

    it('should mark notification as read', async () => {
      const notification = await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'Test',
        message: 'Test message',
      });

      const updated = await NotificationService.markAsRead(notification.id);

      expect(updated.status).toBe('Read');
      expect(updated.readAt).toBeDefined();
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve user notifications sorted by date', async () => {
      // Create multiple notifications
      await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowAssigned',
        subject: 'First',
        message: 'First notification',
      });

      await NotificationService.sendNotification(tenantId, {
        userId,
        email,
        eventType: 'WorkflowApproved',
        subject: 'Second',
        message: 'Second notification',
      });

      const { notifications, total } = await NotificationService.getUserNotifications(
        tenantId,
        userId,
        0,
        10
      );

      expect(total).toBeGreaterThanOrEqual(2);
      expect(notifications.length).toBeGreaterThanOrEqual(2);
      expect(notifications[0].createdAt).toBeGreaterThanOrEqual(notifications[1].createdAt);
    });

    it('should respect pagination', async () => {
      const { notifications: page1 } = await NotificationService.getUserNotifications(
        tenantId,
        userId,
        0,
        1
      );
      const { notifications: page2 } = await NotificationService.getUserNotifications(
        tenantId,
        userId,
        1,
        1
      );

      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });

  describe('getUnreadCount', () => {
    it('should count unread notifications', async () => {
      const notification = await NotificationService.sendNotification(tenantId, {
        userId: 'user-unread-test',
        email: 'unread@example.com',
        eventType: 'WorkflowAssigned',
        subject: 'Unread Test',
        message: 'Test',
      });

      const unreadBefore = await NotificationService.getUnreadCount(
        tenantId,
        'user-unread-test'
      );

      expect(unreadBefore).toBeGreaterThan(0);

      await NotificationService.markAsRead(notification.id);

      const unreadAfter = await NotificationService.getUnreadCount(
        tenantId,
        'user-unread-test'
      );

      expect(unreadAfter).toBeLessThan(unreadBefore);
    });
  });

  describe('renderTemplate', () => {
    it('should replace template placeholders with data', () => {
      const template = 'Hello {{name}}, your project {{projectName}} needs approval';
      const data = {
        name: 'John',
        projectName: 'Alpha Project',
      };

      const rendered = NotificationService.renderTemplate(template, data);

      expect(rendered).toBe('Hello John, your project Alpha Project needs approval');
    });

    it('should handle missing data gracefully', () => {
      const template = 'Hello {{name}}, your status is {{status}}';
      const data = { name: 'John' };

      const rendered = NotificationService.renderTemplate(template, data);

      expect(rendered).toBe('Hello John, your status is ');
    });

    it('should replace multiple occurrences', () => {
      const template = '{{name}} {{name}} {{name}}';
      const data = { name: 'John' };

      const rendered = NotificationService.renderTemplate(template, data);

      expect(rendered).toBe('John John John');
    });
  });

  describe('setPreference', () => {
    it('should create user preference', async () => {
      const preference = await NotificationService.setPreference(
        tenantId,
        'pref-user-1',
        'WorkflowAssigned',
        'Email',
        true
      );

      expect(preference.userId).toBe('pref-user-1');
      expect(preference.eventType).toBe('WorkflowAssigned');
      expect(preference.deliveryMethod).toBe('Email');
      expect(preference.enabled).toBe(true);
    });

    it('should update existing preference', async () => {
      const userId = 'update-pref-user';

      const initial = await NotificationService.setPreference(
        tenantId,
        userId,
        'WorkflowApproved',
        'Email',
        true
      );

      const updated = await NotificationService.setPreference(
        tenantId,
        userId,
        'WorkflowApproved',
        'Both',
        false
      );

      expect(updated.id).toBe(initial.id);
      expect(updated.deliveryMethod).toBe('Both');
      expect(updated.enabled).toBe(false);
    });
  });

  describe('shouldSendNotification', () => {
    it('should allow notification when preference enabled', async () => {
      const userId = 'should-send-user';

      await NotificationService.setPreference(
        tenantId,
        userId,
        'WorkflowAssigned',
        'Email',
        true
      );

      const should = await NotificationService.shouldSendNotification(
        tenantId,
        userId,
        'WorkflowAssigned'
      );

      expect(should).toBe(true);
    });

    it('should prevent notification when preference disabled', async () => {
      const userId = 'no-send-user';

      await NotificationService.setPreference(
        tenantId,
        userId,
        'WorkflowRejected',
        'Email',
        false
      );

      const should = await NotificationService.shouldSendNotification(
        tenantId,
        userId,
        'WorkflowRejected'
      );

      expect(should).toBe(false);
    });

    it('should allow notification without preference set', async () => {
      const should = await NotificationService.shouldSendNotification(
        tenantId,
        'nonexistent-user',
        'WorkflowCompleted'
      );

      expect(should).toBe(true);
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications to multiple users', async () => {
      const results = await NotificationService.sendBulkNotifications(tenantId, {
        userIds: ['user-1', 'user-2', 'user-3'],
        eventType: 'WorkflowAssigned',
        subject: 'Bulk Test',
        message: 'Test message for bulk',
      });

      expect(results.length).toBe(3);
      expect(results.every((r) => r.status === 'Sent' || r.status === 'Failed')).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should calculate notification statistics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const stats = await NotificationService.getStatistics(tenantId, startDate, endDate);

      expect(stats.totalSent).toBeGreaterThanOrEqual(0);
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// AUDIT LOG SERVICE TESTS
// ============================================================================

describe('AuditLogService', () => {
  const tenantId = 'audit-test-tenant';

  describe('logAction', () => {
    it('should create audit log entry', async () => {
      const log = await AuditLogService.logAction(tenantId, {
        actionType: 'WorkflowApproved',
        actionDescription: 'Workflow approved by admin',
        severity: 'Info',
        entityType: 'WorkflowInstance',
        entityId: 'workflow-123',
        actorId: 'admin-user',
        actorName: 'Admin User',
        changeDetails: { status: 'Approved' },
      });

      expect(log).toBeDefined();
      expect(log.actionType).toBe('WorkflowApproved');
      expect(log.entityId).toBe('workflow-123');
      expect(log.actorId).toBe('admin-user');
    });

    it('should record change details', async () => {
      const changeDetails = {
        previousStatus: 'InProgress',
        newStatus: 'Approved',
      };

      const log = await AuditLogService.logAction(tenantId, {
        actionType: 'WorkflowApproved',
        actionDescription: 'Status changed',
        severity: 'Info',
        entityType: 'WorkflowInstance',
        entityId: 'workflow-456',
        changeDetails,
        oldValues: { status: 'InProgress' },
        newValues: { status: 'Approved' },
      });

      expect(log.changeDetails).toEqual(changeDetails);
      expect(log.oldValues).toEqual({ status: 'InProgress' });
      expect(log.newValues).toEqual({ status: 'Approved' });
    });

    it('should record context information', async () => {
      const log = await AuditLogService.logAction(tenantId, {
        actionType: 'WorkflowCreated',
        actionDescription: 'Workflow created',
        severity: 'Info',
        entityType: 'WorkflowInstance',
        entityId: 'workflow-789',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        correlationId: 'correlation-123',
        changeDetails: {},
      });

      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
      expect(log.correlationId).toBe('correlation-123');
    });
  });

  describe('queryLogs', () => {
    it('should query logs with filters', async () => {
      const { logs, total } = await AuditLogService.queryLogs({
        tenantId,
        actionType: 'WorkflowApproved',
        skip: 0,
        take: 50,
      });

      expect(Array.isArray(logs)).toBe(true);
      expect(typeof total).toBe('number');
    });

    it('should filter by entity type', async () => {
      const { logs } = await AuditLogService.queryLogs({
        tenantId,
        entityType: 'WorkflowInstance',
        take: 10,
      });

      if (logs.length > 0) {
        expect(logs.every((log) => log.entityType === 'WorkflowInstance')).toBe(true);
      }
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const { logs } = await AuditLogService.queryLogs({
        tenantId,
        startDate,
        endDate,
        take: 10,
      });

      if (logs.length > 0) {
        expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      }
    });

    it('should respect sort order', async () => {
      const { logs: ascending } = await AuditLogService.queryLogs({
        tenantId,
        sortBy: 'createdAt',
        sortOrder: 'asc',
        take: 2,
      });

      const { logs: descending } = await AuditLogService.queryLogs({
        tenantId,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        take: 2,
      });

      if (ascending.length > 1 && descending.length > 1) {
        expect(ascending[0].createdAt.getTime()).toBeLessThanOrEqual(
          ascending[1].createdAt.getTime()
        );
        expect(descending[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          descending[1].createdAt.getTime()
        );
      }
    });
  });

  describe('getSummary', () => {
    it('should generate audit summary', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const summary = await AuditLogService.getSummary(tenantId, startDate, endDate);

      expect(summary).toBeDefined();
      expect(summary.totalRecords).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.actionBreakdown)).toBe(true);
      expect(Array.isArray(summary.severityBreakdown)).toBe(true);
      expect(Array.isArray(summary.topActors)).toBe(true);
    });

    it('should identify top actors', async () => {
      // Create logs with same actor
      const actorId = 'frequent-actor';
      for (let i = 0; i < 3; i++) {
        await AuditLogService.logAction(tenantId, {
          actionType: 'WorkflowApproved',
          actionDescription: 'Test',
          severity: 'Info',
          entityType: 'WorkflowInstance',
          entityId: `workflow-${i}`,
          actorId,
          changeDetails: {},
        });
      }

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const summary = await AuditLogService.getSummary(tenantId, startDate, endDate);

      const topActor = summary.topActors.find((a) => a.actorId === actorId);
      if (topActor) {
        expect(topActor.actionCount).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('getChangeHistory', () => {
    it('should retrieve change history for entity', async () => {
      const entityId = 'entity-123';

      await AuditLogService.logAction(tenantId, {
        actionType: 'WorkflowCreated',
        actionDescription: 'Created',
        severity: 'Info',
        entityType: 'WorkflowInstance',
        entityId,
        changeDetails: { status: 'Created' },
      });

      const history = await AuditLogService.getChangeHistory(entityId);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const json = await AuditLogService.exportLogs(tenantId, startDate, endDate, 'json');

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export logs as CSV', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const csv = await AuditLogService.exportLogs(tenantId, startDate, endDate, 'csv');

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Timestamp');
    });
  });

  describe('logWorkflowAction', () => {
    it('should log workflow action with context', async () => {
      const log = await AuditLogService.logWorkflowAction(
        tenantId,
        'workflow-action-test',
        'Approved',
        'approver-user',
        { status: 'Approved' },
        { status: 'InProgress' },
        { status: 'Approved' }
      );

      expect(log.workflowInstanceId).toBe('workflow-action-test');
      expect(log.actionType).toBe('Approved');
      expect(log.actorId).toBe('approver-user');
    });
  });
});
