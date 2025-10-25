# MASAR PORTFOLIO MANAGER - ARCHITECTURE & DEPENDENCIES BLUEPRINT

## TABLE OF CONTENTS
1. System Overview & Architecture
2. Dependency Graph
3. Technology Stack Integration
4. Data Model Relationships
5. API Architecture
6. Phasing Strategy Rationale
7. Risk Mitigation
8. Testing Strategy
9. Integration Checklist

---

## 1. SYSTEM OVERVIEW & ARCHITECTURE

### 1.1 Macro Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSERS                           │
│          (Next.js Frontend @ /app Router)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS API LAYER                          │
│         (Route Handlers @ /app/api/[...])                  │
│  ├─ Request Validation (Zod)                              │
│  ├─ Permission Checking (Role-based)                      │
│  ├─ Audit Logging                                         │
│  └─ Tenant Context Middleware                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼───────┐ ┌───▼────────┐ ┌───▼─────────┐
│ PostgreSQL DB │ │ Redis      │ │ File Storage│
│ (Row-Level    │ │ (Caching & │ │ (S3-compat) │
│  Security)    │ │  Sessions) │ │             │
└───────────────┘ └────────────┘ └─────────────┘
```

### 1.2 Layered Architecture

```
┌─────────────────────────────────────────────┐
│     UI LAYER (React Components)             │
│  - Pages (Program, Project, Approval, etc)  │
│  - Forms & Data Entry                       │
│  - Dashboards & Reports                     │
│  - Zustand State Management                 │
└────────────────────┬────────────────────────┘

┌────────────────────▼────────────────────────┐
│    API LAYER (Next.js Route Handlers)       │
│  - Request validation                       │
│  - Permission enforcement                   │
│  - Data transformation                      │
│  - Response formatting                      │
└────────────────────┬────────────────────────┘

┌────────────────────▼────────────────────────┐
│  BUSINESS LOGIC LAYER (Services)            │
│  - WBS Aggregation                          │
│  - Workflow Execution                       │
│  - Risk Inheritance                         │
│  - Financial Calculations                   │
│  - Cost Rollup                              │
└────────────────────┬────────────────────────┘

┌────────────────────▼────────────────────────┐
│   DATA ACCESS LAYER (Prisma ORM)            │
│  - Database queries                         │
│  - Transaction management                   │
│  - Relationship loading                     │
└────────────────────┬────────────────────────┘

┌────────────────────▼────────────────────────┐
│   DATA LAYER (PostgreSQL + Row-Level Auth)  │
│  - Tenant data isolation                    │
│  - Constraints & Validation                 │
│  - Audit Trail                              │
└─────────────────────────────────────────────┘
```

---

## 2. DEPENDENCY GRAPH

### 2.1 Phase Dependencies (Critical Path)

```
Phase 1: Foundation
  ├─ 1.1 Next.js Setup
  ├─ 1.2 Database (Tenants, Users, Roles)
  ├─ 1.3 Authentication (NextAuth)
  ├─ 1.4 Tenant Middleware
  └─ 1.5 Configuration
       ↓ (All 5 required before Phase 2)

Phase 2: Core Models
  ├─ 2.1 Programs & Projects
  ├─ 2.2 WBS Configuration & Items
  ├─ 2.3 Scoring Matrix
  ├─ 2.4 Risk, Benefit, KPI
  ├─ 2.5 Financial (Cost Items, Invoices)
  └─ 2.6 User Roles Context
       ↓ (All 6 required before Phase 3)

Phase 3: Business Logic
  ├─ 3.1 WBS Aggregation (uses 2.2, 2.1)
  ├─ 3.2 Workflow Templates (uses 2.1)
  ├─ 3.3 Workflow Routing (uses 3.2)
  ├─ 3.4 Workflow Execution (uses 3.2, 1.3, 2.1)
  ├─ 3.5 Risk Inheritance (uses 2.4, 2.1)
  └─ 3.6 Financial Calcs (uses 2.5, 3.1)
       ↓ (All 6 required before Phase 4)

Phase 4: APIs
  ├─ 4.1 Zod Validators (uses 2.1-2.5)
  ├─ 4.2 Program/Project CRUD (uses 2.1, 1.4, 4.1)
  ├─ 4.3 WBS APIs (uses 2.2, 3.1, 4.1)
  ├─ 4.4 Scoring APIs (uses 2.3, 4.1)
  ├─ 4.5 Workflow Routing APIs (uses 3.2-3.3, 4.1)
  ├─ 4.6 Workflow Action APIs (uses 3.4, 4.1)
  ├─ 4.7 Risk APIs (uses 2.4, 3.5, 4.1)
  ├─ 4.8 Financial APIs (uses 2.5, 3.6, 4.1)
  ├─ 4.9 Benefit/KPI APIs (uses 2.4, 4.1)
  ├─ 4.10 Audit Logging (uses all)
  └─ 4.11 Approval Queue APIs (uses 3.4, 4.1)
       ↓ (All APIs required before Phase 5)

Phase 5: Frontend Foundation
  ├─ 5.1 Layout & Navigation (uses 1.3, 2.6)
  ├─ 5.2 Login UI (uses 1.3)
  ├─ 5.3 Component Library
  └─ 5.4 Zustand Stores
       ↓ (Foundation for Phase 6)

Phase 6-7: UI Features
  ├─ 6.1-6.6 Core CRUD UIs (use 4.2-4.4 APIs, 5.x foundation)
  ├─ 7.1-7.8 Advanced UIs (use 4.5-4.11 APIs, 5.x foundation)
       ↓
Phase 8: Testing & Deployment
  ├─ 8.1-8.3 Tests (test all previous)
  ├─ 8.4 Performance (optimizes all)
  ├─ 8.5 Notifications (integrates with 4.5-4.6)
  └─ 8.6 Deployment (packages all)
```

### 2.2 Chunk Dependency Matrix

| Chunk | Depends On | Required By | Risk Level |
|-------|------------|-------------|-----------|
| 1.1 | None | 1.2-1.5 | LOW |
| 1.2 | 1.1 | 1.3, 1.4, 2.1-2.6 | LOW |
| 1.3 | 1.2, 1.1 | 1.4, 2.6, API layer | LOW |
| 1.4 | 1.3, 1.2 | All APIs (4.x) | MEDIUM |
| 1.5 | 1.1 | All layers | LOW |
| 2.1 | 1.2, 1.3 | 2.2-2.6, 3.x, 4.x | MEDIUM |
| 2.2 | 2.1 | 3.1, 3.6, 4.3, 4.8 | MEDIUM |
| 2.3 | 2.1 | 4.4 | LOW |
| 2.4 | 2.1 | 3.5, 4.7, 4.9 | LOW |
| 2.5 | 2.1, 2.2 | 3.6, 4.8 | LOW |
| 2.6 | 1.2, 2.1 | Middleware, 4.x | MEDIUM |
| 3.1 | 2.2 | 4.3, 3.6 | MEDIUM |
| 3.2 | 2.1, 1.2 | 3.3-3.4, 4.5 | MEDIUM |
| 3.3 | 3.2 | 3.4, 4.5 | MEDIUM |
| 3.4 | 3.2, 1.3, 2.1 | 4.6 | HIGH |
| 3.5 | 2.4, 2.1 | 4.7 | MEDIUM |
| 3.6 | 2.5, 3.1 | 4.8 | MEDIUM |
| 4.x | Respective 2.x & 3.x | 6.x, 7.x | LOW |
| 5.1 | 1.3, 2.6 | 6.x, 7.x | MEDIUM |
| 5.2 | 1.3 | Login flow | LOW |
| 5.3 | None | All UI components | LOW |
| 5.4 | None | All UI pages | MEDIUM |
| 6.x-7.x | Respective 4.x APIs, 5.x | 8.3 E2E | LOW |
| 8.x | All previous | Production | NONE |

---

## 3. TECHNOLOGY STACK INTEGRATION

### 3.1 Frontend Stack

```
Next.js 14+ App Router
  ├─ TypeScript (strict mode)
  ├─ React 18+
  ├─ UI Components
  │   ├─ shadcn/ui (built on Radix UI)
  │   └─ Tailwind CSS for styling
  ├─ Data Visualization
  │   └─ Tremor (charting library)
  ├─ Data Grids
  │   └─ @tanstack/react-table (headless table)
  ├─ State Management
  │   └─ Zustand (lightweight, TypeScript-first)
  ├─ Forms
  │   └─ react-hook-form + Zod validation
  ├─ Date/Time
  │   └─ date-fns
  ├─ HTTP Client
  │   └─ axios/SWR (with caching)
  └─ Testing
      ├─ Vitest (unit tests)
      ├─ @testing-library (React component tests)
      └─ Playwright (E2E tests)
```

### 3.2 Backend Stack

```
Next.js 14+ Route Handlers
  ├─ TypeScript
  ├─ Database
  │   ├─ PostgreSQL 15+ (with RLS)
  │   ├─ Prisma ORM
  │   └─ pg (driver)
  ├─ Authentication
  │   └─ NextAuth.js (JWT + sessions)
  ├─ Validation
  │   └─ Zod (runtime validation)
  ├─ File Storage
  │   └─ S3-compatible (AWS SDK)
  ├─ Caching
  │   └─ Redis (for sessions, rate limiting)
  ├─ Email
  │   └─ Resend/SendGrid
  ├─ Testing
  │   ├─ Vitest
  │   └─ SuperTest (API testing)
  └─ Deployment
      └─ Docker + GitHub Actions
```

### 3.3 Data Flow Integration

```
User Action in UI
    ↓
React Hook Form (validation)
    ↓
API Request via Axios/SWR
    ↓
NextAuth Session Middleware
    ↓
Tenant Context Middleware (1.4)
    ↓
Next.js Route Handler
    ↓
Zod Validation (4.1)
    ↓
Permission Check (2.6 via middleware)
    ↓
Business Logic Service (3.x)
    ↓
Prisma ORM → PostgreSQL
    ↓
Audit Logging (4.10)
    ↓
Response Transform & Return
    ↓
Zustand Store Update
    ↓
React Re-render
    ↓
UI Update
```

---

## 4. DATA MODEL RELATIONSHIPS

### 4.1 Entity Relationship Diagram (Text)

```
Tenant (1) ──→ (N) User
  │                ├─ has many Roles
  │                └─ created_by relationships
  │
  ├─→ (N) Program
  │       ├─ pm: User
  │       ├─ sponsor: User
  │       ├─ requester: User
  │       ├─ (N) Project
  │       │       ├─ pm: User
  │       │       ├─ sponsor: User
  │       │       ├─ requester: User
  │       │       ├─ (1) WBSConfiguration (immutable)
  │       │       │     └─ (N) WBSItem (hierarchical)
  │       │       │           ├─ owner: User
  │       │       │           └─ children: WBSItem[]
  │       │       ├─ (N) ProjectScoring
  │       │       │     └─ criterion: ScoringCriterion
  │       │       ├─ (N) Risk (inherited from Program)
  │       │       │     └─ parent_risk: Risk
  │       │       ├─ (N) Benefit
  │       │       │     └─ (N) KPI
  │       │       │           └─ (N) KPIMeasurement
  │       │       └─ (N) Invoice
  │       │             └─ (N) InvoiceAllocation
  │       │                   └─ wbs_item: WBSItem
  │       │
  │       ├─ (N) Benefit
  │       │     └─ (N) KPI
  │       │           └─ (N) KPIMeasurement
  │       │
  │       ├─ (N) Risk
  │       │     └─ owner: User
  │       │
  │       └─ (N) Invoice
  │             └─ (N) InvoiceAllocation
  │
  ├─→ (N) ScoringCriterion
  │     └─ created_by: User
  │
  ├─→ (N) WorkflowTemplate
  │     ├─ created_by: User
  │     └─ (N) WorkflowStage
  │           └─ (N) StageResponsibility
  │                 └─ can reference User or Role
  │
  ├─→ (N) WorkflowInstance
  │     ├─ created_by: User
  │     ├─ workflow_template: WorkflowTemplate
  │     ├─ entity: Program | Project
  │     └─ (N) StageAction
  │           └─ actor: User
  │
  └─→ (N) AuditLog
        └─ actor: User
```

### 4.2 Aggregation Flows

```
Parent WBSItem
    ├─ aggregated_start_date = MIN(child.planned_start_date)
    ├─ aggregated_end_date = MAX(child.planned_end_date)
    ├─ aggregated_cost = SUM(child.aggregated_cost)
    ├─ aggregated_status = PRIORITY(child statuses)
    └─ child_owners = COLLECT(leaf.owner_id)

Project
    ├─ actual_cost = SUM(WBSItem.aggregated_cost)
    └─ score_value = WEIGHTED_AVG(ProjectScoring.score)

Program
    ├─ actual_cost = SUM(Project.actual_cost) + direct costs
    └─ (inherits projects' aggregations)
```

### 4.3 Workflow Instance State Machine

```
WorkflowInstance.status:

Draft
  ↓
Pending (assigned to Stage 1)
  ├─ → InProgress (Approve → move to Stage 2)
  │     ├─ → InProgress (each stage)
  │     │     └─ → Approved (final stage approved)
  │     │         └─ Execute request
  │     │             └─ Create/Update/Delete entity
  │     │
  │     ├─ → Rejected (Reject → end)
  │     │
  │     └─ → Pending (Return → back to Stage 1)
  │           └─ (cycle repeats)
  │
  └─ → Rejected (Reject → end)

StageAction tracks each transition
SLA tracked: current_stage_started → sla_due
```

---

## 5. API ARCHITECTURE

### 5.1 Request Flow

```
Frontend Request
    │
    ├─ NextAuth Session Check
    │   └─ Extract JWT token from cookie
    │
    ├─ Tenant Middleware (1.4)
    │   ├─ Extract tenant from subdomain
    │   ├─ Validate tenant exists
    │   └─ Attach to request context
    │
    ├─ Route Handler
    │   ├─ Zod Validation (4.1)
    │   │   └─ Validate request body/params
    │   │
    │   ├─ Permission Check (2.6)
    │   │   ├─ Check user role
    │   │   ├─ Check context (Program/Project)
    │   │   └─ Verify access
    │   │
    │   ├─ Business Logic (3.x)
    │   │   ├─ Call service functions
    │   │   ├─ Transaction if multiple writes
    │   │   └─ Calculate aggregations
    │   │
    │   ├─ Data Access (Prisma)
    │   │   ├─ Query database
    │   │   ├─ Filter by tenant
    │   │   └─ Include relationships
    │   │
    │   └─ Response
    │       ├─ Format data
    │       ├─ Log to audit trail
    │       └─ Return JSON
    │
    └─ Error Handler
        ├─ Catch exceptions
        ├─ Map to error codes
        ├─ Return 4xx/5xx with message
        └─ Log for monitoring
```

### 5.2 Standardized Response Format

```typescript
// Success
{
  success: true,
  data: { ... },
  meta?: {
    page: number,
    limit: number,
    total: number,
    nextCursor?: string
  }
}

// Error
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message',
    details?: { ... },
    path?: '/api/endpoint'
  }
}
```

### 5.3 Pagination Strategy

All list endpoints support:
- `?page=1&limit=20` (offset pagination)
- `?cursor=xxx` (cursor pagination for real-time data)
- `?sort=-created_at` (sortable fields)
- `?filter[status]=Active` (filterable fields)

---

## 6. PHASING STRATEGY RATIONALE

### Why This Order?

#### Phase 1: Foundation First
**Rationale**: Can't build anything without infrastructure
- Database foundation enables all data models
- Authentication enables permission checking
- Middleware enables multi-tenancy enforcement
- Config enables environment management
- **Can't skip**: Try to start Phase 2 without Phase 1 → entire project needs rework

#### Phase 2: Models Before Logic
**Rationale**: Business logic needs data to operate on
- Define all tables and relationships
- Seed test data
- Can write queries, but not business logic yet
- **Risk if skipped**: Business logic has no context, needs refactoring

#### Phase 3: Logic Before APIs
**Rationale**: Business logic should be service layer, not in routes
- Keeps API routes thin
- Enables reuse (same logic from API, CLI, jobs)
- Testable in isolation
- **Risk if skipped**: APIs become fat, hard to test, logic scattered

#### Phase 4: APIs Before UI
**Rationale**: UI needs something to call
- Decouples frontend and backend development
- Enables parallel development
- Frontend can use mocked data while APIs develop
- **Risk if skipped**: UI doesn't know what endpoints exist, needs redesign

#### Phase 5-7: UI After APIs
**Rationale**: UI is presentation layer only
- Drives business value (users see something)
- Should be thin (mostly calling APIs and displaying results)
- Can be developed in parallel with final API polish
- **Risk if skipped**: Beautiful UI with no backend doesn't work

#### Phase 8: Testing & Deployment Last
**Rationale**: Only test after code is complete
- Integration tests need all components
- Performance testing needs full system
- Deployment needs tested, stable codebase
- **Risk if skipped**: Untested code in production = disasters

### Critical Path Optimization

**Must be Serial** (no parallelization):
- Phase 1 (foundation)
- Phase 3 (business logic depends on Phase 2)
- Phase 4 (APIs depend on Phase 3)

**Can Parallelize**:
- Phase 2 chunks (mostly independent models)
- Phase 5 setup (doesn't depend on Phase 4)
- Phase 6-7 (as Phase 4 APIs complete)

**Recommended Team Structure**:
- 1 developer: Phases 1-3 (foundation + logic)
- 2 developers: Parallel tracks
  - Backend: Phase 4 (APIs)
  - Frontend: Phases 5-7 (UI)
  - When Phase 4 complete, both merge on testing

---

## 7. RISK MITIGATION

### 7.1 Orphaned Code Risk

**Risk**: Code written that doesn't integrate into working system
**Mitigation**:
- Each chunk explicitly states "Integration Notes"
- Chunk creates test or is used immediately by next chunk
- Phase 1 code used in Phase 2+
- Phase 2 code used in Phase 3+
- Etc.
- **No floating features**: Every feature eventually connects to user

### 7.2 Dependency Coupling Risk

**Risk**: Tightly coupled code, changes ripple across system
**Mitigation**:
- Clear separation of concerns (models → logic → API → UI)
- Business logic in services (not in routes)
- Prisma ORM abstracts database
- Zod validates at boundary
- Type system enforces contracts
- **Easy to change**: Logic lives in one place

### 7.3 Scope Creep Risk

**Risk**: Chunks get too big, take 2 weeks, block other work
**Mitigation**:
- Chunks sized for 2-3 hour dev sessions
- Clear acceptance criteria (testable)
- No "nice to have" features in core chunks
- Optional features (notifications, builder UI) in Phase 8
- **Move fast**: Short iteration cycles

### 7.4 Multi-Tenancy Risk

**Risk**: Forget tenant filtering, leak data between customers
**Mitigation**:
- Phase 1 Chunk 1.4: Tenant middleware on all API routes
- Every Prisma query filters by tenantId
- Tests explicitly check cross-tenant access fails
- Audit logging shows tenant ID
- Database indexes include tenantId
- **Fail closed**: Default deny if tenant context missing

### 7.5 Permission Check Risk

**Risk**: User can access entities they shouldn't
**Mitigation**:
- Phase 2 Chunk 2.6: Role-based access checking
- Phase 4 Chunk 4.2+: Every API checks permissions
- Permission logic in middleware + route handlers
- Tests verify unauthorized access fails
- Audit log shows who accessed what
- **Defense in depth**: Multiple layers

### 7.6 Data Integrity Risk

**Risk**: Inconsistent state (parent not updated when child changes)
**Mitigation**:
- Phase 3 Chunk 3.1: WBS aggregation service
- Triggers on child updates
- Tests verify parent values correct
- Aggregate values read-only (calculated, not written)
- **Single source of truth**: Calculations standardized

### 7.7 Performance Risk

**Risk**: Slow queries, N+1 problems, scale doesn't work
**Mitigation**:
- Phase 4 APIs use Prisma `include` correctly
- Phase 8.4 Performance optimization (indexes, queries)
- Pagination on all list endpoints
- Load testing in Phase 8
- **Measured**: Query plans reviewed before deploy

---

## 8. TESTING STRATEGY

### 8.1 Testing by Phase

**Phase 1**: Infrastructure tests
- Database connection works
- NextAuth login/logout works
- Middleware attaches context correctly
- Config loads without errors

**Phase 2**: Model tests
- Can CRUD entities
- Constraints enforced (unique, FK)
- Relationships load correctly
- Soft deletes work

**Phase 3**: Logic tests
- Unit tests for each service
- WBS aggregation calculates correctly
- Workflow routing selects right template
- Risk inheritance works
- Cost calculations accurate

**Phase 4**: API tests
- Each endpoint returns correct data
- Permissions enforced
- Validation rejects bad data
- Pagination works
- Audit logging captures changes

**Phase 5-7**: UI tests
- Components render
- Forms submit correctly
- API calls made with right data
- User flows work end-to-end

**Phase 8**: System tests
- Full workflows (create → approve → activate)
- Performance meets SLAs
- Deployment succeeds
- Monitoring alerts work

### 8.2 Test Coverage Targets

- Unit tests: 80%+ coverage for business logic
- Integration tests: All API endpoints
- E2E tests: Critical user paths (5-10 scenarios)
- Performance tests: p95 latency, throughput

### 8.3 Testing Pyramid

```
        /\
       /E2E\           (5-10 tests)
      /      \         Playwright full workflows
     /────────\
    /  API    \        (20-30 tests)
   /  Tests    \       Integration tests per endpoint
  /──────────────\
 /  Unit Tests   \     (100+ tests)
/                \    Business logic, utils
───────────────────
```

---

## 9. INTEGRATION CHECKLIST

### Per-Chunk Integration

Every chunk should verify:

```
[ ] Code written and compiles
[ ] Unit/integration tests written and pass
[ ] Dependencies correctly imported
[ ] TypeScript errors: 0
[ ] ESLint warnings: 0
[ ] Tests: 100% of new code coverage
[ ] Tested against acceptance criteria
[ ] Tested with test data
[ ] Integrated with next chunk's dependencies (if exists)
[ ] No console errors/warnings
[ ] Git commit created with meaningful message
[ ] Code review (if working in team)
```

### Phase Integration Checklist

After completing all chunks in a phase:

```
[ ] All phase chunks completed
[ ] All dependencies from previous phase working
[ ] All phase tests passing
[ ] Database migrations run cleanly
[ ] Seed data creates correct state
[ ] Performance acceptable (no query timeouts)
[ ] Error handling comprehensive (404s, 500s, validation)
[ ] Audit logging working for all operations
[ ] Multi-tenancy isolation verified
[ ] Can create/read/update/delete core entities
[ ] Role-based access control verified
[ ] Next phase can start
```

### Pre-Deployment Checklist (Phase 8)

```
[ ] All unit tests passing
[ ] All integration tests passing
[ ] All E2E tests passing
[ ] Load tests passed (p95 < 2s)
[ ] Security review completed
[ ] Database backup strategy documented
[ ] Monitoring and alerting configured
[ ] Error tracking (Sentry) working
[ ] Logging (CloudWatch/ELK) working
[ ] CI/CD pipeline passing
[ ] Rollback plan documented
[ ] User documentation complete
```

---

## SUMMARY TABLE

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Order** | Serial phases, parallel chunks | Dependencies require order |
| **Chunk Size** | 2-3 hours | Sweet spot for productivity |
| **Testing** | Test-first per chunk | Early problem detection |
| **Orphaned Code** | Zero tolerance | Every code must integrate |
| **Tech Stack** | Next.js full-stack | Modern, integrated tooling |
| **Database** | PostgreSQL + Prisma | Type-safe, scalable |
| **Auth** | NextAuth.js JWT | Secure, built for Next.js |
| **State** | Zustand | Lightweight, TypeScript |
| **UI** | shadcn/ui + Tremor | Accessible, customizable |
| **Multi-tenant** | Middleware + RLS | Defense in depth |
| **Monitoring** | Audit trail everywhere | Compliance + debugging |

---

## NEXT STEPS

1. **Validate** this blueprint with stakeholders
2. **Confirm** Phase 1 dependencies are understood
3. **Allocate** development resources (2-3 person team)
4. **Create** project tracking (Jira/GitHub issues) per chunk
5. **Start** Phase 1 Chunk 1.1: Project Setup

**Estimated Timeline**: 3-4 months with 2-3 FTE developers
**Critical Path**: ~2 months if optimized (Phase 1-4 serial, Phases 5-7 parallel)

