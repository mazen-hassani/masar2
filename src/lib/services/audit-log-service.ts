/**
 * Audit Log Service
 * Maintains complete audit trail of workflow actions and system events
 */

import { PrismaClient } from '@prisma/client';
import {
  AuditLog,
  CreateAuditLogRequest,
  AuditLogQuery,
  AuditLogSummary,
  WorkflowAuditTrail,
  WorkflowChangeHistory,
} from '@/types/notifications';

const prisma = new PrismaClient();

// ============================================================================
// AUDIT LOG SERVICE
// ============================================================================

export class AuditLogService {
  /**
   * Create an audit log entry
   */
  static async logAction(tenantId: string, request: CreateAuditLogRequest): Promise<AuditLog> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditLog = await prisma.auditLog.create({
      data: {
        tenantId,
        actionType: request.actionType,
        actionDescription: request.actionDescription,
        severity: request.severity || 'Info',
        entityType: request.entityType,
        entityId: request.entityId,
        parentEntityId: request.parentEntityId || null,
        actorId: request.actorId || null,
        actorName: request.actorName || null,
        actorEmail: request.actorEmail || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changeDetails: request.changeDetails as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldValues: (request.oldValues || null) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newValues: (request.newValues || null) as any,
        ipAddress: request.ipAddress || null,
        userAgent: request.userAgent || null,
        correlationId: request.correlationId || null,
        workflowInstanceId: request.workflowInstanceId || null,
        timestamp: new Date(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return auditLog as any;
  }

  /**
   * Query audit logs with filters
   */
  static async queryLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.actionType) where.actionType = query.actionType;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.severity) where.severity = query.severity;
    if (query.workflowInstanceId) where.workflowInstanceId = query.workflowInstanceId;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    const [logs, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.auditLog.findMany({
        where,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: query.skip || 0,
        take: query.take || 50,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit log by ID
   */
  static async getLog(logId: string): Promise<AuditLog | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.auditLog.findUnique({
      where: { id: logId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  }

  /**
   * Get audit trail for workflow instance
   */
  static async getWorkflowAuditTrail(workflowInstanceId: string): Promise<WorkflowAuditTrail> {
    // Get workflow instance
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: workflowInstanceId },
      include: {
        currentStage: true,
        stageActions: {
          include: { stage: true },
          orderBy: { actionDate: 'asc' },
        },
      },
    });

    if (!instance) {
      throw new Error(`Workflow instance not found: ${workflowInstanceId}`);
    }

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { workflowInstanceId },
      orderBy: { timestamp: 'asc' },
    });

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: { workflowInstanceId },
      orderBy: { createdAt: 'asc' },
    });

    // Build stage history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageMap = new Map<string, any>();

    // First pass: collect unique stages
    instance.stageActions.forEach((action) => {
      if (!stageMap.has(action.stageId)) {
        stageMap.set(action.stageId, {
          stageId: action.stageId,
          stageName: action.stage?.name || 'Unknown',
          assignedAt: action.stageAssignedDate,
          completedAt: null,
          actions: [],
        });
      }
    });

    // Second pass: add actions to stages
    instance.stageActions.forEach((action) => {
      const stage = stageMap.get(action.stageId);
      if (stage) {
        stage.actions.push({
          actionId: action.id,
          action: action.action,
          actorId: action.actorId,
          actorName: undefined,
          comment: action.comment,
          timestamp: action.actionDate,
        });
        stage.completedAt = action.actionDate;
      }
    });

    return {
      workflowInstanceId,
      createdAt: instance.createdAt,
      createdBy: instance.createdBy || 'System',
      stages: Array.from(stageMap.values()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auditLogs: auditLogs as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifications: notifications as any,
    };
  }

  /**
   * Get change history for entity
   */
  static async getChangeHistory(
    entityId: string,
    entityType?: string
  ): Promise<WorkflowChangeHistory[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { entityId };
    if (entityType) where.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return logs.map((log) => ({
      workflowInstanceId: log.workflowInstanceId || '',
      changeType: this.mapActionToChangeType(log.actionType),
      previousValue: log.oldValues || {},
      newValue: log.newValues || {},
      changedBy: log.actorId || 'System',
      changedAt: log.timestamp,
      reason: log.actionDescription,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
  }

  /**
   * Get audit summary
   */
  static async getSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditLogSummary> {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Action breakdown
    const actionMap = new Map<string, number>();
    logs.forEach((log) => {
      actionMap.set(log.actionType, (actionMap.get(log.actionType) || 0) + 1);
    });

    // Severity breakdown
    const severityMap = new Map<string, number>();
    logs.forEach((log) => {
      severityMap.set(log.severity, (severityMap.get(log.severity) || 0) + 1);
    });

    // Top actors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorMap = new Map<string, { count: number; name?: string }>();
    logs.forEach((log) => {
      if (log.actorId) {
        const existing = actorMap.get(log.actorId) || { count: 0, ...(log.actorName && { name: log.actorName }) };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newEntry: any = { count: existing.count + 1 };
        if (existing.name || log.actorName) {
          newEntry.name = existing.name || log.actorName;
        }
        actorMap.set(log.actorId, newEntry);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topActors: any = Array.from(actorMap.entries())
      .map(([actorId, data]) => ({
        actorId,
        ...(data.name && { actorName: data.name }),
        actionCount: data.count,
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      totalRecords: logs.length,
      dateRange: { startDate, endDate },
      actionBreakdown: Array.from(actionMap.entries()).map(([actionType, count]) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionType: actionType as any,
        count,
      })),
      severityBreakdown: Array.from(severityMap.entries()).map(([severity, count]) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severity: severity as any,
        count,
      })),
      topActors,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Export audit logs
   */
  static async exportLogs(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (format === 'csv') {
      return this.logsToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Delete old audit logs (for data retention policies)
   */
  static async deleteOldLogs(tenantId: string, beforeDate: Date): Promise<number> {
    const result = await prisma.auditLog.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: beforeDate },
      },
    });

    return result.count;
  }

  /**
   * Log workflow action with context
   */
  static async logWorkflowAction(
    tenantId: string,
    workflowInstanceId: string,
    action: string,
    actorId: string,
    changeDetails: Record<string, unknown>,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ): Promise<AuditLog> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.logAction(tenantId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionType: action as any,
      actionDescription: `Workflow action: ${action}`,
      severity: 'Info',
      entityType: 'WorkflowInstance',
      entityId: workflowInstanceId,
      actorId,
      changeDetails,
      oldValues,
      newValues,
      workflowInstanceId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  /**
   * Convert logs to CSV format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static logsToCSV(logs: any[]): string {
    if (logs.length === 0) {
      return 'No logs found';
    }

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'Actor',
      'Severity',
      'Description',
    ];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.actionType,
      log.entityType,
      log.entityId,
      log.actorName || log.actorId || 'System',
      log.severity,
      log.actionDescription,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Map action type to change type
   */
  private static mapActionToChangeType(
    actionType: string
  ): 'Created' | 'StatusChanged' | 'StageAdvanced' | 'Returned' | 'Completed' {
    if (actionType.includes('Created')) return 'Created';
    if (actionType.includes('Approved')) return 'Completed';
    if (actionType.includes('Returned')) return 'Returned';
    if (actionType.includes('Status')) return 'StatusChanged';
    return 'StageAdvanced';
  }
}
