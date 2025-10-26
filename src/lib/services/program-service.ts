/**
 * Program Service
 * Business logic for program management with tenant scoping
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getTenantId } from '@/lib/tenant-context';
import { CreateProgramRequest, UpdateProgramRequest } from '@/lib/validation/program-schema';
import type {
  Program,
  ProgramWithRelations,
  ListProgramsFilter,
  ProgramStatistics,
} from '@/types/program';

const prisma = new PrismaClient();

export class ProgramService {
  /**
   * Get a single program by ID (tenant-scoped)
   */
  static async getProgram(programId: string): Promise<ProgramWithRelations | null> {
    const tenantId = getTenantId();

    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        tenantId,
        deletedAt: null,
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        pm: {
          select: { id: true, name: true, email: true },
        },
        sponsor: {
          select: { id: true, name: true, email: true },
        },
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            budget: true,
            actualCost: true,
          },
        },
      },
    });

    if (!program) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      id: program.id,
      tenantId: program.tenantId,
      name: program.name,
      description: program.description,
      status: program.status,
      complexityBand: program.complexityBand,
      requesterId: program.requesterId,
      pmId: program.pmId,
      sponsorId: program.sponsorId,
      startDate: program.startDate,
      endDate: program.endDate,
      budget: Number(program.budget),
      actualCost: Number(program.actualCost),
      scoreValue: program.scoreValue ? Number(program.scoreValue) : null,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
      deletedAt: program.deletedAt,
      requesterUser: program.requestedBy,
      pmUser: program.pm,
      sponsorUser: program.sponsor,
      projectCount: program.projects.length,
      projects: program.projects.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        budget: Number(p.budget),
        actualCost: Number(p.actualCost),
      })),
    } as ProgramWithRelations;
  }

  /**
   * List programs with filters (tenant-scoped)
   */
  static async listPrograms(
    filter: Partial<ListProgramsFilter> = {}
  ): Promise<{ programs: Program[]; total: number }> {
    const tenantId = getTenantId();

    const where: Prisma.ProgramWhereInput = {
      tenantId,
      deletedAt: null,
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

    const orderBy: Prisma.ProgramOrderByWithRelationInput = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        orderBy,
        skip: filter.skip || 0,
        take: filter.take || 20,
      }),
      prisma.program.count({ where }),
    ]);

    return {
      programs: programs.map((p) => ({
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
   * Create a new program (tenant-scoped)
   */
  static async createProgram(
    data: CreateProgramRequest
  ): Promise<Program> {
    const tenantId = getTenantId();

    // Check for duplicate name in tenant
    const existing = await prisma.program.findFirst({
      where: {
        tenantId,
        name: data.name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new Error(
        `A program with name "${data.name}" already exists in this tenant`
      );
    }

    const program = await prisma.program.create({
      data: {
        tenantId,
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
      ...program,
      budget: Number(program.budget),
      actualCost: Number(program.actualCost),
      scoreValue: program.scoreValue ? Number(program.scoreValue) : null,
    } as Program;
  }

  /**
   * Update an existing program (tenant-scoped)
   */
  static async updateProgram(
    programId: string,
    data: UpdateProgramRequest
  ): Promise<Program> {
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

    // Check for duplicate name if changing
    if (data.name && data.name !== program.name) {
      const existing = await prisma.program.findFirst({
        where: {
          tenantId,
          name: data.name,
          deletedAt: null,
          NOT: { id: programId },
        },
      });

      if (existing) {
        throw new Error(
          `A program with name "${data.name}" already exists in this tenant`
        );
      }
    }

    const updateData: Record<string, unknown> = {};
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

    const updated = await prisma.program.update({
      where: { id: programId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    });

    return {
      ...updated,
      budget: Number(updated.budget),
      actualCost: Number(updated.actualCost),
      scoreValue: updated.scoreValue ? Number(updated.scoreValue) : null,
    } as Program;
  }

  /**
   * Soft delete a program (tenant-scoped)
   */
  static async deleteProgram(programId: string): Promise<void> {
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

    await prisma.program.update({
      where: { id: programId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get program statistics (tenant-scoped)
   */
  static async getStatistics(): Promise<ProgramStatistics> {
    const tenantId = getTenantId();

    const where = { tenantId, deletedAt: null };

    const [totalPrograms, programsByStatus, programsByComplexity, budgetStats] =
      await Promise.all([
        prisma.program.count({ where }),
        prisma.program.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.program.groupBy({
          by: ['complexityBand'],
          where,
          _count: true,
        }),
        prisma.program.aggregate({
          where,
          _sum: { budget: true, actualCost: true },
          _avg: { scoreValue: true },
        }),
      ]);

    const totalBudget = Number(budgetStats._sum.budget || 0);
    const totalActualCost = Number(budgetStats._sum.actualCost || 0);

    const stats: ProgramStatistics = {
      totalPrograms,
      programsByStatus: {
        Draft: 0,
        Pending: 0,
        Active: 0,
        OnHold: 0,
        Completed: 0,
        Cancelled: 0,
      },
      programsByComplexity: {
        Low: 0,
        Medium: 0,
        High: 0,
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
    };

    // Fill in the counts
    programsByStatus.forEach((item) => {
      stats.programsByStatus[item.status as keyof typeof stats.programsByStatus] =
        item._count;
    });

    programsByComplexity.forEach((item) => {
      stats.programsByComplexity[
        item.complexityBand as keyof typeof stats.programsByComplexity
      ] = item._count;
    });

    return stats;
  }
}
