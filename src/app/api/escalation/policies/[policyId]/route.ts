/**
 * Escalation Policy Detail Endpoints
 * GET /api/escalation/policies/:policyId - Get policy
 * PUT /api/escalation/policies/:policyId - Update policy
 * DELETE /api/escalation/policies/:policyId - Delete policy
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { EscalationService } from '@/lib/services/escalation-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { policyId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { policyId } = params;

    const policy = await EscalationService.getPolicy(policyId);

    if (!policy) {
      return ApiResponseBuilder.notFound('Escalation policy not found');
    }

    return ApiResponseBuilder.success(policy);
  } catch (error) {
    console.error('Failed to get escalation policy:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { policyId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { policyId } = params;
    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = await EscalationService.updatePolicy(
      policyId,
      {
        name: body.name,
        description: body.description,
        warningThresholdPercent: body.warningThresholdPercent,
        maxEscalationLevels: body.maxEscalationLevels,
        isActive: body.isActive,
      },
      userId
    );

    if (!policy) {
      return ApiResponseBuilder.notFound('Escalation policy not found');
    }

    return ApiResponseBuilder.success(policy);
  } catch (error) {
    console.error('Failed to update escalation policy:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { policyId: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { policyId } = params;

    const success = await EscalationService.deletePolicy(policyId, userId);

    if (!success) {
      return ApiResponseBuilder.notFound('Escalation policy not found');
    }

    return ApiResponseBuilder.success({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Failed to delete escalation policy:', error);
    return ApiResponseBuilder.internalError();
  }
}
