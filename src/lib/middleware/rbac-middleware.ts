/**
 * RBAC Middleware
 * Extends middleware to attach user roles and permissions to requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/lib/services/rbac-service';
import { UserRolesContext } from '@/types/rbac';
import { getToken } from 'next-auth/jwt';

/**
 * Extended request object with RBAC context
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rolesContext?: UserRolesContext;
    }
  }
}

/**
 * Middleware to attach RBAC context to requests
 * Should be applied after authentication middleware
 */
export async function rbacMiddleware(request: NextRequest): Promise<NextResponse | undefined> {
  // Get JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || 'development-secret',
  });

  if (!token?.sub) {
    // User not authenticated, skip RBAC middleware
    return undefined;
  }

  try {
    // Get user's roles
    const rolesContext = await RBACService.getRolesForUser(token.sub);

    // Attach roles to request headers (will be available in API routes)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-Roles', JSON.stringify(rolesContext.allRoles || []));
    requestHeaders.set('X-User-Global-Roles', JSON.stringify(rolesContext.globalRoles || []));
    requestHeaders.set('X-User-Highest-Role', rolesContext.highestRole || 'null');

    // Create response with updated headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    console.error('Error loading RBAC context:', error);
    // Continue without RBAC context on error
    return undefined;
  }
}

/**
 * Helper to get RBAC context from request headers in API routes
 */
export function getRBACContextFromRequest(request: Request): UserRolesContext | null {
  const rolesJson = request.headers.get('X-User-Roles');
  const globalRolesJson = request.headers.get('X-User-Global-Roles');
  const highestRole = request.headers.get('X-User-Highest-Role');

  if (!rolesJson || !globalRolesJson) {
    return null;
  }

  try {
    const allRoles = JSON.parse(rolesJson);
    const globalRoles = JSON.parse(globalRolesJson);

    return {
      userId: '', // Not available in this context
      globalRoles,
      programRoles: new Map(),
      projectRoles: new Map(),
      allRoles,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highestRole: highestRole === 'null' ? null : (highestRole as any),
    };
  } catch (error) {
    console.error('Error parsing RBAC context from headers:', error);
    return null;
  }
}

/**
 * Protect API route with RBAC check
 * Usage: wrap your handler with this
 */
export function withRBAC(
  handler: (
    request: NextRequest,
    rolesContext: UserRolesContext | null
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rolesContext = getRBACContextFromRequest(request);
    return handler(request, rolesContext);
  };
}

/**
 * Protect API route with role requirement
 * Returns 403 if user doesn't have the required role(s)
 */
export function withRequiredRoles(...roles: string[]) {
  return (
    handler: (
      request: NextRequest,
      rolesContext: UserRolesContext | null
    ) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const rolesContext = getRBACContextFromRequest(request);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!rolesContext || !roles.some((role) => rolesContext.allRoles.includes(role as any))) {
        return NextResponse.json(
          { error: 'Access denied: Required role not found' },
          { status: 403 }
        );
      }

      return handler(request, rolesContext);
    };
  };
}

/**
 * Protect API route requiring admin role
 */
export function withAdminRequired(
  handler: (
    request: NextRequest,
    rolesContext: UserRolesContext | null
  ) => Promise<NextResponse>
) {
  return withRequiredRoles('Admin')(handler);
}

/**
 * Protect API route requiring PMO or Admin role
 */
export function withPMORequired(
  handler: (
    request: NextRequest,
    rolesContext: UserRolesContext | null
  ) => Promise<NextResponse>
) {
  return withRequiredRoles('PMO', 'Admin')(handler);
}

/**
 * Attach user roles to response for client-side access
 */
export function attachRolesToResponse(response: NextResponse, rolesContext: UserRolesContext): void {
  response.headers.set('X-User-Roles', JSON.stringify(rolesContext.allRoles));
  response.headers.set('X-User-Global-Roles', JSON.stringify(rolesContext.globalRoles));
  response.headers.set('X-User-Highest-Role', rolesContext.highestRole || 'null');
}

/**
 * Check if request has admin privilege
 */
export function isAdminRequest(request: Request): boolean {
  const rolesJson = request.headers.get('X-User-Global-Roles');
  if (!rolesJson) return false;

  try {
    const globalRoles = JSON.parse(rolesJson);
    return globalRoles.includes('Admin');
  } catch {
    return false;
  }
}

/**
 * Check if request has PMO privilege
 */
export function isPMORequest(request: Request): boolean {
  const rolesJson = request.headers.get('X-User-Roles');
  if (!rolesJson) return false;

  try {
    const allRoles = JSON.parse(rolesJson);
    return allRoles.includes('PMO') || allRoles.includes('Admin');
  } catch {
    return false;
  }
}

/**
 * Validate request has specific role
 */
export function hasRoleInRequest(request: Request, role: string): boolean {
  const rolesJson = request.headers.get('X-User-Roles');
  if (!rolesJson) return false;

  try {
    const allRoles = JSON.parse(rolesJson);
    return allRoles.includes(role);
  } catch {
    return false;
  }
}
