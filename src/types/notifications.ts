/**
 * Notification & Audit Log Type Definitions
 * Handles workflow notifications and complete audit trail tracking
 */

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification method preference
 */
export type NotificationDeliveryMethod = 'Email' | 'InApp' | 'Both';

/**
 * Notification event types
 */
export type NotificationEventType =
  | 'WorkflowAssigned'
  | 'WorkflowApproved'
  | 'WorkflowRejected'
  | 'WorkflowReturned'
  | 'SLAWarning'
  | 'SLABreached'
  | 'WorkflowCompleted';

/**
 * Notification status
 */
export type NotificationStatus = 'Pending' | 'Sent' | 'Failed' | 'Read';

/**
 * Notification template parameters
 */
export interface NotificationData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Base notification entity
 */
export interface Notification {
  id: string;
  tenantId: string;

  // Recipient
  userId: string;
  email: string;

  // Content
  eventType: NotificationEventType;
  subject: string;
  message: string;
  data: NotificationData;

  // Delivery
  deliveryMethod: NotificationDeliveryMethod;
  status: NotificationStatus;

  // Timing
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  failureReason?: string;

  // Relations
  workflowInstanceId?: string;
}

/**
 * Create notification request
 */
export interface CreateNotificationRequest {
  userId: string;
  email: string;
  eventType: NotificationEventType;
  subject: string;
  message: string;
  data?: NotificationData;
  deliveryMethod?: NotificationDeliveryMethod;
  workflowInstanceId?: string;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  tenantId: string;

  // Definition
  eventType: NotificationEventType;
  name: string;
  description?: string;

  // Email template
  emailSubjectTemplate: string;
  emailBodyTemplate: string;

  // In-app template
  inAppTitleTemplate: string;
  inAppMessageTemplate: string;

  // Configuration
  deliveryMethod: NotificationDeliveryMethod;
  isActive: boolean;

  // Audit
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create notification template request
 */
export interface CreateNotificationTemplateRequest {
  eventType: NotificationEventType;
  name: string;
  description?: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  inAppTitleTemplate: string;
  inAppMessageTemplate: string;
  deliveryMethod?: NotificationDeliveryMethod;
  isActive?: boolean;
}

/**
 * Notification preference for user
 */
export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;

  // Event preferences
  eventType: NotificationEventType;
  enabled: boolean;
  deliveryMethod: NotificationDeliveryMethod;

  // Quiet hours
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  quietHoursEnabled: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bulk notification send request
 */
export interface BulkNotificationRequest {
  userIds: string[];
  eventType: NotificationEventType;
  subject: string;
  message: string;
  data?: NotificationData;
  workflowInstanceId?: string;
}

/**
 * Notification send result
 */
export interface NotificationSendResult {
  notificationId: string;
  userId: string;
  email: string;
  eventType: NotificationEventType;
  deliveryMethod: NotificationDeliveryMethod;
  status: NotificationStatus;
  sentAt?: Date;
  failureReason?: string;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

/**
 * Audit log action type
 */
export type AuditLogActionType =
  | 'WorkflowCreated'
  | 'WorkflowApproved'
  | 'WorkflowRejected'
  | 'WorkflowReturned'
  | 'TemplateCreated'
  | 'TemplateUpdated'
  | 'TemplateDeleted'
  | 'StageCreated'
  | 'StageUpdated'
  | 'StageDeleted'
  | 'ResponsibilityAdded'
  | 'ResponsibilityRemoved'
  | 'CommentAdded'
  | 'AttachmentAdded'
  | 'AttachmentRemoved';

/**
 * Audit log severity level
 */
export type AuditLogSeverity = 'Info' | 'Warning' | 'Error' | 'Critical';

/**
 * Audit log entity type
 */
export type AuditLogEntityType =
  | 'WorkflowTemplate'
  | 'WorkflowInstance'
  | 'WorkflowStage'
  | 'StageAction'
  | 'Notification'
  | 'User'
  | 'System';

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  tenantId: string;

  // Action details
  actionType: AuditLogActionType;
  actionDescription: string;
  severity: AuditLogSeverity;

  // Entity information
  entityType: AuditLogEntityType;
  entityId: string;
  parentEntityId?: string;

  // User who performed action
  actorId?: string;
  actorName?: string;
  actorEmail?: string;

  // Changes
  changeDetails: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;

  // Context
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;

  // Timing
  createdAt: Date;
  timestamp: Date;

  // Relations
  workflowInstanceId?: string;
}

/**
 * Create audit log request
 */
export interface CreateAuditLogRequest {
  actionType: AuditLogActionType;
  actionDescription: string;
  severity?: AuditLogSeverity;
  entityType: AuditLogEntityType;
  entityId: string;
  parentEntityId?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  changeDetails: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  workflowInstanceId?: string;
}

/**
 * Audit log query filters
 */
export interface AuditLogQuery {
  tenantId?: string;
  actionType?: AuditLogActionType;
  entityType?: AuditLogEntityType;
  entityId?: string;
  actorId?: string;
  severity?: AuditLogSeverity;
  startDate?: Date;
  endDate?: Date;
  workflowInstanceId?: string;
  sortBy?: 'createdAt' | 'severity' | 'actionType';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Audit log summary
 */
export interface AuditLogSummary {
  totalRecords: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  actionBreakdown: {
    actionType: AuditLogActionType;
    count: number;
  }[];
  severityBreakdown: {
    severity: AuditLogSeverity;
    count: number;
  }[];
  topActors: {
    actorId: string;
    actorName?: string;
    actionCount: number;
  }[];
}

/**
 * Workflow audit trail - All actions for a single workflow
 */
export interface WorkflowAuditTrail {
  workflowInstanceId: string;
  createdAt: Date;
  createdBy?: string;

  stages: {
    stageId: string;
    stageName: string;
    assignedAt: Date;
    completedAt?: Date;
    actions: {
      actionId: string;
      action: 'Approved' | 'Rejected' | 'Returned';
      actorId: string;
      actorName?: string;
      comment?: string;
      timestamp: Date;
    }[];
  }[];

  auditLogs: AuditLog[];
  notifications: Notification[];
}

/**
 * Workflow change history entry
 */
export interface WorkflowChangeHistory {
  workflowInstanceId: string;
  changeType: 'Created' | 'StatusChanged' | 'StageAdvanced' | 'Returned' | 'Completed';
  previousValue?: string | Record<string, unknown>;
  newValue?: string | Record<string, unknown>;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  totalSent: number;
  totalFailed: number;
  totalRead: number;
  successRate: number; // 0-100
  averageDeliveryTime?: number; // milliseconds

  byEventType: {
    eventType: NotificationEventType;
    sent: number;
    failed: number;
    read: number;
  }[];

  byDeliveryMethod: {
    deliveryMethod: NotificationDeliveryMethod;
    sent: number;
    failed: number;
  }[];

  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Notification response (API)
 */
export interface NotificationResponse
  extends Omit<Notification, 'createdAt' | 'sentAt' | 'readAt'> {
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}

/**
 * Audit log response (API)
 */
export interface AuditLogResponse extends Omit<AuditLog, 'createdAt' | 'timestamp'> {
  createdAt: string;
  timestamp: string;
}
