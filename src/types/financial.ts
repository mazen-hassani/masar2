/**
 * Financial Management Type Definitions
 * Cost items, invoices, and invoice allocations
 */

// ============================================================================
// COST ITEM TYPES
// ============================================================================

export type CostItemCategory = 'Labor' | 'Material' | 'Equipment' | 'Service' | 'Other';
export type EntityType = 'Program' | 'Project';

/**
 * CostItem - Budget items associated with programs/projects
 */
export interface CostItem {
  id: string;

  entityType: EntityType; // Program or Project
  entityId: string; // ID of the program or project
  wbsItemId: string | null; // Optional WBS item allocation

  // Definition
  category: CostItemCategory;
  description: string | null;

  // Budget tracking
  plannedAmount: number;
  actualAmount: number;
  currency: string; // e.g., "USD"

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Cost Item Request
 */
export interface CreateCostItemRequest {
  entityType: EntityType;
  entityId: string;
  wbsItemId?: string | null;

  category: CostItemCategory;
  description?: string;

  plannedAmount: number;
  currency?: string;
}

/**
 * Update Cost Item Request
 */
export interface UpdateCostItemRequest {
  category?: CostItemCategory;
  description?: string | null;
  plannedAmount?: number;
  actualAmount?: number;
  currency?: string;
  wbsItemId?: string | null;
}

/**
 * Cost Item Response - API format
 */
export interface CostItemResponse {
  id: string;
  entityType: EntityType;
  entityId: string;
  wbsItemId: string | null;
  category: CostItemCategory;
  description: string | null;
  plannedAmount: number;
  actualAmount: number;
  variance: number; // plannedAmount - actualAmount
  variancePercentage: number; // (variance / plannedAmount) * 100
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cost Summary Statistics
 */
export interface CostStatistics {
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  variancePercentage: number;
  costsByCategory: Record<CostItemCategory, number>;
  overBudgetItems: number;
  currency: string;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export type InvoiceStatus = 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Cancelled';

/**
 * Invoice - Vendor invoices for programs/projects
 */
export interface Invoice {
  id: string;

  entityType: EntityType; // Program or Project
  entityId: string; // ID of the program or project

  // Invoice details
  invoiceNumber: string; // Unique identifier
  vendorName: string;

  amount: number;
  currency: string; // e.g., "USD"

  // Timeline
  invoiceDate: Date;
  dueDate: Date;

  // Status
  status: InvoiceStatus;

  // Audit
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  allocations?: InvoiceAllocation[];
}

/**
 * Create Invoice Request
 */
export interface CreateInvoiceRequest {
  entityType: EntityType;
  entityId: string;

  invoiceNumber: string;
  vendorName: string;

  amount: number;
  currency?: string;

  invoiceDate: Date | string;
  dueDate: Date | string;

  status?: InvoiceStatus;
  createdBy?: string;
}

/**
 * Update Invoice Request
 */
export interface UpdateInvoiceRequest {
  vendorName?: string;
  amount?: number;
  currency?: string;
  invoiceDate?: Date | string;
  dueDate?: Date | string;
  status?: InvoiceStatus;
}

/**
 * Invoice Response - API format
 */
export interface InvoiceResponse {
  id: string;
  entityType: EntityType;
  entityId: string;
  invoiceNumber: string;
  vendorName: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  allocatedAmount: number; // Sum of allocations
  unallocatedAmount: number; // amount - allocatedAmount
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Invoice with Allocations
 */
export interface InvoiceWithAllocations extends Invoice {
  allocations: InvoiceAllocation[];
}

/**
 * Invoice Statistics
 */
export interface InvoiceStatistics {
  totalInvoices: number;
  totalAmount: number;
  invoicesByStatus: Record<InvoiceStatus, number>;
  totalAllocated: number;
  totalUnallocated: number;
  averageInvoiceAmount: number;
  overdueInvoices: number;
  currency: string;
}

// ============================================================================
// INVOICE ALLOCATION TYPES
// ============================================================================

/**
 * InvoiceAllocation - Allocation of invoice amounts to WBS items
 */
export interface InvoiceAllocation {
  id: string;

  invoiceId: string;
  wbsItemId: string;

  amount: number;
  percentage: number; // Percentage of invoice allocated

  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Invoice Allocation Request
 */
export interface CreateInvoiceAllocationRequest {
  invoiceId: string;
  wbsItemId: string;

  amount: number;
  percentage: number;
  notes?: string;
}

/**
 * Update Invoice Allocation Request
 */
export interface UpdateInvoiceAllocationRequest {
  amount?: number;
  percentage?: number;
  notes?: string | null;
}

/**
 * Invoice Allocation Response - API format
 */
export interface InvoiceAllocationResponse {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  wbsItemId: string;
  wbsItemName?: string;
  amount: number;
  percentage: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Invoice Allocation with details
 */
export interface InvoiceAllocationDetail extends InvoiceAllocation {
  invoice?: Invoice;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wbsItem?: any; // WBSItem type
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Filter options for listing cost items
 */
export interface ListCostItemsFilter {
  entityType?: EntityType;
  entityId?: string;
  wbsItemId?: string;
  category?: CostItemCategory | CostItemCategory[];
  currency?: string;
  sortBy?: 'plannedAmount' | 'actualAmount' | 'category' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Filter options for listing invoices
 */
export interface ListInvoicesFilter {
  entityType?: EntityType;
  entityId?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  vendorName?: string;
  currency?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  sortBy?: 'invoiceDate' | 'amount' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Filter options for listing invoice allocations
 */
export interface ListInvoiceAllocationsFilter {
  invoiceId?: string;
  wbsItemId?: string;
  sortBy?: 'amount' | 'percentage' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/**
 * Cost breakdown by category
 */
export interface CostBreakdown {
  category: CostItemCategory;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  items: CostItem[];
}

/**
 * Budget variance analysis
 */
export interface BudgetVariance {
  itemId: string;
  description: string | null;
  planned: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  status: 'Under' | 'On-Target' | 'Over'; // Based on variance percentage
}

/**
 * Payment status summary
 */
export interface PaymentSummary {
  draft: number;
  submitted: number;
  approved: number;
  paid: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
}

/**
 * Cost allocation summary
 */
export interface CostAllocationSummary {
  wbsItemId: string;
  wbsItemName?: string;
  totalAllocated: number;
  allocationCount: number;
  invoiceCount: number;
}
