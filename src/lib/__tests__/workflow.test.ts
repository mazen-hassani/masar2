/**
 * Workflow Service Tests
 * Comprehensive tests for template management, instance creation, and action tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WorkflowTemplateService,
  WorkflowStageService,
  WorkflowInstanceService,
  StageActionService,
  WorkflowMetricsService,
  WorkflowRouter,
  WorkflowExecutor,
} from '@/lib/services/workflow-service';
import {
  CreateWorkflowTemplateRequest,
  CreateWorkflowStageRequest,
  CreateWorkflowInstanceRequest,
  CreateStageResponsibilityRequest,
  CreateStageActionRequest,
  WorkflowMatchingCriteria,
} from '@/types/workflow';

// Mock Prisma
vi.mock('@prisma/client');

const mockPrisma = {
  workflowTemplate: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  workflowStage: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  workflowInstance: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  stageAction: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  stageResponsibility: {
    create: vi.fn(),
  },
};

describe('Workflow Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkflowTemplateService', () => {
    it('should create a workflow template with valid data', async () => {
      const templateData: CreateWorkflowTemplateRequest = {
        name: 'Project Approval Workflow',
        description: 'Standard project approval',
        entityType: 'Project',
        complexityBand: 'Medium',
        budgetMin: 10000,
        budgetMax: 100000,
        isDefault: false,
      };

      const mockTemplate = {
        id: 'template-1',
        tenantId: 'tenant-1',
        ...templateData,
        matchScore: 75,
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowTemplate.create.mockResolvedValue(mockTemplate);

      const result = await WorkflowTemplateService.createTemplate('tenant-1', templateData, 'user-1');

      expect(result.name).toBe('Project Approval Workflow');
      expect(result.entityType).toBe('Project');
      expect(result.complexityBand).toBe('Medium');
      expect(result.isActive).toBe(true);
      expect(mockPrisma.workflowTemplate.create).toHaveBeenCalled();
    });

    it('should retrieve a template by ID with stages', async () => {
      const mockTemplate = {
        id: 'template-1',
        tenantId: 'tenant-1',
        name: 'Approval Workflow',
        description: null,
        entityType: 'Project',
        complexityBand: 'High',
        budgetMin: null,
        budgetMax: null,
        matchScore: 30,
        isDefault: false,
        isActive: true,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        stages: [
          {
            id: 'stage-1',
            workflowTemplateId: 'template-1',
            stageOrder: 1,
            name: 'Manager Approval',
            description: null,
            slaHours: 24,
            actions: ['Approve', 'Reject'],
            requireComment: false,
            requireAttachment: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrisma.workflowTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await WorkflowTemplateService.getTemplate('template-1');

      expect(result?.name).toBe('Approval Workflow');
      expect(result?.stages).toHaveLength(1);
      expect(result?.stages?.[0].stageOrder).toBe(1);
      expect(mockPrisma.workflowTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        include: { stages: { orderBy: { stageOrder: 'asc' } } },
      });
    });

    it('should list templates with filters', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          tenantId: 'tenant-1',
          name: 'Program Approval',
          entityType: 'Program',
          complexityBand: 'High',
          isActive: true,
          isDefault: false,
          matchScore: 85,
          description: null,
          budgetMin: null,
          budgetMax: null,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          stages: [],
        },
      ];

      mockPrisma.workflowTemplate.findMany.mockResolvedValue(mockTemplates);
      mockPrisma.workflowTemplate.count.mockResolvedValue(1);

      const result = await WorkflowTemplateService.listTemplates({
        entityType: 'Program',
        isActive: true,
      });

      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.templates[0].entityType).toBe('Program');
    });

    it('should find matching template based on criteria', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          tenantId: 'tenant-1',
          name: 'Default Workflow',
          entityType: null,
          complexityBand: null,
          budgetMin: null,
          budgetMax: null,
          matchScore: 15,
          isDefault: true,
          isActive: true,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'template-2',
          tenantId: 'tenant-1',
          name: 'Project Workflow',
          entityType: 'Project',
          complexityBand: 'Medium',
          budgetMin: 5000,
          budgetMax: 50000,
          matchScore: 75,
          isDefault: false,
          isActive: true,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.workflowTemplate.findMany.mockResolvedValue(mockTemplates);

      const criteria: WorkflowMatchingCriteria = {
        entityType: 'Project',
        complexityBand: 'Medium',
        budget: 25000,
      };

      const result = await WorkflowTemplateService.findMatchingTemplate('tenant-1', criteria);

      expect(result).not.toBeNull();
      expect(result?.template.entityType).toBe('Project');
      expect(result?.matchScore).toBe(75);
      expect(result?.matchReasons).toContain('Entity type matches: Project');
    });

    it('should return default template when no exact match found', async () => {
      const mockTemplates = [
        {
          id: 'template-default',
          tenantId: 'tenant-1',
          name: 'Default Workflow',
          entityType: null,
          complexityBand: null,
          budgetMin: null,
          budgetMax: null,
          matchScore: 15,
          isDefault: true,
          isActive: true,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.workflowTemplate.findMany.mockResolvedValue(mockTemplates);

      const criteria: WorkflowMatchingCriteria = {
        entityType: 'Initiative',
        complexityBand: 'Low',
      };

      const result = await WorkflowTemplateService.findMatchingTemplate('tenant-1', criteria);

      expect(result?.template.isDefault).toBe(true);
    });
  });

  describe('WorkflowStageService', () => {
    it('should create a workflow stage', async () => {
      const stageData: CreateWorkflowStageRequest = {
        workflowTemplateId: 'template-1',
        stageOrder: 1,
        name: 'Manager Review',
        description: 'Initial manager review',
        slaHours: 48,
        actions: ['Approve', 'Reject', 'Return'],
        requireComment: true,
        requireAttachment: false,
      };

      const mockStage = {
        id: 'stage-1',
        ...stageData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowStage.create.mockResolvedValue(mockStage);

      const result = await WorkflowStageService.createStage(stageData);

      expect(result.name).toBe('Manager Review');
      expect(result.slaHours).toBe(48);
      expect(result.requireComment).toBe(true);
      expect(mockPrisma.workflowStage.create).toHaveBeenCalled();
    });

    it('should get stages for a template in order', async () => {
      const mockStages = [
        {
          id: 'stage-1',
          workflowTemplateId: 'template-1',
          stageOrder: 1,
          name: 'Manager Review',
          description: null,
          slaHours: 48,
          actions: ['Approve', 'Reject'],
          requireComment: true,
          requireAttachment: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          responsibilities: [],
        },
        {
          id: 'stage-2',
          workflowTemplateId: 'template-1',
          stageOrder: 2,
          name: 'Director Approval',
          description: null,
          slaHours: 72,
          actions: ['Approve', 'Reject'],
          requireComment: false,
          requireAttachment: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          responsibilities: [],
        },
      ];

      mockPrisma.workflowStage.findMany.mockResolvedValue(mockStages);

      const result = await WorkflowStageService.getStagesForTemplate('template-1');

      expect(result).toHaveLength(2);
      expect(result[0].stageOrder).toBe(1);
      expect(result[1].stageOrder).toBe(2);
    });

    it('should get first stage of template', async () => {
      const mockStage = {
        id: 'stage-1',
        workflowTemplateId: 'template-1',
        stageOrder: 1,
        name: 'Initial Review',
        description: null,
        slaHours: 24,
        actions: ['Approve', 'Reject'],
        requireComment: false,
        requireAttachment: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        responsibilities: [],
      };

      mockPrisma.workflowStage.findFirst.mockResolvedValue(mockStage);

      const result = await WorkflowStageService.getFirstStage('template-1');

      expect(result?.stageOrder).toBe(1);
      expect(result?.name).toBe('Initial Review');
    });

    it('should get next stage', async () => {
      const mockStage = {
        id: 'stage-2',
        workflowTemplateId: 'template-1',
        stageOrder: 2,
        name: 'Final Approval',
        description: null,
        slaHours: 48,
        actions: ['Approve', 'Reject'],
        requireComment: false,
        requireAttachment: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowStage.findFirst.mockResolvedValue(mockStage);

      const result = await WorkflowStageService.getNextStage('template-1', 1);

      expect(result?.stageOrder).toBe(2);
      expect(result?.id).toBe('stage-2');
      expect(mockPrisma.workflowStage.findFirst).toHaveBeenCalledWith({
        where: {
          workflowTemplateId: 'template-1',
          stageOrder: { gt: 1 },
        },
        orderBy: { stageOrder: 'asc' },
      });
    });

    it('should add responsibility to stage', async () => {
      const responsibilityData: CreateStageResponsibilityRequest = {
        stageId: 'stage-1',
        type: 'Role',
        value: 'Project Manager',
        scope: 'Project',
        notificationMethod: 'Both',
      };

      const mockResponsibility = {
        id: 'resp-1',
        ...responsibilityData,
        createdAt: new Date(),
      };

      mockPrisma.stageResponsibility.create.mockResolvedValue(mockResponsibility);

      const result = await WorkflowStageService.addResponsibility(responsibilityData);

      expect(result.type).toBe('Role');
      expect(result.value).toBe('Project Manager');
      expect(result.notificationMethod).toBe('Both');
    });
  });

  describe('WorkflowInstanceService', () => {
    it('should create a workflow instance', async () => {
      const instanceData: CreateWorkflowInstanceRequest = {
        workflowTemplateId: 'template-1',
        entityType: 'Project',
        entityId: 'project-1',
        projectId: 'project-1',
        requestType: 'Create',
        requestData: { name: 'New Project', budget: 50000 },
      };

      const mockTemplate = {
        id: 'template-1',
        tenantId: 'tenant-1',
        name: 'Project Workflow',
        entityType: 'Project',
        complexityBand: 'Medium',
        budgetMin: null,
        budgetMax: null,
        matchScore: 75,
        isDefault: false,
        isActive: true,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFirstStage = {
        id: 'stage-1',
        workflowTemplateId: 'template-1',
        stageOrder: 1,
        name: 'Initial Review',
        description: null,
        slaHours: 24,
        actions: ['Approve', 'Reject'],
        requireComment: false,
        requireAttachment: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInstance = {
        id: 'instance-1',
        ...instanceData,
        currentStageId: 'stage-1',
        currentStageStarted: new Date(),
        slaDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'InProgress',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowTemplate.findUnique.mockResolvedValue(mockTemplate);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(WorkflowStageService, 'getFirstStage').mockResolvedValue(mockFirstStage as any);
      mockPrisma.workflowInstance.create.mockResolvedValue(mockInstance);

      const result = await WorkflowInstanceService.createInstance('tenant-1', instanceData, 'user-1');

      expect(result.status).toBe('InProgress');
      expect(result.currentStageId).toBe('stage-1');
      expect(result.entityType).toBe('Project');
      expect(mockPrisma.workflowInstance.create).toHaveBeenCalled();
    });

    it('should throw error if template not found', async () => {
      const instanceData: CreateWorkflowInstanceRequest = {
        workflowTemplateId: 'nonexistent',
        entityType: 'Project',
        entityId: 'project-1',
        projectId: 'project-1',
        requestType: 'Create',
        requestData: {},
      };

      mockPrisma.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(
        WorkflowInstanceService.createInstance('tenant-1', instanceData, 'user-1')
      ).rejects.toThrow('Template not found');
    });

    it('should throw error if template does not belong to tenant', async () => {
      const instanceData: CreateWorkflowInstanceRequest = {
        workflowTemplateId: 'template-1',
        entityType: 'Project',
        entityId: 'project-1',
        projectId: 'project-1',
        requestType: 'Create',
        requestData: {},
      };

      const mockTemplate = {
        id: 'template-1',
        tenantId: 'other-tenant',
        name: 'Project Workflow',
        entityType: 'Project',
        complexityBand: 'Medium',
        budgetMin: null,
        budgetMax: null,
        matchScore: 75,
        isDefault: false,
        isActive: true,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowTemplate.findUnique.mockResolvedValue(mockTemplate);

      await expect(
        WorkflowInstanceService.createInstance('tenant-1', instanceData, 'user-1')
      ).rejects.toThrow('Template does not belong to tenant');
    });

    it('should get workflow instance with details', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowTemplateId: 'template-1',
        entityType: 'Project',
        entityId: 'project-1',
        projectId: 'project-1',
        requestType: 'Create',
        requestData: {},
        currentStageId: 'stage-1',
        currentStageStarted: new Date(),
        slaDue: new Date(),
        status: 'InProgress',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-1',
          tenantId: 'tenant-1',
          name: 'Project Workflow',
          entityType: 'Project',
          complexityBand: 'Medium',
          budgetMin: null,
          budgetMax: null,
          matchScore: 75,
          isDefault: false,
          isActive: true,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          stages: [],
        },
        currentStage: {
          id: 'stage-1',
          workflowTemplateId: 'template-1',
          stageOrder: 1,
          name: 'Review',
          description: null,
          slaHours: 24,
          actions: ['Approve'],
          requireComment: false,
          requireAttachment: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          responsibilities: [],
        },
        stageActions: [],
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);

      const result = await WorkflowInstanceService.getInstance('instance-1');

      expect(result?.id).toBe('instance-1');
      expect(result?.status).toBe('InProgress');
      expect(result?.template).toBeDefined();
      expect(result?.currentStage).toBeDefined();
    });

    it('should list workflow instances with filters', async () => {
      const mockInstances = [
        {
          id: 'instance-1',
          workflowTemplateId: 'template-1',
          entityType: 'Project',
          entityId: 'project-1',
          projectId: 'project-1',
          requestType: 'Create',
          requestData: {},
          currentStageId: 'stage-1',
          currentStageStarted: new Date(),
          slaDue: new Date(),
          status: 'InProgress',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          template: { name: 'Project Workflow' },
          currentStage: { name: 'Review' },
          stageActions: [],
        },
      ];

      mockPrisma.workflowInstance.findMany.mockResolvedValue(mockInstances);
      mockPrisma.workflowInstance.count.mockResolvedValue(1);

      const result = await WorkflowInstanceService.listInstances({
        entityType: 'Project',
        status: 'InProgress',
      });

      expect(result.instances).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.instances[0].status).toBe('InProgress');
    });

    it('should advance workflow to next stage', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowTemplateId: 'template-1',
        entityType: 'Project',
        entityId: 'project-1',
        projectId: null,
        requestType: 'Create',
        requestData: {},
        currentStageId: 'stage-1',
        currentStageStarted: new Date(),
        slaDue: new Date(),
        status: 'InProgress',
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCurrentStage = {
        id: 'stage-1',
        workflowTemplateId: 'template-1',
        stageOrder: 1,
        name: 'Review',
        description: null,
        slaHours: 24,
        actions: ['Approve'],
        requireComment: false,
        requireAttachment: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockNextStage = {
        id: 'stage-2',
        workflowTemplateId: 'template-1',
        stageOrder: 2,
        name: 'Approval',
        description: null,
        slaHours: 48,
        actions: ['Approve', 'Reject'],
        requireComment: false,
        requireAttachment: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockInstance,
        currentStageId: 'stage-2',
        currentStageStarted: new Date(),
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflowStage.findUnique.mockResolvedValue(mockCurrentStage);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(WorkflowStageService, 'getNextStage').mockResolvedValue(mockNextStage as any);
      mockPrisma.workflowInstance.update.mockResolvedValue(mockUpdated);

      const result = await WorkflowInstanceService.advanceWorkflow('instance-1', 'stage-1');

      expect(result?.currentStageId).toBe('stage-2');
      expect(mockPrisma.workflowInstance.update).toHaveBeenCalled();
    });

    it('should complete workflow when no more stages', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowTemplateId: 'template-1',
        entityType: 'Project',
        entityId: 'project-1',
        projectId: null,
        requestType: 'Create',
        requestData: {},
        currentStageId: 'stage-2',
        currentStageStarted: new Date(),
        slaDue: new Date(),
        status: 'InProgress',
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStage = {
        id: 'stage-2',
        workflowTemplateId: 'template-1',
        stageOrder: 2,
        name: 'Final Approval',
        description: null,
        slaHours: 48,
        actions: ['Approve'],
        requireComment: false,
        requireAttachment: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrisma.workflowStage.findUnique.mockResolvedValue(mockStage);
      vi.spyOn(WorkflowStageService, 'getNextStage').mockResolvedValue(null);
      mockPrisma.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: 'Approved',
      });

      const result = await WorkflowInstanceService.advanceWorkflow('instance-1', 'stage-2');

      expect(result?.status).toBe('Approved');
    });
  });

  describe('StageActionService', () => {
    it('should record a stage action', async () => {
      const actionData: CreateStageActionRequest = {
        workflowInstanceId: 'instance-1',
        stageId: 'stage-1',
        action: 'Approved',
        comment: 'Looks good to me',
        actorId: 'user-1',
        stageAssignedDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      };

      const mockAction = {
        id: 'action-1',
        ...actionData,
        hoursToAction: 12,
        wasOverdue: false,
        actionDate: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.stageAction.create.mockResolvedValue(mockAction);

      const result = await StageActionService.recordAction(actionData);

      expect(result.action).toBe('Approved');
      expect(result.comment).toBe('Looks good to me');
      expect(result.actorId).toBe('user-1');
      expect(mockPrisma.stageAction.create).toHaveBeenCalled();
    });

    it('should calculate hours to action and overdue status', async () => {
      // Assigned 30 hours ago (exceeds 24 hour threshold)
      const assignedDate = new Date(Date.now() - 30 * 60 * 60 * 1000);

      const actionData: CreateStageActionRequest = {
        workflowInstanceId: 'instance-1',
        stageId: 'stage-1',
        action: 'Rejected',
        actorId: 'user-2',
        stageAssignedDate: assignedDate,
      };

      const mockAction = {
        id: 'action-1',
        ...actionData,
        hoursToAction: 30,
        wasOverdue: true,
        actionDate: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.stageAction.create.mockResolvedValue(mockAction);

      const result = await StageActionService.recordAction(actionData);

      expect(result.wasOverdue).toBe(true);
      expect(mockPrisma.stageAction.create).toHaveBeenCalled();
    });

    it('should get actions for workflow instance', async () => {
      const mockActions = [
        {
          id: 'action-2',
          workflowInstanceId: 'instance-1',
          stageId: 'stage-2',
          action: 'Approved',
          comment: 'Approved by director',
          actorId: 'user-2',
          stageAssignedDate: new Date(),
          hoursToAction: 20,
          wasOverdue: false,
          actionDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          id: 'action-1',
          workflowInstanceId: 'instance-1',
          stageId: 'stage-1',
          action: 'Approved',
          comment: 'Approved by manager',
          actorId: 'user-1',
          stageAssignedDate: new Date(),
          hoursToAction: 8,
          wasOverdue: false,
          actionDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ];

      mockPrisma.stageAction.findMany.mockResolvedValue(mockActions);

      const result = await StageActionService.getActionsForInstance('instance-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('action-2');
      expect(mockPrisma.stageAction.findMany).toHaveBeenCalledWith({
        where: { workflowInstanceId: 'instance-1' },
        orderBy: { actionDate: 'desc' },
      });
    });

    it('should get actions for specific stage', async () => {
      const mockActions = [
        {
          id: 'action-1',
          workflowInstanceId: 'instance-1',
          stageId: 'stage-1',
          action: 'Approved',
          comment: 'Looks good',
          actorId: 'user-1',
          stageAssignedDate: new Date(),
          hoursToAction: 10,
          wasOverdue: false,
          actionDate: new Date(),
          createdAt: new Date(),
        },
      ];

      mockPrisma.stageAction.findMany.mockResolvedValue(mockActions);

      const result = await StageActionService.getActionsForStage('instance-1', 'stage-1');

      expect(result).toHaveLength(1);
      expect(result[0].stageId).toBe('stage-1');
      expect(mockPrisma.stageAction.findMany).toHaveBeenCalledWith({
        where: {
          workflowInstanceId: 'instance-1',
          stageId: 'stage-1',
        },
        orderBy: { actionDate: 'desc' },
      });
    });
  });

  describe('WorkflowMetricsService', () => {
    it('should calculate workflow metrics', async () => {
      const now = new Date();
      const mockInstances = [
        {
          id: 'instance-1',
          workflowTemplateId: 'template-1',
          entityType: 'Project',
          entityId: 'project-1',
          projectId: null,
          requestType: 'Create',
          requestData: {},
          currentStageId: 'stage-1',
          currentStageStarted: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          slaDue: new Date(),
          status: 'Approved',
          createdBy: null,
          createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
          updatedAt: now,
          stageActions: [
            {
              id: 'action-1',
              workflowInstanceId: 'instance-1',
              stageId: 'stage-1',
              action: 'Approved',
              comment: null,
              actorId: 'user-1',
              stageAssignedDate: new Date(),
              hoursToAction: 24,
              wasOverdue: false,
              actionDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              createdAt: new Date(),
            },
          ],
        },
        {
          id: 'instance-2',
          workflowTemplateId: 'template-1',
          entityType: 'Project',
          entityId: 'project-2',
          projectId: null,
          requestType: 'Update',
          requestData: {},
          currentStageId: 'stage-1',
          currentStageStarted: new Date(),
          slaDue: new Date(),
          status: 'Rejected',
          createdBy: null,
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          updatedAt: now,
          stageActions: [],
        },
      ];

      mockPrisma.workflowInstance.findMany.mockResolvedValue(mockInstances);

      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const endDate = now;

      const result = await WorkflowMetricsService.calculateMetrics('template-1', startDate, endDate);

      expect(result.templateId).toBe('template-1');
      expect(result.totalExecuted).toBe(2);
      expect(result.totalApproved).toBe(1);
      expect(result.totalRejected).toBe(1);
      expect(result.approvalRate).toBeCloseTo(50, 1);
      expect(result.rejectionRate).toBeCloseTo(50, 1);
    });
  });

  describe('WorkflowRouter', () => {
    const mockTemplates = [
      {
        id: 'template-1',
        name: 'Project Workflow',
        entityType: 'Project',
        complexityBand: 'Medium',
        budgetMin: 10000,
        budgetMax: 100000,
        isDefault: false,
      },
      {
        id: 'template-2',
        name: 'Program Workflow',
        entityType: 'Program',
        complexityBand: 'High',
        budgetMin: 100000,
        budgetMax: 1000000,
        isDefault: false,
      },
      {
        id: 'template-default',
        name: 'Default Workflow',
        entityType: null,
        complexityBand: null,
        budgetMin: null,
        budgetMax: null,
        isDefault: true,
      },
    ];

    it('should route to template with highest score', () => {
      const result = WorkflowRouter.routeWorkflow(
        mockTemplates,
        'Project',
        'Medium',
        50000
      );

      expect(result).not.toBeNull();
      expect(result?.template.id).toBe('template-1');
      expect(result?.matchScore).toBeGreaterThan(0);
      expect(result?.matchReasons.length).toBeGreaterThan(0);
    });

    it('should prioritize budget matching (30 points)', () => {
      const result = WorkflowRouter.routeWorkflow(
        mockTemplates,
        'Project',
        undefined,
        50000
      );

      expect(result?.matchScore).toBeGreaterThanOrEqual(30);
      expect(result?.matchReasons).toContain('Budget in range: 10000-100000');
    });

    it('should prioritize complexity matching (20 points)', () => {
      const result = WorkflowRouter.routeWorkflow(
        mockTemplates,
        'Project',
        'Medium',
        undefined
      );

      expect(result?.matchReasons).toContain('Complexity matches: Medium');
    });

    it('should match on entity type (10 points)', () => {
      const result = WorkflowRouter.routeWorkflow(
        mockTemplates,
        'Project',
        undefined,
        undefined
      );

      expect(result?.matchReasons).toContain('Entity type matches: Project');
    });

    it('should fallback to default template when no exact match', () => {
      const result = WorkflowRouter.routeWorkflow(
        mockTemplates,
        'Initiative', // No initiative-specific template
        undefined,
        undefined
      );

      expect(result?.template.isDefault).toBe(true);
      expect(result?.template.id).toBe('template-default');
    });

    it('should return null for empty template list', () => {
      const result = WorkflowRouter.routeWorkflow([], 'Project');

      expect(result).toBeNull();
    });

    it('should calculate score correctly for single template', () => {
      const template = mockTemplates[0];
      const score = WorkflowRouter.calculateScore(template, 'Project', 'Medium', 50000);

      expect(score).toBeGreaterThanOrEqual(60); // Budget (30) + Complexity (20) + Type (10)
    });

    it('should find default template from list', () => {
      const defaultTemplate = WorkflowRouter.getDefaultTemplate(mockTemplates);

      expect(defaultTemplate).not.toBeNull();
      expect(defaultTemplate?.isDefault).toBe(true);
      expect(defaultTemplate?.id).toBe('template-default');
    });

    it('should return null when no default template', () => {
      const noDefaultTemplates = mockTemplates.filter((t) => !t.isDefault);
      const defaultTemplate = WorkflowRouter.getDefaultTemplate(noDefaultTemplates);

      expect(defaultTemplate).toBeNull();
    });

    it('should filter templates by entity type', () => {
      const filtered = WorkflowRouter.filterByEntityType(mockTemplates, 'Project');

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((t) => t.entityType === 'Project' || t.entityType === null)).toBe(true);
      expect(filtered.some((t) => t.entityType === 'Program')).toBe(false);
    });

    it('should include wildcard templates in filter (null entityType)', () => {
      const filtered = WorkflowRouter.filterByEntityType(mockTemplates, 'Initiative');

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((t) => t.isDefault)).toBe(true); // Default has null entityType
    });

    it('should rank templates by score', () => {
      const ranked = WorkflowRouter.rankTemplates(
        mockTemplates,
        'Project',
        'Medium',
        50000
      );

      expect(ranked.length).toBe(mockTemplates.length);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
      expect(ranked[0].template.id).toBe('template-1');
    });

    it('should handle score calculation with no budget', () => {
      const score = WorkflowRouter.calculateScore(mockTemplates[0], 'Project', 'Medium');

      expect(score).toBe(30); // Complexity (20) + Type (10), no budget
    });

    it('should handle score calculation with no complexity', () => {
      const score = WorkflowRouter.calculateScore(mockTemplates[0], 'Project', undefined, 50000);

      expect(score).toBe(40); // Budget (30) + Type (10), no complexity
    });

    it('should handle budget boundary conditions', () => {
      const template = mockTemplates[0]; // budgetMin: 10000, budgetMax: 100000

      // Exactly at min
      let score = WorkflowRouter.calculateScore(template, 'Project', undefined, 10000);
      expect(score).toBe(30);

      // Exactly at max
      score = WorkflowRouter.calculateScore(template, 'Project', undefined, 100000);
      expect(score).toBe(30);

      // Below min
      score = WorkflowRouter.calculateScore(template, 'Project', undefined, 9999);
      expect(score).toBe(0);

      // Above max
      score = WorkflowRouter.calculateScore(template, 'Project', undefined, 100001);
      expect(score).toBe(0);
    });

    it('should prefer default template on score tie', () => {
      const templatesWithTie = [
        {
          id: 'template-a',
          name: 'Template A',
          entityType: 'Project',
          complexityBand: null,
          budgetMin: null,
          budgetMax: null,
          isDefault: false,
        },
        {
          id: 'template-default',
          name: 'Default',
          entityType: 'Project',
          complexityBand: null,
          budgetMin: null,
          budgetMax: null,
          isDefault: true,
        },
      ];

      const result = WorkflowRouter.routeWorkflow(templatesWithTie, 'Project');

      // Both score 10 for entity type match, but default should be chosen
      expect(result?.template.isDefault).toBe(true);
    });

    it('should handle null budget fields in template', () => {
      const templateWithNullBudget = {
        id: 'template-1',
        name: 'Template',
        entityType: 'Project',
        complexityBand: null,
        budgetMin: null,
        budgetMax: null,
        isDefault: false,
      };

      const score = WorkflowRouter.calculateScore(templateWithNullBudget, 'Project', undefined, 50000);

      expect(score).toBe(10); // Only entity type match, budget check fails with null
    });
  });

  // ============================================================================
  // WORKFLOW EXECUTOR TESTS
  // ============================================================================

  describe('WorkflowExecutor', () => {
    describe('calculateSLACompliance', () => {
      it('should calculate SLA compliance for active stage', () => {
        const now = new Date();
        const assignedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
        const dueAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

        const instance = {
          id: 'instance-1',
          currentStageId: 'stage-1',
          currentStageStarted: assignedAt,
          slaDue: dueAt,
          currentStage: {
            id: 'stage-1',
            name: 'Approval',
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compliance = WorkflowExecutor.calculateSLACompliance(instance as any);

        expect(compliance.stageId).toBe('stage-1');
        expect(compliance.stageName).toBe('Approval');
        expect(compliance.isOverdue).toBe(false);
        expect(compliance.hoursUsed).toBe(2);
        expect(compliance.hoursRemaining).toBe(4);
      });

      it('should detect overdue SLA', () => {
        const now = new Date();
        const assignedAt = new Date(now.getTime() - 10 * 60 * 60 * 1000); // 10 hours ago
        const dueAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago (past due)

        const instance = {
          id: 'instance-1',
          currentStageId: 'stage-1',
          currentStageStarted: assignedAt,
          slaDue: dueAt,
          currentStage: {
            id: 'stage-1',
            name: 'Review',
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compliance = WorkflowExecutor.calculateSLACompliance(instance as any);

        expect(compliance.isOverdue).toBe(true);
        expect(compliance.hoursUsed).toBe(10);
        expect(compliance.hoursRemaining).toBeUndefined();
      });

      it('should handle missing current stage gracefully', () => {
        const now = new Date();
        const assignedAt = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        const dueAt = new Date(now.getTime() + 5 * 60 * 60 * 1000);

        const instance = {
          id: 'instance-1',
          currentStageId: 'stage-1',
          currentStageStarted: assignedAt,
          slaDue: dueAt,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compliance = WorkflowExecutor.calculateSLACompliance(instance as any);

        expect(compliance.stageName).toBe('Unknown');
        expect(compliance.isOverdue).toBe(false);
      });
    });

    describe('isOverdue', () => {
      it('should identify overdue workflow', () => {
        const now = new Date();
        const overdueDate = new Date(now.getTime() - 1000); // 1 second in past

        const instance = {
          id: 'instance-1',
          slaDue: overdueDate,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(WorkflowExecutor.isOverdue(instance as any)).toBe(true);
      });

      it('should identify on-time workflow', () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 1000); // 1 second in future

        const instance = {
          id: 'instance-1',
          slaDue: futureDate,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(WorkflowExecutor.isOverdue(instance as any)).toBe(false);
      });
    });

    describe('verifyPermission', () => {
      it('should allow authenticated user', async () => {
        const context = {
          actorId: 'user-123',
          tenantId: 'tenant-1',
          timestamp: new Date(),
        };

        const result = await WorkflowExecutor.verifyPermission({}, context);

        expect(result.isAuthorized).toBe(true);
      });

      it('should reject missing actor ID', async () => {
        const context = {
          actorId: '',
          tenantId: 'tenant-1',
          timestamp: new Date(),
        };

        const result = await WorkflowExecutor.verifyPermission({}, context);

        expect(result.isAuthorized).toBe(false);
        expect(result.reason).toBe('Actor ID required');
      });

      it('should reject null actor ID', async () => {
        const context = {
          actorId: null,
          tenantId: 'tenant-1',
          timestamp: new Date(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await WorkflowExecutor.verifyPermission({}, context as any);

        expect(result.isAuthorized).toBe(false);
        expect(result.reason).toBe('Actor ID required');
      });
    });

    describe('getCompletionResult', () => {
      it('should return null for non-existent instance', async () => {
        const result = await WorkflowExecutor.getCompletionResult('non-existent-id');
        expect(result).toBeNull();
      });

      it('should return null for non-approved workflow', async () => {
        // Create instance with InProgress status
        const template = await WorkflowTemplateService.createTemplate(
          'tenant-1',
          {
            name: 'Test Template',
            entityType: 'Project',
          },
          'admin-1'
        );

        const instance = await WorkflowInstanceService.createInstance('tenant-1', {
          workflowTemplateId: template.id,
          entityType: 'Project',
          entityId: 'project-1',
          requestType: 'Create',
          requestData: { name: 'Test Project' },
        });

        const result = await WorkflowExecutor.getCompletionResult(instance.id);
        expect(result).toBeNull();
      });
    });

    describe('SLA time calculations', () => {
      it('should correctly calculate hours used and remaining', () => {
        const now = new Date();
        const assignedAt = new Date(now.getTime() - 3.5 * 60 * 60 * 1000); // 3.5 hours ago
        const dueAt = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours from now

        const instance = {
          id: 'instance-1',
          currentStageId: 'stage-1',
          currentStageStarted: assignedAt,
          slaDue: dueAt,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compliance = WorkflowExecutor.calculateSLACompliance(instance as any);

        expect(compliance.hoursUsed).toBe(3.5);
        expect(compliance.hoursRemaining).toBe(2.5);
      });

      it('should round hours to one decimal place', () => {
        const now = new Date();
        const assignedAt = new Date(now.getTime() - 3.75 * 60 * 60 * 1000);
        const dueAt = new Date(now.getTime() + 2.33 * 60 * 60 * 1000);

        const instance = {
          id: 'instance-1',
          currentStageId: 'stage-1',
          currentStageStarted: assignedAt,
          slaDue: dueAt,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compliance = WorkflowExecutor.calculateSLACompliance(instance as any);

        // 3.75 hours should round to 3.8
        expect(compliance.hoursUsed).toBe(3.8);
        // 2.33 hours should round to 2.3
        expect(compliance.hoursRemaining).toBe(2.3);
      });
    });

    describe('workflow status tracking', () => {
      it('should identify workflow status correctly', async () => {
        const template = await WorkflowTemplateService.createTemplate(
          'tenant-1',
          {
            name: 'Status Test Template',
            entityType: 'Project',
          },
          'admin-1'
        );

        const instance = await WorkflowInstanceService.createInstance('tenant-1', {
          workflowTemplateId: template.id,
          entityType: 'Project',
          entityId: 'project-status-test',
          requestType: 'Update',
          requestData: { status: 'active' },
        });

        expect(instance.status).toBe('InProgress');

        // Update to different status
        const updated = await WorkflowInstanceService.updateInstance(instance.id, {
          status: 'Approved',
        });

        expect(updated.status).toBe('Approved');
      });
    });
  });
});
