/**
 * Financial Calculations Service
 * Cost rollup, budget forecasting, and financial analysis
 * Integrates with WBS Aggregation Service for hierarchical calculations
 */

import { PrismaClient } from '@prisma/client';
import {
  CostRollupResult,
  WBSCostHierarchy,
  BudgetForecast,
  CostTrend,
  BudgetHealth,
  AllocationEfficiency,
} from '@/types/financial-calculations';

const prisma = new PrismaClient();

// ============================================================================
// COST ROLLUP SERVICE
// ============================================================================

export class CostRollupService {
  /**
   * Calculate cost rollup for a single WBS item including aggregated children costs
   */
  static async calculateItemCostRollup(
    wbsItemId: string
  ): Promise<CostRollupResult | null> {
    // Get WBS item with children
    const item = await prisma.wBSItem.findUnique({
      where: { id: wbsItemId },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            percentComplete: true,
            aggregatedCost: true,
          },
        },
      },
    });

    if (!item) return null;

    // Get direct cost items
    const costItems = await prisma.costItem.findMany({
      where: { wbsItemId },
    });

    // Get invoice allocations to this item
    const allocations = await prisma.invoiceAllocation.findMany({
      where: { wbsItemId },
    });

    // Calculate direct costs
    const directPlannedCost = costItems.reduce((sum, item) => {
      return sum + Number(item.plannedAmount);
    }, 0);

    const directActualCost = costItems.reduce((sum, item) => {
      return sum + Number(item.actualAmount);
    }, 0);

    // Calculate aggregated costs from children
    const childrenAggregatedCost = item.children.reduce((sum, child) => {
      return sum + Number(child.aggregatedCost || 0);
    }, 0);

    // Total costs
    const totalPlannedCost = directPlannedCost + childrenAggregatedCost;
    const totalActualCost = directActualCost + childrenAggregatedCost;

    // Variance
    const plannedVariance = totalPlannedCost - totalActualCost;
    const plannedVariancePercentage =
      totalPlannedCost > 0 ? (plannedVariance / totalPlannedCost) * 100 : 0;

    const actualVariance = directPlannedCost - directActualCost;
    const actualVariancePercentage =
      directPlannedCost > 0 ? (actualVariance / directPlannedCost) * 100 : 0;

    // Invoice allocations
    const invoiceAllocatedAmount = allocations.reduce((sum, alloc) => {
      return sum + Number(alloc.amount);
    }, 0);

    return {
      wbsItemId,
      wbsItemName: item.name,
      level: item.level,

      directPlannedCost,
      directActualCost,
      childrenAggregatedCost,

      totalPlannedCost,
      totalActualCost,

      plannedVariance,
      plannedVariancePercentage: Math.round(plannedVariancePercentage * 100) / 100,
      actualVariance,
      actualVariancePercentage: Math.round(actualVariancePercentage * 100) / 100,

      invoiceAllocatedAmount,
      allocationCount: allocations.length,

      hasChildren: item.children.length > 0,
      childCount: item.children.length,
      childrenWithCosts: item.children.filter((c) => c.aggregatedCost && Number(c.aggregatedCost) > 0)
        .length,
    };
  }

  /**
   * Calculate cost rollup for entire WBS hierarchy
   */
  static async calculateProjectCostHierarchy(
    projectId: string
  ): Promise<WBSCostHierarchy> {
    // Get all WBS items in project
    const items = await prisma.wBSItem.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: { level: 'asc' },
    });

    const allItems = new Map<string, CostRollupResult>();
    const rootItems: CostRollupResult[] = [];

    for (const item of items) {
      const rollup = await this.calculateItemCostRollup(item.id);
      if (rollup) {
        allItems.set(item.id, rollup);
        if (item.level === 0) {
          rootItems.push(rollup);
        }
      }
    }

    // Calculate total project cost
    const totalProjectCost = Array.from(allItems.values()).reduce(
      (sum, item) => sum + item.totalPlannedCost,
      0
    );

    const totalProjectVariance = Array.from(allItems.values()).reduce(
      (sum, item) => sum + item.plannedVariance,
      0
    );

    return {
      projectId,
      rootItems,
      allItems,
      totalProjectCost,
      totalProjectVariance,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate cost by WBS level for analysis
   */
  static async calculateCostByLevel(projectId: string) {
    const items = await prisma.wBSItem.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        level: true,
        aggregatedCost: true,
      },
    });

    const levelCosts: Record<number, { count: number; total: number }> = {};

    for (const item of items) {
      if (!levelCosts[item.level]) {
        levelCosts[item.level] = { count: 0, total: 0 };
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      levelCosts[item.level]!.count++;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      levelCosts[item.level]!.total += Number(item.aggregatedCost || 0);
    }

    return Object.entries(levelCosts).map(([level, data]) => ({
      level: parseInt(level),
      itemCount: data.count,
      totalCost: data.total,
      plannedCost: data.total, // Simplified, would need cost items
      actualCost: data.total, // Simplified
    }));
  }
}

// ============================================================================
// BUDGET FORECAST SERVICE
// ============================================================================

export class BudgetForecastService {
  /**
   * Calculate earned value metrics and budget forecast
   */
  static async calculateBudgetForecast(
    entityId: string,
    entityType: 'WBSItem' | 'Project' | 'Program',
    currentProgress: number,
    _forecastMethod: 'Trend' | 'PercentageComplete' | 'Actual' = 'PercentageComplete'
  ): Promise<BudgetForecast> {
    // Get current costs
    let plannedCost = 0;
    let actualCost = 0;

    if (entityType === 'WBSItem') {
      const rollup = await CostRollupService.calculateItemCostRollup(entityId);
      if (rollup) {
        plannedCost = rollup.totalPlannedCost;
        actualCost = rollup.totalActualCost;
      }
    } else {
      // For Project/Program, get aggregated costs
      const costItems = await prisma.costItem.findMany({
        where: { entityId },
      });
      plannedCost = costItems.reduce((sum, item) => sum + Number(item.plannedAmount), 0);
      actualCost = costItems.reduce((sum, item) => sum + Number(item.actualAmount), 0);
    }

    // Clamp progress to 0-100
    const progress = Math.max(0, Math.min(100, currentProgress));

    // Earned Value Analysis
    const earnedValue = (progress / 100) * plannedCost;
    const plannedValue = plannedCost; // BAC (Budget at Completion)
    const budgetAtCompletion = plannedCost;

    // Performance Indices
    const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 0;
    const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 0;

    // Variances
    const costVariance = earnedValue - actualCost;
    const scheduleVariance = earnedValue - plannedValue;

    // Estimate to Completion
    const estimateToCompletion =
      costPerformanceIndex > 0 ? (budgetAtCompletion - earnedValue) / costPerformanceIndex : 0;

    // Forecast at Completion
    const forecastAtCompletion = actualCost + estimateToCompletion;

    // Variance at Completion
    const varianceAtCompletion = budgetAtCompletion - forecastAtCompletion;

    // Estimate completion date (simplified)
    const daysDaysRemaining = estimateToCompletion > 0 ? Math.ceil(estimateToCompletion / actualCost) : null;
    const projectedCompletion =
      daysDaysRemaining !== null ? new Date(Date.now() + daysDaysRemaining * 24 * 60 * 60 * 1000) : null;

    // Confidence level based on variance
    let confidence: 'Low' | 'Medium' | 'High' = 'Medium';
    const absVariancePercentage = Math.abs((costVariance / budgetAtCompletion) * 100);
    if (absVariancePercentage < 5) {
      confidence = 'High';
    } else if (absVariancePercentage > 15) {
      confidence = 'Low';
    }

    return {
      entityType,
      entityId,
      currentPlannedCost: plannedCost,
      currentActualCost: actualCost,
      currentVariance: costVariance,
      completionPercentage: progress,
      forecastAtCompletion: Math.round(forecastAtCompletion),
      earnedValue: Math.round(earnedValue),
      plannedValue: Math.round(plannedValue),
      actualCost: Math.round(actualCost),
      costPerformanceIndex: Math.round(costPerformanceIndex * 100) / 100,
      schedulePerformanceIndex: Math.round(schedulePerformanceIndex * 100) / 100,
      costVariance: Math.round(costVariance),
      scheduleVariance: Math.round(scheduleVariance),
      estimateToCompletion: Math.round(estimateToCompletion),
      varianceAtCompletion: Math.round(varianceAtCompletion),
      projectedCompletion,
      confidence,
    };
  }

  /**
   * Analyze cost trend and predict future costs
   */
  static async analyzeCostTrend(
    entityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostTrend> {
    // Get cost items in date range
    const costItems = await prisma.costItem.findMany({
      where: {
        entityId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Aggregate by period
    const costsByPeriod = new Map<string, { planned: number; actual: number }>();

    for (const item of costItems) {
      const dateKey = item.createdAt.toISOString().split('T')[0];
      if (!dateKey) continue;
      const current = costsByPeriod.get(dateKey) || { planned: 0, actual: 0 };
      current.planned += Number(item.plannedAmount);
      current.actual += Number(item.actualAmount);
      costsByPeriod.set(dateKey, current);
    }

    // Extract trends
    const plannedCostTrend = Array.from(costsByPeriod.values()).map((c) => c.planned);
    const actualCostTrend = Array.from(costsByPeriod.values()).map((c) => c.actual);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const varianceTrend = plannedCostTrend.map((p, i) => p - actualCostTrend[i]!);

    // Simple linear regression
    const trend = this.calculateTrend(varianceTrend);

    return {
      entityId,
      periodStart: startDate,
      periodEnd: endDate,
      plannedCostTrend,
      actualCostTrend,
      varianceTrend,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trendDirection: trend.direction as any,
      trendSlope: Math.round(trend.slope * 100) / 100,
      trendAccuracy: Math.round(trend.rSquared * 100) / 100,
    };
  }

  /**
   * Helper: Calculate linear regression
   */
  private static calculateTrend(
    data: number[]
  ): { slope: number; intercept: number; rSquared: number; direction: string } {
    if (data.length < 2) {
      return {
        slope: 0,
        intercept: 0,
        rSquared: 0,
        direction: 'Stable',
      };
    }

    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b) / n;

    let ssXY = 0;
    let ssXX = 0;
    let ssYY = 0;

    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dy = data[i]! - yMean;
      ssXY += dx * dy;
      ssXX += dx * dx;
      ssYY += dy * dy;
    }

    const slope = ssXX === 0 ? 0 : ssXY / ssXX;
    const intercept = yMean - slope * xMean;
    const rSquared = ssXX === 0 || ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);

    let direction = 'Stable';
    if (slope > 0.1) direction = 'Deteriorating'; // Variance increasing
    if (slope < -0.1) direction = 'Improving'; // Variance decreasing

    return { slope, intercept, rSquared, direction };
  }
}

// ============================================================================
// FINANCIAL ANALYTICS SERVICE
// ============================================================================

export class FinancialAnalyticsService {
  /**
   * Check budget health and generate alerts
   */
  static async checkBudgetHealth(
    entityId: string,
    warningThresholds?: {
      budgetUtilization?: number;
      variancePercentage?: number;
      performanceIndex?: number;
    }
  ): Promise<BudgetHealth> {
    // Get costs
    const costItems = await prisma.costItem.findMany({
      where: { entityId },
    });

    const plannedTotal = costItems.reduce((sum, item) => sum + Number(item.plannedAmount), 0);
    const actualTotal = costItems.reduce((sum, item) => sum + Number(item.actualAmount), 0);

    // Calculate metrics
    const budgetUtilization = plannedTotal > 0 ? (actualTotal / plannedTotal) * 100 : 0;
    const variancePercentage = plannedTotal > 0 ? ((plannedTotal - actualTotal) / plannedTotal) * 100 : 0;
    const spendingRate = actualTotal > 30 ? actualTotal / 30 : actualTotal; // Average per day
    const remainingBudget = Math.max(0, plannedTotal - actualTotal);

    // Set defaults for thresholds
    const budgetThreshold = warningThresholds?.budgetUtilization ?? 85;
    const varianceThreshold = warningThresholds?.variancePercentage ?? -10;
    // performanceThreshold would be used for performance index checks in future

    // Determine warnings
    const warnings: string[] = [];
    const warningsTriggered = {
      budgetOverrun: false,
      scheduleSlippage: false,
      performanceDegradation: false,
    };

    if (budgetUtilization > budgetThreshold) {
      warnings.push(`Budget utilization at ${Math.round(budgetUtilization)}%`);
      warningsTriggered.budgetOverrun = true;
    }

    if (variancePercentage < varianceThreshold) {
      warnings.push(`Variance at ${Math.round(variancePercentage)}%`);
      warningsTriggered.performanceDegradation = true;
    }

    // Overall status
    let overallStatus: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
    if (budgetUtilization > 95 || variancePercentage < -15) {
      overallStatus = 'Critical';
    } else if (warnings.length > 0) {
      overallStatus = 'Warning';
    }

    // Risk score (0-100)
    const riskScore = Math.min(100, budgetUtilization + Math.abs(variancePercentage) * 2);

    return {
      entityId,
      overallStatus,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      spendingRate: Math.round(spendingRate * 100) / 100,
      remainingBudget: Math.round(remainingBudget),
      riskScore: Math.round(riskScore),
      riskFactors: warnings,
      warningsTriggered,
    };
  }

  /**
   * Analyze invoice allocation efficiency
   */
  static async analyzeAllocationEfficiency(
    projectId: string
  ): Promise<AllocationEfficiency> {
    // Get all invoices and allocations
    const invoices = await prisma.invoice.findMany({
      where: { entityId: projectId },
      include: {
        allocations: true,
      },
    });

    const allocations = await prisma.invoiceAllocation.findMany({
      where: {
        invoice: {
          entityId: projectId,
        },
      },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalAllocated = allocations.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
    const allocationRate = totalInvoiced > 0 ? (totalAllocated / totalInvoiced) * 100 : 0;

    // Count by allocation status
    const fullyAllocated = invoices.filter(
      (inv) => {
        const allocated = allocations
          .filter((a) => a.invoiceId === inv.id)
          .reduce((sum, a) => sum + Number(a.amount), 0);
        return allocated >= Number(inv.amount);
      }
    ).length;

    const partiallyAllocated = invoices.filter((inv) => {
      const allocated = allocations
        .filter((a) => a.invoiceId === inv.id)
        .reduce((sum, a) => sum + Number(a.amount), 0);
      return allocated > 0 && allocated < Number(inv.amount);
    }).length;

    const unallocated = invoices.length - fullyAllocated - partiallyAllocated;

    // Group by WBS item
    const byWBSItem = new Map<string, { count: number; total: number }>();
    for (const alloc of allocations) {
      const current = byWBSItem.get(alloc.wbsItemId) || { count: 0, total: 0 };
      current.count++;
      current.total += Number(alloc.amount);
      byWBSItem.set(alloc.wbsItemId, current);
    }

    const allocationsByItem = Array.from(byWBSItem.entries()).map(([wbsItemId, data]) => ({
      wbsItemId,
      allocationCount: data.count,
      totalAllocated: data.total,
      averageAllocation: data.total / data.count,
    }));

    return {
      totalInvoices: invoices.length,
      totalInvoiced,
      totalAllocated,
      allocationRate: Math.round(allocationRate * 100) / 100,
      fullyAllocated,
      partiallyAllocated,
      unallocated,
      allocationsByItem,
      matchedWithCosts: allocations.length,
      unmatchedAmount: Math.max(0, totalInvoiced - totalAllocated),
      matchingRate: allocationRate / 100,
    };
  }
}
