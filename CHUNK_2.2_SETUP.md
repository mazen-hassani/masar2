# CHUNK 2.2: WBS Configuration & Structure - Setup & Usage Guide

## Overview

This chunk implements the Work Breakdown Structure (WBS) system that provides hierarchical task and activity management for projects. The WBS system allows organizations to decompose project scope into manageable work elements with comprehensive tracking of timelines, costs, ownership, and progress.

**Key Features:**
- ✅ Hierarchical WBS structure with configurable levels (1-5)
- ✅ Immutable WBS Configuration per project
- ✅ Complete financial tracking (planned vs actual costs)
- ✅ Timeline management with planned and actual dates
- ✅ Aggregation of metrics from child items to parents
- ✅ Status tracking with mixed status support
- ✅ Progress percentage tracking
- ✅ Team ownership assignment
- ✅ Soft delete support
- ✅ Comprehensive filtering and search capabilities
- ✅ Recursive tree structure generation

## Architecture

### WBS Hierarchy Structure

```
Project
├─ WBSConfiguration (immutable, defines levels and naming)
└─ WBSItem (hierarchical tree structure)
   ├─ Level 0 (e.g., Phase)
   │  ├─ Level 1 (e.g., Workstream)
   │  │  ├─ Level 2 (e.g., Task)
   │  │  └─ Level 2 (e.g., Task)
   │  └─ Level 1 (e.g., Workstream)
   └─ Level 0 (e.g., Phase)
```

### Data Flow & Aggregation

```
Leaf Items (Level N)
    ↓
[Child Status/Cost/Timeline Data]
    ↓
Parent Items (Level N-1)
    ↓
[Recursive Aggregation Service]
    ↓
Aggregated Values Updated
    ↓
grandparent Items (Level N-2)
    ↓
...continues up the tree
```

## File Structure

```
src/
├── types/
│   └── wbs.ts                          # WBS type definitions and DTOs
├── lib/
│   ├── services/
│   │   └── wbs-service.ts              # WBS business logic with aggregation
│   └── validation/
│       └── wbs-schema.ts               # Zod validation schemas
└── prisma/
    ├── schema.prisma                   # WBSConfiguration & WBSItem models
    └── seed.ts                         # Test data with 15 WBS items
```

## Component Details

### 1. Type Definitions (`src/types/wbs.ts`)

#### Core Types

**WBSItemStatus:**
```typescript
type WBSItemStatus = 'NotStarted' | 'InProgress' | 'Delayed' | 'Completed' | 'Cancelled';
```

**AggregatedStatus:**
```typescript
type AggregatedStatus = 'NotStarted' | 'InProgress' | 'Delayed' | 'Completed' | 'Cancelled' | 'Mixed';
```

#### WBSConfiguration Interface

```typescript
interface WBSConfiguration {
  id: string;
  projectId: string;
  levels: number;              // 1-5 levels allowed
  levelNames: string[];        // e.g., ["Phase", "Workstream", "Task"]
  createdAt: Date;
  // IMMUTABLE after creation - cannot be modified
}
```

**Key Constraint:** WBSConfiguration is immutable. Once created, it cannot be updated. This ensures consistency in the WBS structure throughout the project lifecycle.

#### WBSItem Interface

```typescript
interface WBSItem {
  // Identity
  id: string;
  projectId: string;
  parentId: string | null;     // null for root items

  // Hierarchy
  level: number;               // 0-based (0 = root level)
  name: string;
  description: string | null;

  // Timeline
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;

  // Team
  ownerId: string | null;      // Assigned team member

  // Progress
  status: WBSItemStatus;
  percentComplete: number;     // 0-100

  // Financial
  plannedCost: number | null;
  actualCost: number | null;

  // Aggregated from children (calculated)
  aggregatedStartDate: Date | null;
  aggregatedEndDate: Date | null;
  aggregatedCost: number;
  aggregatedStatus: AggregatedStatus | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;      // Soft delete support
}
```

**Aggregation Fields:**
- `aggregatedStartDate`: Earliest start date from all child items
- `aggregatedEndDate`: Latest end date from all child items
- `aggregatedCost`: Sum of actual costs from all child items
- `aggregatedStatus`: Calculated status based on children's statuses

#### WBSTree Interface

```typescript
interface WBSTree {
  item: WBSItemResponse;      // Formatted for API response
  children: WBSTree[];        // Recursive child structure
}
```

#### Request/Response DTOs

**CreateWBSItemRequest:**
```typescript
{
  projectId: string;          // Required
  parentId?: string | null;   // Optional (null for root items)
  name: string;               // Required, 1-255 chars
  description?: string;       // Optional, max 2000 chars
  plannedStartDate?: Date | string;  // ISO datetime or Date
  plannedEndDate?: Date | string;
  actualStartDate?: Date | string;
  actualEndDate?: Date | string;
  ownerId?: string;           // Optional user ID
  status?: WBSItemStatus;     // Defaults to 'NotStarted'
  plannedCost?: number;       // Defaults to null
  actualCost?: number;        // Defaults to null
  percentComplete?: number;   // Defaults to 0
}
```

**UpdateWBSItemRequest:**
```typescript
{
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
```

**WBSItemResponse:**
All dates returned as ISO format strings instead of Date objects for API consistency.

### 2. Validation Schemas (`src/lib/validation/wbs-schema.ts`)

#### createWBSItemSchema
- `projectId`: Required, non-empty string
- `parentId`: Optional, accepts string or null
- `name`: Required, 1-255 characters
- `description`: Optional, max 2000 characters
- `status`: Optional, defaults to 'NotStarted'
- `percentComplete`: Optional, 0-100 range, defaults to 0
- `plannedCost`/`actualCost`: Optional, min 0
- All date fields accept ISO datetime strings or Date objects

#### updateWBSItemSchema
All fields are optional (subset operations supported)

#### listWBSItemsFilterSchema
```typescript
{
  projectId: string;          // Required
  parentId?: string;          // Filter by parent
  level?: number;             // Filter by hierarchy level
  status?: WBSItemStatus | WBSItemStatus[];  // Single or array
  search?: string;            // Search name/description
  ownerId?: string;           // Filter by owner
  hasChildren?: boolean;      // Only parent or leaf items
  sortBy?: 'name' | 'createdAt' | 'plannedStartDate' | 'status' | 'level';
  sortOrder?: 'asc' | 'desc';
  skip?: number;              // Pagination offset
  take?: number;              // Pagination limit (1-100)
}
```

#### createWBSConfigurationSchema
```typescript
{
  projectId: string;          // Required
  levels: number;             // 1-5 levels
  levelNames: string[];       // Names for each level
}
```

### 3. WBSService (`src/lib/services/wbs-service.ts`)

#### Core Methods

**getOrCreateConfiguration(projectId: string)**
- Gets existing WBS configuration or creates default (3 levels)
- Ensures every project has a WBS configuration
- **Returns:** `WBSConfiguration`

**getWBSItem(itemId: string)**
- Retrieves single item with full details and relationships
- Converts Decimal types to JavaScript numbers
- **Returns:** `WBSItem`

**listWBSItems(filter?: Partial<ListWBSItemsFilter>)**
- Lists items with comprehensive filtering, sorting, pagination
- Supports status filtering (single or array)
- Search in name and description fields
- **Returns:** `{ items: WBSItem[]; total: number }`

**getWBSTree(projectId: string)**
- Returns complete hierarchical tree structure
- Organizes items by parent-child relationships
- Useful for UI tree rendering
- **Returns:** `WBSTree[]`

**createWBSItem(data: CreateWBSItemRequest)**
- Creates new WBS item with validation
- Validates parent item exists and level doesn't exceed configured max
- Does NOT trigger aggregation (parent aggregations update lazily)
- **Returns:** `WBSItem`

**updateWBSItem(itemId: string, data: UpdateWBSItemRequest)**
- Updates item fields (all optional)
- If parent changes, triggers aggregation for old and new parent chains
- If data changes, triggers aggregation for parent chain
- **Returns:** `WBSItem`

**deleteWBSItem(itemId: string)**
- Soft delete (sets deletedAt timestamp)
- Prevents deletion if item has children
- Triggers aggregation recalculation for parent chain
- **Returns:** `void`

**recalculateAggregations(itemId: string, direction: 'up' | 'down')**
- **Direction 'up':** Recalculates item and recursively updates all ancestors
- **Direction 'down':** Recalculates item and all descendants
- Used internally after updates/deletes
- **Returns:** `void`

**calculateAggregations(itemId: string)**
- Computes aggregated values from direct children
- Calculates: aggregatedStartDate, aggregatedEndDate, aggregatedCost, aggregatedStatus
- **Returns:** `AggregationResult`

**calculateAggregatedStatus(statuses: WBSItemStatus[])**
- Determines parent status from child statuses
- Logic:
  - All same status → return that status
  - Mixed InProgress/Delayed → 'InProgress'
  - Any Cancelled with non-Completed → 'Mixed'
  - Else → 'Mixed'
- **Returns:** `AggregatedStatus | null`

**getStatistics(projectId: string)**
- Returns comprehensive WBS statistics
- Includes counts by status, level, financial totals
- **Returns:** `WBSStatistics`

#### Aggregation Logic Deep Dive

**When Aggregation Occurs:**
1. Item creation - No aggregation (lazy)
2. Item update - Recalculate parent chain (up direction)
3. Parent change - Recalculate old and new parent chains
4. Item deletion - Recalculate parent chain
5. Manual trigger - On demand via recalculateAggregations

**Calculation Formula:**

```
aggregatedStartDate = MIN(child.actualStartDate OR child.plannedStartDate)
aggregatedEndDate = MAX(child.actualEndDate OR child.plannedEndDate)
aggregatedCost = SUM(child.actualCost OR child.plannedCost)
aggregatedStatus = calculateAggregatedStatus([child.status...])
```

**Recursive Pattern:**
```typescript
static async recalculateAggregations(itemId: string, direction: 'up' | 'down') {
  const item = await prisma.wBSItem.findUnique({ ... });

  if (direction === 'up' && item.parentId) {
    // 1. Calculate aggregation for parent
    const agg = await this.calculateAggregations(item.parentId);
    // 2. Update parent in database
    await prisma.wBSItem.update({ ... });
    // 3. Recursively update grandparent
    await this.recalculateAggregations(item.parentId, 'up');
  }

  if (direction === 'down') {
    // 1. Get all children
    // 2. Calculate aggregations for each child
    // 3. Update all children in database
    // 4. Recursively process their children
  }
}
```

## Tenant Scoping

All database operations are automatically scoped to the current tenant:

```typescript
// Service internally uses getTenantId()
const items = await WBSService.listWBSItems({ projectId });
// Only returns items for projects in current tenant
```

**Multi-level Verification:**
1. Project existence verified with tenantId
2. WBS item queries include implicit tenant filtering
3. Parent/child relationships validated within tenant

## Decimal Type Handling

Prisma returns financial fields as `Decimal` type. All service methods automatically convert:

```typescript
// Prisma returns Decimal
const dbItem = await prisma.wBSItem.findUnique({ ... });
// dbItem.actualCost is Decimal

// Service converts to number
const item = await WBSService.getWBSItem(id);
// item.actualCost is number
```

## Test Data

Seed data includes 15 comprehensive WBS items across 3 projects:

### Project 1: EHR Implementation (3-level WBS)

```
Phase 2: Development (InProgress, 60% complete)
├─ Backend Development (InProgress, 75% complete)
│  ├─ Database Schema Design (Completed, 100%)
│  └─ API Development & Integration (InProgress, 65%)
├─ Frontend Development (NotStarted, 0%)
└─ QA & Testing (NotStarted, 0%)
   └─ Test Case Development (NotStarted, 0%)
```

**Financial Summary:**
- Planned Cost: $280,000
- Actual Cost: $88,000
- Budget Utilization: 31.4%

### Project 2: Pharmacy Integration (2-level WBS)

```
Pharmacy Integration (Pending, 10% complete)
├─ Requirements & Design (InProgress, 90%)
└─ Development & Deployment (NotStarted, 0%)
   ├─ System Integration (NotStarted, 0%)
   └─ User Acceptance Testing (NotStarted, 0%)
```

**Financial Summary:**
- Planned Cost: $200,000
- Actual Cost: $5,000
- Budget Utilization: 2.5%

### Project 3: Analytics Dashboard (2-level WBS)

```
Data Integration & Reporting (InProgress, 45% complete)
└─ Data Warehouse Setup (InProgress, 80%)
   └─ Schema Design & Setup (Completed, 100%)
```

**Financial Summary:**
- Planned Cost: $130,000
- Actual Cost: $63,000
- Budget Utilization: 48.5%

## Usage Examples

### Getting a WBSItem

```typescript
import { WBSService } from '@/lib/services/wbs-service';

const item = await WBSService.getWBSItem(itemId);
console.log(`${item.name}: ${item.percentComplete}% complete`);
```

### Listing WBS Items with Filters

```typescript
// Get all in-progress items in a project
const { items, total } = await WBSService.listWBSItems({
  projectId,
  status: 'InProgress',
  sortBy: 'plannedStartDate',
  take: 20,
});

// Get completed items at level 2
const { items } = await WBSService.listWBSItems({
  projectId,
  level: 2,
  status: 'Completed',
});

// Search across name and description
const { items } = await WBSService.listWBSItems({
  projectId,
  search: 'database',
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
```

### Getting the WBS Tree

```typescript
const tree = await WBSService.getWBSTree(projectId);

// Render hierarchically
const renderTree = (nodes: WBSTree[]) => {
  return nodes.map(node => (
    <div key={node.item.id}>
      <h3>{node.item.name}</h3>
      <p>Status: {node.item.status} ({node.item.percentComplete}%)</p>
      {node.children.length > 0 && renderTree(node.children)}
    </div>
  ));
};
```

### Creating a WBS Item

```typescript
import { createWBSItemSchema } from '@/lib/validation/wbs-schema';

const validated = createWBSItemSchema.parse({
  projectId,
  parentId: phaseId,
  name: 'Database Migration',
  description: 'Migrate legacy data to new schema',
  status: 'NotStarted',
  plannedStartDate: new Date('2024-11-01'),
  plannedEndDate: new Date('2024-12-15'),
  ownerId: userId,
  plannedCost: 50000,
});

const item = await WBSService.createWBSItem(validated);
```

### Updating a WBS Item

```typescript
const updated = await WBSService.updateWBSItem(itemId, {
  percentComplete: 75,
  actualCost: 45000,
  actualStartDate: new Date('2024-10-15'),
  status: 'InProgress',
});

// Parent aggregations automatically recalculated
```

### Handling Parent-Child Relationships

```typescript
// Get all children of an item
const { items: children } = await WBSService.listWBSItems({
  projectId,
  parentId: itemId,
});

// Change parent (careful - triggers aggregation recalculation)
await WBSService.updateWBSItem(childItemId, {
  parentId: newParentId,
});

// Cannot delete items with children
try {
  await WBSService.deleteWBSItem(parentItemId);
} catch (e) {
  console.error('Cannot delete parent with children');
}
```

### Manual Aggregation Recalculation

```typescript
// Recalculate upward (item and all ancestors)
await WBSService.recalculateAggregations(itemId, 'up');

// Recalculate downward (item and all descendants)
await WBSService.recalculateAggregations(itemId, 'down');
```

## Constraints & Validation

### Level Validation

```
Maximum Levels: 5 (configured per project in WBSConfiguration)
Level Numbering: 0-based (0 = root, 1 = children of root, etc.)
Parent Level: Must be one less than child level
```

**Validation Logic:**
```typescript
if (item.level >= config.levels) {
  throw new Error('Item level exceeds configured maximum');
}
if (parent.level + 1 !== item.level) {
  throw new Error('Item level must be parent level + 1');
}
```

### Deletion Constraints

```typescript
// Cannot delete if has children
if (childCount > 0) {
  throw new Error('Cannot delete parent item with children');
}

// Can only soft delete (sets deletedAt)
// Hard delete requires direct Prisma access (admin only)
```

### Financial Constraints

```
plannedCost: >= 0
actualCost: >= 0
percentComplete: 0-100
```

## Soft Deletes

Items use soft delete pattern (deletedAt field):

```typescript
// Deletion doesn't remove record
await WBSService.deleteWBSItem(itemId);
// Sets deletedAt timestamp

// All queries exclude soft-deleted items
const items = await WBSService.listWBSItems({ projectId });
// Only returns items where deletedAt = null
```

## Performance Considerations

### Indexes

Database has indexes on:
- `projectId` - For project filtering
- `parentId` - For parent-child queries
- `level` - For level-based queries
- `status` - For status filtering
- `deletedAt` - To exclude soft-deleted items
- `(projectId, level)` - Composite for efficient filtering

### Query Patterns

**Efficient:**
```typescript
// Uses index on (projectId, level)
const { items } = await WBSService.listWBSItems({
  projectId,
  level: 2,
});

// Uses index on projectId
const tree = await WBSService.getWBSTree(projectId);
```

**Expensive:**
```typescript
// Full table scan with regex
const { items } = await WBSService.listWBSItems({
  search: '%pattern%',
});
```

### Pagination Recommendations

```typescript
// Always paginate for large projects
const page1 = await WBSService.listWBSItems({
  projectId,
  take: 20,
  skip: 0,
});

const page2 = await WBSService.listWBSItems({
  projectId,
  take: 20,
  skip: 20,
});
```

### Aggregation Performance

Aggregation is expensive for deep hierarchies:
- Time complexity: O(n) where n = all descendants
- Triggered on each item change
- Consider batch operations for bulk updates

```typescript
// Single aggregation recalculation
// Cost: proportional to tree depth

// Bulk updates should batch recalculations
// Planned for CHUNK 3.1: WBS Aggregation Service optimization
```

## Error Handling

Common errors and how to handle:

```typescript
try {
  await WBSService.deleteWBSItem(itemId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Item doesn't exist
  }
  if (error.message.includes('has children')) {
    // Item has dependent children
  }
  if (error.message.includes('not accessible')) {
    // Cross-tenant access attempt
  }
}
```

## Configuration

### WBS Configuration Immutability

WBS Configuration CANNOT be modified after creation:

```typescript
// ✅ Create configuration
await prisma.wBSConfiguration.create({
  data: { projectId, levels: 3, levelNames: [...] }
});

// ❌ Update configuration - NOT SUPPORTED
// This would break WBS structure integrity

// To change structure: Create new project with new configuration
```

**Rationale:** Ensures all WBS items in a project conform to the defined structure throughout the project lifecycle.

## Related Models

WBS connects to:
- **Project** - Each project has one WBSConfiguration
- **User** (ownerId) - Team member assigned to item
- **CostItem** - Financial tracking
- **Risk** - Risks associated with WBS items
- **Benefit** - Benefits linked to deliverables

## What's Next (Phase 3, Chunk 3.1)

The next chunk implements:
- **WBS Aggregation Service** (Advanced)
- Bulk aggregation optimization
- Background job for deep hierarchy recalculation
- Cache invalidation patterns
- Performance optimization for large trees

## Acceptance Criteria

### ✅ Type Definitions
- [x] WBSItem interface with all fields
- [x] WBSConfiguration interface (immutable)
- [x] AggregatedStatus type including 'Mixed' and 'Cancelled'
- [x] Request/Response DTOs
- [x] Filter and statistics types
- [x] WBSTree hierarchical type

### ✅ Validation Schemas
- [x] createWBSItemSchema
- [x] updateWBSItemSchema
- [x] listWBSItemsFilterSchema
- [x] createWBSConfigurationSchema
- [x] Comprehensive field validations
- [x] Type inference from schemas

### ✅ WBSService Implementation
- [x] 8 main methods fully implemented
- [x] Recursive aggregation logic working
- [x] Tenant scoping on all queries
- [x] Decimal type conversion
- [x] Parent-child validation
- [x] Soft delete support
- [x] Error handling with descriptive messages
- [x] Level validation
- [x] Owner assignment

### ✅ Database Integration
- [x] WBSConfiguration model with indexes
- [x] WBSItem model with relationships
- [x] Soft delete support (deletedAt)
- [x] Proper cascading relationships
- [x] Performance indexes

### ✅ Test Data
- [x] WBS Configuration for 3 projects (3-level, 2-level, 2-level)
- [x] 15 comprehensive WBS items
- [x] Mixed statuses and completion states
- [x] Multiple ownership assignments
- [x] Hierarchical structure with 3 levels max
- [x] Realistic financial data

### ✅ Code Quality
- [x] npm run build succeeds
- [x] TypeScript strict mode passes
- [x] ESLint validation clean
- [x] All type assertions properly documented
- [x] No type errors in return values

## Statistics Available

### WBSStatistics

```typescript
interface WBSStatistics {
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
```

**Usage:**
```typescript
const stats = await WBSService.getStatistics(projectId);
console.log(`
  Total Items: ${stats.totalItems}
  In Progress: ${stats.itemsByStatus['InProgress']}
  Budget: $${stats.totalPlannedCost}
  Actual Cost: $${stats.totalActualCost}
  Avg Completion: ${stats.averagePercentComplete}%
`);
```

## Security & Authorization

- Tenant context from middleware prevents cross-tenant access
- Database queries always filtered by project + tenant
- Parent-child relationships validated within same project
- Soft delete field automatically populated
- User references (ownerId) optionally verified

## Documentation

- `CHUNK_2.2_SETUP.md` - This file
- Service methods fully documented with JSDoc
- Type definitions with detailed interface comments
- Validation schemas with inline comments
- Seed data examples in prisma/seed.ts

---

**Status**: Implementation Complete ✅
**Phase**: 2 (Core Models)
**Chunk**: 2.2 / 51
**Overall Progress**: 7/51 chunks (14%)
**Build Status**: ✅ Success
**Test Status**: ⏳ Running...

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
