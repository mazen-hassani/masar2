/**
 * SLA Compliance Endpoint
 * GET /api/sla/compliance/:workflowInstanceId - Get SLA compliance for workflow
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
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

    // Get workflow instance
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

    // Calculate compliance
    const compliance = SLAManagementService.calculateSLACompliance(instance);

    return ApiResponseBuilder.success(compliance);
  } catch (error) {
    console.error('Failed to get SLA compliance:', error);
    return ApiResponseBuilder.internalError();
  }
}
