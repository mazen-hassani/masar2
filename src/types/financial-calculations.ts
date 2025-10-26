/**
 * Financial Calculations Type Definitions
 * Cost rollup, invoice allocation, and budget forecasting for WBS hierarchy
 */

// ============================================================================
// COST ROLLUP TYPES
// ============================================================================

/**
 * Cost rollup result for a single WBS item
 */
export interface CostRollupResult {
  wbsItemId: string;
  wbsItemName?: string;
  level: number; // WBS level in hierarchy

  // Direct costs from cost items
  directPlannedCost: number;
  directActualCost: number;

  // Aggregated costs from children
  childrenAggregatedCost: number;

  // Total costs (direct + aggregated)
  totalPlannedCost: number;
  totalActualCost: number;

  // Variance analysis
  plannedVariance: number; // totalPlanned - totalActual
  plannedVariancePercentage: number;
  actualVariance: number; // directPlanned - directActual
  actualVariancePercentage: number;

  // Invoice allocations
  invoiceAllocatedAmount: number;
  allocationCount: number;

  // Child metrics
  hasChildren: boolean;
  childCount: number;
  childrenWithCosts: number;
}

/**
 * Complete cost rollup for WBS hierarchy
 */
export interface WBSCostHierarchy {
  projectId: string;
  rootItems: CostRollupResult[];
  allItems: Map<string, CostRollupResult>;
  totalProjectCost: number;
  totalProjectVariance: number;
  timestamp: Date;
}

/**
 * Cost by WBS level
 */
export interface CostByLevel {
  level: number;
  itemCount: number;
  totalCost: number;
  plannedCost: number;
  actualCost: number;
}

/**
 * Cost allocation across WBS
 */
export interface CostAllocationAcrossWBS {
  wbsItemId: string;
  directCostItems: number;
  allocatedInvoices: number;
  totalAllocated: number;
  allocationPercentage: number; // Of item's total cost
}

// ============================================================================
// BUDGET FORECAST TYPES
// ============================================================================

/**
 * Budget forecast for a WBS item or project
 */
export interface BudgetForecast {
  entityType: 'WBSItem' | 'Project' | 'Program';
  entityId: string;

  // Current status
  currentPlannedCost: number;
  currentActualCost: number;
  currentVariance: number;

  // Forecast calculation
  completionPercentage: number; // From WBS aggregation
  forecastAtCompletion: number; // FAC = ETC + AC

  // Earned value metrics
  earnedValue: number; // EV = % Complete * BAC
  plannedValue: number; // PV = BAC at this point in time
  actualCost: number; // AC = actual spending

  // Performance indices
  costPerformanceIndex: number; // CPI = EV / AC
  schedulePerformanceIndex: number; // SPI = EV / PV

  // Variances
  costVariance: number; // CV = EV - AC
  scheduleVariance: number; // SV = EV - PV

  // Projections
  estimateToCompletion: number; // ETC = (BAC - EV) / CPI
  varianceAtCompletion: number; // VAC = BAC - FAC
  projectedCompletion: Date | null; // Based on progress

  confidence: 'Low' | 'Medium' | 'High'; // Based on variance stability
}

/**
 * Cost trend analysis
 */
export interface CostTrend {
  entityId: string;
  periodStart: Date;
  periodEnd: Date;

  plannedCostTrend: number[]; // Cost per period
  actualCostTrend: number[]; // Actual spending per period
  varianceTrend: number[]; // Variance per period

  // Linear regression
  trendDirection: 'Improving' | 'Stable' | 'Deteriorating';
  trendSlope: number; // Cost change per unit time
  trendAccuracy: number; // R² value (0-1)
}

/**
 * Budget health summary
 */
export interface BudgetHealth {
  entityId: string;

  // Overall status
  overallStatus: 'Healthy' | 'Warning' | 'Critical';

  // Metrics
  budgetUtilization: number; // Actual / Planned
  spendingRate: number; // Amount spent per day
  remainingBudget: number;

  // Risk assessment
  riskScore: number; // 0-100
  riskFactors: string[];

  // Thresholds that triggered warnings
  warningsTriggered: {
    budgetOverrun?: boolean;
    scheduleSlippage?: boolean;
    performanceDegradation?: boolean;
  };
}

// ============================================================================
// COST TRACKING TYPES
// ============================================================================

/**
 * Cost tracking record (daily/weekly/monthly)
 */
export interface CostTrackingRecord {
  id: string;
  entityId: string; // Project or WBS item ID
  entityType: 'Project' | 'WBSItem';

  // Period
  period: Date; // Start of tracking period
  periodType: 'Daily' | 'Weekly' | 'Monthly';

  // Costs
  plannedCost: number; // Planned for this period
  actualCost: number; // Actual spending in this period
  variance: number; // Planned - Actual

  // Cumulative
  cumulativePlanned: number;
  cumulativeActual: number;
  cumulativeVariance: number;

  // Rate
  spendingRate: number; // Cost per day

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cumulative cost curve (S-curve)
 */
export interface CostCurve {
  entityId: string;
  projectDuration: number; // In days

  plannedCurve: { time: number; cost: number }[];
  actualCurve: { time: number; cost: number }[];
  forecastCurve: { time: number; cost: number }[];

  // Key metrics
  plannedCompletion: Date;
  forecastCompletion: Date | null;
  actualCompletion: Date | null;

  currentProgress: number; // Percentage of duration elapsed
  valueEarned: number; // At current progress
}

// ============================================================================
// INVOICE ALLOCATION ANALYSIS
// ============================================================================

/**
 * Invoice allocation analysis
 */
export interface InvoiceAllocationAnalysis {
  invoiceId: string;
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number;

  // Allocation details
  allocatedAmount: number;
  unallocatedAmount: number;
  allocationPercentage: number;

  // WBS allocation
  allocatedToWBSItems: number;
  allocations: {
    wbsItemId: string;
    amount: number;
    percentage: number;
  }[];

  // Matching with costs
  matchingCostItems: number;
  unmatchedAmount: number; // Invoice amount without corresponding cost items

  // Status
  requiresReview: boolean;
  issues: string[];
}

/**
 * Allocation efficiency metrics
 */
export interface AllocationEfficiency {
  totalInvoices: number;
  totalInvoiced: number;
  totalAllocated: number;
  allocationRate: number; // Allocated / Total

  // By status
  fullyAllocated: number;
  partiallyAllocated: number;
  unallocated: number;

  // By WBS item
  allocationsByItem: {
    wbsItemId: string;
    allocationCount: number;
    totalAllocated: number;
    averageAllocation: number;
  }[];

  // Matching efficiency
  matchedWithCosts: number;
  unmatchedAmount: number;
  matchingRate: number;
}

// ============================================================================
// CASH FLOW TYPES
// ============================================================================

/**
 * Cash flow projection
 */
export interface CashFlowProjection {
  entityId: string;
  periodStart: Date;
  periodEnd: Date;

  inflows: {
    period: Date;
    amount: number;
    source: string;
  }[];

  outflows: {
    period: Date;
    amount: number;
    category: string;
  }[];

  cumulativeBalance: number; // Inflows - Outflows
  projectedBalance: number; // At periodEnd

  // Warnings
  negativeCashPeriods: Date[];
  lowCashAlert: boolean;
}

/**
 * Payment forecast (invoice due dates)
 */
export interface PaymentForecast {
  entityId: string;

  upcomingPayments: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
    daysUntilDue: number;
  }[];

  paymentsByMonth: {
    month: Date;
    amount: number;
    invoiceCount: number;
  }[];

  totalDueInNext30Days: number;
  totalDueInNext90Days: number;
}

// ============================================================================
// SUMMARY TYPES
// ============================================================================

/**
 * Financial summary for reporting
 */
export interface FinancialSummary {
  entityId: string;
  entityType: string;
  reportDate: Date;

  // Cost summary
  costs: {
    planned: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  };

  // Invoice summary
  invoices: {
    total: number;
    allocated: number;
    unallocated: number;
    status: Record<string, number>;
  };

  // Performance
  earned: number;
  performance: {
    cpi: number;
    spi: number;
    overallHealth: 'Healthy' | 'Warning' | 'Critical';
  };

  // Forecast
  forecast: {
    atCompletion: number;
    variance: number;
    completion: Date | null;
  };
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request for cost rollup calculation
 */
export interface CalculateCostRollupRequest {
  projectId: string;
  wbsItemId?: string; // If provided, calculate from this item down
  includeChildren?: boolean; // Default: true
  includeAllocations?: boolean; // Default: true
}

/**
 * Request for budget forecast
 */
export interface CalculateBudgetForecastRequest {
  entityId: string;
  entityType: 'WBSItem' | 'Project' | 'Program';
  currentProgress: number; // 0-100 percentage
  forecastMethod?: 'Trend' | 'PercentageComplete' | 'Actual'; // How to forecast
}

/**
 * Request for cost trend analysis
 */
export interface AnalyzeCostTrendRequest {
  entityId: string;
  startDate: Date;
  endDate: Date;
  granularity?: 'Daily' | 'Weekly' | 'Monthly'; // Default: Weekly
}

/**
 * Request for budget health check
 */
export interface CheckBudgetHealthRequest {
  entityId: string;
  warningThresholds?: {
    budgetUtilization?: number; // % of budget
    variancePercentage?: number; // % variance
    performanceIndex?: number; // CPI/SPI threshold
  };
}

// ============================================================================
// FILTER/AGGREGATION TYPES
// ============================================================================

/**
 * Financial metrics aggregation
 */
export interface AggregateFinancialMetricsRequest {
  entityType: 'Program' | 'Project' | 'WBSItem';
  entityIds?: string[];
  timeperiod?: {
    startDate: Date;
    endDate: Date;
  };
  groupBy?: 'None' | 'Category' | 'Vendor' | 'Status' | 'Period';
}

/**
 * Variance threshold filters
 */
export interface VarianceFilter {
  minVariancePercentage?: number;
  maxVariancePercentage?: number;
  varianceStatus?: 'Under' | 'On-Target' | 'Over';
}
