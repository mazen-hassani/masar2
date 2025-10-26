/**
 * SLA Warnings and Breaches API Endpoints
 * GET /api/sla/warnings - Get workflows with SLA warnings
 * GET /api/sla/warnings?type=breach - Get workflows with SLA breaches
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
    const type = searchParams.get('type') || 'warning'; // 'warning' or 'breach'
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const { skip: validSkip, take: validTake } = RequestValidator.validatePagination(skip, take);

    // Check SLA warnings/breaches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await SLAManagementService.checkSLAWarnings(tenantId) as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let alerts: any[] = [];
    if (type === 'breach') {
      alerts = response?.breaches || [];
    } else {
      alerts = (response?.warnings || []).concat(response?.breaches || []);
    }

    const total = alerts.length;
    const paginated = alerts.slice(validSkip, validSkip + validTake);

    return ApiResponseBuilder.paginated(paginated, total, validSkip, validTake);
  } catch (error) {
    console.error('Failed to get SLA warnings:', error);
    return ApiResponseBuilder.internalError();
  }
}
