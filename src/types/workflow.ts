/**
 * Workflow Management Type Definitions
 * Workflow templates, instances, stages, and actions
 */

// ============================================================================
// ENUMS
// ============================================================================

export type EntityType = 'Program' | 'Project' | 'Initiative';
export type ComplexityBand = 'Low' | 'Medium' | 'High';
export type WorkflowAction = 'Approve' | 'Reject' | 'Return';
export type ResponsibilityType = 'Role' | 'Position' | 'User';
export type ResponsibilityScope = 'Global' | 'Program' | 'Project';
export type NotificationMethod = 'Email' | 'InApp' | 'Both';
export type WorkflowInstanceStatus = 'InProgress' | 'Approved' | 'Rejected' | 'Returned';
export type RequestType = 'Create' | 'Update' | 'Close';
export type ActionResult = 'Approved' | 'Rejected' | 'Returned';

// ============================================================================
// WORKFLOW TEMPLATE TYPES
// ============================================================================

/**
 * Workflow template - Blueprint for approval workflows
 */
export interface WorkflowTemplate {
  id: string;
  tenantId: string;

  // Definition
  name: string;
  description: string | null;

  // Matching criteria (template applies when conditions met)
  entityType: EntityType | null; // 'Program', 'Project', 'Initiative'
  complexityBand: ComplexityBand | null; // 'Low', 'Medium', 'High'
  budgetMin: number | null;
  budgetMax: number | null;

  // Match score for template selection
  matchScore: number;

  // Status
  isDefault: boolean;
  isActive: boolean;

  // Audit
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  stages?: WorkflowStage[];
  instances?: WorkflowInstance[];
}

/**
 * Create workflow template request
 */
export interface CreateWorkflowTemplateRequest {
  name: string;
  description?: string;
  entityType?: EntityType;
  complexityBand?: ComplexityBand;
  budgetMin?: number;
  budgetMax?: number;
  isDefault?: boolean;
}

/**
 * Update workflow template request
 */
export interface UpdateWorkflowTemplateRequest {
  name?: string;
  description?: string;
  entityType?: EntityType;
  complexityBand?: ComplexityBand;
  budgetMin?: number;
  budgetMax?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Workflow template with stages (detailed view)
 */
export interface WorkflowTemplateWithStages extends WorkflowTemplate {
  stages: WorkflowStage[];
}

/**
 * Filter for listing workflow templates
 */
export interface ListWorkflowTemplatesFilter {
  tenantId?: string;
  entityType?: EntityType;
  complexityBand?: ComplexityBand;
  isActive?: boolean;
  isDefault?: boolean;
  sortBy?: 'name' | 'matchScore' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

// ============================================================================
// WORKFLOW STAGE TYPES
// ============================================================================

/**
 * Workflow stage - Step in approval workflow
 */
export interface WorkflowStage {
  id: string;
  workflowTemplateId: string;

  // Definition
  stageOrder: number;
  name: string;
  description?: string;

  // Configuration
  slaHours: number; // Service Level Agreement hours
  actions: WorkflowAction[]; // ['Approve', 'Reject', 'Return']

  // Requirements
  requireComment: boolean;
  requireAttachment: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  responsibilities?: StageResponsibility[];
  stageActions?: StageAction[];
}

/**
 * Create workflow stage request
 */
export interface CreateWorkflowStageRequest {
  workflowTemplateId: string;
  stageOrder: number;
  name: string;
  description?: string;
  slaHours: number;
  actions: WorkflowAction[];
  requireComment?: boolean;
  requireAttachment?: boolean;
}

/**
 * Update workflow stage request
 */
export interface UpdateWorkflowStageRequest {
  name?: string;
  description?: string;
  slaHours?: number;
  actions?: WorkflowAction[];
  requireComment?: boolean;
  requireAttachment?: boolean;
}

/**
 * Stage responsibility - Who approves at this stage
 */
export interface StageResponsibility {
  id: string;
  stageId: string;

  // Who is responsible
  type: ResponsibilityType; // 'Role', 'Position', 'User'
  value: string; // Role name, Position ID, or User ID

  // Context
  scope: ResponsibilityScope; // 'Global', 'Program', 'Project'

  // Notifications
  notificationMethod: NotificationMethod; // 'Email', 'InApp', 'Both'

  // Audit
  createdAt: Date;
}

/**
 * Create stage responsibility request
 */
export interface CreateStageResponsibilityRequest {
  stageId: string;
  type: ResponsibilityType;
  value: string;
  scope: ResponsibilityScope;
  notificationMethod?: NotificationMethod;
}

// ============================================================================
// WORKFLOW INSTANCE TYPES
// ============================================================================

/**
 * Workflow instance - Running workflow for specific entity
 */
export interface WorkflowInstance {
  id: string;
  workflowTemplateId: string;

  // Entity being workflow'd
  entityType: EntityType; // 'Program', 'Project', 'Initiative'
  entityId: string;
  projectId?: string;

  // Request details
  requestType: RequestType; // 'Create', 'Update', 'Close'
  requestData: Record<string, unknown>; // JSON of requested changes

  // Current stage
  currentStageId: string;
  currentStageStarted: Date;
  slaDue: Date;

  // Status
  status: WorkflowInstanceStatus; // 'InProgress', 'Approved', 'Rejected', 'Returned'

  // Audit
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  template?: WorkflowTemplate;
  currentStage?: WorkflowStage;
  stageActions?: StageAction[];
}

/**
 * Create workflow instance request
 */
export interface CreateWorkflowInstanceRequest {
  workflowTemplateId: string;
  entityType: EntityType;
  entityId: string;
  projectId?: string;
  requestType: RequestType;
  requestData: Record<string, unknown>;
}

/**
 * Update workflow instance (for status changes)
 */
export interface UpdateWorkflowInstanceRequest {
  status?: WorkflowInstanceStatus;
  currentStageId?: string;
  currentStageStarted?: Date;
  slaDue?: Date;
}

/**
 * Workflow instance with details
 */
export interface WorkflowInstanceDetail extends WorkflowInstance {
  template: WorkflowTemplate;
  currentStage: WorkflowStage;
  stageActions: StageAction[];
}

/**
 * Filter for listing workflow instances
 */
export interface ListWorkflowInstancesFilter {
  entityType?: EntityType;
  entityId?: string;
  projectId?: string;
  status?: WorkflowInstanceStatus;
  workflowTemplateId?: string;
  overdueSLAOnly?: boolean;
  sortBy?: 'createdAt' | 'slaDue' | 'status';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

// ============================================================================
// WORKFLOW ACTION TYPES
// ============================================================================

/**
 * Stage action - Action taken at a workflow stage
 */
export interface StageAction {
  id: string;

  workflowInstanceId: string;
  stageId: string;

  // Action details
  action: ActionResult; // 'Approved', 'Rejected', 'Returned'
  comment?: string;

  // Who took action
  actorId: string;

  // Timing
  stageAssignedDate: Date;
  hoursToAction?: number;
  wasOverdue: boolean;

  // When
  actionDate: Date;

  // Audit
  createdAt: Date;
}

/**
 * Create stage action request
 */
export interface CreateStageActionRequest {
  workflowInstanceId: string;
  stageId: string;
  action: ActionResult;
  comment?: string;
  actorId: string;
  stageAssignedDate: Date;
}

// ============================================================================
// WORKFLOW MATCHING TYPES
// ============================================================================

/**
 * Workflow match result - Which template matches an entity
 */
export interface WorkflowMatch {
  template: WorkflowTemplate;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Workflow matching criteria
 */
export interface WorkflowMatchingCriteria {
  entityType: EntityType;
  complexityBand?: ComplexityBand;
  budget?: number;
}

// ============================================================================
// WORKFLOW SUMMARY TYPES
// ============================================================================

/**
 * Summary of workflows in progress
 */
export interface WorkflowSummary {
  totalInProgress: number;
  totalApproved: number;
  totalRejected: number;
  totalReturned: number;

  overdueSLA: number;
  upcomingSLA: number; // Due in next 24 hours

  byTemplate: {
    templateId: string;
    templateName: string;
    count: number;
    status: Record<WorkflowInstanceStatus, number>;
  }[];

  byEntityType: {
    entityType: EntityType;
    count: number;
    status: Record<WorkflowInstanceStatus, number>;
  }[];
}

/**
 * Workflow performance metrics
 */
export interface WorkflowMetrics {
  templateId: string;
  totalExecuted: number;
  totalApproved: number;
  approvalRate: number; // % approved

  avgApprovalTime: number; // days
  avgStageTime: number; // hours per stage

  rejectionRate: number; // % rejected
  returnRate: number; // % returned

  slaMissedCount: number;
  slaMissedPercentage: number;

  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Stage completion status
 */
export interface StageCompletionStatus {
  stageId: string;
  stageName: string;
  stageOrder: number;

  status: 'Pending' | 'InProgress' | 'Completed' | 'Overdue';
  startedAt?: Date;
  completedAt?: Date;
  overdueAt?: Date;

  actions: StageAction[];
}

/**
 * Workflow execution trace
 */
export interface WorkflowExecutionTrace {
  workflowInstanceId: string;
  templateName: string;
  startedAt: Date;
  currentStage: StageCompletionStatus;
  completedStages: StageCompletionStatus[];
  pendingStages: StageCompletionStatus[];

  timeline: {
    stage: string;
    action: ActionResult;
    comment?: string;
    actionBy: string;
    actionAt: Date;
  }[];
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Workflow template response (API)
 */
export interface WorkflowTemplateResponse extends Omit<WorkflowTemplate, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow instance response (API)
 */
export interface WorkflowInstanceResponse
  extends Omit<WorkflowInstance, 'createdAt' | 'updatedAt' | 'currentStageStarted' | 'slaDue'> {
  createdAt: string;
  updatedAt: string;
  currentStageStarted: string;
  slaDue: string;
}

/**
 * Stage action response (API)
 */
export interface StageActionResponse extends Omit<StageAction, 'createdAt' | 'actionDate' | 'stageAssignedDate'> {
  createdAt: string;
  actionDate: string;
  stageAssignedDate: string;
}
