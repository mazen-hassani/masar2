/**
 * Escalation Execution API Endpoints
 * POST /api/escalation/execute - Trigger manual escalation
 * GET /api/escalation/execute/status/:workflowInstanceId - Get escalation status
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { EscalationExecutor } from '@/lib/services/escalation-executor';

export async function POST(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const body = await request.json();
    const errors = RequestValidator.validateRequired(body, [
      'workflowInstanceId',
      'escalationRuleId',
      'reason',
    ]);

    if (errors.length > 0) {
      return ApiResponseBuilder.badRequest(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    const escalationEvent = await EscalationExecutor.manualEscalate(
      body.workflowInstanceId,
      body.escalationRuleId,
      tenantId,
      userId,
      body.reason
    );

    if (!escalationEvent) {
      return ApiResponseBuilder.badRequest('Failed to trigger escalation');
    }

    return ApiResponseBuilder.success(escalationEvent, 201);
  } catch (error) {
    console.error('Failed to execute escalation:', error);
    return ApiResponseBuilder.internalError();
  }
}
