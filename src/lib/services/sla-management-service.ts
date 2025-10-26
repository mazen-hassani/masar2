/**
 * SLA Management Service
 * Tracks SLA compliance, calculates time metrics, and detects warnings/breaches
 */

import { PrismaClient } from '@prisma/client';
import {
  SLAComplianceInfo,
  SLAStatus,
  SLAHistoryRecord,
  QuerySLAMetricsRequest,
  SLAMetricsResponse,
} from '@/types/escalation';

const prisma = new PrismaClient();

// ============================================================================
// SLA MANAGEMENT SERVICE
// ============================================================================

export class SLAManagementService {
  /**
   * Calculate SLA compliance for a workflow instance
   */
  static calculateSLACompliance(instance: {
    id: string;
    currentStageId: string;
    currentStageStarted: Date;
    slaDue: Date;
    currentStage?: {
      id: string;
      name: string;
      slaHours?: number;
    };
  }): SLAComplianceInfo {
    const now = new Date();
    const stageName = instance.currentStage?.name || 'Unknown';
    const totalSLAHours = instance.currentStage?.slaHours || 24; // default 24 hours

    // Calculate time in stage
    const timeInStageMs = now.getTime() - instance.currentStageStarted.getTime();
    const hoursUsed = Math.round((timeInStageMs / (1000 * 60 * 60)) * 10) / 10; // 1 decimal place

    // Calculate time remaining
    const timeRemainingMs = instance.slaDue.getTime() - now.getTime();
    const hoursRemaining = Math.round((timeRemainingMs / (1000 * 60 * 60)) * 10) / 10;

    // Calculate percentage used
    const percentageUsed = Math.round((hoursUsed / totalSLAHours) * 100);

    // Determine status
    let status: SLAStatus = 'Compliant';
    let isOverdue = false;
    let isWarning = false;
    let hoursBreach: number | undefined;

    const warningThresholdPercent = 75; // Default warning at 75% of SLA used

    if (timeRemainingMs < 0) {
      // SLA breached
      status = 'Breached';
      isOverdue = true;
      hoursBreach = Math.abs(hoursRemaining);
    } else if (percentageUsed >= warningThresholdPercent) {
      // Warning level
      status = 'Warning';
      isWarning = true;
    }

    return {
      workflowInstanceId: instance.id,
      stageId: instance.currentStageId,
      stageName,
      stageStartedAt: instance.currentStageStarted,
      slaDueAt: instance.slaDue,
      currentStatus: status,
      totalSLAHours,
      hoursUsed,
      hoursRemaining: isOverdue ? undefined : hoursRemaining,
      percentageUsed,
      isOverdue,
      isWarning,
      warningThresholdPercent,
      hoursBreach,
    };
  }

  /**
   * Get SLA compliance for specific workflow instance
   */
  static async getSLACompliance(workflowInstanceId: string): Promise<SLAComplianceInfo | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          currentStage: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (!instance) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.calculateSLACompliance(instance as any);
    } catch (error) {
      console.error(`Failed to get SLA compliance for instance ${workflowInstanceId}: ${error}`);
      return null;
    }
  }

  /**
   * Batch check SLA compliance for multiple instances
   */
  static async getSLAComplianceBatch(
    workflowInstanceIds: string[]
  ): Promise<Map<string, SLAComplianceInfo>> {
    const results = new Map<string, SLAComplianceInfo>();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (await prisma.workflowInstance.findMany({
        where: {
          id: {
            in: workflowInstanceIds,
          },
        },
        include: {
          currentStage: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];

      for (const instance of instances) {
        const compliance = this.calculateSLACompliance(instance);
        results.set(instance.id, compliance);
      }
    } catch (error) {
      console.error(`Failed to get batch SLA compliance: ${error}`);
    }

    return results;
  }

  /**
   * Check all workflows for SLA warnings
   */
  static async checkSLAWarnings(
    tenantId: string
  ): Promise<{ warnings: SLAComplianceInfo[]; breaches: SLAComplianceInfo[] }> {
    const warnings: SLAComplianceInfo[] = [];
    const breaches: SLAComplianceInfo[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (await prisma.workflowInstance.findMany({
        where: {
          tenantId,
          status: { in: ['InProgress', 'Returned'] },
        },
        include: {
          currentStage: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];

      for (const instance of instances) {
        const compliance = this.calculateSLACompliance(instance);

        if (compliance.currentStatus === 'Breached') {
          breaches.push(compliance);
        } else if (compliance.currentStatus === 'Warning') {
          warnings.push(compliance);
        }
      }
    } catch (error) {
      console.error(`Failed to check SLA warnings for tenant ${tenantId}: ${error}`);
    }

    return { warnings, breaches };
  }

  /**
   * Record SLA history snapshot
   */
  static async recordSLAHistory(workflowInstanceId: string): Promise<SLAHistoryRecord | null> {
    try {
      const compliance = await this.getSLACompliance(workflowInstanceId);

      if (!compliance) {
        return null;
      }

      // Create history record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const historyRecord = {
        id: `sla-${workflowInstanceId}-${Date.now()}`,
        workflowInstanceId,
        stageId: compliance.stageId,
        stageName: compliance.stageName,
        startTime: compliance.stageStartedAt,
        endTime: new Date(),
        slaDueTime: compliance.slaDueAt,
        totalHours: compliance.totalSLAHours,
        hoursUsed: compliance.hoursUsed,
        status: compliance.currentStatus,
        isBreached: compliance.isOverdue,
        hoursBreach: compliance.hoursBreach,
        recordedAt: new Date(),
      };

      // In production, this would be persisted to database
      // For now, we return the record
      return historyRecord as unknown as SLAHistoryRecord;
    } catch (error) {
      console.error(`Failed to record SLA history for ${workflowInstanceId}: ${error}`);
      return null;
    }
  }

  /**
   * Query SLA metrics with filters
   */
  static async querySLAMetrics(query: QuerySLAMetricsRequest): Promise<SLAMetricsResponse> {
    try {
      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        tenantId: query.tenantId,
        status: { in: ['InProgress', 'Returned', 'Approved', 'Rejected'] },
      };

      if (query.workflowTemplateId) {
        where.workflowTemplateId = query.workflowTemplateId;
      }

      if (query.startDate || query.endDate) {
        where.currentStageStarted = {};
        if (query.startDate) {
          where.currentStageStarted.gte = query.startDate;
        }
        if (query.endDate) {
          where.currentStageStarted.lte = query.endDate;
        }
      }

      // Get instances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = (await prisma.workflowInstance.findMany({
        where,
        include: {
          currentStage: true,
        },
        orderBy: { currentStageStarted: 'desc' },
        skip: query.skip || 0,
        take: query.take || 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];

      // Calculate compliance for each
      const records: SLAHistoryRecord[] = [];
      let compliantCount = 0;
      let warningCount = 0;
      let breachedCount = 0;
      let totalTimeInStage = 0;

      for (const instance of instances) {
        const compliance = this.calculateSLACompliance(instance);

        if (query.status && compliance.currentStatus !== query.status) {
          continue; // Skip if doesn't match filter
        }

        // Add to records
        records.push({
          id: instance.id,
          workflowInstanceId: instance.id,
          stageId: compliance.stageId,
          stageName: compliance.stageName,
          startTime: compliance.stageStartedAt,
          endTime: new Date(),
          slaDueTime: compliance.slaDueAt,
          totalHours: compliance.totalSLAHours,
          hoursUsed: compliance.hoursUsed,
          status: compliance.currentStatus,
          isBreached: compliance.isOverdue,
          hoursBreach: compliance.hoursBreach,
          recordedAt: new Date(),
        });

        // Update counters
        if (compliance.currentStatus === 'Compliant') {
          compliantCount++;
        } else if (compliance.currentStatus === 'Warning') {
          warningCount++;
        } else if (compliance.currentStatus === 'Breached') {
          breachedCount++;
        }

        totalTimeInStage += compliance.hoursUsed;
      }

      const totalRecords = records.length;
      const complianceRate =
        totalRecords > 0 ? Math.round((compliantCount / totalRecords) * 100) : 0;
      const averageTimeInStage = totalRecords > 0 ? totalTimeInStage / totalRecords : 0;

      return {
        totalRecords,
        compliantCount,
        warningCount,
        breachedCount,
        complianceRate,
        averageTimeInStage: Math.round(averageTimeInStage * 10) / 10,
        records,
      };
    } catch (error) {
      console.error(`Failed to query SLA metrics: ${error}`);
      return {
        totalRecords: 0,
        compliantCount: 0,
        warningCount: 0,
        breachedCount: 0,
        complianceRate: 0,
        averageTimeInStage: 0,
        records: [],
      };
    }
  }

  /**
   * Get SLA report for template
   */
  static async getTemplateReport(
    workflowTemplateId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SLAMetricsResponse> {
    return this.querySLAMetrics({
      workflowTemplateId,
      startDate,
      endDate,
      take: 1000,
    });
  }

  /**
   * Get tenant-wide SLA report
   */
  static async getTenantReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SLAMetricsResponse> {
    return this.querySLAMetrics({
      tenantId,
      startDate,
      endDate,
      take: 1000,
    });
  }

  /**
   * Reset SLA timer (advance stage without escalation)
   */
  static async resetSLATimer(
    workflowInstanceId: string,
    newSLADueDate: Date
  ): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.workflowInstance.update({
        where: { id: workflowInstanceId },
        data: {
          slaDue: newSLADueDate,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      return true;
    } catch (error) {
      console.error(`Failed to reset SLA timer for ${workflowInstanceId}: ${error}`);
      return false;
    }
  }
}
