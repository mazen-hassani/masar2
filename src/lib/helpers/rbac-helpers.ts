/**
 * RBAC Helper Functions
 * Utility functions for common role checking operations
 */

import { RBACService } from '@/lib/services/rbac-service';
import { UserRole, EntityType, Action, UserRolesContext } from '@/types/rbac';

/**
 * Check if user has a specific role at global level
 */
export async function hasGlobalRole(userId: string, role: UserRole): Promise<boolean> {
  const rolesContext = await RBACService.getRolesForUser(userId);
  return rolesContext.globalRoles.includes(role);
}

/**
 * Check if user has a specific role for a program
 */
export async function hasProgramRole(userId: string, programId: string, role: UserRole): Promise<boolean> {
  const rolesContext = await RBACService.getRolesForUser(userId);
  return (rolesContext.programRoles.get(programId) || []).includes(role);
}

/**
 * Check if user has a specific role for a project
 */
export async function hasProjectRole(userId: string, projectId: string, role: UserRole): Promise<boolean> {
  const rolesContext = await RBACService.getRolesForUser(userId);
  return (rolesContext.projectRoles.get(projectId) || []).includes(role);
}

/**
 * Check if user has at least one of the specified roles
 */
export async function hasAnyRole(userId: string, roles: UserRole[]): Promise<boolean> {
  const rolesContext = await RBACService.getRolesForUser(userId);
  return roles.some((role) => rolesContext.allRoles.includes(role));
}

/**
 * Check if user has all of the specified roles
 */
export async function hasAllRoles(userId: string, roles: UserRole[]): Promise<boolean> {
  const rolesContext = await RBACService.getRolesForUser(userId);
  return roles.every((role) => rolesContext.allRoles.includes(role));
}

/**
 * Get the highest role in hierarchy for a user
 */
export async function getHighestRole(userId: string): Promise<UserRole | null> {
  const rolesContext = await RBACService.getRolesForUser(userId);
  return rolesContext.highestRole;
}

/**
 * Check if user can perform an action on an entity
 * Convenience wrapper around canUserAccess
 */
export async function canPerformAction(
  userId: string,
  entityType: EntityType,
  entityId: string | null,
  action: Action
): Promise<boolean> {
  const result = await RBACService.canUserAccess(userId, entityType, entityId, action);
  return result.allowed;
}

/**
 * Check if user can view an entity
 */
export async function canView(
  userId: string,
  entityType: EntityType,
  entityId: string | null
): Promise<boolean> {
  return canPerformAction(userId, entityType, entityId, 'view');
}

/**
 * Check if user can create an entity type
 */
export async function canCreate(
  userId: string,
  entityType: EntityType,
  contextId?: string | null
): Promise<boolean> {
  const checkContextId = entityType === 'Program' ? null : (contextId || null);
  return canPerformAction(userId, entityType, checkContextId, 'create');
}

/**
 * Check if user can update an entity
 */
export async function canUpdate(
  userId: string,
  entityType: EntityType,
  entityId: string | null
): Promise<boolean> {
  return canPerformAction(userId, entityType, entityId, 'update');
}

/**
 * Check if user can delete an entity
 */
export async function canDelete(
  userId: string,
  entityType: EntityType,
  entityId: string | null
): Promise<boolean> {
  return canPerformAction(userId, entityType, entityId, 'delete');
}

/**
 * Check if user can approve an entity
 */
export async function canApprove(
  userId: string,
  entityType: EntityType,
  entityId: string | null
): Promise<boolean> {
  return canPerformAction(userId, entityType, entityId, 'approve');
}

/**
 * Check if user can execute an entity
 */
export async function canExecute(
  userId: string,
  entityType: EntityType,
  entityId: string | null
): Promise<boolean> {
  return canPerformAction(userId, entityType, entityId, 'execute');
}

/**
 * Check if user can manage an entity
 */
export async function canManage(
  userId: string,
  entityType: EntityType,
  entityId: string | null
): Promise<boolean> {
  return canPerformAction(userId, entityType, entityId, 'manage');
}

/**
 * Get all roles for a user with caching capability
 */
const roleCache: Map<string, { context: UserRolesContext; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get roles for a user with optional caching
 */
export async function getRolesForUserCached(
  userId: string,
  useCache: boolean = true
): Promise<UserRolesContext> {
  if (useCache) {
    const cached = roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.context;
    }
  }

  const context = await RBACService.getRolesForUser(userId);

  if (useCache) {
    roleCache.set(userId, { context, timestamp: Date.now() });
  }

  return context;
}

/**
 * Invalidate role cache for a user
 */
export function invalidateRoleCache(userId: string): void {
  roleCache.delete(userId);
}

/**
 * Clear all role cache
 */
export function clearRoleCache(): void {
  roleCache.clear();
}

/**
 * Validate that a user has required permissions before executing an operation
 * Throws error if user doesn't have permission
 */
export async function requireAccess(
  userId: string,
  entityType: EntityType,
  entityId: string | null,
  action: Action
): Promise<void> {
  const result = await RBACService.canUserAccess(userId, entityType, entityId, action);
  if (!result.allowed) {
    throw new Error(`Access denied: ${result.reason}`);
  }
}

/**
 * Validate that a user has at least one of the specified roles
 * Throws error if user doesn't have any of the roles
 */
export async function requireAnyRole(userId: string, roles: UserRole[]): Promise<void> {
  const hasRole = await hasAnyRole(userId, roles);
  if (!hasRole) {
    throw new Error(`Access denied: User does not have any of the required roles: ${roles.join(', ')}`);
  }
}

/**
 * Validate that a user has all of the specified roles
 * Throws error if user doesn't have all roles
 */
export async function requireAllRoles(userId: string, roles: UserRole[]): Promise<void> {
  const hasRoles = await hasAllRoles(userId, roles);
  if (!hasRoles) {
    throw new Error(`Access denied: User does not have all required roles: ${roles.join(', ')}`);
  }
}

/**
 * Validate that a user is an admin
 * Throws error if user is not an admin
 */
export async function requireAdmin(userId: string): Promise<void> {
  const isAdmin = await RBACService.isAdmin(userId);
  if (!isAdmin) {
    throw new Error('Access denied: Admin role required');
  }
}

/**
 * Filter an array of entities to only those the user can access
 */
export async function filterByAccess<T extends { id: string; type: EntityType }>(
  userId: string,
  entities: T[],
  action: Action = 'view'
): Promise<T[]> {
  const accessible: T[] = [];

  for (const entity of entities) {
    const result = await RBACService.canUserAccess(userId, entity.type, entity.id, action);
    if (result.allowed) {
      accessible.push(entity);
    }
  }

  return accessible;
}
