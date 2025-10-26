/**
 * Workflow Audit Trail Endpoint
 * GET /api/audit-logs/workflow/:workflowInstanceId - Get complete audit trail for workflow
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { AuditLogService } from '@/lib/services/audit-log-service';

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

    const auditTrail = await AuditLogService.getWorkflowAuditTrail(workflowInstanceId);

    return ApiResponseBuilder.success(auditTrail);
  } catch (error) {
    console.error('Failed to get workflow audit trail:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return ApiResponseBuilder.notFound('Workflow instance not found');
    }
    return ApiResponseBuilder.internalError();
  }
}
