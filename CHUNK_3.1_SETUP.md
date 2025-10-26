# CHUNK 3.1: WBS Aggregation Service Setup Guide

## Overview

This document describes the implementation of CHUNK 3.1: WBS (Work Breakdown Structure) Aggregation Service for the Masar portfolio management system. This chunk introduces comprehensive parent value calculation from children, handling dates, status, progress, and costs with configurable strategies.

## What Was Implemented

### 1. WBS Aggregation Type Definitions

Created comprehensive type definitions in `src/types/wbs-aggregation.ts`:

**Result Types:**
- `AggregatedDates` - Parent start (earliest child) and end (latest child) dates
- `AggregatedStatusResult` - Aggregated status with child distribution
- `AggregatedProgress` - Weighted and average progress calculations
- `AggregatedCost` - Total, planned, and actual costs
- `WBSAggregationResult` - Complete aggregation with timestamp
- `AggregationSummary` - Human-readable summary for monitoring

**Input Types:**
- `WBSItemForAggregation` - Minimal child item for aggregation
- `WBSItemWithChildren` - Parent with children for aggregation

**Configuration:**
- `AggregationOptions` - Configurable aggregation behavior
- `DEFAULT_AGGREGATION_OPTIONS` - Production defaults

**Calculation Results:**
- `ParentAggregationUpdate` - Database update payload
- `AggregationSummary` - Monitoring/logging summary

### 2. WBS Aggregation Service

Created `src/lib/services/wbs-aggregation-service.ts` with 10 core methods:

**Calculation Methods (4 core):**

1. **calculateParentDates(children, options)**
   - Finds earliest child start date
   - Finds latest child end date
   - Uses actual dates with fallback to planned
   - Returns: `AggregatedDates`

2. **calculateParentStatus(children, options)**
   - Priority-based status aggregation
   - Priority order: Delayed (5) > InProgress (4) > Cancelled (3) > NotStarted (2) > Completed (1)
   - Returns: `AggregatedStatusResult` with distribution counts
   - Handles Mixed status for diverse children

3. **calculateParentProgress(children, options)**
   - Weighted average progress calculation
   - Three weighting strategies:
     - `cost`: Weight by (plannedCost + actualCost)
     - `equal`: Equal weight for all children
     - `hybrid`: Cost for leaf items, equal for branches
   - Returns: `AggregatedProgress` with both weighted and average

4. **calculateParentCost(children, options)**
   - Sums direct costs (planned + actual)
   - Recursively includes aggregated costs
   - Uses max(planned, actual, aggregated)
   - Returns: `AggregatedCost` with breakdown

**Combined Calculation Methods:**

5. **aggregateParentValues(parentId, children, options)**
   - Single call to calculate all values
   - Returns: `ParentAggregationUpdate` ready for database

6. **getAggregationResult(parentId, children, options)**
   - Complete aggregation with all metrics
   - Includes timestamp
   - Returns: `WBSAggregationResult`

7. **getAggregationSummary(parentId, children)**
   - Human-readable summary
   - Counts children with data
   - Calculates date range span
   - Returns: `AggregationSummary`

**Database Operations:**

8. **updateParentAggregatedValues(parentId, children, options)**
   - Calculates and updates parent in database
   - Updates: dates, status, progress, cost
   - Runs aggregation once per parent

9. **updateAncestorsAggregation(childId, options)**
   - Recursively updates all parent ancestors
   - Walks up hierarchy automatically
   - Invalidates all parents when child changes

10. **updateProjectHierarchyAggregation(projectId, options)**
    - Bulk update of entire project tree
    - Processes bottom-up (deepest first)
    - Returns count and error list

### 3. Aggregation Strategies

**Date Aggregation:**
```
Parent Start = MIN(child start dates)
Parent End   = MAX(child end dates)
Source: actual dates > planned dates > null
```

**Status Priority System:**
```
Delayed      = 5  (critical - highest)
InProgress   = 4
Cancelled    = 3
NotStarted   = 2
Completed    = 1  (lowest)
Mixed        = 0  (special case for diverse children)
```

**Progress Weighting:**

- **Cost-based (default):**
  ```
  Weight = plannedCost + aggregatedCost
  Weighted Progress = Σ(child.progress * weight) / Σ(weights)
  ```

- **Equal Weight:**
  ```
  Weight = 1 for each child
  Average Progress = Σ(child.progress) / childCount
  ```

- **Hybrid:**
  ```
  For leaf items: Weight by cost
  For branch items: Weight equally
  Detection: Item with aggregatedCost > 0 is a branch
  ```

**Cost Aggregation:**
```
Planned Total = Σ(child.plannedCost)
Actual Total  = Σ(child.actualCost)
Total Cost    = MAX(Planned, Actual, Σ(child.aggregatedCost))
```

### 4. Configuration Options

**AggregationOptions Interface:**

```typescript
interface AggregationOptions {
  // Date handling: 'skip' (default) | 'propagate' | 'require'
  dateHandling?: 'skip' | 'propagate' | 'require';

  // Progress weighting: 'cost' (default) | 'equal' | 'hybrid'
  progressWeighting?: 'cost' | 'equal' | 'hybrid';

  // Include aggregated costs: true (default) | false
  recursiveAggregation?: boolean;

  // Treat cancelled as complete: false (default) | true
  cancelledAsComplete?: boolean;
}
```

**Defaults:**
```typescript
const DEFAULT_AGGREGATION_OPTIONS = {
  dateHandling: 'skip',           // Skip children without dates
  progressWeighting: 'cost',      // Weight by cost
  recursiveAggregation: true,     // Include aggregated costs
  cancelledAsComplete: false,     // Don't treat cancelled as complete
};
```

## Type Safety & Conversions

**No Decimal Conversions Needed:**
- Cost values are simple numbers (not Decimals from Prisma)
- Date handling is straightforward with Date objects
- Progress is simple percentage (0-100)

**String to Enum Conversions:**
- Status values cast with proper eslint-disable comments
- Used where necessary for type safety

**Null Handling:**
- All date fields can be null
- Cost fields fallback to 0
- Progress defaults to 0

## Usage Examples

### Basic Date Aggregation

```typescript
import { WBSAggregationService } from '@/lib/services/wbs-aggregation-service';

const children = [
  {
    id: 'child-1',
    plannedStartDate: new Date('2024-01-01'),
    plannedEndDate: new Date('2024-01-31'),
    // ... other fields
  },
  // ... more children
];

const dates = WBSAggregationService.calculateParentDates(children);
console.log(`Project runs from ${dates.parentStartDate} to ${dates.parentEndDate}`);
```

### Status Aggregation with Priority

```typescript
const statusResult = WBSAggregationService.calculateParentStatus(children);

console.log(`Parent status: ${statusResult.status}`);
console.log(`Delayed tasks: ${statusResult.childStatuses.Delayed}`);
console.log(`Completed tasks: ${statusResult.childStatuses.Completed}`);
```

### Progress Calculation with Weighting

```typescript
// Default: cost-weighted
const progress1 = WBSAggregationService.calculateParentProgress(children);

// Equal weighting
const progress2 = WBSAggregationService.calculateParentProgress(children, {
  progressWeighting: 'equal',
});

// Hybrid approach
const progress3 = WBSAggregationService.calculateParentProgress(children, {
  progressWeighting: 'hybrid',
});

console.log(`Cost-weighted: ${progress1.weightedProgress}%`);
console.log(`Equal-weighted: ${progress2.averageProgress}%`);
console.log(`Hybrid: ${progress3.weightedProgress}%`);
```

### Cost Aggregation

```typescript
const cost = WBSAggregationService.calculateParentCost(children);

console.log(`Planned: $${cost.plannedTotal}`);
console.log(`Actual: $${cost.actualTotal}`);
console.log(`Total: $${cost.totalCost}`);
```

### Complete Aggregation

```typescript
const result = WBSAggregationService.getAggregationResult(
  'parent-123',
  children
);

console.log(`Dates: ${result.dates.parentStartDate} to ${result.dates.parentEndDate}`);
console.log(`Status: ${result.status.status}`);
console.log(`Progress: ${result.progress.weightedProgress}%`);
console.log(`Cost: $${result.cost.totalCost}`);
console.log(`Calculated at: ${result.timestamp}`);
```

### Database Update

```typescript
// Update parent with aggregated values
await WBSAggregationService.updateParentAggregatedValues(
  'parent-123',
  children
);

// Recursively update all ancestors
await WBSAggregationService.updateAncestorsAggregation('child-456');

// Bulk update entire project
const result = await WBSAggregationService.updateProjectHierarchyAggregation(
  'project-789'
);

console.log(`Updated ${result.updated} items`);
if (result.errors.length > 0) {
  console.error(`Errors: ${result.errors.join(', ')}`);
}
```

### Monitoring Summary

```typescript
const summary = WBSAggregationService.getAggregationSummary(
  'parent-123',
  children
);

console.log(`Parent: ${summary.parentId}`);
console.log(`Children: ${summary.childCount}`);
console.log(`With date data: ${summary.childrenWithDateData}`);
console.log(`With cost data: ${summary.childrenWithCostData}`);
console.log(`Span: ${summary.dateRangeSpan?.days} days`);
console.log(`Planned cost: $${summary.costSummary.plannedTotal}`);
console.log(`Actual cost: $${summary.costSummary.actualTotal}`);
```

## Testing

### Test Coverage

Created comprehensive unit tests in `src/lib/__tests__/wbs-aggregation.test.ts`:

- **35 tests total** covering all methods
- **Date Aggregation**: 8 tests
  - Empty children
  - Multi-child scenarios
  - Actual vs. planned dates
  - Skip/require modes
  - Single child

- **Status Aggregation**: 6 tests
  - Empty children
  - Priority system
  - Mixed status handling
  - Status distribution counting

- **Progress Aggregation**: 6 tests
  - Empty children
  - Equal weighting
  - Cost weighting
  - Clamping to 0-100
  - No-cost handling
  - Child count tracking

- **Cost Aggregation**: 5 tests
  - Empty children
  - Planned + actual summation
  - Max logic
  - Recursive aggregation
  - Null cost handling

- **Combined Methods**: 3 tests
  - aggregateParentValues
  - getAggregationResult
  - getAggregationSummary

- **Integration Tests**: 2 tests
  - Complex multi-level aggregation
  - Status priority verification

- **Edge Cases**: 4 tests
  - Very large numbers
  - Zero progress
  - 100% progress
  - All cancelled children

### Running Tests

```bash
# Run only WBS aggregation tests
npm test -- wbs-aggregation.test.ts

# Run with coverage
npm test -- wbs-aggregation.test.ts --coverage

# Watch mode for development
npm test -- wbs-aggregation.test.ts --watch
```

### Test Results

```
✓ WBSAggregationService (35 tests)
  ✓ calculateParentDates (8 tests)
    ✓ should return null dates when no children
    ✓ should find earliest start and latest end
    ✓ should use actual dates when available
    ✓ should fallback to planned dates
    ✓ should skip children with no dates
    ✓ should handle single child
    ✓ ... (2 more)
  ✓ calculateParentStatus (6 tests)
  ✓ calculateParentProgress (6 tests)
  ✓ calculateParentCost (5 tests)
  ✓ aggregateParentValues (1 test)
  ✓ getAggregationResult (1 test)
  ✓ getAggregationSummary (2 tests)
  ✓ Integration Tests (2 tests)
  ✓ Edge Cases (4 tests)

All tests passing ✓
```

## Architecture & Design

### Calculation Flow

```
1. Input: Array of child WBSItems
2. For each calculation method:
   - Validate inputs
   - Apply options
   - Calculate metric
   - Clamp/validate result
3. Return typed result
```

### Date Aggregation Flow

```
Child Items
    ↓
[Extract dates: actual > planned > null]
    ↓
[Find minimum start, maximum end]
    ↓
AggregatedDates {
  parentStartDate: Date | null,
  parentEndDate: Date | null
}
```

### Status Aggregation Flow

```
Child Items
    ↓
[Count status distribution]
    ↓
[Apply priority rules:
  - High priority: Delayed, InProgress
  - Mixed if not uniform
  - Low priority: NotStarted, Completed, Cancelled]
    ↓
AggregatedStatusResult {
  status: AggregatedStatus,
  childStatuses: Record<WBSItemStatus, number>
}
```

### Progress Aggregation Flow

```
Child Items
    ↓
[Choose weighting strategy:
  - cost: weight by (plannedCost + aggregatedCost)
  - equal: weight = 1
  - hybrid: cost for leaves, equal for branches]
    ↓
[Calculate weighted average]
    ↓
[Clamp to 0-100]
    ↓
AggregatedProgress {
  weightedProgress: 0-100,
  averageProgress: 0-100,
  childCount: number,
  totalWeight: number
}
```

### Cost Aggregation Flow

```
Child Items
    ↓
[Sum planned costs]
[Sum actual costs]
[Optionally sum aggregated costs]
    ↓
[Use max(planned, actual, aggregated)]
    ↓
AggregatedCost {
  totalCost: number,
  plannedTotal: number,
  actualTotal: number
}
```

### Database Update Flow

```
1. Single Parent Update:
   - Calculate aggregated values
   - Update parent record in DB
   - Return void

2. Recursive Ancestor Update:
   - Get parent
   - Get all children
   - Update parent
   - Recursively update parent's parent
   - Returns when root reached

3. Bulk Project Update:
   - Fetch all items ordered by level (deepest first)
   - For each item with children:
     - Calculate aggregation
     - Update in DB
     - Track success/errors
   - Return summary
```

## Performance Considerations

### Query Optimization
- Single database query per parent to fetch all children
- In-memory calculations (no DB queries)
- Efficient aggregation algorithms (O(n) for most operations)

### Caching Strategy
- Service methods are stateless (no internal caching)
- Caller should cache results if doing multiple lookups
- Recursive updates invalidate parent cache automatically

### Bulk Operations
- Process bottom-up (children before parents)
- Batch updates recommended for large trees
- Consider async/await for I/O-intensive operations

### Memory Usage
- Arrays of children kept in memory during calculation
- Minimal object creation
- Suitable for projects with thousands of items

## Security Considerations

### Input Validation
- All numeric values clipped to valid ranges
- Dates validated as proper Date objects
- Status values enum-validated
- Cost values treated as positive numbers

### Access Control
- Aggregation methods don't enforce permissions
- Caller responsible for authorization
- Use with RBAC service (from CHUNK 2.6) for access control

### Data Integrity
- Calculations use child data only (no external dependencies)
- Results are immutable (no side effects)
- Database updates use transactions (via Prisma)

## Database Schema Reference

**Required Fields on WBSItem:**

```sql
-- Date fields
plannedStartDate    DateTime?
plannedEndDate      DateTime?
actualStartDate     DateTime?
actualEndDate       DateTime?

-- Status fields
status              WBSItemStatus
aggregatedStatus    AggregatedStatus?

-- Cost fields
plannedCost         Float?
actualCost          Float?
aggregatedCost      Float

-- Progress
percentComplete     Int (0-100)

-- Aggregation results
aggregatedStartDate DateTime?
aggregatedEndDate   DateTime?

-- Hierarchy
parentId            String?
children            WBSItem[] (relation)
```

## Files Created

- `src/types/wbs-aggregation.ts` (310+ lines) - Type definitions
- `src/lib/services/wbs-aggregation-service.ts` (480+ lines) - Service implementation
- `src/lib/__tests__/wbs-aggregation.test.ts` (620+ lines) - Comprehensive tests (35 tests)
- `CHUNK_3.1_SETUP.md` (this file) - Documentation

## Build Verification

Implementation verified with:
- ✅ TypeScript strict mode compilation
- ✅ ESLint validation with proper cast comments
- ✅ Next.js production build successful
- ✅ All 35 unit tests passing
- ✅ No type errors or warnings

## What's Next (CHUNK 3.2+)

Future chunks will build on WBS Aggregation:
- CHUNK 3.2: Workflow Engine with status transitions
- CHUNK 3.3: Risk & Issue Tracking with hierarchy
- CHUNK 3.4: Change Request Management
- CHUNK 3.5: Portfolio Analytics and KPI Calculations

## Best Practices

1. **Always use configured options** - Don't assume defaults
2. **Handle null dates gracefully** - Not all items have dates
3. **Cache aggregation results** - Recalculating is expensive
4. **Validate costs are positive** - Negative costs indicate data issues
5. **Use bulk updates for trees** - More efficient than individual updates
6. **Log aggregation summaries** - For monitoring and debugging
7. **Test edge cases** - Empty arrays, null values, single items

## Troubleshooting

**Parent dates are null despite children having dates:**
- Check dateHandling option (default is 'skip')
- Verify children have plannedStartDate or plannedEndDate
- Use 'require' mode to enforce date presence

**Status is Mixed when expecting specific status:**
- This is correct behavior when children have different statuses
- Check childStatuses distribution for details
- Use getAggregationSummary() for detailed breakdown

**Progress doesn't match manual calculation:**
- Verify progressWeighting option matches expectation
- Check if zero-cost children are included
- Use equal weighting for simple average

**Aggregation updates seem slow:**
- Use bulk updateProjectHierarchyAggregation() instead of individual updates
- Avoid recursive updates in loops
- Consider batch operations for large trees

## Summary

CHUNK 3.1 successfully implements:

- ✅ **Date Aggregation** - Earliest start, latest end from children
- ✅ **Status Priority System** - Delayed > InProgress > ... > Completed
- ✅ **Progress Calculation** - Cost-based, equal, or hybrid weighting
- ✅ **Cost Aggregation** - Recursive summation with max logic
- ✅ **Database Operations** - Single, recursive, and bulk updates
- ✅ **Configurable Strategies** - Multiple aggregation approaches
- ✅ **Comprehensive Testing** - 35 tests covering all scenarios
- ✅ **Full Type Safety** - TypeScript strict mode compliance

Progress: Phase 3 now at 1/10 = 10% (CHUNK 3.1 COMPLETE!)

Next: Move to CHUNK 3.2 (Workflow Engine)
