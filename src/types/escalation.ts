/**
 * Escalation Management Type Definitions
 * Types for SLA tracking, escalation rules, and escalation actions
 */

// ============================================================================
// ENUMS
// ============================================================================

export type EscalationActionType =
  | 'Reassign'
  | 'Notify'
  | 'ChangePriority'
  | 'AddComment'
  | 'CreateAlert'
  | 'TriggerWebhook';

export type EscalationTriggerType =
  | 'TimeInStage'
  | 'SLAWarning'
  | 'SLABreach'
  | 'PriorityHigh'
  | 'CustomCondition';

export type EscalationLevel = 1 | 2 | 3 | 4 | 5;
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type SLAStatus = 'Compliant' | 'Warning' | 'Breached' | 'NotApplicable';

// ============================================================================
// ESCALATION RULES & POLICIES
// ============================================================================

/**
 * Escalation action to be executed when rule triggers
 */
export interface EscalationAction {
  id: string;
  escalationRuleId: string;
  actionType: EscalationActionType;

  // Action-specific parameters
  reassignToUserId?: string; // For Reassign action
  reassignToRole?: string; // For Reassign action
  notificationTemplate?: string; // For Notify action
  newPriority?: PriorityLevel; // For ChangePriority action
  comment?: string; // For AddComment action
  webhookUrl?: string; // For TriggerWebhook action

  // Configuration
  isActive: boolean;
  order: number; // Order of execution

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escalation rule that triggers escalation actions
 */
export interface EscalationRule {
  id: string;
  escalationPolicyId: string;

  // Rule definition
  name: string;
  description?: string;
  triggerType: EscalationTriggerType;
  escalationLevel: EscalationLevel;

  // Trigger conditions
  // For TimeInStage: hoursInStage
  hoursInStage?: number;

  // For SLAWarning: warningThresholdPercent (e.g., 75)
  warningThresholdPercent?: number;

  // For PriorityHigh: minimum priority level
  minimumPriority?: PriorityLevel;

  // Custom conditions (for complex rules)
  customCondition?: Record<string, unknown>;

  // Configuration
  isActive: boolean;
  isRepeatable: boolean; // Can escalate multiple times
  cooldownMinutes?: number; // Prevent duplicate escalations
  maxEscalations?: number; // Max times this rule can trigger

  // Actions to execute
  actions: EscalationAction[];

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escalation policy - groups rules for a workflow template
 */
export interface EscalationPolicy {
  id: string;
  workflowTemplateId: string;
  tenantId: string;

  // Policy definition
  name: string;
  description?: string;

  // Default settings
  warningThresholdPercent: number; // Default: 75
  maxEscalationLevels: number; // Default: 3
  cooldownBetweenEscalations: number; // minutes, default: 60

  // Rules
  rules: EscalationRule[];

  // Configuration
  isActive: boolean;
  isDefault: boolean;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SLA MANAGEMENT
// ============================================================================

/**
 * SLA compliance information for a workflow instance
 */
export interface SLAComplianceInfo {
  workflowInstanceId: string;
  stageId: string;
  stageName: string;

  // Time tracking
  stageStartedAt: Date;
  slaDueAt: Date;
  currentStatus: SLAStatus;

  // Time calculations (in hours, rounded to 1 decimal)
  totalSLAHours: number;
  hoursUsed: number;
  hoursRemaining?: number; // undefined if breached
  percentageUsed: number;

  // Breach info
  isOverdue: boolean;
  hoursBreach?: number; // How many hours past due

  // Warning info
  isWarning: boolean; // Within warning threshold
  warningThresholdPercent: number;
}

/**
 * Historical SLA record for analytics
 */
export interface SLAHistoryRecord {
  id: string;
  workflowInstanceId: string;
  stageId: string;
  stageName: string;

  // Time info
  startTime: Date;
  endTime: Date;
  slaDueTime: Date;
  totalHours: number;
  hoursUsed: number;

  // Compliance
  status: SLAStatus;
  isBreached: boolean;
  hoursBreach?: number;

  // Timestamps
  recordedAt: Date;
}

// ============================================================================
// ESCALATION EVENTS & TRACKING
// ============================================================================

/**
 * Escalation event - tracks when escalations occur
 */
export interface EscalationEvent {
  id: string;
  workflowInstanceId: string;
  escalationRuleId: string;
  tenantId: string;

  // What triggered escalation
  triggerType: EscalationTriggerType;
  escalationLevel: EscalationLevel;

  // Who/what escalated
  triggeredBy: 'Rule' | 'Manual' | 'System';
  triggeredByUserId?: string; // For manual escalations

  // Previous state
  previousAssigneeId?: string;
  previousPriority?: PriorityLevel;

  // New state
  newAssigneeId?: string;
  newPriority?: PriorityLevel;

  // Details
  reason: string;
  details?: Record<string, unknown>;

  // Escalation chain
  escalationChainLevel: number; // 1st, 2nd, 3rd escalation
  parentEscalationEventId?: string; // Link to previous escalation in chain

  // Response
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;

  // Timestamps
  createdAt: Date;
}

/**
 * Escalation chain - defines escalation path
 */
export interface EscalationChain {
  id: string;
  escalationPolicyId: string;

  // Chain definition
  name: string;
  description?: string;

  // Levels in chain
  level1: {
    roleOrUserId: string;
    escalationDelayMinutes: number;
  };
  level2?: {
    roleOrUserId: string;
    escalationDelayMinutes: number;
  };
  level3?: {
    roleOrUserId: string;
    escalationDelayMinutes: number;
  };

  // Configuration
  isActive: boolean;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create escalation policy request
 */
export interface CreateEscalationPolicyRequest {
  workflowTemplateId: string;
  name: string;
  description?: string;
  warningThresholdPercent?: number;
  maxEscalationLevels?: number;
  cooldownBetweenEscalations?: number;
  isDefault?: boolean;
}

/**
 * Create escalation rule request
 */
export interface CreateEscalationRuleRequest {
  escalationPolicyId: string;
  name: string;
  description?: string;
  triggerType: EscalationTriggerType;
  escalationLevel: EscalationLevel;
  hoursInStage?: number;
  warningThresholdPercent?: number;
  minimumPriority?: PriorityLevel;
  isRepeatable?: boolean;
  cooldownMinutes?: number;
  maxEscalations?: number;
  actions: CreateEscalationActionRequest[];
}

/**
 * Create escalation action request
 */
export interface CreateEscalationActionRequest {
  actionType: EscalationActionType;
  reassignToUserId?: string;
  reassignToRole?: string;
  notificationTemplate?: string;
  newPriority?: PriorityLevel;
  comment?: string;
  webhookUrl?: string;
  order?: number;
}

/**
 * Execute escalation request
 */
export interface ExecuteEscalationRequest {
  workflowInstanceId: string;
  escalationRuleId: string;
  reason: string;
  triggeredByUserId?: string;
}

/**
 * Query SLA metrics request
 */
export interface QuerySLAMetricsRequest {
  workflowTemplateId?: string;
  workflowInstanceId?: string;
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  status?: SLAStatus;
  skip?: number;
  take?: number;
}

/**
 * SLA metrics response
 */
export interface SLAMetricsResponse {
  totalRecords: number;
  compliantCount: number;
  warningCount: number;
  breachedCount: number;
  complianceRate: number; // percentage
  averageTimeInStage: number; // hours
  records: SLAHistoryRecord[];
}
