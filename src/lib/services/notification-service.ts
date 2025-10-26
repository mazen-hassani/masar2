/**
 * Notification Service
 * Manages workflow notifications via email and in-app messaging
 */

import { PrismaClient } from '@prisma/client';
import {
  Notification,
  CreateNotificationRequest,
  NotificationTemplate,
  CreateNotificationTemplateRequest,
  NotificationPreference,
  NotificationSendResult,
  BulkNotificationRequest,
  NotificationEventType,
  NotificationDeliveryMethod,
  NotificationStats,
} from '@/types/notifications';

const prisma = new PrismaClient();

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  /**
   * Send a single notification
   */
  static async sendNotification(
    tenantId: string,
    request: CreateNotificationRequest
  ): Promise<Notification> {
    // Check user preferences
    const preference = await this.getUserPreference(tenantId, request.userId, request.eventType);
    const deliveryMethod = preference?.deliveryMethod || request.deliveryMethod || 'Both';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notification = await prisma.notification.create({
      data: {
        tenantId,
        userId: request.userId,
        email: request.email,
        eventType: request.eventType,
        subject: request.subject,
        message: request.message,
        data: request.data || {},
        deliveryMethod,
        status: 'Pending',
        workflowInstanceId: request.workflowInstanceId || null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Queue for sending (would be async in production)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.queueNotificationSend(notification as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return notification as any;
  }

  /**
   * Send bulk notifications to multiple users
   */
  static async sendBulkNotifications(
    tenantId: string,
    request: BulkNotificationRequest
  ): Promise<NotificationSendResult[]> {
    const results: NotificationSendResult[] = [];

    for (const userId of request.userIds) {
      try {
        // Get user email (would fetch from user table in production)
        const userEmail = `user-${userId}@example.com`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notification = await this.sendNotification(tenantId, {
          userId,
          email: userEmail,
          eventType: request.eventType,
          subject: request.subject,
          message: request.message,
          data: request.data || {},
          workflowInstanceId: request.workflowInstanceId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results.push({
          notificationId: notification.id,
          userId,
          email: userEmail,
          eventType: notification.eventType,
          deliveryMethod: notification.deliveryMethod,
          status: notification.status,
          sentAt: notification.sentAt || undefined,
          failureReason: notification.failureReason || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          notificationId: '',
          userId,
          email: `user-${userId}@example.com`,
          eventType: request.eventType,
          deliveryMethod: 'Both',
          status: 'Failed',
          failureReason: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Mark notification as sent
   */
  static async markAsSent(notificationId: string, _deliveryMethod?: string): Promise<Notification> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'Sent',
        sentAt: new Date(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  /**
   * Mark notification as failed
   */
  static async markAsFailed(
    notificationId: string,
    reason: string
  ): Promise<Notification> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'Failed',
        failureReason: reason,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<Notification> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'Read',
        readAt: new Date(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  /**
   * Get user's notifications
   */
  static async getUserNotifications(
    tenantId: string,
    userId: string,
    skip: number = 0,
    take: number = 50
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: {
          tenantId,
          userId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({
        where: {
          tenantId,
          userId,
        },
      }),
    ]);

    // Type conversion for API compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { notifications: notifications as any, total };
  }

  /**
   * Get unread notifications count for user
   */
  static async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        tenantId,
        userId,
        status: { not: 'Read' },
      },
    });
  }

  /**
   * Create notification template
   */
  static async createTemplate(
    tenantId: string,
    request: CreateNotificationTemplateRequest,
    createdBy: string
  ): Promise<NotificationTemplate> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.notificationTemplate.create({
      data: {
        tenantId,
        eventType: request.eventType,
        name: request.name,
        description: request.description || null,
        emailSubjectTemplate: request.emailSubjectTemplate,
        emailBodyTemplate: request.emailBodyTemplate,
        inAppTitleTemplate: request.inAppTitleTemplate,
        inAppMessageTemplate: request.inAppMessageTemplate,
        deliveryMethod: request.deliveryMethod || 'Both',
        isActive: request.isActive !== false,
        createdBy,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  /**
   * Get template by event type
   */
  static async getTemplate(
    tenantId: string,
    eventType: NotificationEventType
  ): Promise<NotificationTemplate | null> {
    const template = (await prisma.notificationTemplate.findFirst({
      where: {
        tenantId,
        eventType,
        isActive: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
    return template;
  }

  /**
   * Render template with data
   */
  static renderTemplate(template: string, data: Record<string, unknown>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value || ''));
    }

    return rendered;
  }

  /**
   * Set user notification preference
   */
  static async setPreference(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType,
    deliveryMethod: NotificationDeliveryMethod,
    enabled: boolean = true
  ): Promise<NotificationPreference> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.notificationPreference.upsert({
      where: {
        tenantId_userId_eventType: {
          tenantId,
          userId,
          eventType,
        },
      },
      update: {
        enabled,
        deliveryMethod,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        userId,
        eventType,
        enabled,
        deliveryMethod,
        quietHoursEnabled: false,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  /**
   * Get user preference for event
   */
  static async getUserPreference(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType
  ): Promise<NotificationPreference | null> {
    const preference = (await prisma.notificationPreference.findUnique({
      where: {
        tenantId_userId_eventType: {
          tenantId,
          userId,
          eventType,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
    return preference;
  }

  /**
   * Check if user should receive notification (respects quiet hours)
   */
  static async shouldSendNotification(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType
  ): Promise<boolean> {
    const preference = await this.getUserPreference(tenantId, userId, eventType);

    if (!preference) {
      return true; // Default to sending if no preference set
    }

    if (!preference.enabled) {
      return false;
    }

    if (!preference.quietHoursEnabled) {
      return true;
    }

    // Check quiet hours
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (preference.quietHoursStart && preference.quietHoursEnd) {
      const isInQuietHours =
        currentTime >= preference.quietHoursStart && currentTime <= preference.quietHoursEnd;

      return !isInQuietHours;
    }

    return true;
  }

  /**
   * Get notification statistics for tenant
   */
  static async getStatistics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<NotificationStats> {
    const notifications = await prisma.notification.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalSent = notifications.filter((n) => n.status === 'Sent').length;
    const totalFailed = notifications.filter((n) => n.status === 'Failed').length;
    const totalRead = notifications.filter((n) => n.status === 'Read').length;

    // Calculate success rate
    const successRate =
      notifications.length > 0 ? Math.round((totalSent / notifications.length) * 100) : 0;

    // Group by event type
    const byEventType = Array.from(
      new Map(
        notifications.map((n) => [
          n.eventType,
          {
            eventType: n.eventType as NotificationEventType,
            sent: 0,
            failed: 0,
            read: 0,
          },
        ])
      ).values()
    );

    notifications.forEach((n) => {
      const typeGroup = byEventType.find((t) => t.eventType === n.eventType);
      if (typeGroup) {
        if (n.status === 'Sent') typeGroup.sent++;
        if (n.status === 'Failed') typeGroup.failed++;
        if (n.status === 'Read') typeGroup.read++;
      }
    });

    // Group by delivery method
    const byDeliveryMethod = Array.from(
      new Map(
        notifications.map((n) => [
          n.deliveryMethod,
          {
            deliveryMethod: n.deliveryMethod as NotificationDeliveryMethod,
            sent: 0,
            failed: 0,
          },
        ])
      ).values()
    );

    notifications.forEach((n) => {
      const methodGroup = byDeliveryMethod.find((m) => m.deliveryMethod === n.deliveryMethod);
      if (methodGroup) {
        if (n.status === 'Sent') methodGroup.sent++;
        if (n.status === 'Failed') methodGroup.failed++;
      }
    });

    return {
      totalSent,
      totalFailed,
      totalRead,
      successRate,
      byEventType,
      byDeliveryMethod,
      timeRange: { startDate, endDate },
    };
  }

  /**
   * Queue notification for sending (placeholder for async queue)
   */
  private static async queueNotificationSend(notification: Notification): Promise<void> {
    // In production, this would:
    // 1. Queue to Redis/message broker
    // 2. Have background worker process
    // 3. Call email service (SendGrid, SES, etc.)
    // For now, just mark as sent immediately
    await this.markAsSent(notification.id);
  }
}
