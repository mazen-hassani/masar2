/**
 * Audit Log API Endpoints
 * GET /api/audit-logs - Query audit logs with filters
 * GET /api/audit-logs/export - Export audit logs
 * GET /api/audit-logs/summary - Get audit summary
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Export logs
    if (action === 'export') {
      const format = (searchParams.get('format') || 'json') as 'json' | 'csv';
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

      const exported = await AuditLogService.exportLogs(tenantId, startDate, endDate, format);

      return ApiResponseBuilder.success(
        {
          format,
          startDate,
          endDate,
          data: format === 'csv' ? exported : JSON.parse(exported),
        },
        200
      );
    }

    // Summary
    if (action === 'summary') {
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

      const summary = await AuditLogService.getSummary(tenantId, startDate, endDate);

      return ApiResponseBuilder.success(summary, 200);
    }

    // Query logs
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');
    const actionType = searchParams.get('actionType') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const actorId = searchParams.get('actorId') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const { skip: validSkip, take: validTake } = RequestValidator.validatePagination(skip, take);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { logs, total } = await AuditLogService.queryLogs({
      tenantId,
      actionType,
      entityType,
      entityId,
      actorId,
      severity,
      skip: validSkip,
      take: validTake,
      sortBy,
      sortOrder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return ApiResponseBuilder.paginated(logs, total, validSkip, validTake);
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    return ApiResponseBuilder.internalError();
  }
}
