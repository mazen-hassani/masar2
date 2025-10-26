/**
 * Workflow Escalation Integration Endpoint
 * POST /api/workflows/:workflowInstanceId/check-escalation - Check and execute escalation if needed
 * GET /api/workflows/:workflowInstanceId/check-escalation?action=status - Get escalation status
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { EscalationExecutor } from '@/lib/services/escalation-executor';
import { SLAManagementService } from '@/lib/services/sla-management-service';
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
    const action = new URL(request.url).searchParams.get('action') || 'sla';

    if (action === 'status') {
      const escalationStatus = await EscalationExecutor.getEscalationStatus(workflowInstanceId);
      return ApiResponseBuilder.success(escalationStatus);
    }

    // Default: Get SLA compliance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = (await prisma.workflowInstance.findUnique({
      where: { id: workflowInstanceId },
      include: {
        currentStage: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

    if (!instance) {
      return ApiResponseBuilder.notFound('Workflow instance not found');
    }

    const slaCompliance = SLAManagementService.calculateSLACompliance(instance);
    const escalationStatus = await EscalationExecutor.getEscalationStatus(workflowInstanceId);

    return ApiResponseBuilder.success({
      workflowInstanceId,
      slaCompliance,
      escalationStatus,
    });
  } catch (error) {
    console.error('Failed to get escalation info:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowInstanceId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { workflowInstanceId } = params;

    // Get workflow escalation policy
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

    // For now, use a default escalation policy ID
    // In production, retrieve from database
    const escalationPolicyId = `policy-${instance.template?.id}`;

    const escalationEvent = await EscalationExecutor.checkAndEscalate(
      workflowInstanceId,
      tenantId,
      escalationPolicyId,
      userId
    );

    return ApiResponseBuilder.success({
      workflowInstanceId,
      escalationTriggered: !!escalationEvent,
      escalationEvent: escalationEvent || null,
    });
  } catch (error) {
    console.error('Failed to check escalation:', error);
    return ApiResponseBuilder.internalError();
  }
}
