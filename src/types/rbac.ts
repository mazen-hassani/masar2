/**
 * Role-Based Access Control (RBAC) Type Definitions
 * Supports Global, Program, and Project-level roles
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

/**
 * User roles in the system
 */
export type UserRole = 'Admin' | 'PMO' | 'Sponsor' | 'PM' | 'Finance' | 'TeamMember' | 'Management';

/**
 * Context types for role assignment
 */
export type RoleContextType = 'Global' | 'Program' | 'Project';

/**
 * Actions that can be performed
 */
export type Action = 'view' | 'create' | 'update' | 'delete' | 'approve' | 'execute' | 'manage';

/**
 * Entity types that roles can be assigned to
 */
export type EntityType = 'Program' | 'Project' | 'Global';

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

/**
 * Role hierarchy for permission inheritance
 * Higher numbers = more permissions
 */
export enum RoleHierarchy {
  TeamMember = 1,
  Finance = 2,
  PM = 3,
  Management = 4,
  Sponsor = 5,
  PMO = 6,
  Admin = 7,
}

/**
 * Get the hierarchy level of a role
 */
export function getRoleHierarchyLevel(role: UserRole): number {
  return RoleHierarchy[role] || 0;
}

/**
 * Check if a role is higher or equal in hierarchy
 */
export function isRoleHigherOrEqual(role1: UserRole, role2: UserRole): boolean {
  return getRoleHierarchyLevel(role1) >= getRoleHierarchyLevel(role2);
}

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

/**
 * Permission matrix: role → actions
 * Roles not listed have no permissions for that entity type
 */
export const rolePermissions: Record<UserRole, Record<EntityType, Action[]>> = {
  Admin: {
    Global: ['view', 'create', 'update', 'delete', 'approve', 'execute', 'manage'],
    Program: ['view', 'create', 'update', 'delete', 'approve', 'execute', 'manage'],
    Project: ['view', 'create', 'update', 'delete', 'approve', 'execute', 'manage'],
  },
  PMO: {
    Global: ['view', 'create', 'update', 'approve', 'manage'],
    Program: ['view', 'create', 'update', 'approve', 'manage'],
    Project: ['view', 'update', 'approve'],
  },
  Sponsor: {
    Global: ['view', 'approve'],
    Program: ['view', 'approve'],
    Project: ['view', 'approve'],
  },
  PM: {
    Global: ['view'],
    Program: ['view', 'create', 'update', 'execute'],
    Project: ['view', 'create', 'update', 'execute'],
  },
  Management: {
    Global: ['view'],
    Program: ['view', 'approve'],
    Project: ['view', 'approve'],
  },
  Finance: {
    Global: ['view'],
    Program: ['view'],
    Project: ['view', 'update'],
  },
  TeamMember: {
    Global: [],
    Program: ['view'],
    Project: ['view', 'update'],
  },
};

/**
 * Check if a role has permission for an action on an entity type
 */
export function hasPermission(role: UserRole, entityType: EntityType, action: Action): boolean {
  const permissions = rolePermissions[role]?.[entityType] || [];
  return permissions.includes(action);
}

// ============================================================================
// USER ROLE INTERFACE
// ============================================================================

/**
 * User role assignment with context
 */
export interface UserRoleAssignment {
  id: string;
  userId: string;
  role: UserRole;
  contextType: RoleContextType;
  contextId: string | null; // Program or Project ID
  isActive: boolean;
  validUntil: Date | null;
  assignedAt: Date;
  assignedBy: string;
}

/**
 * User roles organized by context
 */
export interface UserRolesContext {
  userId: string;
  globalRoles: UserRole[]; // Admin, PMO, Sponsor, etc at global level
  programRoles: Map<string, UserRole[]>; // Program ID → [roles]
  projectRoles: Map<string, UserRole[]>; // Project ID → [roles]
  allRoles: UserRole[]; // All unique roles (deduplicated)
  highestRole: UserRole | null; // Highest in hierarchy
}

/**
 * Access check result with reasoning
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  role?: UserRole;
  contextType?: RoleContextType;
  missingPermission?: Action;
}

/**
 * Role assignment request DTO
 */
export interface AssignRoleRequest {
  userId: string;
  role: UserRole;
  contextType: RoleContextType;
  contextId?: string | null;
  validUntil?: Date | null;
}

/**
 * Role update request DTO
 */
export interface UpdateRoleRequest {
  role?: UserRole;
  validUntil?: Date | null;
  isActive?: boolean;
}

/**
 * Role filter for queries
 */
export interface RoleFilter {
  userId?: string;
  role?: UserRole | UserRole[];
  contextType?: RoleContextType;
  contextId?: string;
  isActive?: boolean;
}

// ============================================================================
// CONTEXT HIERARCHY
// ============================================================================

/**
 * Context hierarchy for role inheritance
 * A Global role grants permissions at all levels
 * A Program role grants permissions for that program and its projects
 * A Project role is specific to that project
 */
export const contextHierarchy: Record<RoleContextType, number> = {
  Global: 3,
  Program: 2,
  Project: 1,
};

/**
 * Check if a context grants permissions at a target level
 */
export function contextApplies(
  assignedContext: RoleContextType,
  assignedContextId: string | null,
  targetContext: RoleContextType,
  targetContextId: string | null
): boolean {
  // Global roles apply everywhere
  if (assignedContext === 'Global') {
    return true;
  }

  // Program roles apply to their projects
  if (assignedContext === 'Program' && targetContext === 'Project') {
    return assignedContextId !== null; // Must have contextId
  }

  // Same context with same ID
  if (assignedContext === targetContext && assignedContextId === targetContextId) {
    return true;
  }

  return false;
}

// ============================================================================
// ACTION DESCRIPTIONS
// ============================================================================

export const actionDescriptions: Record<Action, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  execute: 'Execute',
  manage: 'Manage',
};

/**
 * Get human-readable description of an action
 */
export function getActionDescription(action: Action): string {
  return actionDescriptions[action] || action;
}
