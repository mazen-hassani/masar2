# Masar Portfolio Manager - Technical Specification

## 1. Executive Summary

Masar is a web-based portfolio management system designed for government-grade institutions, enabling centralized definition and governance of Programs, Projects, and Initiatives through a sophisticated workflow engine, scoring matrix, benefits realization tracking, and comprehensive financial management.

### Key Features
- Multi-tenant SaaS architecture
- Configurable hierarchical work breakdown structures
- Dynamic workflow routing based on cost, complexity, and type
- Weighted scoring matrix for portfolio prioritization
- Benefits realization tracking with KPIs
- Risk management with cascade inheritance
- Invoice allocation and financial tracking
- Complete audit trail and version history

### Technology Stack
- **Frontend**: Next.js (App Router)
- **UI Components**: shadcn/ui
- **Data Visualization**: Tremor
- **Data Grids**: TanStack Table (via shadcn integration)
- **Database**: PostgreSQL with Row-Level Security for multi-tenancy
- **Authentication**: NextAuth.js with JWT
- **State Management**: Zustand for complex client state
- **API**: Next.js Route Handlers with Zod validation
- **File Storage**: S3-compatible object storage
- **Notifications**: Email (SendGrid/Resend) + In-app (WebSockets/Server-Sent Events)

## 2. System Architecture

### 2.1 Multi-Tenancy Model
```typescript
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: {
    timezone: string;
    fiscalYearStart: Date;
    currency: string;
    dateFormat: string;
  };
  createdAt: Date;
  status: 'active' | 'suspended' | 'trial';
}
```

**Implementation Strategy:**
- Database-level isolation using PostgreSQL schemas
- Subdomain-based tenant identification (e.g., `ministry-of-health.masar.gov`)
- Tenant context middleware for all API routes
- Separate connection pools per tenant for performance isolation

### 2.2 User & Role Model

#### Roles and Permissions Matrix

| Role | Create | Read | Update | Delete | Approve | Financial | Reports |
|------|--------|------|--------|--------|---------|-----------|---------|
| **Admin** | System Config | All | System Config | System Config | N/A | View All | All |
| **PMO** | All Programs/Projects | All | All | Soft Delete | Override Approvals | View/Edit All | All |
| **Sponsor** | N/A | Assigned Programs/Projects | N/A | N/A | Workflow Stage | View Assigned | Portfolio |
| **PM** | Assigned Projects/Initiatives | Assigned + Team View | Assigned | N/A | N/A | View Assigned | Project-level |
| **Finance** | Invoices | All Financial | Invoices/Costs | N/A | Financial Stages | Create/Edit All | Financial |
| **Team Member** | Work Items (assigned) | Assigned Items | Status/Progress | N/A | N/A | N/A | Task-level |
| **Management** | N/A | Dashboard/Portfolio | N/A | N/A | Workflow Stage | View All | Executive |

#### Context-Specific Role Assignment
```typescript
interface UserRole {
  userId: string;
  role: 'Admin' | 'PMO' | 'Sponsor' | 'PM' | 'Finance' | 'TeamMember' | 'Management';
  contextType: 'Global' | 'Program' | 'Project';
  contextId?: string; // Program or Project ID
  assignedBy: string;
  assignedAt: Date;
  validUntil?: Date;
}
```

## 3. Core Domain Models

### 3.1 Program/Project/Initiative Structure

```typescript
interface BaseEntity {
  id: string;
  type: 'Program' | 'Project' | 'Initiative';
  name: string;
  description: string;
  status: 'Draft' | 'Pending' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled';
  requesterId: string;
  pmId: string;
  sponsorId: string;
  startDate?: Date;
  endDate?: Date;
  budget: number;
  actualCost: number;
  scoreValue: number;
  complexityBand: 'Low' | 'Medium' | 'High';
  createdAt: Date;
  updatedAt: Date;
}

interface Program extends BaseEntity {
  type: 'Program';
  projects: Project[];
  benefits: Benefit[];
  risks: Risk[];
}

interface Project extends BaseEntity {
  type: 'Project' | 'Initiative';
  programId?: string; // Optional - standalone or under program
  wbsConfig: WBSConfiguration;
  wbsItems: WBSItem[];
  benefits: Benefit[]; // Subset of Program benefits if nested
  risks: Risk[]; // Subset of Program risks if nested
}
```

### 3.2 Work Breakdown Structure (WBS)

```typescript
interface WBSConfiguration {
  projectId: string;
  levels: number; // 1-5
  levelNames: string[]; // e.g., ["Milestone", "Activity", "Task"]
  createdAt: Date;
  // Immutable after creation
}

interface WBSItem {
  id: string;
  projectId: string;
  parentId?: string;
  level: number; // 0-based index
  name: string;
  description?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  ownerId?: string; // Only for leaf nodes
  status: 'NotStarted' | 'InProgress' | 'Delayed' | 'Completed' | 'Cancelled';
  plannedCost?: number;
  actualCost?: number;
  percentComplete: number;
  attachments: Attachment[];
  
  // Aggregated fields (calculated from children)
  aggregatedStartDate?: Date; // Earliest child start
  aggregatedEndDate?: Date; // Latest child end
  aggregatedCost: number; // Sum of children
  aggregatedStatus: string; // Derived from children
  childOwners: string[]; // Collected from leaf descendants
}
```

#### Aggregation Rules
```typescript
class WBSAggregationService {
  calculateParentDates(children: WBSItem[]): { start: Date, end: Date } {
    // Parent start = earliest child start date
    // Parent end = latest child end date
    return {
      start: min(children.map(c => c.plannedStartDate || c.aggregatedStartDate)),
      end: max(children.map(c => c.plannedEndDate || c.aggregatedEndDate))
    };
  }
  
  calculateParentStatus(children: WBSItem[]): string {
    // Priority order: Delayed > InProgress > NotStarted > Completed
    if (children.some(c => c.status === 'Delayed')) return 'Delayed';
    if (children.some(c => c.status === 'Cancelled')) return 'AtRisk';
    if (children.some(c => c.status === 'InProgress')) return 'InProgress';
    if (children.all(c => c.status === 'Completed')) return 'Completed';
    return 'NotStarted';
  }
  
  calculateParentProgress(children: WBSItem[]): number {
    // Weighted average based on cost or simple average
    const totalWeight = children.reduce((sum, c) => sum + (c.plannedCost || 1), 0);
    const weightedProgress = children.reduce((sum, c) => 
      sum + (c.percentComplete * (c.plannedCost || 1)), 0);
    return weightedProgress / totalWeight;
  }
}
```

### 3.3 Scoring Matrix

```typescript
interface ScoringCriterion {
  id: string;
  tenantId: string;
  name: string; // e.g., "Strategic Alignment", "Risk Level"
  description: string;
  minScore: number;
  maxScore: number;
  isActive: boolean;
  createdBy: string; // Admin user
}

interface ProjectScoring {
  projectId: string;
  criterionId: string;
  weight: number; // Percentage or arbitrary number
  score: number; // Actual score given
  justification?: string;
  evaluatedBy: string;
  evaluatedAt: Date;
}

interface ComplexityBandConfig {
  tenantId: string;
  lowThreshold: number; // e.g., 0-30
  mediumThreshold: number; // e.g., 31-70
  highThreshold: number; // e.g., 71-100
}

// Score Calculation
function calculateWeightedScore(scorings: ProjectScoring[]): number {
  const totalWeight = scorings.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scorings.reduce((sum, s) => 
    sum + (s.score * s.weight), 0);
  return (weightedSum / totalWeight) * 100; // Normalize to 0-100
}
```

### 3.4 Benefits & KPIs

```typescript
interface Benefit {
  id: string;
  programId?: string; // For program-level benefits
  projectId?: string; // For project-level benefits
  name: string;
  description: string;
  category: 'Financial' | 'Strategic' | 'Operational' | 'Social';
  targetValue: number;
  targetDate: Date;
  kpis: KPI[];
}

interface KPI {
  id: string;
  benefitId: string;
  name: string;
  unit: string; // e.g., "USD", "Percentage", "Count"
  baseline: number;
  target: number;
  collectionCadence: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  measurements: KPIMeasurement[];
}

interface KPIMeasurement {
  kpiId: string;
  value: number;
  measurementDate: Date;
  notes?: string;
  attachedEvidence?: Attachment[];
  recordedBy: string;
}
```

### 3.5 Risk Management

```typescript
interface Risk {
  id: string;
  programId?: string; // Program-level risk
  projectId?: string; // Project-level risk
  parentRiskId?: string; // For inherited risks
  name: string;
  description: string;
  category: 'Technical' | 'Financial' | 'Operational' | 'External' | 'Legal';
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  riskScore: number; // probability * impact
  mitigation: string;
  contingency: string;
  owner: string;
  status: 'Open' | 'Mitigated' | 'Closed' | 'Occurred';
  
  // For project-level tailoring of program risks
  isTailored: boolean;
  tailoredDescription?: string;
  tailoredMitigation?: string;
}
```

### 3.6 Financial Management

```typescript
interface CostItem {
  id: string;
  entityType: 'Program' | 'Project';
  entityId: string;
  wbsItemId?: string; // Link to specific WBS item
  category: 'Labor' | 'Material' | 'Equipment' | 'Service' | 'Other';
  description: string;
  plannedAmount: number;
  actualAmount: number;
  currency: string;
}

interface Invoice {
  id: string;
  entityType: 'Program' | 'Project';
  entityId: string;
  invoiceNumber: string;
  vendorName: string;
  amount: number;
  currency: string;
  invoiceDate: Date;
  dueDate: Date;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Cancelled';
  allocations: InvoiceAllocation[];
  attachments: Attachment[];
  createdBy: string; // Finance user
}

interface InvoiceAllocation {
  invoiceId: string;
  wbsItemId: string;
  amount: number;
  percentage: number; // Percentage of invoice
  notes?: string;
}
```

## 4. Workflow Engine

### 4.1 Workflow Configuration

```typescript
interface WorkflowTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  // Matching criteria (at least one required)
  entityType?: 'Program' | 'Project' | 'Initiative';
  complexityBand?: 'Low' | 'Medium' | 'High';
  budgetRange?: { min: number; max: number };
  
  // Priority for matching (implicit: Cost > Complexity > Type)
  matchScore: number; // Higher score = better match
  
  isDefault: boolean;
  stages: WorkflowStage[];
  isActive: boolean;
  createdBy: string; // PMO user
}

interface WorkflowStage {
  id: string;
  workflowTemplateId: string;
  order: number;
  name: string; // Becomes the request status
  description?: string;
  slaHours: number;
  responsibilities: StageResponsibility[];
  actions: ('Approve' | 'Reject' | 'Return')[];
  requireComment: boolean;
  requireAttachment: boolean;
}

interface StageResponsibility {
  type: 'Role' | 'Position' | 'User';
  value: string; // Role name, Position ID, or User ID
  
  // Resolution logic for roles
  scope: 'Global' | 'Program' | 'Project'; // Where to look for users with this role
  notificationMethod: 'Email' | 'InApp' | 'Both';
}
```

### 4.2 Workflow Routing Algorithm

```typescript
class WorkflowRouter {
  findApplicableWorkflow(
    entityType: 'Program' | 'Project' | 'Initiative',
    complexityBand: 'Low' | 'Medium' | 'High',
    budget: number,
    tenantId: string
  ): WorkflowTemplate {
    const allWorkflows = await this.getActiveWorkflows(tenantId);
    
    // Calculate match scores
    const scoredWorkflows = allWorkflows.map(wf => ({
      workflow: wf,
      score: this.calculateMatchScore(wf, entityType, complexityBand, budget)
    }));
    
    // Sort by score (highest first)
    scoredWorkflows.sort((a, b) => b.score - a.score);
    
    // Return best match or default
    const bestMatch = scoredWorkflows[0];
    if (bestMatch.score > 0) {
      return bestMatch.workflow;
    }
    
    // Fallback to default workflow
    return allWorkflows.find(wf => wf.isDefault) || throw new Error('No default workflow');
  }
  
  calculateMatchScore(
    workflow: WorkflowTemplate,
    entityType: string,
    complexityBand: string,
    budget: number
  ): number {
    let score = 0;
    
    // Priority: Cost (30 points) > Complexity (20 points) > Type (10 points)
    if (workflow.budgetRange && 
        budget >= workflow.budgetRange.min && 
        budget <= workflow.budgetRange.max) {
      score += 30;
    }
    
    if (workflow.complexityBand === complexityBand) {
      score += 20;
    }
    
    if (workflow.entityType === entityType) {
      score += 10;
    }
    
    return score;
  }
}
```

### 4.3 Workflow Execution

```typescript
interface WorkflowInstance {
  id: string;
  workflowTemplateId: string;
  entityType: 'Program' | 'Project' | 'Initiative';
  entityId: string;
  requestType: 'Create' | 'Update' | 'Close';
  requestData: any; // JSON of requested changes
  currentStageId: string;
  currentStageStarted: Date;
  slaDue: Date;
  status: 'InProgress' | 'Approved' | 'Rejected' | 'Returned';
  createdBy: string;
  createdAt: Date;
}

interface StageAction {
  id: string;
  workflowInstanceId: string;
  stageId: string;
  action: 'Approve' | 'Reject' | 'Return';
  actorId: string;
  comment?: string;
  attachments: Attachment[];
  actionDate: Date;
  
  // For tracking SLA
  stageAssignedDate: Date;
  hoursToAction: number;
  wasOverdue: boolean;
}

class WorkflowExecutor {
  async processStageAction(
    instanceId: string,
    action: 'Approve' | 'Reject' | 'Return',
    actorId: string,
    comment?: string,
    attachments?: Attachment[]
  ): Promise<void> {
    const instance = await this.getInstance(instanceId);
    const currentStage = await this.getStage(instance.currentStageId);
    
    // Verify actor has permission
    if (!this.actorCanAct(actorId, currentStage, instance)) {
      throw new Error('Unauthorized');
    }
    
    // Record the action
    await this.recordAction(instance, action, actorId, comment, attachments);
    
    // Process based on action
    switch(action) {
      case 'Approve':
        await this.moveToNextStage(instance);
        break;
      case 'Reject':
        await this.rejectRequest(instance);
        break;
      case 'Return':
        await this.returnForRevision(instance);
        break;
    }
    
    // Send notifications
    await this.notifyRelevantParties(instance, action);
  }
  
  async moveToNextStage(instance: WorkflowInstance): Promise<void> {
    const template = await this.getTemplate(instance.workflowTemplateId);
    const currentIndex = template.stages.findIndex(s => s.id === instance.currentStageId);
    
    if (currentIndex === template.stages.length - 1) {
      // Final approval - execute the request
      await this.executeRequest(instance);
      instance.status = 'Approved';
    } else {
      // Move to next stage
      const nextStage = template.stages[currentIndex + 1];
      instance.currentStageId = nextStage.id;
      instance.currentStageStarted = new Date();
      instance.slaDue = addHours(new Date(), nextStage.slaHours);
      
      // Notify new approvers
      await this.notifyStageAssignees(nextStage, instance);
    }
  }
}
```

## 5. API Endpoints

### 5.1 Program Management
```typescript
// Programs
POST   /api/programs                 // Create program (triggers workflow)
GET    /api/programs                 // List programs (filtered by role)
GET    /api/programs/:id            // Get program details
PUT    /api/programs/:id            // Update program (triggers workflow)
DELETE /api/programs/:id            // Soft delete (triggers workflow)
POST   /api/programs/:id/benefits   // Add benefits
POST   /api/programs/:id/risks      // Add risks

// Projects
POST   /api/projects                // Create project
GET    /api/projects                // List projects
GET    /api/projects/:id           // Get project details
PUT    /api/projects/:id           // Update project
DELETE /api/projects/:id           // Soft delete
POST   /api/projects/:id/wbs       // Define WBS structure (one-time)
PUT    /api/projects/:id/wbs/:itemId // Update WBS item

// Scoring
POST   /api/scoring/criteria        // Admin: Create criterion
GET    /api/scoring/criteria        // List criteria
POST   /api/projects/:id/scoring   // Assign scores and weights
GET    /api/projects/:id/score     // Calculate current score

// Benefits & KPIs
POST   /api/benefits/:id/kpis      // Add KPI to benefit
POST   /api/kpis/:id/measurements  // Record measurement
GET    /api/programs/:id/kpi-dashboard // KPI rollup view

// Risks
GET    /api/programs/:id/risks     // Get program risk register
POST   /api/projects/:id/risks/inherit // Select & tailor from program
PUT    /api/risks/:id              // Update risk status

// Financial
POST   /api/invoices               // Create invoice
POST   /api/invoices/:id/allocate  // Allocate to WBS items
GET    /api/projects/:id/financials // Financial summary
GET    /api/wbs/:id/costs          // Cost rollup for WBS item

// Workflow
GET    /api/workflows               // PMO: List workflow templates
POST   /api/workflows               // PMO: Create workflow
PUT    /api/workflows/:id          // PMO: Update workflow
POST   /api/workflow-instances/:id/action // Process approval action
GET    /api/my-approvals           // Get pending approvals for user
GET    /api/requests/:id/history   // Get approval history

// Reports & Dashboards
GET    /api/dashboard/portfolio    // Portfolio overview
GET    /api/dashboard/risks        // Risk heatmap
GET    /api/dashboard/financials   // Budget vs actuals
GET    /api/reports/audit-trail    // Complete audit log
```

### 5.2 Request/Response Schemas

```typescript
// Example: Create Project Request
interface CreateProjectRequest {
  name: string;
  description: string;
  type: 'Project' | 'Initiative';
  programId?: string; // Optional for nested projects
  pmId: string;
  sponsorId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  budget: number;
  wbsConfig: {
    levels: number;
    levelNames: string[];
  };
  scoringCriteria: {
    criterionId: string;
    weight: number;
    score: number;
    justification?: string;
  }[];
  benefits?: {
    name: string;
    description: string;
    category: string;
    targetValue: number;
    targetDate: Date;
  }[];
}

// Example: Workflow Action Request  
interface WorkflowActionRequest {
  action: 'Approve' | 'Reject' | 'Return';
  comment?: string;
  attachmentIds?: string[];
}
```

## 6. Database Schema

### 6.1 Core Tables

```sql
-- Multi-tenancy
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active'
);

-- Users & Roles
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  context_type VARCHAR(50) DEFAULT 'Global',
  context_id UUID, -- Program or Project ID
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  UNIQUE(user_id, role, context_type, context_id)
);

-- Programs & Projects
CREATE TABLE programs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  requester_id UUID REFERENCES users(id),
  pm_id UUID REFERENCES users(id),
  sponsor_id UUID REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  actual_cost DECIMAL(15,2) DEFAULT 0,
  score_value DECIMAL(5,2),
  complexity_band VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  program_id UUID REFERENCES programs(id),
  type VARCHAR(20) NOT NULL, -- 'Project' or 'Initiative'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  requester_id UUID REFERENCES users(id),
  pm_id UUID REFERENCES users(id),
  sponsor_id UUID REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  actual_cost DECIMAL(15,2) DEFAULT 0,
  score_value DECIMAL(5,2),
  complexity_band VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WBS Configuration & Items
CREATE TABLE wbs_configurations (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) UNIQUE,
  levels INTEGER CHECK (levels BETWEEN 1 AND 5),
  level_names TEXT[], -- Array of level names
  created_at TIMESTAMP DEFAULT NOW()
  -- Immutable after creation
);

CREATE TABLE wbs_items (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  parent_id UUID REFERENCES wbs_items(id),
  level INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50),
  planned_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  percent_complete INTEGER DEFAULT 0,
  -- Aggregated fields (maintained by triggers)
  aggregated_start_date DATE,
  aggregated_end_date DATE,
  aggregated_cost DECIMAL(15,2),
  aggregated_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Scoring
CREATE TABLE scoring_criteria (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_score INTEGER,
  max_score INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_scorings (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  criterion_id UUID REFERENCES scoring_criteria(id),
  weight DECIMAL(5,2),
  score DECIMAL(5,2),
  justification TEXT,
  evaluated_by UUID REFERENCES users(id),
  evaluated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, criterion_id)
);

-- Workflows
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(20),
  complexity_band VARCHAR(20),
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  match_score INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_stages (
  id UUID PRIMARY KEY,
  workflow_template_id UUID REFERENCES workflow_templates(id),
  stage_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sla_hours INTEGER,
  actions TEXT[], -- Array of available actions
  require_comment BOOLEAN DEFAULT false,
  require_attachment BOOLEAN DEFAULT false,
  UNIQUE(workflow_template_id, stage_order)
);

CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY,
  workflow_template_id UUID REFERENCES workflow_templates(id),
  entity_type VARCHAR(20),
  entity_id UUID,
  request_type VARCHAR(20),
  request_data JSONB,
  current_stage_id UUID REFERENCES workflow_stages(id),
  current_stage_started TIMESTAMP,
  sla_due TIMESTAMP,
  status VARCHAR(50),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Trail
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  entity_type VARCHAR(50),
  entity_id UUID,
  action VARCHAR(50),
  actor_id UUID REFERENCES users(id),
  changes JSONB, -- Before/after values
  metadata JSONB, -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_program ON projects(program_id);
CREATE INDEX idx_wbs_items_project ON wbs_items(project_id);
CREATE INDEX idx_wbs_items_parent ON wbs_items(parent_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

## 7. Frontend Architecture

### 7.1 Component Structure

```
/app
  /(auth)
    /login
    /setup              # Initial tenant setup
  /(dashboard)
    /dashboard          # Main dashboard
    /programs
      /page.tsx        # Programs list
      /[id]/page.tsx   # Program details
      /new/page.tsx    # Create program
    /projects
      /page.tsx        # Projects list
      /[id]/
        /page.tsx      # Project details
        /wbs/page.tsx  # WBS view
        /risks/page.tsx
        /benefits/page.tsx
    /approvals         # My pending approvals
    /reports
    /admin
      /workflows       # Workflow builder
      /scoring         # Scoring matrix setup
      /users          # User management

/components
  /ui                  # shadcn/ui components
  /dashboard
    PortfolioOverview.tsx
    RiskHeatmap.tsx
    KPIDashboard.tsx
  /programs
    ProgramCard.tsx
    ProgramForm.tsx
  /projects
    ProjectForm.tsx
    WBSTree.tsx
    WBSGanttChart.tsx
  /workflow
    WorkflowBuilder.tsx
    StageDesigner.tsx
    ApprovalCard.tsx
  /common
    DataTable.tsx      # TanStack Table wrapper
    MetricCard.tsx     # Tremor wrapper
    
/hooks
  useAuth.ts
  usePrograms.ts
  useWorkflow.ts
  useNotifications.ts
  
/lib
  /api               # API client functions
  /validators        # Zod schemas
  /utils
  /stores           # Zustand stores
```

### 7.2 Key UI Components

#### WBS Tree Component
```tsx
interface WBSTreeProps {
  projectId: string;
  onItemClick?: (item: WBSItem) => void;
  editable?: boolean;
}

export function WBSTree({ projectId, onItemClick, editable }: WBSTreeProps) {
  // Hierarchical tree view with:
  // - Collapsible nodes
  // - Inline editing (if editable)
  // - Progress indicators
  // - Status badges
  // - Aggregated values display
  // - Drag-and-drop for reordering (within same level)
}
```

#### Workflow Builder Component
```tsx
export function WorkflowBuilder() {
  // Visual workflow designer with:
  // - Drag-and-drop stages
  // - Stage configuration panels
  // - Responsibility assignment (roles/users)
  // - SLA configuration
  // - Preview mode
  // - Template save/load
}
```

#### Approval Action Component
```tsx
interface ApprovalActionProps {
  instanceId: string;
  currentStage: WorkflowStage;
  onAction: (action: string) => Promise<void>;
}

export function ApprovalAction({ instanceId, currentStage, onAction }: ApprovalActionProps) {
  // Approval interface with:
  // - Action buttons (Approve/Reject/Return)
  // - Comment field (required/optional based on config)
  // - File attachment
  // - History timeline
  // - SLA countdown
}
```

### 7.3 State Management

```typescript
// Zustand store example for workflow state
interface WorkflowStore {
  pendingApprovals: WorkflowInstance[];
  myApprovals: WorkflowInstance[];
  
  fetchPendingApprovals: () => Promise<void>;
  processApproval: (instanceId: string, action: string, comment?: string) => Promise<void>;
  
  // Real-time updates via WebSocket
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

// Project store with optimistic updates
interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  wbsItems: Record<string, WBSItem[]>; // Keyed by projectId
  
  updateWBSItem: (projectId: string, itemId: string, updates: Partial<WBSItem>) => void;
  // Optimistically update UI, then sync with server
  syncWBSChanges: () => Promise<void>;
}
```

## 8. Security & Performance

### 8.1 Security Measures

1. **Authentication & Authorization**
   - JWT-based authentication with refresh tokens
   - Role-based access control (RBAC) at API level
   - Row-level security in PostgreSQL
   - API rate limiting per tenant

2. **Data Protection**
   - Encryption at rest (database)
   - Encryption in transit (HTTPS)
   - Sensitive data masking in logs
   - GDPR compliance for PII

3. **Input Validation**
   - Zod schemas for all API inputs
   - SQL injection prevention via parameterized queries
   - XSS prevention with React's built-in escaping
   - File upload scanning and type validation

### 8.2 Performance Optimization

1. **Database**
   - Composite indexes on frequently queried columns
   - Materialized views for complex aggregations
   - Connection pooling per tenant
   - Query result caching with Redis

2. **Frontend**
   - Code splitting by route
   - Lazy loading for heavy components
   - Virtual scrolling for large lists
   - Optimistic UI updates
   - Image optimization with Next.js Image

3. **API**
   - Pagination for all list endpoints
   - GraphQL-style field selection
   - Batch operations where applicable
   - Background job processing for heavy operations

## 9. Integration Points

### 9.1 Notification System

```typescript
interface NotificationService {
  // Email notifications via SendGrid/Resend
  sendEmail(to: string[], template: string, data: any): Promise<void>;
  
  // In-app notifications via WebSocket/SSE
  pushNotification(userId: string, notification: Notification): void;
  
  // Batch notifications for efficiency
  sendBatchNotifications(notifications: NotificationBatch[]): Promise<void>;
}

// Notification triggers:
// - Workflow stage assignment
// - SLA breach warnings (80% of SLA)
// - Approval actions (approved/rejected/returned)
// - Project status changes
// - Risk escalations
// - KPI target achievements
```

### 9.2 File Storage

```typescript
interface FileStorageService {
  // S3-compatible object storage
  uploadFile(file: File, metadata: FileMetadata): Promise<string>;
  getSignedUrl(fileId: string, expirySeconds?: number): Promise<string>;
  deleteFile(fileId: string): Promise<void>;
  
  // File types supported:
  // - Documents: PDF, DOCX, XLSX, PPTX
  // - Images: PNG, JPG, GIF
  // - Archives: ZIP, RAR
  // Max file size: 50MB
}
```

### 9.3 External Integrations (Future)

```typescript
// Potential integration points:
interface ExternalIntegrations {
  // ERP integration for financial data
  erpConnector?: {
    syncInvoices(): Promise<void>;
    syncBudgets(): Promise<void>;
  };
  
  // Business Intelligence tools
  biExport?: {
    exportToTableau(): Promise<void>;
    exportToPowerBI(): Promise<void>;
  };
  
  // Calendar integration
  calendarSync?: {
    syncMilestones(): Promise<void>;
    createMeetings(): Promise<void>;
  };
}
```

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// Example test for workflow routing
describe('WorkflowRouter', () => {
  it('should select workflow with highest match score', async () => {
    const router = new WorkflowRouter();
    const workflows = [
      { entityType: 'Project', complexityBand: 'High', budgetRange: { min: 100000, max: 500000 } },
      { entityType: 'Project', complexityBand: 'Low', budgetRange: { min: 0, max: 100000 } },
    ];
    
    const selected = router.findApplicableWorkflow(
      'Project', 'High', 250000, 'tenant-1'
    );
    
    expect(selected).toBe(workflows[0]); // All criteria match
  });
  
  it('should fallback to default workflow when no match', async () => {
    // Test default workflow selection
  });
});
```

### 10.2 Integration Tests

```typescript
// API integration test example
describe('Project Creation Workflow', () => {
  it('should trigger workflow on project creation', async () => {
    const response = await api.post('/api/projects', {
      name: 'Test Project',
      budget: 100000,
      // ... other required fields
    });
    
    expect(response.status).toBe(202); // Accepted, pending approval
    
    // Verify workflow instance created
    const instance = await db.query(
      'SELECT * FROM workflow_instances WHERE entity_id = $1',
      [response.data.projectId]
    );
    expect(instance).toBeDefined();
  });
});
```

### 10.3 E2E Tests

```typescript
// Playwright E2E test example
test('Complete project approval workflow', async ({ page }) => {
  // 1. PM creates project
  await page.goto('/projects/new');
  await page.fill('[name="name"]', 'E2E Test Project');
  await page.fill('[name="budget"]', '250000');
  await page.click('button[type="submit"]');
  
  // 2. Verify pending status
  await expect(page.locator('.status-badge')).toContainText('Pending');
  
  // 3. Login as approver
  await page.goto('/logout');
  await loginAs(page, 'approver@example.com');
  
  // 4. Navigate to approvals
  await page.goto('/approvals');
  await page.click('text=E2E Test Project');
  
  // 5. Approve
  await page.fill('[name="comment"]', 'Approved for testing');
  await page.click('button:has-text("Approve")');
  
  // 6. Verify project is active
  await page.goto('/projects');
  await expect(page.locator('text=E2E Test Project')).toHaveClass(/status-active/);
});
```

### 10.4 Performance Tests

```typescript
// Load testing with k6
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Sustain
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
  },
};

export default function() {
  const response = http.get('https://masar.gov/api/projects');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## 11. Deployment & DevOps

### 11.1 Infrastructure

```yaml
# Docker Compose for development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/masar
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis
      
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: masar
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    
volumes:
  postgres_data:
```

### 11.2 CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t masar:${{ github.sha }} .
      - run: docker push masar:${{ github.sha }}
      
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: kubectl set image deployment/masar masar=masar:${{ github.sha }}
```

### 11.3 Monitoring & Observability

```typescript
// Monitoring setup
interface MonitoringConfig {
  // Application Performance Monitoring
  apm: {
    provider: 'DataDog' | 'NewRelic' | 'Sentry';
    traceSampleRate: 0.1;
  };
  
  // Metrics
  metrics: {
    // Custom metrics to track
    workflowProcessingTime: Histogram;
    activeProjects: Gauge;
    approvalSLABreaches: Counter;
  };
  
  // Logging
  logging: {
    level: 'info' | 'debug' | 'error';
    format: 'json';
    destinations: ['stdout', 'elasticsearch'];
  };
  
  // Alerting rules
  alerts: {
    slaBreach: {
      condition: 'workflow.sla_remaining < 2 hours';
      notify: ['pmo@example.com'];
    };
    highErrorRate: {
      condition: 'error_rate > 1%';
      notify: ['oncall@example.com'];
    };
  };
}
```

## 12. Migration & Rollout Plan

### Phase 1: Foundation (Weeks 1-4)
- [ ] Setup multi-tenant infrastructure
- [ ] Implement authentication/authorization
- [ ] Create user management system
- [ ] Build workflow engine core

### Phase 2: Core Features (Weeks 5-8)
- [ ] Program/Project CRUD operations
- [ ] WBS structure and management
- [ ] Scoring matrix implementation
- [ ] Basic workflow templates

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Benefits & KPI tracking
- [ ] Risk management cascade
- [ ] Invoice allocation system
- [ ] Advanced workflow builder UI

### Phase 4: Reporting & Polish (Weeks 13-16)
- [ ] Dashboard implementation
- [ ] Report generation
- [ ] Audit trail completion
- [ ] Performance optimization

### Phase 5: Testing & Deployment (Weeks 17-20)
- [ ] Comprehensive testing
- [ ] Security audit
- [ ] Documentation
- [ ] Production deployment
- [ ] User training materials

## 13. Assumptions & Constraints

### Assumptions
1. Users have modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
2. Government institutions have stable internet connectivity
3. File uploads limited to 50MB per file
4. Maximum 10,000 active projects per tenant
5. SLA notifications sent within 5 minutes of trigger

### Constraints
1. Must comply with government data residency requirements
2. Audit logs retained for minimum 7 years
3. System available 99.9% uptime SLA
4. Response time <2 seconds for 95% of requests
5. Support for Arabic language (RTL) in Phase 2

## 14. Open Questions & Decisions Needed

1. **Localization**: Requirements for multi-language support beyond English?
2. **Authentication**: Integration with government SSO systems (SAML/OAuth)?
3. **Backup**: RPO/RTO requirements for disaster recovery?
4. **Compliance**: Specific regulatory standards (ISO 27001, SOC2)?
5. **Mobile**: Native mobile apps or responsive web only?
6. **Offline**: Any offline capability requirements?
7. **API**: Public API for third-party integrations?
8. **Customization**: White-labeling requirements per tenant?

## 15. Success Metrics

### Technical Metrics
- Page load time <2 seconds (P95)
- API response time <500ms (P95)  
- System uptime >99.9%
- Zero critical security vulnerabilities

### Business Metrics
- User adoption rate >80% within 6 months
- Workflow processing time reduced by 50%
- Project delivery on-time rate improved by 30%
- Complete audit trail for 100% of changes

### User Satisfaction
- System usability score (SUS) >75
- User-reported bugs <5 per month after launch
- Feature request implementation cycle <30 days
- Training completion rate >90%

---

## Appendix A: Glossary

- **WBS**: Work Breakdown Structure - hierarchical decomposition of project work
- **KPI**: Key Performance Indicator - metric to measure benefit realization  
- **SLA**: Service Level Agreement - time limit for workflow stage completion
- **PMO**: Project Management Office - central governance body
- **PM**: Project Manager - individual managing specific project
- **Sponsor**: Executive providing oversight and approval authority

## Appendix B: Database Indexing Strategy

```sql
-- Performance-critical indexes
CREATE INDEX idx_workflow_instances_pending ON workflow_instances(status, sla_due) 
  WHERE status = 'InProgress';
  
CREATE INDEX idx_user_roles_lookup ON user_roles(user_id, context_type, context_id) 
  WHERE valid_until IS NULL OR valid_until > NOW();
  
CREATE INDEX idx_wbs_aggregation ON wbs_items(project_id, parent_id, level);

CREATE INDEX idx_audit_search ON audit_logs(entity_type, entity_id, created_at DESC);
```

## Appendix C: Error Codes

```typescript
enum ErrorCodes {
  // Authentication/Authorization (1xxx)
  UNAUTHORIZED = 1001,
  FORBIDDEN = 1002,
  TOKEN_EXPIRED = 1003,
  
  // Validation (2xxx)
  INVALID_INPUT = 2001,
  MISSING_REQUIRED = 2002,
  CONSTRAINT_VIOLATION = 2003,
  
  // Workflow (3xxx)
  NO_WORKFLOW_FOUND = 3001,
  INVALID_ACTION = 3002,
  SLA_BREACHED = 3003,
  
  // Business Logic (4xxx)
  INSUFFICIENT_BUDGET = 4001,
  INVALID_STATE_TRANSITION = 4002,
  CIRCULAR_DEPENDENCY = 4003,
  
  // System (5xxx)
  DATABASE_ERROR = 5001,
  EXTERNAL_SERVICE_ERROR = 5002,
  FILE_UPLOAD_FAILED = 5003,
}
```

---

*This specification is version 1.0 and subject to updates based on stakeholder feedback and technical discoveries during implementation.*