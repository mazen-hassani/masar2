import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extract tenant from request using multiple strategies:
 * 1. Subdomain (e.g., ministry-health.localhost:3000)
 * 2. Header (X-Tenant-ID)
 * 3. Query parameter (tenant_id)
 */
export async function middleware(request: NextRequest) {
  const { pathname, hostname, searchParams } = request.nextUrl;

  // Skip middleware for auth routes and static assets
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  try {
    let tenantId: string | null = null;

    // Strategy 1: Check X-Tenant-ID header
    const headerTenantId = request.headers.get('X-Tenant-ID');
    if (headerTenantId) {
      tenantId = headerTenantId;
    }

    // Strategy 2: Check URL query parameter
    if (!tenantId) {
      const queryTenantId = searchParams.get('tenant_id');
      if (queryTenantId) {
        tenantId = queryTenantId;
      }
    }

    // Strategy 3: Extract from subdomain
    // Pattern: subdomain.localhost:3000 or subdomain.example.com
    if (!tenantId) {
      const parts = hostname.split('.');
      if (parts.length > 2 || (parts.length === 2 && !hostname.includes('localhost'))) {
        const subdomain = parts[0];
        // Validate subdomain format (alphanumeric and hyphens)
        if (subdomain && /^[a-z0-9-]+$/.test(subdomain) && subdomain !== 'www') {
          tenantId = subdomain;
        }
      }
    }

    // If no tenant found, check if user is authenticated
    // Authenticated users can have tenant in session
    if (!tenantId) {
      // For unauthenticated routes, this is ok
      if (pathname === '/login' || pathname === '/api/auth/callback') {
        return NextResponse.next();
      }
      // For protected routes, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Validate tenant exists in database
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantId },
      select: { id: true, status: true },
    });

    if (!tenant) {
      // Tenant not found
      return NextResponse.redirect(new URL(`/login?error=invalid_tenant`, request.url));
    }

    if (tenant.status !== 'active') {
      // Tenant is not active
      return NextResponse.redirect(new URL(`/login?error=tenant_inactive`, request.url));
    }

    // Create response with tenant context
    const response = NextResponse.next();

    // Attach tenant ID to response headers for server components to access
    response.headers.set('X-Tenant-ID', tenant.id);
    response.headers.set('X-Tenant-SUBDOMAIN', tenantId);

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow request to proceed (fail open)
    // Database connection might be temporarily unavailable
    return NextResponse.next();
  }
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    // Apply to all routes except:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
