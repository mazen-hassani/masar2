/**
 * Escalation Rule Detail Endpoints
 * GET /api/escalation/rules/:ruleId - Get rule
 * PUT /api/escalation/rules/:ruleId - Update rule
 * DELETE /api/escalation/rules/:ruleId - Delete rule
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { EscalationService } from '@/lib/services/escalation-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { ruleId } = params;

    const rule = await EscalationService.getRule(ruleId);

    if (!rule) {
      return ApiResponseBuilder.notFound('Escalation rule not found');
    }

    return ApiResponseBuilder.success(rule);
  } catch (error) {
    console.error('Failed to get escalation rule:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { ruleId } = params;
    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = await EscalationService.updateRule(
      ruleId,
      {
        name: body.name,
        triggerType: body.triggerType,
        escalationLevel: body.escalationLevel,
        hoursInStage: body.hoursInStage,
        warningThresholdPercent: body.warningThresholdPercent,
        minimumPriority: body.minimumPriority,
        actions: body.actions,
        isActive: body.isActive,
        isRepeatable: body.isRepeatable,
        cooldownMinutes: body.cooldownMinutes,
        maxEscalations: body.maxEscalations,
      },
      userId
    );

    if (!rule) {
      return ApiResponseBuilder.notFound('Escalation rule not found');
    }

    return ApiResponseBuilder.success(rule);
  } catch (error) {
    console.error('Failed to update escalation rule:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { ruleId } = params;

    const success = await EscalationService.deleteRule(ruleId, userId);

    if (!success) {
      return ApiResponseBuilder.notFound('Escalation rule not found');
    }

    return ApiResponseBuilder.success({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete escalation rule:', error);
    return ApiResponseBuilder.internalError();
  }
}
