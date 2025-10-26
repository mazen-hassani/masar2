/**
 * Escalation Status Endpoint
 * GET /api/escalation/status/:workflowInstanceId - Get escalation status
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { EscalationExecutor } from '@/lib/services/escalation-executor';

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

    const status = await EscalationExecutor.getEscalationStatus(workflowInstanceId);

    return ApiResponseBuilder.success(status);
  } catch (error) {
    console.error('Failed to get escalation status:', error);
    return ApiResponseBuilder.internalError();
  }
}
