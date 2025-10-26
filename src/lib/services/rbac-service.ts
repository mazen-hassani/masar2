/**
 * Role-Based Access Control (RBAC) Service
 * Manages user roles, permissions, and access control across contexts
 */

import { PrismaClient } from '@prisma/client';
import {
  UserRole,
  RoleContextType,
  Action,
  EntityType,
  UserRolesContext,
  AccessCheckResult,
  AssignRoleRequest,
  UpdateRoleRequest,
  RoleFilter,
  UserRoleAssignment,
  hasPermission,
  getRoleHierarchyLevel,
} from '@/types/rbac';

const prisma = new PrismaClient();

// ============================================================================
// RBAC SERVICE
// ============================================================================

export class RBACService {
  /**
   * Get all roles for a user, organized by context
   * Resolves role hierarchy and context inheritance
   */
  static async getRolesForUser(userId: string): Promise<UserRolesContext> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
    });

    const context: UserRolesContext = {
      userId,
      globalRoles: [],
      programRoles: new Map(),
      projectRoles: new Map(),
      allRoles: [],
      highestRole: null,
    };

    // Organize roles by context
    for (const userRole of userRoles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = userRole.role as UserRole;

      if (userRole.contextType === 'Global') {
        context.globalRoles.push(role);
      } else if (userRole.contextType === 'Program' && userRole.contextId) {
        const existing = context.programRoles.get(userRole.contextId) || [];
        existing.push(role);
        context.programRoles.set(userRole.contextId, existing);
      } else if (userRole.contextType === 'Project' && userRole.contextId) {
        const existing = context.projectRoles.get(userRole.contextId) || [];
        existing.push(role);
        context.projectRoles.set(userRole.contextId, existing);
      }
    }

    // Collect all unique roles
    const allRolesSet = new Set<UserRole>();
    context.globalRoles.forEach((r) => allRolesSet.add(r));
    context.programRoles.forEach((roles) => roles.forEach((r) => allRolesSet.add(r)));
    context.projectRoles.forEach((roles) => roles.forEach((r) => allRolesSet.add(r)));

    context.allRoles = Array.from(allRolesSet);

    // Find highest role in hierarchy
    if (context.allRoles.length > 0) {
      context.highestRole = context.allRoles.reduce((highest, current) => {
        return getRoleHierarchyLevel(current) > getRoleHierarchyLevel(highest)
          ? current
          : highest;
      });
    }

    return context;
  }

  /**
   * Check if user has permission to perform an action on an entity
   * Considers role hierarchy, context inheritance, and permissions
   */
  static async canUserAccess(
    userId: string,
    entityType: EntityType,
    entityId: string | null,
    action: Action
  ): Promise<AccessCheckResult> {
    // Get user's roles
    const rolesContext = await this.getRolesForUser(userId);

    // Check global roles
    for (const role of rolesContext.globalRoles) {
      if (hasPermission(role, entityType, action)) {
        return {
          allowed: true,
          reason: `User has ${role} role at Global level`,
          role,
          contextType: 'Global',
        };
      }
    }

    // Check context-specific roles
    if (entityType === 'Program' && entityId) {
      const programRoles = rolesContext.programRoles.get(entityId) || [];
      for (const role of programRoles) {
        if (hasPermission(role, entityType, action)) {
          return {
            allowed: true,
            reason: `User has ${role} role for this Program`,
            role,
            contextType: 'Program',
          };
        }
      }
    }

    if (entityType === 'Project' && entityId) {
      // Check project-specific roles
      const projectRoles = rolesContext.projectRoles.get(entityId) || [];
      for (const role of projectRoles) {
        if (hasPermission(role, entityType, action)) {
          return {
            allowed: true,
            reason: `User has ${role} role for this Project`,
            role,
            contextType: 'Project',
          };
        }
      }

      // Check if user has program roles that include this project
      const project = await prisma.project.findUnique({
        where: { id: entityId },
        select: { programId: true },
      });

      if (project?.programId) {
        const programRoles = rolesContext.programRoles.get(project.programId) || [];
        for (const role of programRoles) {
          if (hasPermission(role, entityType, action)) {
            return {
              allowed: true,
              reason: `User has ${role} role for the parent Program`,
              role,
              contextType: 'Program',
            };
          }
        }
      }
    }

    // No permission found
    const relevantRoles =
      entityType === 'Program' && entityId
        ? rolesContext.programRoles.get(entityId) || []
        : entityType === 'Project' && entityId
          ? rolesContext.projectRoles.get(entityId) || []
          : [];

    if (relevantRoles.length === 0) {
      return {
        allowed: false,
        reason: `User has no ${entityType} roles assigned`,
        missingPermission: action,
      };
    }

    return {
      allowed: false,
      reason: `User roles lack permission to ${action} on ${entityType}`,
      missingPermission: action,
    };
  }

  /**
   * Assign a role to a user
   */
  static async assignRole(data: AssignRoleRequest, assignedBy: string): Promise<UserRoleAssignment> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = await prisma.userRole.create({
      data: {
        userId: data.userId,
        role: data.role,
        contextType: data.contextType,
        contextId: data.contextId || null,
        validUntil: data.validUntil || null,
        assignedBy,
        isActive: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...userRole,
      role: userRole.role as UserRole,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update a user's role assignment
   */
  static async updateRole(roleId: string, data: UpdateRoleRequest): Promise<UserRoleAssignment> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = await prisma.userRole.update({
      where: { id: roleId },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...userRole,
      role: userRole.role as UserRole,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Revoke a user's role assignment
   */
  static async revokeRole(roleId: string): Promise<void> {
    await prisma.userRole.update({
      where: { id: roleId },
      data: { isActive: false },
    });
  }

  /**
   * Get user's role assignments with optional filtering
   */
  static async listUserRoles(
    userId: string,
    filter?: Partial<RoleFilter>
  ): Promise<{ roles: UserRoleAssignment[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };

    if (filter?.role) {
      if (Array.isArray(filter.role)) {
        where.role = { in: filter.role };
      } else {
        where.role = filter.role;
      }
    }

    if (filter?.contextType) {
      where.contextType = filter.contextType;
    }

    if (filter?.contextId) {
      where.contextId = filter.contextId;
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    const [roles, total] = await Promise.all([
      prisma.userRole.findMany({
        where,
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.userRole.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      roles: roles.map((r) => ({
        ...r,
        role: r.role as UserRole,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Get all users with a specific role in a context
   */
  static async getUsersWithRole(
    role: UserRole,
    contextType: RoleContextType,
    contextId?: string | null
  ): Promise<UserRoleAssignment[]> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        role,
        contextType,
        contextId: contextId || null,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      orderBy: { assignedAt: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return userRoles.map((r) => ({
      ...r,
      role: r.role as UserRole,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
  }

  /**
   * Check if user is an admin (has Admin role at Global level)
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const rolesContext = await this.getRolesForUser(userId);
    return rolesContext.globalRoles.includes('Admin');
  }

  /**
   * Check if user is a PMO (has PMO role at any level)
   */
  static async isPMO(userId: string): Promise<boolean> {
    const rolesContext = await this.getRolesForUser(userId);
    return rolesContext.allRoles.includes('PMO');
  }

  /**
   * Get users who can approve a project/program (have Sponsor, PMO, or Admin role)
   */
  static async getApprovers(
    contextType: RoleContextType,
    contextId: string | null
  ): Promise<string[]> {
    const approverRoles = ['Admin', 'PMO', 'Sponsor'] as UserRole[];

    const userRoles = await prisma.userRole.findMany({
      where: {
        role: { in: approverRoles },
        ...(contextType === 'Global' && { contextType: 'Global' }),
        ...(contextType !== 'Global' && {
          OR: [
            { contextType: 'Global' },
            { contextType, contextId },
          ],
        }),
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return userRoles.map((r) => r.userId);
  }
}
