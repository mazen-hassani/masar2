/**
 * Escalation Rule API Endpoints
 * GET /api/escalation/rules - List rules
 * POST /api/escalation/rules - Create rule
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
    const policyId = searchParams.get('policyId');

    if (!policyId) {
      return ApiResponseBuilder.badRequest('policyId is required');
    }

    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const { skip: validSkip, take: validTake } = RequestValidator.validatePagination(skip, take);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = await EscalationService.listRulesForPolicy(policyId as any);

    // Manual pagination for the results
    const total = rules.length;
    const paginatedRules = rules.slice(validSkip, validSkip + validTake);

    return ApiResponseBuilder.paginated(paginatedRules, total, validSkip, validTake);
  } catch (error) {
    console.error('Failed to list escalation rules:', error);
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
    const errors = RequestValidator.validateRequired(body, [
      'escalationPolicyId',
      'name',
      'triggerType',
      'escalationLevel',
      'actions',
    ]);

    if (errors.length > 0) {
      return ApiResponseBuilder.badRequest(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = await EscalationService.createRule(
      {
        escalationPolicyId: body.escalationPolicyId,
        name: body.name,
        triggerType: body.triggerType,
        escalationLevel: body.escalationLevel,
        hoursInStage: body.hoursInStage,
        warningThresholdPercent: body.warningThresholdPercent,
        minimumPriority: body.minimumPriority,
        actions: body.actions,
        isRepeatable: body.isRepeatable ?? false,
        cooldownMinutes: body.cooldownMinutes || 60,
        maxEscalations: body.maxEscalations,
      },
      userId
    );

    return ApiResponseBuilder.success(rule, 201);
  } catch (error) {
    console.error('Failed to create escalation rule:', error);
    return ApiResponseBuilder.internalError();
  }
}
