# MASAR IMPLEMENTATION PROMPTS - PHASE 2 (Continued), 3, 4, 5, 6, 7, 8

---

## CHUNK 2.3: Scoring Matrix Models

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Models: ScoringCriterion, ProjectScoring, ComplexityBandConfig
- Create tables for scoring criteria defined by Admin users
- Create ProjectScoring to assign scores and weights per project/criterion
- Create complexity band configuration (thresholds for Low/Medium/High)
- Seed test criteria (Strategic Alignment, Risk Level, Innovation, etc.)
- Implement score calculation function (weighted average)

---

## CHUNK 2.4: Risk, Benefit, KPI Models

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Models: Risk, Benefit, KPI, KPIMeasurement
- Risk: program or project level, with isTailored flag for project inheritance
- Benefit: associated with program or project
- KPI: metrics for benefits with units, baselines, targets
- KPIMeasurement: recorded measurements of KPIs over time
- Seed test data with various risk categories and benefits

---

## CHUNK 2.5: Financial Models (Costs & Invoices)

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Models: CostItem, Invoice, InvoiceAllocation
- CostItem: labor, material, equipment, service, other
- Invoice: vendor invoices with status tracking
- InvoiceAllocation: allocate invoice amounts to WBS items
- Implement percentage-based allocation validation
- Seed test invoices and allocations

---

## CHUNK 2.6: User Roles with Context-Specific Access

**Timing**: ~1-2 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Medium

Implementation:
- Create helpers to check user roles in context (Global, Program, Project)
- Implement canUserAccess(userId, entityType, entityId, action) helper
- Implement getRolesForUser(userId) with context expansion
- Create middleware extension to attach roles to request
- Tests for role checking at different contexts

---

## PHASE 3: BUSINESS LOGIC

### CHUNK 3.1: WBS Aggregation Service

**Timing**: ~2-3 hours | **Difficulty**: Hard | **Orphaned Code Risk**: Medium

Service: WBSAggregationService
- calculateParentDates(): earliest child start → parent start, latest end → parent end
- calculateParentStatus(): Priority order (Delayed > InProgress > NotStarted > Completed)
- calculateParentProgress(): weighted average by cost
- calculateParentCost(): sum of child costs + aggregated costs
- Implement as standalone functions with unit tests
- Consider PostgreSQL triggers vs application service (implement service first)

---

### CHUNK 3.2: Workflow Templates & Instances

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Medium

Models: WorkflowTemplate, WorkflowStage, StageResponsibility, WorkflowInstance, StageAction
- Create Prisma models for workflow structure
- Seed example workflows for different entity types/complexities
- Implement WorkflowInstance creation
- Track SLA due dates and stage transitions
- No execution logic yet (comes next chunk)

---

### CHUNK 3.3: Workflow Routing Algorithm

**Timing**: ~1-2 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Medium

Service: WorkflowRouter
- Implement calculateMatchScore() for each workflow template
- Priority: Budget (30 pts) > Complexity (20 pts) > Type (10 pts)
- Fallback to default workflow if no match
- Pure function with comprehensive unit tests
- No database writes, just selection logic

---

### CHUNK 3.4: Workflow Execution Engine

**Timing**: ~3-4 hours | **Difficulty**: Hard | **Orphaned Code Risk**: Medium

Service: WorkflowExecutor
- Process stage actions (Approve, Reject, Return)
- Verify actor has permission to act
- Record StageAction with audit info
- Move to next stage or handle rejection
- Execute request on final approval
- Calculate SLA compliance
- Comprehensive integration tests

---

### CHUNK 3.5: Risk Inheritance from Programs to Projects

**Timing**: ~1-2 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Medium

Service: RiskInheritanceService
- inheritRisksFromProgram(projectId): copy program risks to project
- Mark as inherited (isTailored: false initially)
- Allow project to tailor description/mitigation
- Don't delete if program updates
- Prevent duplicate inheritance

---

### CHUNK 3.6: Financial Calculations & Allocations

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Medium

Services:
- InvoiceAllocationService: allocate invoice to WBS items with percentage validation
- CostRollupService: calculate total costs rolling up WBS hierarchy
- FinancialSummary: budget vs actual, forecast at completion
- Unit tests for allocation logic and constraint validation

---

## PHASE 4: API LAYER

### CHUNK 4.1: Zod Validation Schemas

**Timing**: ~2-3 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Implementation:
- Create comprehensive Zod schemas for all domain models
- Schemas for CreateRequest, UpdateRequest, Response types
- Nested schemas for complex objects (WBS hierarchies, scoring, etc.)
- Error handling utilities for pretty error messages
- Export from /lib/validators/

---

### CHUNK 4.2: Program & Project CRUD Endpoints

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/programs (Create - no workflow trigger yet)
- GET /api/programs (List with filtering)
- GET /api/programs/:id (Detail)
- PUT /api/programs/:id (Update - no workflow yet)
- DELETE /api/programs/:id (Soft delete - no workflow yet)
- POST /api/projects (Create)
- GET /api/projects (List)
- GET /api/projects/:id (Detail)
- PUT /api/projects/:id (Update)
- DELETE /api/projects/:id (Soft delete)

Requirements:
- Use tenant context from middleware (filter by tenantId)
- Validate requests with Zod
- Return paginated results
- Include related entities (users, program for projects)
- Check user permissions (role-based)
- Consistent error responses

---

### CHUNK 4.3: WBS Management Endpoints

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/projects/:id/wbs (Create WBS configuration)
- GET /api/projects/:id/wbs (Get configuration)
- GET /api/projects/:id/wbs/items (List all items)
- POST /api/wbs/items (Create WBS item with parent)
- PUT /api/wbs/items/:id (Update WBS item - triggers aggregation)
- DELETE /api/wbs/items/:id (Soft delete)

Requirements:
- Immutability: reject updates to WBS config
- Level validation: prevent exceeding config levels
- Aggregation: trigger parent recalculation on item update
- Hierarchy validation: prevent cycles, validate parent exists
- Include aggregated values in responses

---

### CHUNK 4.4: Scoring Endpoints

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/scoring/criteria (Admin only)
- GET /api/scoring/criteria (List)
- PUT /api/scoring/criteria/:id (Update)
- POST /api/projects/:id/scoring (Score a project)
- GET /api/projects/:id/score (Get calculated score)
- PUT /api/project-scorings/:id (Update score)

Requirements:
- Admin-only for criteria management
- Calculate weighted score
- Return score with justifications
- Filter by tenant

---

### CHUNK 4.5: Workflow Template & Routing Endpoints

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/workflows (PMO: Create template)
- GET /api/workflows (PMO: List templates)
- PUT /api/workflows/:id (PMO: Update)
- POST /api/workflows/:id/stages (Add stages)
- POST /api/workflows/:id/assign (Auto-route test)

Requirements:
- PMO-only access
- Validate matching criteria
- Test routing algorithm
- Return best-matching workflow for given entity

---

### CHUNK 4.6: Workflow Action Processing

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/workflow-instances/:id/action (Process approval)
- GET /api/my-approvals (User's pending approvals)
- GET /api/workflow-instances/:id/history (Approval history)

Requirements:
- Verify actor has permission to act on stage
- Process Approve/Reject/Return actions
- Record comments and attachments
- Track SLA compliance
- Return updated workflow instance

---

### CHUNK 4.7: Risk Management Endpoints

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/programs/:id/risks (Create)
- GET /api/programs/:id/risks (List)
- PUT /api/risks/:id (Update)
- POST /api/projects/:id/risks/inherit (Inherit from program)
- PUT /api/risks/:id/tailor (Tailor inherited risk)

Requirements:
- Program-level risks viewable by projects
- Inheritance with tailoring support
- Don't duplicate if inherited multiple times

---

### CHUNK 4.8: Financial Endpoints

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/invoices (Finance role)
- GET /api/invoices (List)
- PUT /api/invoices/:id (Update)
- POST /api/invoices/:id/allocate (Allocate to WBS)
- GET /api/projects/:id/financials (Summary)
- GET /api/wbs/:id/costs (WBS item costs)

Requirements:
- Finance role validation
- Percentage allocation validation (sum = 100%)
- Calculate rollup costs
- Filter by entity (program/project)

---

### CHUNK 4.9: Benefits & KPI Endpoints

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Endpoints:
- POST /api/benefits (Create)
- POST /api/benefits/:id/kpis (Add KPI)
- POST /api/kpis/:id/measurements (Record measurement)
- GET /api/programs/:id/kpi-dashboard (Rollup view)

Requirements:
- Create benefits with multiple KPIs
- Record measurements with evidence
- Calculate achievement %
- Dashboard shows KPI status

---

### CHUNK 4.10: Audit Trail Logging

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Implementation:
- Create audit_logs table (done in Phase 2)
- Middleware to log all mutations
- GET /api/audit-logs endpoint
- Filter by entity, date range, actor
- Immutable audit records

---

### CHUNK 4.11: Approval Queue Endpoints

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Endpoints:
- GET /api/my-approvals (User's queue)
- GET /api/requests/:id/history (Approval timeline)

Requirements:
- Based on user roles and responsibilities
- Show SLA status
- Include request details

---

## PHASE 5: FRONTEND FOUNDATION

### CHUNK 5.1: App Layout & Navigation

**Timing**: ~2-3 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Medium

Components:
- RootLayout with sidebar navigation
- Navigation menu with role-based items
- Responsive design (mobile/tablet/desktop)
- Theme provider (Tailwind)
- User menu with logout

---

### CHUNK 5.2: Login & Authentication UI

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Pages:
- /login page with email/password form
- Session validation (useSession hook)
- Redirect logic (authenticated → dashboard)
- Error display

---

### CHUNK 5.3: UI Component Library Setup

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Setup:
- Install shadcn/ui components
- Configure Tailwind CSS
- Create component wrappers/patterns
- Export common components from /components/ui/

---

### CHUNK 5.4: Zustand Store Architecture

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Medium

Stores:
- Program store (programs, filter state)
- Project store (projects, current project)
- Workflow store (pending approvals, actions)
- UI store (open panels, filters)
- Auth store (user, roles)

---

## PHASE 6: CORE FRONTEND

### CHUNK 6.1: Program Management Pages

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Pages:
- /programs (list with filtering)
- /programs/:id (detail view)
- /programs/new (create form)

Features:
- Data table with sorting/filtering
- Edit form
- Status badges
- Links to projects

---

### CHUNK 6.2: Project Management Pages

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Pages:
- /projects (list)
- /projects/:id (detail)
- /projects/new (create)

Features:
- Show program parent
- Complexity indicators
- Status updates

---

### CHUNK 6.3: WBS Tree Component & UI

**Timing**: ~3-4 hours | **Difficulty**: Hard | **Orphaned Code Risk**: Low

Components:
- WBSTree (collapsible hierarchy)
- WBSItem node (inline editing)
- Parent aggregated values display
- Drag-and-drop reordering
- Progress indicators

---

### CHUNK 6.4: Scoring Interface

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Components:
- Scoring form (criteria + weights + scores)
- Score display
- Justification notes

---

### CHUNK 6.5: Risk Management UI

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Pages:
- Risk register (program)
- Risk inheritance interface
- Risk detail with tailoring
- Status updates

---

### CHUNK 6.6: Benefits & KPI UI

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Pages:
- Benefits list
- KPI recording form
- Measurement history
- Target tracking

---

## PHASE 7: ADVANCED FEATURES

### CHUNK 7.1: Approval Queue Page

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Pages:
- /approvals (pending list)
- Detail panel with request info

---

### CHUNK 7.2: Approval Action Component

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Component:
- Approve/Reject/Return buttons
- Comment form
- File upload
- Action history timeline
- SLA countdown

---

### CHUNK 7.3: Workflow Builder (Visual Designer)

**Timing**: ~4-5 hours | **Difficulty**: Hard | **Orphaned Code Risk**: Low

Component:
- Canvas to add/arrange stages
- Stage configuration panels
- Role assignment UI
- Matching criteria editor
- Preview mode
- Save template

---

### CHUNK 7.4: Financial Management UI

**Timing**: ~3-4 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Pages:
- Invoice management
- Allocation form (allocate to WBS)
- Cost tracking
- Budget vs actuals view

---

### CHUNK 7.5: Portfolio Dashboard

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Page:
- Portfolio metrics (count, budget, status)
- Active projects list
- Upcoming milestones
- Role-based filtering

---

### CHUNK 7.6: Risk Heatmap

**Timing**: ~1-2 hours | **Difficulty**: Easy | **Orphaned Code Risk**: Low

Component:
- Probability × Impact matrix
- Risks plotted by score
- Color coding by severity

---

### CHUNK 7.7: KPI Dashboard

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Page:
- KPI status cards
- Progress toward targets
- Trend charts
- Measurement history

---

### CHUNK 7.8: Financial Dashboard

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Page:
- Budget vs actual charts
- Cost trends
- Invoice status summary

---

## PHASE 8: POLISH & PRODUCTION

### CHUNK 8.1: Unit Tests for Business Logic

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: None

Tests:
- WBS aggregation (parent calculations)
- Workflow routing (match scoring)
- Risk inheritance logic
- Cost calculations
- Score calculations

---

### CHUNK 8.2: Integration Tests for API

**Timing**: ~3-4 hours | **Difficulty**: Medium | **Orphaned Code Risk**: None

Tests:
- Full workflow: create → assign → approve → activate
- Permission checks
- Data consistency
- Cascading deletes

---

### CHUNK 8.3: E2E Tests (Playwright)

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: None

Tests:
- Create program → project → WBS
- Score project
- Create workflow instance
- Approve workflow
- Verify data appears correctly

---

### CHUNK 8.4: Performance Optimization

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Tasks:
- Database query optimization (add indexes, explain plans)
- N+1 query elimination (use Prisma include)
- Frontend code splitting
- Image optimization
- API pagination
- Response caching

---

### CHUNK 8.5: Notification System

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Medium

Implementation:
- Email notifications (Resend/SendGrid integration)
- In-app notifications (WebSocket/SSE)
- Notification triggers (workflow actions, SLA breaches)
- Notification history/preferences

---

### CHUNK 8.6: Deployment & Production Setup

**Timing**: ~2-3 hours | **Difficulty**: Medium | **Orphaned Code Risk**: Low

Setup:
- Docker containerization
- CI/CD pipeline (GitHub Actions)
- Environment management (staging/prod)
- Database migrations in production
- Monitoring setup (error tracking, APM)
- Health checks

---

## EXECUTION SUMMARY

**Total Estimated Time**: 90-110 hours
**Number of Chunks**: 51
**Recommended Pace**:
- Phase 1: 1 week (foundation critical path)
- Phase 2: 1-2 weeks (data modeling)
- Phase 3: 1-2 weeks (business logic)
- Phase 4: 2 weeks (API)
- Phase 5-7: 3-4 weeks (frontend)
- Phase 8: 1-2 weeks (testing + deployment)

**Total Timeline**: ~3-4 months with full-time team of 2-3 developers

**Key Success Factors**:
1. Strictly follow chunk order (dependencies critical)
2. Complete testing for each chunk before moving to next
3. No orphaned code - integrate immediately after implementation
4. Review generated code for quality before merging
5. Maintain clear separation of concerns (models → logic → API → UI)

