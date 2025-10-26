/**
 * WBS Aggregation Type Definitions
 * Types for parent value calculation from children
 */

import { WBSItemStatus, AggregatedStatus } from './wbs';

// ============================================================================
// AGGREGATION RESULTS
// ============================================================================

/**
 * Aggregated dates from children
 */
export interface AggregatedDates {
  parentStartDate: Date | null; // Earliest child start
  parentEndDate: Date | null; // Latest child end
  hasChildren: boolean;
  childCount: number;
}

/**
 * Aggregated status from children
 */
export interface AggregatedStatusResult {
  status: AggregatedStatus; // Priority-based status
  childStatuses: Record<WBSItemStatus, number>; // Count by status
  hasChildren: boolean;
}

/**
 * Aggregated progress from children
 */
export interface AggregatedProgress {
  weightedProgress: number; // 0-100
  averageProgress: number; // 0-100
  childCount: number;
  childProgressTotal: number; // Sum of all child progress
  totalWeight: number; // Sum of all weights (costs)
}

/**
 * Aggregated cost from children
 */
export interface AggregatedCost {
  totalCost: number; // Sum of child aggregated costs
  plannedTotal: number; // Sum of child planned costs
  actualTotal: number; // Sum of child actual costs
  childCount: number;
}

/**
 * Complete aggregation result for a parent WBS item
 */
export interface WBSAggregationResult {
  parentId: string;
  dates: AggregatedDates;
  status: AggregatedStatusResult;
  progress: AggregatedProgress;
  cost: AggregatedCost;
  timestamp: Date;
}

// ============================================================================
// STATUS PRIORITY
// ============================================================================

/**
 * Status priority order (used for aggregation)
 * Higher number = higher priority (overwrites lower priority)
 */
export const statusPriority: Record<WBSItemStatus, number> = {
  Delayed: 5, // Critical - highest priority
  InProgress: 4,
  NotStarted: 2,
  Completed: 1, // Lowest priority
  Cancelled: 3, // Below InProgress, above NotStarted
};

/**
 * Get status priority level
 */
export function getStatusPriority(status: WBSItemStatus | AggregatedStatus): number {
  if (status === 'Mixed') return 0; // Mixed is special case
  return statusPriority[status as WBSItemStatus] || 0;
}

// ============================================================================
// AGGREGATION INPUT
// ============================================================================

/**
 * Minimal child WBS item for aggregation (internal use)
 */
export interface WBSItemForAggregation {
  id: string;
  parentId: string | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  status: WBSItemStatus;
  percentComplete: number;
  plannedCost: number | null;
  actualCost: number | null;
  aggregatedCost: number;
  aggregatedStatus: AggregatedStatus | null;
}

/**
 * Parent WBS item with children for aggregation
 */
export interface WBSItemWithChildren extends WBSItemForAggregation {
  children: WBSItemForAggregation[];
}

// ============================================================================
// AGGREGATION OPTIONS
// ============================================================================

/**
 * Options for aggregation behavior
 */
export interface AggregationOptions {
  /**
   * How to handle dates when children have no dates
   * 'propagate': Use parent's dates if child missing
   * 'skip': Ignore children without dates
   * 'require': Return null if any child missing dates
   */
  dateHandling?: 'propagate' | 'skip' | 'require';

  /**
   * How to weight progress calculation
   * 'cost': Weight by cost (default)
   * 'equal': Equal weight for all children
   * 'hybrid': Use cost for leaf items, equal for branches
   */
  progressWeighting?: 'cost' | 'equal' | 'hybrid';

  /**
   * Whether to recursively calculate aggregated costs
   * True: Include child aggregated costs
   * False: Only sum direct cost values
   */
  recursiveAggregation?: boolean;

  /**
   * Treat cancelled items as complete
   */
  cancelledAsComplete?: boolean;
}

/**
 * Default aggregation options
 */
export const DEFAULT_AGGREGATION_OPTIONS: Required<AggregationOptions> = {
  dateHandling: 'skip',
  progressWeighting: 'cost',
  recursiveAggregation: true,
  cancelledAsComplete: false,
};

// ============================================================================
// CALCULATION RESULTS
// ============================================================================

/**
 * Result of all aggregation calculations for a parent
 */
export interface ParentAggregationUpdate {
  id: string;
  aggregatedStartDate: Date | null;
  aggregatedEndDate: Date | null;
  aggregatedStatus: AggregatedStatus | null;
  percentComplete: number;
  aggregatedCost: number;
}

/**
 * Summary of aggregation for logging/monitoring
 */
export interface AggregationSummary {
  parentId: string;
  childCount: number;
  childrenWithDateData: number;
  childrenWithCostData: number;
  statusDistribution: Record<WBSItemStatus, number>;
  dateRangeSpan?: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  costSummary: {
    plannedTotal: number;
    actualTotal: number;
    aggregatedTotal: number;
  };
}
