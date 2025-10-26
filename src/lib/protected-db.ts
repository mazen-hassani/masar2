import { PrismaClient, Prisma } from '@prisma/client';
import { getTenantId } from './tenant-context';

const prisma = new PrismaClient();

/**
 * Tenant-scoped database utilities
 * All queries automatically filter by current tenant ID
 * Prevents accidental cross-tenant data access
 */
export class TenantDB {
  /**
   * Get tenant-specific Prisma client
   * Automatically includes tenantId filter for all queries
   */
  static get client() {
    return prisma;
  }

  /**
   * Get user by ID within current tenant
   * Ensures user belongs to tenant
   */
  static async getUser(userId: string) {
    const tenantId = getTenantId();
    return prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });
  }

  /**
   * Get program by ID within current tenant
   */
  static async getProgram(programId: string) {
    const tenantId = getTenantId();
    return prisma.program.findFirst({
      where: {
        id: programId,
        tenantId,
      },
      include: {
        projects: true,
        benefits: true,
        risks: true,
      },
    });
  }

  /**
   * Get project by ID within current tenant
   */
  static async getProject(projectId: string) {
    const tenantId = getTenantId();
    return prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
        program: true,
        wbsItems: true,
        benefits: true,
        risks: true,
      },
    });
  }

  /**
   * Get all programs for current tenant
   */
  static async listPrograms(where?: Prisma.ProgramWhereInput) {
    const tenantId = getTenantId();
    return prisma.program.findMany({
      where: {
        tenantId,
        ...where,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all projects for current tenant
   */
  static async listProjects(where?: Prisma.ProjectWhereInput) {
    const tenantId = getTenantId();
    return prisma.project.findMany({
      where: {
        tenantId,
        ...where,
      },
      include: {
        program: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all users in current tenant
   */
  static async listUsers(where?: Prisma.UserWhereInput) {
    const tenantId = getTenantId();
    return prisma.user.findMany({
      where: {
        tenantId,
        ...where,
      },
      include: {
        roles: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create program in current tenant
   */
  static async createProgram(data: Omit<Prisma.ProgramCreateInput, 'tenant'>) {
    const tenantId = getTenantId();
    return prisma.program.create({
      data: {
        ...data,
        tenant: {
          connect: { id: tenantId },
        },
      },
    });
  }

  /**
   * Create project in current tenant
   */
  static async createProject(data: Omit<Prisma.ProjectCreateInput, 'tenant'>) {
    const tenantId = getTenantId();
    return prisma.project.create({
      data: {
        ...data,
        tenant: {
          connect: { id: tenantId },
        },
      },
    });
  }

  /**
   * Update program - verifies ownership by current tenant
   */
  static async updateProgram(
    programId: string,
    data: Prisma.ProgramUpdateInput
  ) {
    const tenantId = getTenantId();

    // Verify program belongs to tenant
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        tenantId,
      },
    });

    if (!program) {
      throw new Error(`Program not found or not accessible to tenant ${tenantId}`);
    }

    return prisma.program.update({
      where: { id: programId },
      data,
    });
  }

  /**
   * Update project - verifies ownership by current tenant
   */
  static async updateProject(
    projectId: string,
    data: Prisma.ProjectUpdateInput
  ) {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    return prisma.project.update({
      where: { id: projectId },
      data,
    });
  }

  /**
   * Delete program - verifies ownership by current tenant
   */
  static async deleteProgram(programId: string) {
    const tenantId = getTenantId();

    // Verify program belongs to tenant
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        tenantId,
      },
    });

    if (!program) {
      throw new Error(`Program not found or not accessible to tenant ${tenantId}`);
    }

    // Soft delete using deletedAt
    return prisma.program.update({
      where: { id: programId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Delete project - verifies ownership by current tenant
   */
  static async deleteProject(projectId: string) {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    // Soft delete using deletedAt
    return prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get tenant information
   */
  static async getTenant() {
    const tenantId = getTenantId();
    return prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
  }

  /**
   * Generic query method - use with caution
   * Always ensure you're adding tenantId to where clause
   */
  static async query<T>(
    callback: (tenantId: string) => Promise<T>
  ): Promise<T> {
    const tenantId = getTenantId();
    return callback(tenantId);
  }
}

export default TenantDB;
