/**
 * Notification Detail Endpoints
 * GET /api/notifications/:id - Get notification
 * PUT /api/notifications/:id/read - Mark as read
 */

import { NextRequest } from 'next/server';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';
import { NotificationService } from '@/lib/services/notification-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = RequestValidator.getTenantId(request.headers);

    if (!tenantId) {
      return ApiResponseBuilder.unauthorized();
    }

    const { id } = params;
    const action = new URL(request.url).searchParams.get('action') || 'read';

    if (action === 'read') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notification = await NotificationService.markAsRead(id);
      return ApiResponseBuilder.success(notification);
    }

    return ApiResponseBuilder.badRequest('Invalid action');
  } catch (error) {
    console.error('Failed to update notification:', error);
    return ApiResponseBuilder.internalError();
  }
}
