/**
 * Workflow Service
 * Manages workflow templates, instances, stages, and actions
 */

import { PrismaClient } from '@prisma/client';
import {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowStage,
  WorkflowInstanceStatus,
  StageAction,
  WorkflowMatch,
  WorkflowMetrics,
  CreateWorkflowTemplateRequest,
  CreateWorkflowInstanceRequest,
  CreateWorkflowStageRequest,
  CreateStageActionRequest,
  CreateStageResponsibilityRequest,
  ListWorkflowTemplatesFilter,
  ListWorkflowInstancesFilter,
  WorkflowMatchingCriteria,
  ExecutionContext,
  ActionExecutionRequest,
  ExecutionResult,
  SLAComplianceInfo,
  PermissionVerificationResult,
  WorkflowCompletionResult,
} from '@/types/workflow';
import { WorkflowNotificationIntegration } from './workflow-notification-integration';

const prisma = new PrismaClient();

// ============================================================================
// WORKFLOW TEMPLATE SERVICE
// ============================================================================

export class WorkflowTemplateService {
  /**
   * Create workflow template
   */
  static async createTemplate(
    tenantId: string,
    data: CreateWorkflowTemplateRequest,
    createdBy: string
  ): Promise<WorkflowTemplate> {
    const template = await prisma.workflowTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        entityType: data.entityType || null,
        complexityBand: data.complexityBand || null,
        budgetMin: data.budgetMin || null,
        budgetMax: data.budgetMax || null,
        isDefault: data.isDefault || false,
        matchScore: this.calculateMatchScore(data),
        createdBy,
        isActive: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return template as any;
  }

  /**
   * Get template by ID
   */
  static async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
      include: { stages: { orderBy: { stageOrder: 'asc' } } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return template as any;
  }

  /**
   * List templates with filters
   */
  static async listTemplates(filter: ListWorkflowTemplatesFilter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: filter.isActive !== false };

    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.complexityBand) where.complexityBand = filter.complexityBand;
    if (filter.isDefault !== undefined) where.isDefault = filter.isDefault;

    const [templates, total] = await Promise.all([
      prisma.workflowTemplate.findMany({
        where,
        orderBy: { [filter.sortBy || 'createdAt']: filter.sortOrder || 'desc' },
        skip: filter.skip || 0,
        take: filter.take || 20,
        include: { stages: { orderBy: { stageOrder: 'asc' } } },
      }),
      prisma.workflowTemplate.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { templates: templates as any, total };
  }

  /**
   * Find matching template for entity
   */
  static async findMatchingTemplate(
    tenantId: string,
    criteria: WorkflowMatchingCriteria
  ): Promise<WorkflowMatch | null> {
    const templates = await prisma.workflowTemplate.findMany({
      where: { tenantId, isActive: true },
    });

    let bestMatch: WorkflowTemplate | null = null;
    let bestScore = 0;
    const matchReasons: string[] = [];

    for (const template of templates) {
      let score = 0;

      // Entity type match
      if (template.entityType === criteria.entityType) {
        score += 30;
        matchReasons.push(`Entity type matches: ${criteria.entityType}`);
      }

      // Complexity band match
      if (template.complexityBand === criteria.complexityBand) {
        score += 20;
        matchReasons.push(`Complexity matches: ${criteria.complexityBand}`);
      }

      // Budget range match
      if (criteria.budget) {
        const min = template.budgetMin ? Number(template.budgetMin) : 0;
        const max = template.budgetMax ? Number(template.budgetMax) : Number.MAX_SAFE_INTEGER;

        if (criteria.budget >= min && criteria.budget <= max) {
          score += 25;
          matchReasons.push(`Budget in range: ${min}-${max}`);
        }
      }

      // Default template fallback
      if (template.isDefault) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bestMatch = template as any;
      }
    }

    return bestMatch ? { template: bestMatch, matchScore: bestScore, matchReasons } : null;
  }

  /**
   * Helper: Calculate template match score
   */
  private static calculateMatchScore(data: CreateWorkflowTemplateRequest): number {
    let score = 0;
    if (data.entityType) score += 30;
    if (data.complexityBand) score += 20;
    if (data.budgetMin && data.budgetMax) score += 25;
    if (data.isDefault) score += 15;
    return score;
  }
}

// ============================================================================
// WORKFLOW STAGE SERVICE
// ============================================================================

export class WorkflowStageService {
  /**
   * Create workflow stage
   */
  static async createStage(data: CreateWorkflowStageRequest): Promise<WorkflowStage> {
    const stage = await prisma.workflowStage.create({
      data: {
        workflowTemplateId: data.workflowTemplateId,
        stageOrder: data.stageOrder,
        name: data.name,
        description: data.description || null,
        slaHours: data.slaHours,
        actions: data.actions,
        requireComment: data.requireComment || false,
        requireAttachment: data.requireAttachment || false,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stage as any;
  }

  /**
   * Get stages for template (ordered)
   */
  static async getStagesForTemplate(templateId: string): Promise<WorkflowStage[]> {
    const stages = await prisma.workflowStage.findMany({
      where: { workflowTemplateId: templateId },
      orderBy: { stageOrder: 'asc' },
      include: { responsibilities: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stages as any;
  }

  /**
   * Get first stage (entry point)
   */
  static async getFirstStage(templateId: string): Promise<WorkflowStage | null> {
    const stage = await prisma.workflowStage.findFirst({
      where: { workflowTemplateId: templateId },
      orderBy: { stageOrder: 'asc' },
      include: { responsibilities: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stage as any;
  }

  /**
   * Get next stage
   */
  static async getNextStage(templateId: string, currentOrder: number): Promise<WorkflowStage | null> {
    const stage = await prisma.workflowStage.findFirst({
      where: {
        workflowTemplateId: templateId,
        stageOrder: { gt: currentOrder },
      },
      orderBy: { stageOrder: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stage as any;
  }

  /**
   * Add responsibility to stage
   */
  static async addResponsibility(data: CreateStageResponsibilityRequest) {
    const responsibility = await prisma.stageResponsibility.create({
      data: {
        stageId: data.stageId,
        type: data.type,
        value: data.value,
        scope: data.scope,
        notificationMethod: data.notificationMethod || 'Both',
      },
    });

    return responsibility;
  }
}

// ============================================================================
// WORKFLOW INSTANCE SERVICE
// ============================================================================

export class WorkflowInstanceService {
  /**
   * Create workflow instance
   */
  static async createInstance(
    tenantId: string,
    data: CreateWorkflowInstanceRequest,
    createdBy: string
  ): Promise<WorkflowInstance> {
    // Get template
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: data.workflowTemplateId },
    });

    if (!template) {
      throw new Error(`Template not found: ${data.workflowTemplateId}`);
    }

    // Verify template belongs to tenant
    if (template.tenantId !== tenantId) {
      throw new Error(`Template does not belong to tenant: ${tenantId}`);
    }

    // Get first stage
    const firstStage = await WorkflowStageService.getFirstStage(data.workflowTemplateId);

    if (!firstStage) {
      throw new Error(`No stages found for template: ${data.workflowTemplateId}`);
    }

    // Calculate SLA due
    const slaDue = new Date();
    slaDue.setHours(slaDue.getHours() + firstStage.slaHours);

    const instance = await prisma.workflowInstance.create({
      data: {
        workflowTemplateId: data.workflowTemplateId,
        entityType: data.entityType,
        entityId: data.entityId,
        projectId: data.projectId || null,
        requestType: data.requestType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestData: data.requestData as any,
        currentStageId: firstStage.id,
        currentStageStarted: new Date(),
        slaDue,
        status: 'InProgress',
        createdBy,
      },
    });

    // Send notification about workflow creation
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    WorkflowNotificationIntegration.notifyWorkflowCreated(instance.id, tenantId, createdBy);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return instance as any;
  }

  /**
   * Get workflow instance with details
   */
  static async getInstance(instanceId: string) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        template: { include: { stages: { orderBy: { stageOrder: 'asc' } } } },
        currentStage: { include: { responsibilities: true } },
        stageActions: { orderBy: { actionDate: 'desc' } },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return instance as any;
  }

  /**
   * List workflow instances
   */
  static async listInstances(filter: ListWorkflowInstancesFilter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;
    if (filter.workflowTemplateId) where.workflowTemplateId = filter.workflowTemplateId;

    if (filter.overdueSLAOnly) {
      where.slaDue = { lt: new Date() };
      where.status = { ne: 'Approved' };
    }

    const [instances, total] = await Promise.all([
      prisma.workflowInstance.findMany({
        where,
        orderBy: { [filter.sortBy || 'createdAt']: filter.sortOrder || 'desc' },
        skip: filter.skip || 0,
        take: filter.take || 20,
        include: {
          template: true,
          currentStage: true,
          stageActions: { take: 1, orderBy: { actionDate: 'desc' } },
        },
      }),
      prisma.workflowInstance.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { instances: instances as any, total };
  }

  /**
   * Advance workflow to next stage or complete
   */
  static async advanceWorkflow(
    instanceId: string,
    currentStageId: string
  ): Promise<WorkflowInstance | null> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) return null;

    const currentStage = await prisma.workflowStage.findUnique({
      where: { id: currentStageId },
    });

    if (!currentStage) return null;

    const nextStage = await WorkflowStageService.getNextStage(
      instance.workflowTemplateId,
      currentStage.stageOrder
    );

    if (!nextStage) {
      // No more stages, workflow complete
      const updated = await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'Approved',
          updatedAt: new Date(),
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return updated as any;
    }

    // Calculate new SLA
    const slaDue = new Date();
    slaDue.setHours(slaDue.getHours() + nextStage.slaHours);

    const updated2 = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStageId: nextStage.id,
        currentStageStarted: new Date(),
        slaDue,
        updatedAt: new Date(),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return updated2 as any;
  }
}

// ============================================================================
// STAGE ACTION SERVICE
// ============================================================================

export class StageActionService {
  /**
   * Record stage action (approval, rejection, etc)
   */
  static async recordAction(data: CreateStageActionRequest): Promise<StageAction> {
    // Calculate hours to action
    const now = new Date();
    const hoursToAction = (now.getTime() - data.stageAssignedDate.getTime()) / (1000 * 60 * 60);
    const wasOverdue = hoursToAction > 24; // Example: overdue if more than 24 hours

    const action = await prisma.stageAction.create({
      data: {
        workflowInstanceId: data.workflowInstanceId,
        stageId: data.stageId,
        action: data.action,
        comment: data.comment || null,
        actorId: data.actorId,
        stageAssignedDate: data.stageAssignedDate,
        hoursToAction,
        wasOverdue,
        actionDate: new Date(),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return action as any;
  }

  /**
   * Get actions for workflow instance
   */
  static async getActionsForInstance(instanceId: string): Promise<StageAction[]> {
    const actions = await prisma.stageAction.findMany({
      where: { workflowInstanceId: instanceId },
      orderBy: { actionDate: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return actions as any;
  }

  /**
   * Get actions for specific stage
   */
  static async getActionsForStage(instanceId: string, stageId: string): Promise<StageAction[]> {
    const actions = await prisma.stageAction.findMany({
      where: {
        workflowInstanceId: instanceId,
        stageId,
      },
      orderBy: { actionDate: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return actions as any;
  }
}

// ============================================================================
// WORKFLOW METRICS SERVICE
// ============================================================================

export class WorkflowMetricsService {
  /**
   * Calculate workflow performance metrics
   */
  static async calculateMetrics(
    templateId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkflowMetrics> {
    const instances = await prisma.workflowInstance.findMany({
      where: {
        workflowTemplateId: templateId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { stageActions: true },
    });

    const totalExecuted = instances.length;
    const totalApproved = instances.filter((i) => i.status === 'Approved').length;
    const totalRejected = instances.filter((i) => i.status === 'Rejected').length;
    const totalReturned = instances.filter((i) => i.status === 'Returned').length;

    const approvalRate = totalExecuted > 0 ? (totalApproved / totalExecuted) * 100 : 0;
    const rejectionRate = totalExecuted > 0 ? (totalRejected / totalExecuted) * 100 : 0;
    const returnRate = totalExecuted > 0 ? (totalReturned / totalExecuted) * 100 : 0;

    // Calculate timing metrics
    let totalApprovalTime = 0;
    let totalStageTime = 0;
    let stageCount = 0;

    for (const instance of instances) {
      if (instance.status === 'Approved') {
        const approvalTime =
          (instance.updatedAt.getTime() - instance.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        totalApprovalTime += approvalTime;
      }

      if (instance.stageActions.length > 0) {
        const firstAction = instance.stageActions[instance.stageActions.length - 1];
        if (firstAction) {
          const stageTime =
            (firstAction.actionDate.getTime() - instance.currentStageStarted.getTime()) / (1000 * 60 * 60);
          totalStageTime += stageTime;
          stageCount++;
        }
      }
    }

    const avgApprovalTime =
      instances.filter((i) => i.status === 'Approved').length > 0
        ? totalApprovalTime / instances.filter((i) => i.status === 'Approved').length
        : 0;

    const avgStageTime = stageCount > 0 ? totalStageTime / stageCount : 0;

    // SLA metrics
    const slaMissed = instances.filter((i) => i.slaDue < new Date() && i.status === 'InProgress')
      .length;
    const slaMissedPercentage = totalExecuted > 0 ? (slaMissed / totalExecuted) * 100 : 0;

    return {
      templateId,
      totalExecuted,
      totalApproved,
      approvalRate: Math.round(approvalRate * 100) / 100,
      avgApprovalTime: Math.round(avgApprovalTime * 100) / 100,
      avgStageTime: Math.round(avgStageTime * 100) / 100,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      returnRate: Math.round(returnRate * 100) / 100,
      slaMissedCount: slaMissed,
      slaMissedPercentage: Math.round(slaMissedPercentage * 100) / 100,
      timeRange: { startDate, endDate },
    };
  }
}

// ============================================================================
// WORKFLOW ROUTER SERVICE
// ============================================================================

export class WorkflowRouter {
  /**
   * Route workflow - Pure function that matches templates to entities
   * No database access, works with passed-in templates
   * Scoring: Budget (30 pts) > Complexity (20 pts) > Type (10 pts)
   */
  static routeWorkflow(
    templates: Array<{
      id: string;
      name: string;
      entityType: string | null;
      complexityBand: string | null;
      budgetMin: number | null;
      budgetMax: number | null;
      isDefault: boolean;
    }>,
    entityType: string,
    complexityBand?: string | null,
    budget?: number | null
  ): WorkflowMatch | null {
    if (templates.length === 0) return null;

    let bestTemplate = templates[0];
    let bestScore = 0;
    const matchReasons: string[] = [];

    for (const template of templates) {
      let score = 0;
      const reasons: string[] = [];

      // Budget range match (30 points)
      if (budget !== null && budget !== undefined) {
        const min = template.budgetMin ? Number(template.budgetMin) : 0;
        const max = template.budgetMax ? Number(template.budgetMax) : Number.MAX_SAFE_INTEGER;

        if (budget >= min && budget <= max) {
          score += 30;
          reasons.push(`Budget in range: ${min}-${max}`);
        }
      }

      // Complexity band match (20 points)
      if (complexityBand && template.complexityBand === complexityBand) {
        score += 20;
        reasons.push(`Complexity matches: ${complexityBand}`);
      }

      // Entity type match (10 points)
      if (template.entityType === entityType) {
        score += 10;
        reasons.push(`Entity type matches: ${entityType}`);
      }

      // Default template bonus (5 points)
      if (template.isDefault) {
        score += 5;
      }

      if (score > bestScore || (score === bestScore && template.isDefault)) {
        bestScore = score;
        bestTemplate = template;
        matchReasons.length = 0;
        matchReasons.push(...reasons);
      }
    }

    return {
      template: bestTemplate as WorkflowTemplate,
      matchScore: bestScore,
      matchReasons,
    };
  }

  /**
   * Calculate match score for a single template
   * Pure function with no side effects
   */
  static calculateScore(
    template: {
      id: string;
      name: string;
      entityType: string | null;
      complexityBand: string | null;
      budgetMin: number | null;
      budgetMax: number | null;
      isDefault: boolean;
    },
    entityType: string,
    complexityBand?: string | null,
    budget?: number | null
  ): number {
    let score = 0;

    // Budget range match (30 points - highest priority)
    if (budget !== null && budget !== undefined) {
      const min = template.budgetMin ? Number(template.budgetMin) : 0;
      const max = template.budgetMax ? Number(template.budgetMax) : Number.MAX_SAFE_INTEGER;

      if (budget >= min && budget <= max) {
        score += 30;
      }
    }

    // Complexity band match (20 points)
    if (complexityBand && template.complexityBand === complexityBand) {
      score += 20;
    }

    // Entity type match (10 points - lowest priority)
    if (template.entityType === entityType) {
      score += 10;
    }

    // Default template bonus (5 points)
    if (template.isDefault) {
      score += 5;
    }

    return score;
  }

  /**
   * Find default template from list
   * Used as fallback when no matches found
   */
  static getDefaultTemplate(
    templates: Array<{
      id: string;
      name: string;
      isDefault: boolean;
    }>
  ): typeof templates[0] | null {
    return templates.find((t) => t.isDefault) || null;
  }

  /**
   * Filter templates by entity type
   * Pre-filters templates before scoring
   */
  static filterByEntityType(
    templates: Array<{
      id: string;
      name: string;
      entityType: string | null;
    }>,
    entityType: string
  ): typeof templates {
    return templates.filter(
      (t) => t.entityType === entityType || t.entityType === null // null = wildcard
    );
  }

  /**
   * Sort templates by match score
   * Used to get ranked list of candidates
   */
  static rankTemplates(
    templates: Array<{
      id: string;
      name: string;
      entityType: string | null;
      complexityBand: string | null;
      budgetMin: number | null;
      budgetMax: number | null;
      isDefault: boolean;
    }>,
    entityType: string,
    complexityBand?: string | null,
    budget?: number | null
  ): Array<{
    template: typeof templates[0];
    score: number;
  }> {
    return templates
      .map((template) => ({
        template,
        score: this.calculateScore(template, entityType, complexityBand, budget),
      }))
      .sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// WORKFLOW EXECUTOR SERVICE
// ============================================================================

export class WorkflowExecutor {
  /**
   * Execute a workflow action (Approve, Reject, Return)
   */
  static async executeAction(
    request: ActionExecutionRequest,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { instanceId, stageId, action, comment, returnToStageId } = request;

    try {
      // Get workflow instance
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          template: { include: { stages: true } },
          currentStage: { include: { responsibilities: true } },
        },
      });

      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }

      // Verify permission
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const permissionResult = await this.verifyPermission(instance as any, context);
      if (!permissionResult.isAuthorized) {
        throw new Error(`Not authorized: ${permissionResult.reason}`);
      }

      // Calculate SLA info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slaInfo = this.calculateSLACompliance(instance as any);

      // Record the action
      const stageAction = await StageActionService.recordAction({
        workflowInstanceId: instanceId,
        stageId,
        action,
        ...(comment && { comment }),
        actorId: context.actorId,
        stageAssignedDate: instance.currentStageStarted,
      });

      let nextStageId: string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let workflowStatus = instance.status as any as WorkflowInstanceStatus;

      // Process action
      if (action === 'Approved') {
        const nextStage = await WorkflowStageService.getNextStage(
          instance.workflowTemplateId,
          instance.currentStage!.stageOrder
        );

        if (nextStage) {
          // Move to next stage
          const advanced = await WorkflowInstanceService.advanceWorkflow(instanceId, stageId);
          nextStageId = advanced?.currentStageId;
          workflowStatus = advanced?.status || 'InProgress';
          // Send notification about stage advancement
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          WorkflowNotificationIntegration.notifyWorkflowAdvanced(
            instanceId,
            context.tenantId,
            nextStageId || '',
            stageId,
            context.actorId
          );
        } else {
          // Workflow complete
          await prisma.workflowInstance.update({
            where: { id: instanceId },
            data: { status: 'Approved' },
          });
          workflowStatus = 'Approved';
          // Send notification about approval
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          WorkflowNotificationIntegration.notifyWorkflowApproved(
            instanceId,
            context.tenantId,
            context.actorId
          );
        }
      } else if (action === 'Rejected') {
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { status: 'Rejected' },
        });
        workflowStatus = 'Rejected';
        // Send notification about rejection
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        WorkflowNotificationIntegration.notifyWorkflowRejected(
          instanceId,
          context.tenantId,
          context.actorId,
          comment
        );
      } else if (action === 'Returned') {
        if (!returnToStageId) {
          throw new Error('Return action requires returnToStageId');
        }

        const returnStage = await prisma.workflowStage.findUnique({
          where: { id: returnToStageId },
        });

        if (!returnStage) {
          throw new Error(`Return stage not found: ${returnToStageId}`);
        }

        // Return to specified stage
        const slaDue = new Date();
        slaDue.setHours(slaDue.getHours() + returnStage.slaHours);

        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            currentStageId: returnToStageId,
            currentStageStarted: new Date(),
            slaDue,
            status: 'Returned',
          },
        });

        nextStageId = returnToStageId;
        workflowStatus = 'Returned';
        // Send notification about return
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        WorkflowNotificationIntegration.notifyWorkflowReturned(
          instanceId,
          context.tenantId,
          context.actorId,
          returnStage.name,
          comment
        );
      }

      return {
        success: true,
        instanceId,
        actionId: stageAction.id,
        action,
        previousStageId: stageId,
        ...(nextStageId && { nextStageId }),
        workflowStatus,
        slaInfo,
        message: `Action ${action} recorded successfully`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        instanceId,
        actionId: '',
        action,
        previousStageId: stageId,
        workflowStatus: 'InProgress',
        slaInfo: {
          stageId,
          stageName: '',
          assignedAt: new Date(),
          dueAt: new Date(),
          isOverdue: false,
          hoursUsed: 0,
        },
        error: errorMessage,
        message: `Action execution failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Verify that actor has permission to execute action
   */
  static async verifyPermission(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _instance: any,
    context: ExecutionContext
  ): Promise<PermissionVerificationResult> {
    // For now, allow any authenticated user to perform actions
    // In production, this would check role-based permissions against stage responsibilities
    if (!context.actorId) {
      return {
        isAuthorized: false,
        reason: 'Actor ID required',
      };
    }

    // TODO: Integrate with RBAC system (CHUNK 2.6)
    // Check if actor has one of the required roles for this stage
    // For now, assume authorized
    return {
      isAuthorized: true,
    };
  }

  /**
   * Calculate SLA compliance information
   */
  static calculateSLACompliance(instance: WorkflowInstance & { currentStage?: WorkflowStage }): SLAComplianceInfo {
    const now = new Date();
    const assignedAt = instance.currentStageStarted;
    const dueAt = instance.slaDue;

    const msUsed = now.getTime() - assignedAt.getTime();
    const hoursUsed = msUsed / (1000 * 60 * 60);

    const msRemaining = dueAt.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    const isOverdue = msRemaining < 0;

    return {
      stageId: instance.currentStageId,
      stageName: instance.currentStage?.name || 'Unknown',
      assignedAt,
      dueAt,
      isOverdue,
      ...(hoursRemaining >= 0 && { hoursRemaining: Math.round(hoursRemaining * 10) / 10 }),
      hoursUsed: Math.round(hoursUsed * 10) / 10,
    };
  }

  /**
   * Get workflow completion result when all stages done
   */
  static async getCompletionResult(instanceId: string): Promise<WorkflowCompletionResult | null> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { stageActions: true },
    });

    if (!instance || instance.status !== 'Approved') {
      return null;
    }

    const totalApprovalTime = (instance.updatedAt.getTime() - instance.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    return {
      instanceId,
      completedAt: instance.updatedAt,
      totalStagesCompleted: instance.stageActions.length,
      totalApprovalTime: Math.round(totalApprovalTime * 100) / 100,
      requestExecuted: true, // In production, would actually execute the request
    };
  }

  /**
   * Check if workflow is overdue
   */
  static isOverdue(instance: WorkflowInstance): boolean {
    const now = new Date();
    return instance.slaDue < now && instance.status === 'InProgress';
  }

  /**
   * Get list of overdue workflows
   */
  static async getOverdueWorkflows(tenantId: string): Promise<WorkflowInstance[]> {
    const now = new Date();
    const result = (await prisma.workflowInstance.findMany({
      where: {
        template: { tenantId },
        slaDue: { lt: now },
        status: 'InProgress',
      },
      include: { template: true, currentStage: true },
    })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return result;
  }
}
