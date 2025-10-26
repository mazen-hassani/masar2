/**
 * WBS Aggregation Service
 * Calculates parent WBS item values from their children
 * Handles dates, status, progress, and costs with configurable strategies
 */

import { PrismaClient } from '@prisma/client';
import {
  AggregatedDates,
  AggregatedStatusResult,
  AggregatedProgress,
  AggregatedCost,
  WBSAggregationResult,
  WBSItemForAggregation,
  AggregationOptions,
  DEFAULT_AGGREGATION_OPTIONS,
  ParentAggregationUpdate,
  AggregationSummary,
} from '@/types/wbs-aggregation';
import { WBSItemStatus, AggregatedStatus } from '@/types/wbs';

const prisma = new PrismaClient();

// ============================================================================
// WBS AGGREGATION SERVICE
// ============================================================================

export class WBSAggregationService {
  /**
   * Calculate aggregated dates from children
   * Start date: earliest child start date
   * End date: latest child end date
   */
  static calculateParentDates(
    children: WBSItemForAggregation[],
    options: Partial<AggregationOptions> = {}
  ): AggregatedDates {
    const opts = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };

    // Use actual dates if available, fallback to planned
    const childDates = children
      .map((child) => ({
        start: child.actualStartDate || child.plannedStartDate,
        end: child.actualEndDate || child.plannedEndDate,
        hasData: !!(child.actualStartDate || child.plannedStartDate || child.actualEndDate || child.plannedEndDate),
      }))
      .filter((d) => opts.dateHandling === 'require' || d.hasData);

    if (childDates.length === 0) {
      return {
        parentStartDate: null,
        parentEndDate: null,
        hasChildren: children.length > 0,
        childCount: children.length,
      };
    }

    // Find earliest start and latest end
    let parentStartDate: Date | null = null;
    let parentEndDate: Date | null = null;

    for (const date of childDates) {
      if (date.start) {
        if (!parentStartDate || date.start < parentStartDate) {
          parentStartDate = date.start;
        }
      }
      if (date.end) {
        if (!parentEndDate || date.end > parentEndDate) {
          parentEndDate = date.end;
        }
      }
    }

    return {
      parentStartDate,
      parentEndDate,
      hasChildren: children.length > 0,
      childCount: children.length,
    };
  }

  /**
   * Calculate aggregated status from children
   * Priority: Delayed > InProgress > Cancelled > NotStarted > Completed
   * If all same: use that status
   * If mixed: return 'Mixed'
   */
  static calculateParentStatus(
    children: WBSItemForAggregation[],
    _options: Partial<AggregationOptions> = {}
  ): AggregatedStatusResult {
    if (children.length === 0) {
      return {
        status: 'NotStarted',
        childStatuses: {
          NotStarted: 0,
          InProgress: 0,
          Delayed: 0,
          Completed: 0,
          Cancelled: 0,
        },
        hasChildren: false,
      };
    }

    // Count statuses
    const statusCounts: Record<WBSItemStatus, number> = {
      NotStarted: 0,
      InProgress: 0,
      Delayed: 0,
      Completed: 0,
      Cancelled: 0,
    };

    for (const child of children) {
      const status = child.status as WBSItemStatus;
      statusCounts[status]++;
    }

    // Priority order check
    const priorities = ['Delayed', 'InProgress', 'Cancelled', 'NotStarted', 'Completed'] as const;

    for (const priority of priorities) {
      if (statusCounts[priority] > 0) {
        // If only one status, use it directly
        if (priorities.indexOf(priority) < 4 && statusCounts[priority] === children.length) {
          return {
            status: priority as AggregatedStatus,
            childStatuses: statusCounts,
            hasChildren: true,
          };
        }

        // Otherwise, if we have any of the high-priority statuses, check if it dominates
        if (priority === 'Delayed' || priority === 'InProgress') {
          // High priority status found with mixed children = Mixed
          return {
            status: 'Mixed',
            childStatuses: statusCounts,
            hasChildren: true,
          };
        }

        // For lower priority, use it only if it's the only status
        if (statusCounts[priority] === children.length) {
          return {
            status: priority as AggregatedStatus,
            childStatuses: statusCounts,
            hasChildren: true,
          };
        }
      }
    }

    // All completed or cancelled
    if (statusCounts.Completed === children.length) {
      return {
        status: 'Completed',
        childStatuses: statusCounts,
        hasChildren: true,
      };
    }

    // Default to mixed
    return {
      status: 'Mixed',
      childStatuses: statusCounts,
      hasChildren: true,
    };
  }

  /**
   * Calculate aggregated progress from children
   * Weighted average using cost as weight
   * Falls back to simple average if no cost data
   */
  static calculateParentProgress(
    children: WBSItemForAggregation[],
    options: Partial<AggregationOptions> = {}
  ): AggregatedProgress {
    const opts = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };

    if (children.length === 0) {
      return {
        weightedProgress: 0,
        averageProgress: 0,
        childCount: 0,
        childProgressTotal: 0,
        totalWeight: 0,
      };
    }

    let totalWeight = 0;
    let weightedProgressSum = 0;
    let progressSum = 0;

    for (const child of children) {
      progressSum += child.percentComplete;

      if (opts.progressWeighting === 'equal') {
        // Equal weighting
        totalWeight += 1;
        weightedProgressSum += child.percentComplete;
      } else if (opts.progressWeighting === 'cost') {
        // Weight by total cost (planned + aggregated)
        const childTotalCost =
          (child.plannedCost || 0) + (child.aggregatedCost || 0);

        if (childTotalCost > 0) {
          totalWeight += childTotalCost;
          weightedProgressSum += child.percentComplete * childTotalCost;
        } else {
          // No cost, use equal weight
          totalWeight += 1;
          weightedProgressSum += child.percentComplete;
        }
      } else if (opts.progressWeighting === 'hybrid') {
        // Hybrid: check if leaf or branch
        // If has children (branch), use equal weight
        // If leaf, use cost weight
        // For now, simplified: if has aggregated cost, treat as branch
        if ((child.aggregatedCost || 0) > 0) {
          // Branch - equal weight
          totalWeight += 1;
          weightedProgressSum += child.percentComplete;
        } else {
          // Leaf - cost weight
          const leafCost = (child.plannedCost || 0) + (child.actualCost || 0);
          if (leafCost > 0) {
            totalWeight += leafCost;
            weightedProgressSum += child.percentComplete * leafCost;
          } else {
            totalWeight += 1;
            weightedProgressSum += child.percentComplete;
          }
        }
      }
    }

    const averageProgress = progressSum / children.length;
    const weightedProgress = totalWeight > 0 ? weightedProgressSum / totalWeight : 0;

    return {
      weightedProgress: Math.min(100, Math.max(0, Math.round(weightedProgress))),
      averageProgress: Math.min(100, Math.max(0, Math.round(averageProgress))),
      childCount: children.length,
      childProgressTotal: progressSum,
      totalWeight,
    };
  }

  /**
   * Calculate aggregated cost from children
   * Sums child aggregated costs (recursive) plus direct cost values
   */
  static calculateParentCost(
    children: WBSItemForAggregation[],
    options: Partial<AggregationOptions> = {}
  ): AggregatedCost {
    const opts = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };

    if (children.length === 0) {
      return {
        totalCost: 0,
        plannedTotal: 0,
        actualTotal: 0,
        childCount: 0,
      };
    }

    let totalCost = 0;
    let plannedTotal = 0;
    let actualTotal = 0;

    for (const child of children) {
      // Add direct cost values
      plannedTotal += child.plannedCost || 0;
      actualTotal += child.actualCost || 0;

      // Add aggregated cost if recursive aggregation enabled
      if (opts.recursiveAggregation) {
        totalCost += child.aggregatedCost || 0;
      }
    }

    // Total = max(planned, actual, aggregated)
    const maxDirectCost = Math.max(plannedTotal, actualTotal);
    const finalTotal = Math.max(totalCost, maxDirectCost);

    return {
      totalCost: finalTotal,
      plannedTotal,
      actualTotal,
      childCount: children.length,
    };
  }

  /**
   * Aggregate all values for a parent WBS item
   */
  static aggregateParentValues(
    parentId: string,
    children: WBSItemForAggregation[],
    options: Partial<AggregationOptions> = {}
  ): ParentAggregationUpdate {
    const dates = this.calculateParentDates(children, options);
    const status = this.calculateParentStatus(children, options);
    const progress = this.calculateParentProgress(children, options);
    const cost = this.calculateParentCost(children, options);

    return {
      id: parentId,
      aggregatedStartDate: dates.parentStartDate,
      aggregatedEndDate: dates.parentEndDate,
      aggregatedStatus: status.status,
      percentComplete: progress.weightedProgress,
      aggregatedCost: cost.totalCost,
    };
  }

  /**
   * Get complete aggregation result for a parent
   */
  static getAggregationResult(
    parentId: string,
    children: WBSItemForAggregation[],
    options: Partial<AggregationOptions> = {}
  ): WBSAggregationResult {
    return {
      parentId,
      dates: this.calculateParentDates(children, options),
      status: this.calculateParentStatus(children, options),
      progress: this.calculateParentProgress(children, options),
      cost: this.calculateParentCost(children, options),
      timestamp: new Date(),
    };
  }

  /**
   * Generate aggregation summary for logging/monitoring
   */
  static getAggregationSummary(
    parentId: string,
    children: WBSItemForAggregation[]
  ): AggregationSummary {
    const aggregation = this.getAggregationResult(parentId, children);

    const childrenWithDateData = children.filter(
      (c) => c.actualStartDate || c.plannedStartDate || c.actualEndDate || c.plannedEndDate
    ).length;

    const childrenWithCostData = children.filter(
      (c) => (c.plannedCost || 0) > 0 || (c.actualCost || 0) > 0
    ).length;

    let dateRangeSpan: { days: number; startDate: Date; endDate: Date } | undefined;

    if (aggregation.dates.parentStartDate && aggregation.dates.parentEndDate) {
      const diffMs = aggregation.dates.parentEndDate.getTime() - aggregation.dates.parentStartDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      dateRangeSpan = {
        days: diffDays,
        startDate: aggregation.dates.parentStartDate,
        endDate: aggregation.dates.parentEndDate,
      };
    }

    return {
      parentId,
      childCount: children.length,
      childrenWithDateData,
      childrenWithCostData,
      statusDistribution: aggregation.status.childStatuses,
      ...(dateRangeSpan && { dateRangeSpan }),
      costSummary: {
        plannedTotal: aggregation.cost.plannedTotal,
        actualTotal: aggregation.cost.actualTotal,
        aggregatedTotal: aggregation.cost.totalCost,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update WBS item with aggregated values in database
   */
  static async updateParentAggregatedValues(
    parentId: string,
    children: WBSItemForAggregation[],
    options: Partial<AggregationOptions> = {}
  ): Promise<void> {
    const update = this.aggregateParentValues(parentId, children, options);

    await prisma.wBSItem.update({
      where: { id: parentId },
      data: {
        aggregatedStartDate: update.aggregatedStartDate,
        aggregatedEndDate: update.aggregatedEndDate,
        aggregatedStatus: update.aggregatedStatus,
        percentComplete: update.percentComplete,
        aggregatedCost: update.aggregatedCost,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Recursively update all ancestors with aggregated values
   */
  static async updateAncestorsAggregation(
    childId: string,
    options: Partial<AggregationOptions> = {}
  ): Promise<void> {
    // Get the item and its parent
    const item = await prisma.wBSItem.findUnique({
      where: { id: childId },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!item?.parentId) {
      return; // No parent, nothing to update
    }

    // Get the parent and all its children
    const parent = await prisma.wBSItem.findUnique({
      where: { id: item.parentId },
      include: {
        children: {
          select: {
            id: true,
            parentId: true,
            plannedStartDate: true,
            plannedEndDate: true,
            actualStartDate: true,
            actualEndDate: true,
            status: true,
            percentComplete: true,
            plannedCost: true,
            actualCost: true,
            aggregatedCost: true,
            aggregatedStatus: true,
          },
        },
      },
    });

    if (!parent) {
      return;
    }

    // Update parent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.updateParentAggregatedValues(parent.id, parent.children as any, options);

    // Recursively update parent's parent
    if (parent.parentId) {
      await this.updateAncestorsAggregation(parent.id, options);
    }
  }

  /**
   * Update all parents in a project hierarchy
   * Call after bulk updates to recalculate entire project tree
   */
  static async updateProjectHierarchyAggregation(
    projectId: string,
    options: Partial<AggregationOptions> = {}
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      // Get all items in project, ordered by level (deepest first)
      const items = await prisma.wBSItem.findMany({
        where: {
          projectId,
          deletedAt: null,
        },
        include: {
          children: {
            select: {
              id: true,
              parentId: true,
              plannedStartDate: true,
              plannedEndDate: true,
              actualStartDate: true,
              actualEndDate: true,
              status: true,
              percentComplete: true,
              plannedCost: true,
              actualCost: true,
              aggregatedCost: true,
              aggregatedStatus: true,
            },
          },
        },
        orderBy: { level: 'desc' }, // Bottom-up
      });

      // Update each parent item
      for (const item of items) {
        if (item.children.length > 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.updateParentAggregatedValues(item.id, item.children as any, options);
            updated++;
          } catch (error) {
            errors.push(`Failed to update ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      return { updated, errors };
    } catch (error) {
      throw new Error(`Failed to update project hierarchy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
