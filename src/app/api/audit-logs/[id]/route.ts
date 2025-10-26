/**
 * Audit Log Detail Endpoints
 * GET /api/audit-logs/:id - Get audit log by ID
 * GET /api/audit-logs/:id/change-history - Get change history for entity
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { id } = params;
    const action = new URL(request.url).searchParams.get('action') || 'detail';

    if (action === 'change-history') {
      const entityType = new URL(request.url).searchParams.get('entityType') || undefined;
      const history = await AuditLogService.getChangeHistory(id, entityType);

      if (!history || history.length === 0) {
        return ApiResponseBuilder.notFound('Change history not found');
      }

      return ApiResponseBuilder.success(history);
    }

    // Default: Get log by ID
    const log = await AuditLogService.getLog(id);

    if (!log) {
      return ApiResponseBuilder.notFound('Audit log not found');
    }

    return ApiResponseBuilder.success(log);
  } catch (error) {
    console.error('Failed to get audit log:', error);
    return ApiResponseBuilder.internalError();
  }
}
