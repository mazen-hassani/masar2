/**
 * WBS Service
 * Work Breakdown Structure management with aggregation and hierarchy support
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getTenantId } from '@/lib/tenant-context';
import { CreateWBSItemRequest, UpdateWBSItemRequest } from '@/lib/validation/wbs-schema';
import type {
  WBSConfiguration,
  WBSItem,
  WBSItemWithRelations,
  WBSTree,
  ListWBSItemsFilter,
  AggregationResult,
  WBSStatistics,
  AggregatedStatus,
  WBSItemStatus,
} from '@/types/wbs';

const prisma = new PrismaClient();

export class WBSService {
  /**
   * Get or create WBS Configuration for a project
   */
  static async getOrCreateConfiguration(
    projectId: string
  ): Promise<WBSConfiguration> {
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

    let config = await prisma.wBSConfiguration.findUnique({
      where: { projectId },
    });

    if (!config) {
      // Create default configuration
      config = await prisma.wBSConfiguration.create({
        data: {
          projectId,
          levels: 3,
          levelNames: ['Phase', 'Workstream', 'Task'],
        },
      });
    }

    return config as WBSConfiguration;
  }

  /**
   * Get a single WBS item with relationships
   */
  static async getWBSItem(itemId: string): Promise<WBSItemWithRelations | null> {
    const tenantId = getTenantId();

    const item = await prisma.wBSItem.findFirst({
      where: {
        id: itemId,
        project: {
          tenantId,
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: { level: 'asc' },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!item) {
      return null;
    }

    return {
      ...item,
      plannedCost: item.plannedCost ? Number(item.plannedCost) : null,
      actualCost: item.actualCost ? Number(item.actualCost) : null,
      aggregatedCost: Number(item.aggregatedCost),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * List WBS items with filters
   */
  static async listWBSItems(
    filter: ListWBSItemsFilter
  ): Promise<{ items: WBSItem[]; total: number }> {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: filter.projectId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    const where: Prisma.WBSItemWhereInput = {
      projectId: filter.projectId,
      deletedAt: null,
      ...(filter.parentId !== undefined && { parentId: filter.parentId || null }),
      ...(filter.level !== undefined && { level: filter.level }),
      ...(filter.status && {
        status:
          typeof filter.status === 'string'
            ? filter.status
            : { in: filter.status },
      }),
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
      ...(filter.ownerId && { ownerId: filter.ownerId }),
    };

    const orderBy: Prisma.WBSItemOrderByWithRelationInput = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.level = 'asc';
      orderBy.name = 'asc';
    }

    const [items, total] = await Promise.all([
      prisma.wBSItem.findMany({
        where,
        orderBy,
        skip: filter.skip || 0,
        take: filter.take || 20,
      }),
      prisma.wBSItem.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        ...i,
        plannedCost: i.plannedCost ? Number(i.plannedCost) : null,
        actualCost: i.actualCost ? Number(i.actualCost) : null,
        aggregatedCost: Number(i.aggregatedCost),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Get WBS tree structure for a project
   */
  static async getWBSTree(projectId: string): Promise<WBSTree[]> {
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

    // Get all items for the project
    const items = await prisma.wBSItem.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    // Build tree structure
    const roots: WBSTree[] = [];

    items.forEach((item) => {
      if (!item.parentId) {
        roots.push({
          item: this.itemToResponse(item),
          children: [],
        });
      }
    });

    // Recursively build tree
    const buildTree = (parentId: string | null): WBSTree[] => {
      return items
        .filter((i) => i.parentId === parentId)
        .map((item) => ({
          item: this.itemToResponse(item),
          children: buildTree(item.id),
        }));
    };

    roots.forEach((root) => {
      root.children = buildTree(root.item.id);
    });

    return roots;
  }

  /**
   * Create a new WBS item
   */
  static async createWBSItem(data: CreateWBSItemRequest): Promise<WBSItem> {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    // Verify parent if provided
    let level = 0;
    if (data.parentId) {
      const parent = await prisma.wBSItem.findFirst({
        where: {
          id: data.parentId,
          projectId: data.projectId,
          deletedAt: null,
        },
      });

      if (!parent) {
        throw new Error('Parent WBS item not found');
      }

      level = parent.level + 1;

      // Verify level doesn't exceed configuration
      const config = await this.getOrCreateConfiguration(data.projectId);
      if (level >= config.levels) {
        throw new Error(`Cannot exceed WBS level limit of ${config.levels}`);
      }
    }

    const item = await prisma.wBSItem.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId ?? null,
        level,
        name: data.name,
        description: data.description ?? null,
        plannedStartDate: data.plannedStartDate
          ? new Date(data.plannedStartDate)
          : null,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
        actualStartDate: data.actualStartDate
          ? new Date(data.actualStartDate)
          : null,
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : null,
        ownerId: data.ownerId ?? null,
        status: data.status || 'NotStarted',
        plannedCost: data.plannedCost ?? null,
        actualCost: data.actualCost ?? null,
        percentComplete: data.percentComplete ?? 0,
      },
    });

    // Recalculate parent aggregations
    if (data.parentId) {
      await this.recalculateAggregations(data.parentId);
    }

    return {
      ...item,
      plannedCost: item.plannedCost ? Number(item.plannedCost) : null,
      actualCost: item.actualCost ? Number(item.actualCost) : null,
      aggregatedCost: Number(item.aggregatedCost),
    } as WBSItem;
  }

  /**
   * Update a WBS item
   */
  static async updateWBSItem(
    itemId: string,
    data: UpdateWBSItemRequest
  ): Promise<WBSItem> {
    const tenantId = getTenantId();

    // Verify item belongs to project in tenant
    const item = await prisma.wBSItem.findFirst({
      where: {
        id: itemId,
        project: { tenantId, deletedAt: null },
        deletedAt: null,
      },
    });

    if (!item) {
      throw new Error(`WBS item not found or not accessible to tenant ${tenantId}`);
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.plannedStartDate !== undefined)
      updateData.plannedStartDate = data.plannedStartDate
        ? new Date(data.plannedStartDate)
        : null;
    if (data.plannedEndDate !== undefined)
      updateData.plannedEndDate = data.plannedEndDate
        ? new Date(data.plannedEndDate)
        : null;
    if (data.actualStartDate !== undefined)
      updateData.actualStartDate = data.actualStartDate
        ? new Date(data.actualStartDate)
        : null;
    if (data.actualEndDate !== undefined)
      updateData.actualEndDate = data.actualEndDate
        ? new Date(data.actualEndDate)
        : null;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId ?? null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.plannedCost !== undefined) updateData.plannedCost = data.plannedCost ?? null;
    if (data.actualCost !== undefined) updateData.actualCost = data.actualCost ?? null;
    if (data.percentComplete !== undefined) updateData.percentComplete = data.percentComplete;

    const updated = await prisma.wBSItem.update({
      where: { id: itemId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    });

    // Recalculate parent aggregations if data changed
    if (item.parentId || Object.keys(updateData).length > 0) {
      await this.recalculateAggregations(item.parentId || item.id);
    }

    return {
      ...updated,
      plannedCost: updated.plannedCost ? Number(updated.plannedCost) : null,
      actualCost: updated.actualCost ? Number(updated.actualCost) : null,
      aggregatedCost: Number(updated.aggregatedCost),
    } as WBSItem;
  }

  /**
   * Delete a WBS item (soft delete)
   */
  static async deleteWBSItem(itemId: string): Promise<void> {
    const tenantId = getTenantId();

    // Verify item belongs to project in tenant
    const item = await prisma.wBSItem.findFirst({
      where: {
        id: itemId,
        project: { tenantId, deletedAt: null },
        deletedAt: null,
      },
    });

    if (!item) {
      throw new Error(`WBS item not found or not accessible to tenant ${tenantId}`);
    }

    // Check if has children
    const hasChildren = await prisma.wBSItem.count({
      where: {
        parentId: itemId,
        deletedAt: null,
      },
    });

    if (hasChildren > 0) {
      throw new Error('Cannot delete WBS item with children');
    }

    await prisma.wBSItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });

    // Recalculate parent aggregations
    if (item.parentId) {
      await this.recalculateAggregations(item.parentId);
    }
  }

  /**
   * Recalculate aggregations for an item and its parents recursively
   */
  private static async recalculateAggregations(itemId: string): Promise<void> {
    const item = await prisma.wBSItem.findUnique({
      where: { id: itemId },
    });

    if (!item) return;

    // Calculate aggregations from children
    const aggregation = await this.calculateAggregations(itemId);

    await prisma.wBSItem.update({
      where: { id: itemId },
      data: {
        aggregatedStartDate: aggregation.aggregatedStartDate,
        aggregatedEndDate: aggregation.aggregatedEndDate,
        aggregatedCost: aggregation.aggregatedCost,
        aggregatedStatus: aggregation.aggregatedStatus,
      },
    });

    // Recursively update parent
    if (item.parentId) {
      await this.recalculateAggregations(item.parentId);
    }
  }

  /**
   * Calculate aggregation values from child items
   */
  private static async calculateAggregations(itemId: string): Promise<AggregationResult> {
    const children = await prisma.wBSItem.findMany({
      where: {
        parentId: itemId,
        deletedAt: null,
      },
    });

    if (children.length === 0) {
      // Leaf node - use own values
      const item = await prisma.wBSItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return {
          aggregatedStartDate: null,
          aggregatedEndDate: null,
          aggregatedCost: 0,
          aggregatedStatus: null,
          childCount: 0,
          totalPercentComplete: 0,
        };
      }

      return {
        aggregatedStartDate: item.plannedStartDate,
        aggregatedEndDate: item.plannedEndDate,
        aggregatedCost: item.actualCost ? Number(item.actualCost) : Number(item.plannedCost) || 0,
        aggregatedStatus: item.status as AggregatedStatus,
        childCount: 0,
        totalPercentComplete: item.percentComplete,
      };
    }

    // Calculate from children
    const dates = children
      .map((c) => c.plannedStartDate)
      .filter((d) => d !== null) as Date[];
    const endDates = children
      .map((c) => c.plannedEndDate)
      .filter((d) => d !== null) as Date[];
    const costs = children
      .map((c) => Number(c.aggregatedCost || c.actualCost || c.plannedCost || 0))
      .reduce((sum, cost) => sum + cost, 0);

    const statuses = children.map((c) => c.status as WBSItemStatus);
    const aggregatedStatus = this.calculateAggregatedStatus(statuses);

    const avgCompletion =
      children.length > 0
        ? Math.round(
            children.reduce((sum, c) => sum + c.percentComplete, 0) / children.length
          )
        : 0;

    return {
      aggregatedStartDate: dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
      aggregatedEndDate: endDates.length > 0 ? new Date(Math.max(...endDates.map((d) => d.getTime()))) : null,
      aggregatedCost: costs,
      aggregatedStatus,
      childCount: children.length,
      totalPercentComplete: avgCompletion,
    };
  }

  /**
   * Calculate aggregated status from child statuses
   */
  private static calculateAggregatedStatus(statuses: WBSItemStatus[]): AggregatedStatus | null {
    if (statuses.length === 0) return null;

    const unique = new Set(statuses);

    if (unique.size === 1) {
      const status = statuses[0];
      if (status === 'Completed') return 'Completed';
      if (status === 'InProgress') return 'InProgress';
      if (status === 'Delayed') return 'Delayed';
      if (status === 'Cancelled') return 'Cancelled';
      return 'NotStarted';
    }

    // Mixed statuses
    if (statuses.includes('InProgress') || statuses.includes('Delayed')) {
      return 'InProgress';
    }
    if (statuses.includes('Cancelled')) {
      return 'Mixed';
    }

    return 'Mixed';
  }

  /**
   * Convert WBS item to response format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static itemToResponse(item: any): any {
    return {
      ...item,
      plannedStartDate: item.plannedStartDate?.toISOString() || null,
      plannedEndDate: item.plannedEndDate?.toISOString() || null,
      actualStartDate: item.actualStartDate?.toISOString() || null,
      actualEndDate: item.actualEndDate?.toISOString() || null,
      aggregatedStartDate: item.aggregatedStartDate?.toISOString() || null,
      aggregatedEndDate: item.aggregatedEndDate?.toISOString() || null,
      plannedCost: item.plannedCost ? Number(item.plannedCost) : null,
      actualCost: item.actualCost ? Number(item.actualCost) : null,
      aggregatedCost: Number(item.aggregatedCost),
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
      deletedAt: item.deletedAt?.toISOString() || null,
    };
  }

  /**
   * Get WBS statistics
   */
  static async getStatistics(projectId: string): Promise<WBSStatistics> {
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

    const where = { projectId, deletedAt: null };

    const [total, byStatus, byLevel, rootItems, leafItems, withOwner, costStats, completeStats] =
      await Promise.all([
        prisma.wBSItem.count({ where }),
        prisma.wBSItem.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.wBSItem.groupBy({
          by: ['level'],
          where,
          _count: true,
        }),
        prisma.wBSItem.count({ where: { ...where, parentId: null } }),
        prisma.wBSItem.count({
          where: {
            ...where,
            children: { none: {} },
          },
        }),
        prisma.wBSItem.count({ where: { ...where, NOT: { ownerId: null } } }),
        prisma.wBSItem.aggregate({
          where,
          _sum: { plannedCost: true, actualCost: true },
        }),
        prisma.wBSItem.aggregate({
          where,
          _avg: { percentComplete: true },
        }),
      ]);

    const stats: WBSStatistics = {
      totalItems: total,
      itemsByStatus: {
        NotStarted: 0,
        InProgress: 0,
        Delayed: 0,
        Completed: 0,
        Cancelled: 0,
      },
      itemsByLevel: {},
      rootItems,
      leafItems,
      totalPlannedCost: costStats._sum.plannedCost
        ? Number(costStats._sum.plannedCost)
        : 0,
      totalActualCost: costStats._sum.actualCost
        ? Number(costStats._sum.actualCost)
        : 0,
      averagePercentComplete: completeStats._avg.percentComplete || 0,
      itemsWithOwner: withOwner,
    };

    byStatus.forEach((item) => {
      stats.itemsByStatus[item.status as WBSItemStatus] = item._count;
    });

    byLevel.forEach((item) => {
      stats.itemsByLevel[item.level] = item._count;
    });

    return stats;
  }
}
