/**
 * Work Breakdown Structure (WBS) Type Definitions
 * Hierarchical task and activity management
 */

export type WBSItemStatus = 'NotStarted' | 'InProgress' | 'Delayed' | 'Completed' | 'Cancelled';
export type AggregatedStatus = 'NotStarted' | 'InProgress' | 'Delayed' | 'Completed' | 'Cancelled' | 'Mixed';

/**
 * WBS Configuration - Defines the structure and naming for a project's WBS
 * Immutable after creation
 */
export interface WBSConfiguration {
  id: string;
  projectId: string;
  levels: number; // 1-5
  levelNames: string[]; // e.g., ["Phase", "Workstream", "Task"]
  createdAt: Date;
}

/**
 * WBS Item - Individual work item in the hierarchy
 */
export interface WBSItem {
  id: string;
  projectId: string;
  parentId: string | null;

  // Hierarchy
  level: number; // 0-based
  name: string;
  description: string | null;

  // Timeline
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;

  // Team
  ownerId: string | null;

  // Progress
  status: WBSItemStatus;
  percentComplete: number; // 0-100

  // Financial
  plannedCost: number | null;
  actualCost: number | null;

  // Aggregated fields (calculated from children)
  aggregatedStartDate: Date | null;
  aggregatedEndDate: Date | null;
  aggregatedCost: number;
  aggregatedStatus: AggregatedStatus | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * WBS Item request for creation
 */
export interface CreateWBSItemRequest {
  projectId: string;
  parentId?: string | null;
  name: string;
  description?: string;
  plannedStartDate?: Date | string;
  plannedEndDate?: Date | string;
  actualStartDate?: Date | string;
  actualEndDate?: Date | string;
  ownerId?: string;
  status?: WBSItemStatus;
  plannedCost?: number;
  actualCost?: number;
  percentComplete?: number;
}

/**
 * WBS Item request for updating
 */
export interface UpdateWBSItemRequest {
  name?: string;
  description?: string | null;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  actualStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  ownerId?: string | null;
  status?: WBSItemStatus;
  plannedCost?: number | null;
  actualCost?: number | null;
  percentComplete?: number;
}

/**
 * WBS Item response with related data
 */
export interface WBSItemResponse {
  id: string;
  projectId: string;
  parentId: string | null;
  level: number;
  name: string;
  description: string | null;
  plannedStartDate: string | null; // ISO format
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  ownerId: string | null;
  status: WBSItemStatus;
  percentComplete: number;
  plannedCost: number | null;
  actualCost: number | null;
  aggregatedStartDate: string | null;
  aggregatedEndDate: string | null;
  aggregatedCost: number;
  aggregatedStatus: AggregatedStatus | null;
  ownerName?: string;
  childCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * WBS Item with full relationships
 */
export interface WBSItemWithRelations extends WBSItem {
  parent?: WBSItem | null;
  children?: WBSItem[];
  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Hierarchical WBS structure for tree display
 */
export interface WBSTree {
  item: WBSItemResponse;
  children: WBSTree[];
}

/**
 * WBS Filter options
 */
export interface ListWBSItemsFilter {
  projectId: string;
  parentId?: string; // Filter by parent (root items if null)
  level?: number; // Filter by level
  status?: WBSItemStatus | WBSItemStatus[];
  search?: string; // Search in name and description
  ownerId?: string;
  hasChildren?: boolean; // Only parent items or leaf items
  sortBy?: 'name' | 'createdAt' | 'plannedStartDate' | 'status' | 'level';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * WBS Validation result
 */
export interface WBSValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * WBS Aggregation calculation result
 */
export interface AggregationResult {
  aggregatedStartDate: Date | null;
  aggregatedEndDate: Date | null;
  aggregatedCost: number;
  aggregatedStatus: AggregatedStatus | null;
  childCount: number;
  totalPercentComplete: number;
}

/**
 * WBS Statistics
 */
export interface WBSStatistics {
  totalItems: number;
  itemsByStatus: Record<WBSItemStatus, number>;
  itemsByLevel: Record<number, number>;
  rootItems: number;
  leafItems: number;
  totalPlannedCost: number;
  totalActualCost: number;
  averagePercentComplete: number;
  itemsWithOwner: number;
}

/**
 * Create WBS Configuration request
 */
export interface CreateWBSConfigurationRequest {
  projectId: string;
  levels: number; // 1-5
  levelNames: string[]; // min 1, max per levels
}
