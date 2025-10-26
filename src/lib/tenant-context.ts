import { headers } from 'next/headers';

/**
 * Type-safe tenant context for server-side use
 */
export interface TenantContext {
  id: string;
  subdomain: string;
}

/**
 * Get the current tenant context from request headers
 * Available in Server Components, Server Actions, Route Handlers
 *
 * @returns TenantContext with tenant ID and subdomain
 * @throws Error if tenant context not found (indicates middleware setup issue)
 */
export function getTenantContext(): TenantContext {
  const headersList = headers();
  const tenantId = headersList.get('X-Tenant-ID');
  const tenantSubdomain = headersList.get('X-Tenant-SUBDOMAIN');

  if (!tenantId || !tenantSubdomain) {
    throw new Error(
      'Tenant context not found. Ensure middleware is properly configured and tenant is provided in request.'
    );
  }

  return {
    id: tenantId,
    subdomain: tenantSubdomain,
  };
}

/**
 * Get the current tenant ID only
 * Useful when you just need the ID for database queries
 *
 * @returns Tenant ID string
 * @throws Error if tenant context not found
 */
export function getTenantId(): string {
  return getTenantContext().id;
}

/**
 * Get the current tenant subdomain only
 * Useful for tenant-specific branding or multi-domain routing
 *
 * @returns Tenant subdomain string
 * @throws Error if tenant context not found
 */
export function getTenantSubdomain(): string {
  return getTenantContext().subdomain;
}

/**
 * Check if tenant context is available
 * Safe to use when tenant might not be required (e.g., public pages)
 *
 * @returns true if tenant context is available
 */
export function hasTenantContext(): boolean {
  try {
    const headersList = headers();
    const tenantId = headersList.get('X-Tenant-ID');
    return tenantId !== null;
  } catch {
    return false;
  }
}

/**
 * Get tenant context safely without throwing
 * Returns null if context not found
 *
 * @returns TenantContext or null
 */
export function getTenantContextSafe(): TenantContext | null {
  try {
    const headersList = headers();
    const tenantId = headersList.get('X-Tenant-ID');
    const tenantSubdomain = headersList.get('X-Tenant-SUBDOMAIN');

    if (!tenantId || !tenantSubdomain) {
      return null;
    }

    return {
      id: tenantId,
      subdomain: tenantSubdomain,
    };
  } catch {
    return null;
  }
}
