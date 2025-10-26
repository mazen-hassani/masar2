/**
 * Escalation Policy API Endpoints
 * GET /api/escalation/policies - List policies
 * POST /api/escalation/policies - Create policy
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { EscalationService } from '@/lib/services/escalation-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const workflowTemplateId = searchParams.get('workflowTemplateId') || undefined;
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const { skip: validSkip, take: validTake } = RequestValidator.validatePagination(skip, take);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policies = await EscalationService.listPolicies(tenantId, workflowTemplateId as any);

    // Manual pagination for the results
    const total = policies.length;
    const paginatedPolicies = policies.slice(validSkip, validSkip + validTake);

    return ApiResponseBuilder.paginated(paginatedPolicies, total, validSkip, validTake);
  } catch (error) {
    console.error('Failed to list escalation policies:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const body = await request.json();
    const errors = RequestValidator.validateRequired(body, ['workflowTemplateId', 'name']);

    if (errors.length > 0) {
      return ApiResponseBuilder.badRequest(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = await EscalationService.createPolicy(
      tenantId,
      {
        workflowTemplateId: body.workflowTemplateId,
        name: body.name,
        description: body.description,
        warningThresholdPercent: body.warningThresholdPercent || 75,
        maxEscalationLevels: body.maxEscalationLevels || 3,
      },
      userId
    );

    return ApiResponseBuilder.success(policy, 201);
  } catch (error) {
    console.error('Failed to create escalation policy:', error);
    return ApiResponseBuilder.internalError();
  }
}
