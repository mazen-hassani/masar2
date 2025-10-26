/**
 * Project Service
 * Business logic for project management with tenant scoping
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getTenantId } from '@/lib/tenant-context';
import { CreateProjectRequest, UpdateProjectRequest } from '@/lib/validation/project-schema';
import type {
  Project,
  ProjectWithRelations,
  ListProjectsFilter,
  ProjectStatistics,
} from '@/types/project';

const prisma = new PrismaClient();

export class ProjectService {
  /**
   * Get a single project by ID (tenant-scoped)
   */
  static async getProject(projectId: string): Promise<ProjectWithRelations | null> {
    const tenantId = getTenantId();

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
        deletedAt: null,
      },
      include: {
        program: {
          select: { id: true, name: true, status: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        pm: {
          select: { id: true, name: true, email: true },
        },
        sponsor: {
          select: { id: true, name: true, email: true },
        },
        wbsConfig: {
          select: { id: true, levels: true, levelNames: true },
        },
        wbsItems: {
          where: { deletedAt: null },
          select: { id: true },
        },
        scorings: {
          select: { id: true },
        },
      },
    });

    if (!project) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      id: project.id,
      tenantId: project.tenantId,
      programId: project.programId,
      type: project.type,
      name: project.name,
      description: project.description,
      status: project.status,
      complexityBand: project.complexityBand,
      requesterId: project.requesterId,
      pmId: project.pmId,
      sponsorId: project.sponsorId,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: Number(project.budget),
      actualCost: Number(project.actualCost),
      scoreValue: project.scoreValue ? Number(project.scoreValue) : null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      deletedAt: project.deletedAt,
      program: project.program,
      requesterUser: project.requestedBy,
      pmUser: project.pm,
      sponsorUser: project.sponsor,
      wbsConfig: project.wbsConfig,
      wbsItemCount: project.wbsItems.length,
      scoreCount: project.scorings.length,
    } as ProjectWithRelations;
  }

  /**
   * List projects with filters (tenant-scoped)
   */
  static async listProjects(
    filter: Partial<ListProjectsFilter> = {}
  ): Promise<{ projects: Project[]; total: number }> {
    const tenantId = getTenantId();

    const where: Prisma.ProjectWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filter.programId && { programId: filter.programId }),
      ...(filter.type && { type: filter.type }),
      ...(filter.status && {
        status:
          typeof filter.status === 'string'
            ? filter.status
            : { in: filter.status },
      }),
      ...(filter.complexity && {
        complexityBand:
          typeof filter.complexity === 'string'
            ? filter.complexity
            : { in: filter.complexity },
      }),
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
      ...(filter.pmId && { pmId: filter.pmId }),
      ...(filter.sponsorId && { sponsorId: filter.sponsorId }),
      ...(filter.startDateFrom && { startDate: { gte: filter.startDateFrom } }),
      ...(filter.startDateTo && { startDate: { lte: filter.startDateTo } }),
    };

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip: filter.skip || 0,
        take: filter.take || 20,
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects: projects.map((p) => ({
        ...p,
        budget: Number(p.budget),
        actualCost: Number(p.actualCost),
        scoreValue: p.scoreValue ? Number(p.scoreValue) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Create a new project (tenant-scoped)
   */
  static async createProject(
    data: CreateProjectRequest
  ): Promise<Project> {
    const tenantId = getTenantId();

    // If programId provided, verify it belongs to tenant
    if (data.programId) {
      const program = await prisma.program.findFirst({
        where: {
          id: data.programId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!program) {
        throw new Error(
          `Program not found or not accessible to tenant ${tenantId}`
        );
      }
    }

    // Check for duplicate name in tenant
    const existing = await prisma.project.findFirst({
      where: {
        tenantId,
        name: data.name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new Error(
        `A project with name "${data.name}" already exists in this tenant`
      );
    }

    const project = await prisma.project.create({
      data: {
        tenantId,
        programId: data.programId ?? null,
        type: data.type,
        name: data.name,
        description: data.description ?? null,
        status: data.status || 'Draft',
        complexityBand: data.complexityBand || 'Low',
        requesterId: data.requesterId ?? null,
        pmId: data.pmId ?? null,
        sponsorId: data.sponsorId ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        budget: data.budget || 0,
      },
    });

    return {
      ...project,
      budget: Number(project.budget),
      actualCost: Number(project.actualCost),
      scoreValue: project.scoreValue ? Number(project.scoreValue) : null,
    } as Project;
  }

  /**
   * Update an existing project (tenant-scoped)
   */
  static async updateProject(
    projectId: string,
    data: UpdateProjectRequest
  ): Promise<Project> {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    // If programId is changing, verify new program belongs to tenant
    if (data.programId !== undefined && data.programId !== null && data.programId !== project.programId) {
      const program = await prisma.program.findFirst({
        where: {
          id: data.programId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!program) {
        throw new Error(
          `Program not found or not accessible to tenant ${tenantId}`
        );
      }
    }

    // Check for duplicate name if changing
    if (data.name && data.name !== project.name) {
      const existing = await prisma.project.findFirst({
        where: {
          tenantId,
          name: data.name,
          deletedAt: null,
          NOT: { id: projectId },
        },
      });

      if (existing) {
        throw new Error(
          `A project with name "${data.name}" already exists in this tenant`
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.programId !== undefined) updateData.programId = data.programId ?? null;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.complexityBand !== undefined) updateData.complexityBand = data.complexityBand;
    if (data.requesterId !== undefined) updateData.requesterId = data.requesterId ?? null;
    if (data.pmId !== undefined) updateData.pmId = data.pmId ?? null;
    if (data.sponsorId !== undefined) updateData.sponsorId = data.sponsorId ?? null;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.actualCost !== undefined) updateData.actualCost = data.actualCost;
    if (data.scoreValue !== undefined) updateData.scoreValue = data.scoreValue ?? null;

    const updated = await prisma.project.update({
      where: { id: projectId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    });

    return {
      ...updated,
      budget: Number(updated.budget),
      actualCost: Number(updated.actualCost),
      scoreValue: updated.scoreValue ? Number(updated.scoreValue) : null,
    } as Project;
  }

  /**
   * Soft delete a project (tenant-scoped)
   */
  static async deleteProject(projectId: string): Promise<void> {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get projects by program (tenant-scoped)
   */
  static async getProjectsByProgram(programId: string): Promise<Project[]> {
    const tenantId = getTenantId();

    // Verify program belongs to tenant
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!program) {
      throw new Error(`Program not found or not accessible to tenant ${tenantId}`);
    }

    const projects = await prisma.project.findMany({
      where: {
        programId,
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      ...p,
      budget: Number(p.budget),
      actualCost: Number(p.actualCost),
      scoreValue: p.scoreValue ? Number(p.scoreValue) : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
  }

  /**
   * Get project statistics (tenant-scoped)
   */
  static async getStatistics(): Promise<ProjectStatistics> {
    const tenantId = getTenantId();

    const where = { tenantId, deletedAt: null };

    const [totalProjects, projectsByStatus, projectsByComplexity, projectsByType, budgetStats, wbsStats, scoredStats] =
      await Promise.all([
        prisma.project.count({ where }),
        prisma.project.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.project.groupBy({
          by: ['complexityBand'],
          where,
          _count: true,
        }),
        prisma.project.groupBy({
          by: ['type'],
          where,
          _count: true,
        }),
        prisma.project.aggregate({
          where,
          _sum: { budget: true, actualCost: true },
          _avg: { scoreValue: true },
        }),
        prisma.wBSConfiguration.count({
          where: { project: { tenantId, deletedAt: null } },
        }),
        prisma.projectScoring.count({
          where: {
            project: { tenantId, deletedAt: null },
          },
        }),
      ]);

    const totalBudget = Number(budgetStats._sum.budget || 0);
    const totalActualCost = Number(budgetStats._sum.actualCost || 0);

    const stats: ProjectStatistics = {
      totalProjects,
      projectsByStatus: {
        Draft: 0,
        Pending: 0,
        Active: 0,
        OnHold: 0,
        Completed: 0,
        Cancelled: 0,
      },
      projectsByComplexity: {
        Low: 0,
        Medium: 0,
        High: 0,
      },
      projectsByType: {
        Project: 0,
        Initiative: 0,
      },
      totalBudget,
      totalActualCost,
      budgetUtilization:
        totalBudget > 0
          ? Math.round((totalActualCost / totalBudget) * 100)
          : 0,
      averageScore: budgetStats._avg.scoreValue
        ? Number(budgetStats._avg.scoreValue)
        : null,
      projectsWithWBS: wbsStats,
      projectsScored: scoredStats,
    };

    // Fill in the counts
    projectsByStatus.forEach((item) => {
      stats.projectsByStatus[item.status as keyof typeof stats.projectsByStatus] =
        item._count;
    });

    projectsByComplexity.forEach((item) => {
      stats.projectsByComplexity[
        item.complexityBand as keyof typeof stats.projectsByComplexity
      ] = item._count;
    });

    projectsByType.forEach((item) => {
      stats.projectsByType[item.type as keyof typeof stats.projectsByType] =
        item._count;
    });

    return stats;
  }
}
