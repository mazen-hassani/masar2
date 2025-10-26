# CHUNK 2.1: Program & Project Domain Models - Setup & Usage Guide

## Overview

This chunk implements the core Program and Project domain models that form the foundation of the portfolio management system. These models represent the main entities that organizations manage and track throughout their lifecycle.

**Key Features:**
- ✅ Comprehensive domain models with validation
- ✅ Type-safe DTOs for requests/responses
- ✅ Zod validation schemas
- ✅ Service classes with tenant scoping
- ✅ Statistics and filtering capabilities
- ✅ Extensive test data seeding

## Architecture

### Domain Model Hierarchy

```
┌─────────────────────────────────────────┐
│          PORTFOLIO STRUCTURE             │
├─────────────────────────────────────────┤
│ Tenant                                  │
│ └─ Program (multiple)                   │
│    ├─ Project (multiple per program)     │
│    │  ├─ WBS Configuration               │
│    │  ├─ WBS Items (hierarchical)        │
│    │  ├─ Project Scoring                 │
│    │  ├─ Benefits & KPIs                 │
│    │  ├─ Risks                           │
│    │  └─ Costs                           │
│    ├─ Program Risks                      │
│    └─ Program Benefits                   │
└─────────────────────────────────────────┘
```

### Type System

**Program Types:**
```typescript
// Status: Draft, Pending, Active, OnHold, Completed, Cancelled
// Complexity: Low, Medium, High
```

**Project Types:**
```typescript
// Type: Project, Initiative
// Status: Draft, Pending, Active, OnHold, Completed, Cancelled
// Complexity: Low, Medium, High
```

## File Structure

```
src/
├── types/
│   ├── program.ts          # Program type definitions and DTOs
│   └── project.ts          # Project type definitions and DTOs
├── lib/
│   ├── services/
│   │   ├── program-service.ts    # Program business logic
│   │   └── project-service.ts    # Project business logic
│   ├── validation/
│   │   ├── program-schema.ts     # Zod validation schemas
│   │   └── project-schema.ts     # Zod validation schemas
│   └── ...
└── ...
```

## Component Details

### 1. Program Type Definitions (`src/types/program.ts`)

**Core Program Interface:**
```typescript
interface Program {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  complexityBand: ComplexityBand;
  requesterId: string | null;
  pmId: string | null;
  sponsorId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  actualCost: number;
  scoreValue: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

**Program DTOs:**
- `CreateProgramRequest` - Input for creating programs
- `UpdateProgramRequest` - Input for updating programs
- `ProgramResponse` - Output format for API responses
- `ProgramWithRelations` - Full object with related data

**Program Filters:**
```typescript
interface ListProgramsFilter {
  status?: ProgramStatus | ProgramStatus[];
  complexity?: ComplexityBand | ComplexityBand[];
  search?: string;
  pmId?: string;
  sponsorId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  sortBy?: 'name' | 'createdAt' | 'startDate' | 'budget' | 'status';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}
```

### 2. Project Type Definitions (`src/types/project.ts`)

**Core Project Interface:**
```typescript
interface Project {
  id: string;
  tenantId: string;
  programId: string | null;
  type: ProjectType;
  name: string;
  description: string | null;
  status: ProjectStatus;
  complexityBand: ComplexityBand;
  requesterId: string | null;
  pmId: string | null;
  sponsorId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  actualCost: number;
  scoreValue: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

**Project DTOs:**
- `CreateProjectRequest` - Input for creating projects
- `UpdateProjectRequest` - Input for updating projects
- `ProjectResponse` - Output format for API responses
- `ProjectWithRelations` - Full object with related data

**Project Health Status:**
```typescript
interface ProjectHealthStatus {
  projectId: string;
  overallHealth: 'Healthy' | 'AtRisk' | 'Critical';
  budgetHealth: 'Healthy' | 'AtRisk' | 'Critical';
  scheduleHealth: 'Healthy' | 'AtRisk' | 'Critical';
  scopeHealth: 'Healthy' | 'AtRisk' | 'Critical';
  issues: string[];
  recommendations: string[];
}
```

### 3. Validation Schemas

**Program Validation Schema:**
```typescript
// Required fields
- name: string (1-255 chars)
- description: string (optional, max 2000 chars)
- status: enum (Draft, Pending, Active, OnHold, Completed, Cancelled)
- complexityBand: enum (Low, Medium, High)
- budget: number (min 0)
- dates: ISO datetime or Date objects
```

**Project Validation Schema:**
```typescript
// Required fields
- type: enum (Project, Initiative)
- name: string (1-255 chars)
- programId: optional reference to Program
- All other validations same as Program
```

### 4. Service Classes

#### ProgramService

**Available Methods:**

```typescript
// Get single program
static async getProgram(programId: string): Promise<ProgramWithRelations | null>

// List programs with filters
static async listPrograms(filter?: Partial<ListProgramsFilter>):
  Promise<{ programs: Program[]; total: number }>

// Create new program
static async createProgram(data: CreateProgramRequest): Promise<Program>

// Update existing program
static async updateProgram(programId: string, data: UpdateProgramRequest): Promise<Program>

// Soft delete program
static async deleteProgram(programId: string): Promise<void>

// Get statistics
static async getStatistics(): Promise<ProgramStatistics>
```

**Tenant Scoping:**
All methods automatically filter by current tenant using `getTenantId()` from tenant context. Cross-tenant access is prevented at the database query level.

#### ProjectService

**Available Methods:**

```typescript
// Get single project
static async getProject(projectId: string): Promise<ProjectWithRelations | null>

// List projects with filters
static async listProjects(filter?: Partial<ListProjectsFilter>):
  Promise<{ projects: Project[]; total: number }>

// Create new project
static async createProject(data: CreateProjectRequest): Promise<Project>

// Update existing project
static async updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project>

// Soft delete project
static async deleteProject(projectId: string): Promise<void>

// Get projects by program
static async getProjectsByProgram(programId: string): Promise<Project[]>

// Get statistics
static async getStatistics(): Promise<ProjectStatistics>
```

## Test Data

The seed script populates comprehensive test data:

### Programs
1. **Digital Health Transformation** (Active, High Complexity)
   - Budget: $1,000,000
   - Actual Cost: $250,000
   - Status: Active (in progress)

2. **Healthcare Data Analytics Platform** (Active, Medium Complexity)
   - Budget: $500,000
   - Actual Cost: $80,000
   - Status: Active

3. **Telemedicine Infrastructure** (Pending, High Complexity)
   - Budget: $300,000
   - Actual Cost: $0
   - Status: Not started

4. **Patient Engagement System** (Draft, Medium Complexity)
   - Budget: $400,000
   - Actual Cost: $0
   - Status: Planning phase

### Projects
1. **EHR Implementation** (Project) - Under Digital Health Transformation
   - Budget: $450,000
   - Actual Cost: $150,000
   - WBS: 6 items with 3-level hierarchy
   - Scoring: 2 criteria (Strategic Alignment: 85, Risk Level: 70)

2. **Pharmacy Integration** (Initiative) - Under Digital Health Transformation
   - Budget: $200,000
   - Actual Cost: $35,000
   - Status: Pending

3. **Analytics Dashboard Development** (Project) - Under Data Analytics Platform
   - Budget: $350,000
   - Actual Cost: $70,000
   - WBS: Configured with 2-level hierarchy

4. **Standalone Security Audit** (Project) - Not part of program
   - Budget: $100,000
   - Status: Draft

## Usage Examples

### Creating a Program

```typescript
import { ProgramService } from '@/lib/services/program-service';
import { createProgramSchema } from '@/lib/validation/program-schema';

// Validate input
const validated = createProgramSchema.parse({
  name: 'Cloud Migration Initiative',
  description: 'Migrate legacy systems to cloud',
  status: 'Draft',
  complexityBand: 'High',
  budget: 800000,
  startDate: new Date('2024-06-01'),
});

// Create program
const program = await ProgramService.createProgram(validated);
```

### Listing Programs with Filters

```typescript
// Get active high-complexity programs
const { programs, total } = await ProgramService.listPrograms({
  status: 'Active',
  complexity: 'High',
  sortBy: 'startDate',
  sortOrder: 'asc',
  take: 10,
});

console.log(`Found ${total} programs, showing ${programs.length}`);
```

### Updating a Program

```typescript
await ProgramService.updateProgram(programId, {
  status: 'Active',
  actualCost: 350000,
  scoreValue: 82,
});
```

### Creating a Project Under Program

```typescript
const project = await ProjectService.createProject({
  programId: program.id,
  type: 'Project',
  name: 'Infrastructure Setup',
  description: 'Set up cloud infrastructure',
  status: 'Pending',
  budget: 150000,
  pmId: userId,
});
```

### Getting Program Statistics

```typescript
const stats = await ProgramService.getStatistics();

console.log(`
  Total Programs: ${stats.totalPrograms}
  Active: ${stats.programsByStatus.Active}
  Budget Utilization: ${stats.budgetUtilization}%
  Average Score: ${stats.averageScore}
`);
```

### Listing Projects by Program

```typescript
const projects = await ProjectService.getProjectsByProgram(programId);

console.log(`Program has ${projects.length} projects`);
```

## Decimal Type Handling

Prisma uses `Decimal` type for financial fields. All service methods automatically convert Decimal values to JavaScript `number` for type safety:

```typescript
// Prisma returns Decimal
const dbRecord = await prisma.program.findUnique({ ... });
// dbRecord.budget is Decimal

// Service converts to number
const program = await ProgramService.getProgram(id);
// program.budget is number
```

## Tenant Scoping

All database queries are automatically scoped to the current tenant:

```typescript
// All methods use getTenantId() internally
const programs = await ProgramService.listPrograms();
// Only returns programs for current tenant

// Creating a program
const program = await ProgramService.createProgram({
  name: 'New Program',
  ...
});
// Automatically assigned to current tenant
```

Cross-tenant access is prevented at multiple levels:
1. Query filter on `tenantId`
2. Verification before update/delete operations
3. Program validation when assigning to projects

## Soft Deletes

Programs and Projects support soft deletes using `deletedAt` timestamp:

```typescript
// Deletes don't remove records, just set deletedAt
await ProgramService.deleteProgram(programId);

// All list queries automatically exclude soft-deleted items
// Hard delete requires direct Prisma call (admin only)
```

## Error Handling

Services throw descriptive errors:

```typescript
try {
  await ProgramService.createProgram(data);
} catch (error) {
  if (error.message.includes('already exists')) {
    // Handle duplicate name
  }
  if (error.message.includes('not found')) {
    // Handle missing program
  }
}
```

## Performance Considerations

**Indexes:**
- `tenantId` - For filtering by tenant
- `status` - For status-based queries
- `complexityBand` - For complexity filtering
- `deletedAt` - To exclude soft-deleted items
- `programId` (projects) - For program-project relationships

**Pagination:**
Always use `skip` and `take` for large datasets:

```typescript
const page1 = await ProgramService.listPrograms({
  take: 20,
  skip: 0,
});

const page2 = await ProgramService.listPrograms({
  take: 20,
  skip: 20,
});
```

## Related Models

Programs and Projects connect to:
- **WBSConfiguration/WBSItem** - Work breakdown structure
- **ProjectScoring** - Scoring matrix scores
- **Benefit** - Benefits realization tracking
- **Risk** - Risk management
- **CostItem/Invoice** - Financial tracking

## What's Next (Phase 2, Chunk 2.2)

The next chunk implements:
- **WBS Configuration & Structure** (Work Breakdown Structure)
- Hierarchical task breakdown
- Cost aggregation from child items
- Status aggregation from leaf items

## Acceptance Criteria

### ✅ Type Definitions
- [x] Program type definitions with all fields
- [x] Project type definitions with all fields
- [x] Request/Response DTOs for both
- [x] Filter and statistics types
- [x] Type guards and helpers

### ✅ Validation Schemas
- [x] Zod schemas for creation
- [x] Zod schemas for updates
- [x] Filter schema with options
- [x] Comprehensive validation rules
- [x] Type inference from schemas

### ✅ Service Classes
- [x] ProgramService with 6 methods
- [x] ProjectService with 7 methods
- [x] Tenant scoping on all queries
- [x] Decimal type conversion
- [x] Error handling
- [x] Statistics calculations

### ✅ Database Setup
- [x] Program model with relationships
- [x] Project model with relationships
- [x] Proper indexes for performance
- [x] Soft delete support (deletedAt)
- [x] Unique constraints (tenant-scoped names)

### ✅ Test Data
- [x] 4 programs with various statuses
- [x] 4 projects under programs
- [x] WBS configurations and items
- [x] Scoring data with criteria
- [x] Realistic financial data

### ✅ Code Quality
- [x] npm run build succeeds
- [x] TypeScript strict mode passes
- [x] ESLint validation clean
- [x] All tests passing (35 total)
- [x] No type errors

## Statistics Returned

```typescript
interface ProgramStatistics {
  totalPrograms: number;
  programsByStatus: Record<ProgramStatus, number>;
  programsByComplexity: Record<ComplexityBand, number>;
  totalBudget: number;
  totalActualCost: number;
  budgetUtilization: number; // percentage
  averageScore: number | null;
}

interface ProjectStatistics {
  totalProjects: number;
  projectsByStatus: Record<ProjectStatus, number>;
  projectsByComplexity: Record<ComplexityBand, number>;
  projectsByType: Record<ProjectType, number>;
  totalBudget: number;
  totalActualCost: number;
  budgetUtilization: number;
  averageScore: number | null;
  projectsWithWBS: number;
  projectsScored: number;
}
```

## Security & Authorization

- Tenant context from middleware prevents cross-tenant access
- Database queries always filtered by tenantId
- Soft delete field automatically populated on creation
- User references (requesterId, pmId, sponsorId) enforce data relationships

## Documentation

- `CHUNK_2.1_SETUP.md` - This file
- Service methods fully documented with JSDoc comments
- Type definitions with detailed interface documentation
- Validation schemas with inline comments

---

**Status**: Implementation Complete ✅
**Phase**: 2 (Core Models)
**Chunk**: 2.1 / 51
**Overall Progress**: 6/51 chunks (12%)
**Test Results**: 35/35 tests passing
**Build Status**: ✅ Success

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
