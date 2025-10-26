/**
 * SLA Metrics API Endpoints
 * GET /api/sla/metrics - Query SLA metrics with filters
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { SLAManagementService } from '@/lib/services/sla-management-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');
    const status = searchParams.get('status') || undefined; // 'Compliant', 'Warning', 'Breached'
    const stageName = searchParams.get('stageName') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const { skip: validSkip, take: validTake } = RequestValidator.validatePagination(skip, take);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await SLAManagementService.querySLAMetrics({
      tenantId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: status as any,
      stageName,
      startDate,
      endDate,
      skip: validSkip,
      take: validTake,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metricsData = (response as any)?.records || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (response as any)?.totalRecords || metricsData.length;

    return ApiResponseBuilder.paginated(metricsData, total, validSkip, validTake);
  } catch (error) {
    console.error('Failed to query SLA metrics:', error);
    return ApiResponseBuilder.internalError();
  }
}
