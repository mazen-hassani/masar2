# CHUNK 3.3: Workflow Routing Algorithm Setup Guide

## Overview

CHUNK 3.3 implements a pure workflow routing service that intelligently matches workflow templates to entities based on matching criteria. This service complements CHUNK 3.2's database-driven template management by providing a flexible, stateless routing engine for workflow selection.

## What Was Implemented

### 1. WorkflowRouter Service (`src/lib/services/workflow-service.ts`)

**Pure Function-Based Routing (No Database Access)**

A dedicated routing service class with static methods for workflow template matching and selection:

#### Core Methods

- **`routeWorkflow()`** - Main routing entry point
  - Takes array of templates and entity properties
  - Scores each template using multi-criteria algorithm
  - Returns best match with score and match reasons
  - Falls back to default template if available
  - Returns null for empty template list

- **`calculateScore()`** - Single template scoring
  - Pure function with no side effects
  - Scores: Budget (30) > Complexity (20) > Type (10) + Default (5)
  - Returns numeric score for ranking

- **`getDefaultTemplate()`** - Default template retrieval
  - Finds template with `isDefault = true`
  - Used as fallback when no matches found
  - Returns null if no default available

- **`filterByEntityType()`** - Pre-filter templates
  - Filters templates by entity type
  - Treats `null` entityType as wildcard
  - Reduces scoring workload for large template lists

- **`rankTemplates()`** - Get ranked candidate list
  - Scores all templates
  - Sorts by score descending
  - Returns array of templates with scores
  - Useful for showing user multiple options

### 2. Scoring Algorithm

**Priority-Based Matching: Budget > Complexity > Type**

```
Total Score = Budget(30) + Complexity(20) + Type(10) + Default(5)

Budget Range Match (30 points) - HIGHEST PRIORITY
- If budget >= budgetMin AND budget <= budgetMax → +30
- Otherwise → 0
- Null budgetMin treated as 0
- Null budgetMax treated as Number.MAX_SAFE_INTEGER

Complexity Band Match (20 points) - MEDIUM PRIORITY
- If entityComplexity === templateComplexity → +20
- Otherwise → 0

Entity Type Match (10 points) - LOWEST PRIORITY
- If entityType === templateEntityType → +10
- Otherwise → 0

Default Template Bonus (5 points) - TIEBREAKER
- If template.isDefault === true → +5
- Used to prefer default on score ties

Max Possible Score: 65 points
```

### 3. Comprehensive Unit Tests (`src/lib/__tests__/workflow.test.ts`)

**18 New Tests for WorkflowRouter (in addition to existing 40+ tests)**

#### Routing Tests (5 tests)
- Route to template with highest score
- Prioritize budget matching (30 points)
- Prioritize complexity matching (20 points)
- Match on entity type (10 points)
- Fallback to default template when no exact match
- Return null for empty template list

#### Scoring Tests (5 tests)
- Calculate score correctly for single template
- Handle score calculation with no budget
- Handle score calculation with no complexity
- Handle budget boundary conditions (exact min, exact max, below, above)
- Prefer default template on score tie

#### Utility Tests (4 tests)
- Find default template from list
- Return null when no default template
- Filter templates by entity type
- Include wildcard templates in filter (null entityType)

#### Advanced Tests (4 tests)
- Rank templates by score (full ranking)
- Handle null budget fields in template
- Edge case: empty template list
- Edge case: multiple templates with same score

## Integration Architecture

**How CHUNK 3.3 Fits with CHUNK 3.2**

```
CHUNK 3.2 (Database-Driven)      CHUNK 3.3 (Pure Routing)
┌─────────────────────────────┐  ┌──────────────────────────────┐
│ WorkflowTemplateService     │  │ WorkflowRouter               │
├─────────────────────────────┤  ├──────────────────────────────┤
│ findMatchingTemplate()      │  │ routeWorkflow()              │
│ ├─ Loads from database      │  │ ├─ Pure function            │
│ ├─ Filters by tenant        │  │ ├─ Works with passed arrays │
│ └─ Calls routing logic      │  │ ├─ No database access       │
│                             │  │ └─ Fast, deterministic      │
└─────────────────────────────┘  └──────────────────────────────┘
         │                                    ▲
         └────────────────────────────────────┘
         Calls WorkflowRouter for scoring
```

**Use Cases for Pure Routing:**

1. **Testing** - Test routing logic without database
2. **Pre-Filtering** - Client-side template preview/selection
3. **Offline Mode** - Cached template routing
4. **API Simplicity** - Separate routing from persistence
5. **Performance** - Fast in-memory template matching

## Key Design Decisions

### 1. Pure Function Pattern
- No database access = fast, testable, cacheable
- Works with in-memory template arrays
- Can be used in different contexts (UI, API, batch jobs)
- Complements CHUNK 3.2's database operations

### 2. Score-Based Ranking
- Deterministic scoring allows ranking multiple candidates
- Budget is highest priority (most constraining)
- Complexity and type are secondary filters
- Default is tiebreaker, not primary fallback

### 3. Null Handling
- Null entityType = wildcard (matches any entity)
- Null budget bounds = unbounded (0 to infinity)
- Enables flexible template definitions

### 4. Fallback Strategy
- No match scenario: return default template if available
- Empty list scenario: return null (caller handles)
- Tie scenario: prefer default template

## Scoring Formula Details

### Budget Priority (30 Points)
```
if (entity.budget >= template.budgetMin && entity.budget <= template.budgetMax) {
  score += 30
}
```

Budget is highest priority because:
- Most restrictive constraint
- Different workflows for different budget scales
- Non-budgeted workflows can use wildcard (null budgetMin/Max)

### Complexity Priority (20 Points)
```
if (entity.complexity === template.complexityBand) {
  score += 20
}
```

Complexity is second priority because:
- Affects workflow depth and rigor
- Low complexity: simple fast-track workflows
- High complexity: detailed approval workflows

### Entity Type (10 Points)
```
if (entity.type === template.entityType) {
  score += 10
}
```

Entity type is lowest priority because:
- All entities need approval workflows
- Default template can handle any type
- More flexibility in matching

## Usage Examples

### Route Workflow to Template
```typescript
const templates = await templateService.listTemplates({});
const match = WorkflowRouter.routeWorkflow(
  templates.templates,
  'Project',      // entityType
  'Medium',       // complexityBand
  75000           // budget
);

console.log(`Best match: ${match?.template.name}`);
console.log(`Score: ${match?.matchScore}`);
console.log(`Reasons: ${match?.matchReasons.join(', ')}`);
```

### Calculate Single Template Score
```typescript
const score = WorkflowRouter.calculateScore(
  template,
  'Project',
  'High',
  500000
);
console.log(`Template score: ${score}`);
```

### Get All Candidates Ranked
```typescript
const ranked = WorkflowRouter.rankTemplates(
  templates,
  'Project',
  'Medium',
  100000
);

// Show user top 3 options
ranked.slice(0, 3).forEach((item, index) => {
  console.log(`${index + 1}. ${item.template.name} (score: ${item.score})`);
});
```

### Find Default Template
```typescript
const defaultTemplate = WorkflowRouter.getDefaultTemplate(templates);
if (!defaultTemplate) {
  console.warn('No default workflow template configured');
}
```

### Filter Before Scoring (Performance Optimization)
```typescript
// Pre-filter for type to reduce scoring workload
const projectTemplates = WorkflowRouter.filterByEntityType(
  templates,
  'Project'
);

const match = WorkflowRouter.routeWorkflow(
  projectTemplates,
  'Project',
  'Medium',
  50000
);
```

## Type Safety

**Pure Function Advantages:**
- No implicit dependencies on database state
- Parameters explicitly show requirements
- Return types are clear and predictable
- Easy to mock and test

**TypeScript Compatibility:**
- No Prisma type casting needed
- Works with simple object shapes
- Can accept templates from any source
- Flexible for future enhancements

## Performance Characteristics

**Time Complexity:**
- routeWorkflow: O(n) where n = number of templates
- calculateScore: O(1)
- rankTemplates: O(n log n) due to sorting
- getDefaultTemplate: O(n)

**Space Complexity:**
- O(1) for all methods (no proportional data structures)
- rankTemplates creates output array: O(n)

**Optimization Opportunities:**
1. Pre-filter by entityType before full scoring
2. Cache ranked results per tenant
3. Index templates by entityType for quick filtering
4. Memoize calculateScore for identical inputs

## Testing Coverage

**18 WorkflowRouter Tests** covering:

✅ **Functional Tests** - Core routing scenarios
- Highest score selection
- Budget priority enforcement
- Complexity matching
- Entity type matching
- Default fallback
- Empty list handling

✅ **Boundary Tests** - Edge cases
- Score ties with default template
- Null budget fields in templates
- Score calculations without all parameters
- Budget boundaries (min, max, boundaries)

✅ **Utility Tests** - Helper functions
- Default template retrieval
- Entity type filtering
- Template ranking
- All feature combinations

✅ **Scoring Tests** - Algorithm verification
- Correct score calculation
- Priority order enforcement (30 > 20 > 10)
- Default bonus application

## Integration with CHUNK 3.2

**WorkflowTemplateService.findMatchingTemplate() now uses WorkflowRouter:**

```typescript
// Before: CHUNK 3.2 had inline scoring logic
// After: Uses WorkflowRouter.routeWorkflow() for cleaner separation

static async findMatchingTemplate(
  tenantId: string,
  criteria: WorkflowMatchingCriteria
): Promise<WorkflowMatch | null> {
  // Load templates from database
  const templates = await prisma.workflowTemplate.findMany({...});

  // Use pure router for scoring/selection
  return WorkflowRouter.routeWorkflow(
    templates,
    criteria.entityType,
    criteria.complexityBand,
    criteria.budget
  );
}
```

## Advantages Over Database-Only Approach

| Aspect | Database-Only | Pure Routing |
|--------|---------------|--------------|
| **Speed** | Database round-trip | In-memory scoring |
| **Testability** | Requires mocks | Simple unit tests |
| **Flexibility** | Tied to database | Works anywhere |
| **Caching** | Complex invalidation | Easy memoization |
| **Offline** | Not possible | Fully functional |
| **Composability** | Hard to reuse | Easy to compose |

## Files Created/Modified

### Created
- None (pure routing service added to existing workflow-service.ts)

### Modified
- `src/lib/services/workflow-service.ts` - Added WorkflowRouter class (180+ lines)
- `src/lib/__tests__/workflow.test.ts` - Added 18 WorkflowRouter tests (220+ lines)

## Build Verification

```
✓ TypeScript strict compilation
✓ ESLint validation passed
✓ 18 new WorkflowRouter tests
✓ 40+ existing workflow tests still passing
✓ Production build successful
```

## Next Steps (CHUNK 3.4+)

- CHUNK 3.4: Workflow Execution Engine
  - Process stage actions (Approve/Reject/Return)
  - Permission verification
  - SLA compliance tracking
  - Request execution on final approval

## Summary

CHUNK 3.3 successfully implements:

- ✅ **Pure Routing Engine** - Stateless template matching
- ✅ **Score-Based Algorithm** - Budget > Complexity > Type
- ✅ **Default Fallback** - Graceful handling of no matches
- ✅ **Utility Functions** - Filtering, ranking, score calculation
- ✅ **Comprehensive Tests** - 18 tests covering all scenarios
- ✅ **Type Safety** - Full TypeScript compliance
- ✅ **Performance** - O(n) linear complexity
- ✅ **Flexibility** - Works with any template array

**Progress: Phase 3 now at 4/10 = 40% (CHUNKS 3.1, 3.2, 3.3, & 3.6 COMPLETE!)**
