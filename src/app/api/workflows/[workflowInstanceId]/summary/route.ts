/**
 * Workflow Summary Endpoint
 * GET /api/workflows/:workflowInstanceId/summary - Get complete workflow summary with all related info
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { SLAManagementService } from '@/lib/services/sla-management-service';
import { EscalationExecutor } from '@/lib/services/escalation-executor';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowInstanceId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { workflowInstanceId } = params;

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

    if (!instance) {
      return ApiResponseBuilder.notFound('Workflow instance not found');
    }

    // Gather all related information in parallel
    const [slaCompliance, escalationStatus, auditTrail, notifications] = await Promise.all([
      SLAManagementService.calculateSLACompliance(instance),
      EscalationExecutor.getEscalationStatus(workflowInstanceId),
      AuditLogService.getWorkflowAuditTrail(workflowInstanceId).catch(() => null),
      prisma.notification.findMany({
        where: { workflowInstanceId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return ApiResponseBuilder.success({
      workflowInstanceId,
      status: instance.status,
      templateName: instance.template?.name,
      currentStageName: instance.currentStage?.name,
      createdAt: instance.createdAt,
      createdBy: instance.createdBy,
      slaCompliance,
      escalationStatus,
      auditTrail,
      recentNotifications: notifications.map((n) => ({
        id: n.id,
        subject: n.subject,
        message: n.message,
        status: n.status,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get workflow summary:', error);
    return ApiResponseBuilder.internalError();
  }
}
