/**
 * Notification API Endpoints
 * GET /api/notifications - List user notifications
 * POST /api/notifications - Send notification
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);
    const userId = RequestValidator.getUserId(request.headers);

    if (!tenantId || !userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const { skip: validSkip, take: validTake } = RequestValidator.validatePagination(skip, take);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { notifications, total } = await NotificationService.getUserNotifications(
      tenantId,
      userId,
      validSkip,
      validTake
    );

    return ApiResponseBuilder.paginated(notifications, total, validSkip, validTake);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return ApiResponseBuilder.internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const body = await request.json();
    const errors = RequestValidator.validateRequired(body, ['userId', 'subject', 'message']);

    if (errors.length > 0) {
      return ApiResponseBuilder.badRequest(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notification = await NotificationService.sendNotification(tenantId, body as any);

    return ApiResponseBuilder.success(notification, 201);
  } catch (error) {
    console.error('Failed to send notification:', error);
    return ApiResponseBuilder.internalError();
  }
}
