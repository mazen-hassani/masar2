/**
 * Risk and Benefit Service
 * Risk management and benefits realization tracking
 */

import { PrismaClient } from '@prisma/client';
import {
  Risk,
  Benefit,
  KPI,
  KPIMeasurement,
  RiskStatistics,
  BenefitStatistics,
  KPIProgress,
  RiskHeatMap,
  BenefitWithKPIs,
} from '@/types/risk-benefit';
import type {
  CreateRiskRequest,
  UpdateRiskRequest,
  CreateBenefitRequest,
  UpdateBenefitRequest,
  CreateKPIRequest,
  UpdateKPIRequest,
  CreateKPIMeasurementRequest,
  ListRisksFilter,
  ListBenefitsFilter,
  ListKPIsFilter,
} from '@/lib/validation/risk-benefit-schema';

const prisma = new PrismaClient();

export class RiskService {
  /**
   * Get a single risk
   */
  static async getRisk(riskId: string): Promise<Risk | null> {
    const risk = await prisma.risk.findUnique({
      where: { id: riskId },
    });

    if (!risk) return null;

    return {
      ...risk,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: risk.category as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      probability: risk.probability as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      impact: risk.impact as any,
      riskScore: risk.riskScore as number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * List risks with filtering
   */
  static async listRisks(
    filter?: Partial<ListRisksFilter>
  ): Promise<{ risks: Risk[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null,
    };

    if (filter?.programId) where.programId = filter.programId;
    if (filter?.projectId) where.projectId = filter.projectId;

    if (filter?.category) {
      if (Array.isArray(filter.category)) {
        where.category = { in: filter.category };
      } else {
        where.category = filter.category;
      }
    }

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status };
      } else {
        where.status = filter.status;
      }
    }

    if (filter?.minRiskScore !== undefined) {
      where.riskScore = { gte: filter.minRiskScore };
    }

    if (filter?.maxRiskScore !== undefined) {
      if (where.riskScore) {
        where.riskScore.lte = filter.maxRiskScore;
      } else {
        where.riskScore = { lte: filter.maxRiskScore };
      }
    }

    const [risks, total] = await Promise.all([
      prisma.risk.findMany({
        where,
        orderBy: {
          [filter?.sortBy || 'riskScore']: filter?.sortOrder || 'desc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.risk.count({ where }),
    ]);

    return {
      risks: risks.map((r) => ({
        ...r,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: r.category as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        probability: r.probability as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        impact: r.impact as any,
        riskScore: r.riskScore as number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Create a new risk
   */
  static async createRisk(data: CreateRiskRequest): Promise<Risk> {
    // Ensure at least one of program or project is specified
    if (!data.programId && !data.projectId) {
      throw new Error('Either programId or projectId is required');
    }

    // Calculate risk score (probability × impact)
    const riskScore = (data.probability as number) * (data.impact as number);

    const risk = await prisma.risk.create({
      data: {
        programId: data.programId || null,
        projectId: data.projectId || null,
        parentRiskId: data.parentRiskId || null,
        name: data.name,
        description: data.description || null,
        category: data.category,
        probability: data.probability as number,
        impact: data.impact as number,
        riskScore,
        mitigation: data.mitigation || null,
        contingency: data.contingency || null,
        owner: data.owner || null,
        status: data.status || 'Open',
      },
    });

    return {
      ...risk,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: risk.category as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      probability: risk.probability as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      impact: risk.impact as any,
      riskScore: risk.riskScore as number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update an existing risk
   */
  static async updateRisk(
    riskId: string,
    data: UpdateRiskRequest
  ): Promise<Risk> {
    const existing = await prisma.risk.findUnique({
      where: { id: riskId },
    });

    if (!existing) {
      throw new Error('Risk not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.mitigation !== undefined) updateData.mitigation = data.mitigation;
    if (data.contingency !== undefined) updateData.contingency = data.contingency;
    if (data.owner !== undefined) updateData.owner = data.owner;
    if (data.status !== undefined) updateData.status = data.status;

    // Recalculate risk score if probability or impact changes
    if (data.probability !== undefined || data.impact !== undefined) {
      const probability = (data.probability ?? existing.probability) as number;
      const impact = (data.impact ?? existing.impact) as number;
      updateData.probability = probability;
      updateData.impact = impact;
      updateData.riskScore = probability * impact;
    }

    const updated = await prisma.risk.update({
      where: { id: riskId },
      data: updateData,
    });

    return {
      ...updated,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: updated.category as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      probability: updated.probability as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      impact: updated.impact as any,
      riskScore: updated.riskScore as number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Delete a risk (soft delete)
   */
  static async deleteRisk(riskId: string): Promise<void> {
    const risk = await prisma.risk.findUnique({
      where: { id: riskId },
    });

    if (!risk) {
      throw new Error('Risk not found');
    }

    await prisma.risk.update({
      where: { id: riskId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Inherit program risks to a project
   */
  static async inheritProgramRisks(
    programId: string,
    projectId: string
  ): Promise<Risk[]> {
    const programRisks = await prisma.risk.findMany({
      where: {
        programId,
        deletedAt: null,
      },
    });

    const inheritedRisks: Risk[] = [];

    for (const programRisk of programRisks) {
      const inherited = await prisma.risk.create({
        data: {
          projectId,
          parentRiskId: programRisk.id,
          name: programRisk.name,
          description: programRisk.description,
          category: programRisk.category,
          probability: programRisk.probability,
          impact: programRisk.impact,
          riskScore: programRisk.riskScore,
          mitigation: programRisk.mitigation,
          contingency: programRisk.contingency,
          owner: programRisk.owner,
          status: 'Open',
        },
      });

      inheritedRisks.push({
        ...inherited,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: inherited.category as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        probability: inherited.probability as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        impact: inherited.impact as any,
        riskScore: inherited.riskScore as number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }

    return inheritedRisks;
  }

  /**
   * Get risk heat map (Probability vs Impact matrix)
   */
  static async getRiskHeatMap(
    filter?: Partial<Pick<ListRisksFilter, 'programId' | 'projectId'>>
  ): Promise<RiskHeatMap> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deletedAt: null };

    if (filter?.programId) where.programId = filter.programId;
    if (filter?.projectId) where.projectId = filter.projectId;

    const risks = await prisma.risk.findMany({
      where,
    });

    const heatMap: RiskHeatMap = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    for (const risk of risks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convertedRisk: any = {
        ...risk,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: risk.category as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        probability: risk.probability as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        impact: risk.impact as any,
        riskScore: risk.riskScore as number,
      };

      if (risk.riskScore >= 20) {
        heatMap.critical.push(convertedRisk);
      } else if (risk.riskScore >= 15) {
        heatMap.high.push(convertedRisk);
      } else if (risk.riskScore >= 10) {
        heatMap.medium.push(convertedRisk);
      } else {
        heatMap.low.push(convertedRisk);
      }
    }

    return heatMap;
  }

  /**
   * Get risk statistics
   */
  static async getRiskStatistics(): Promise<RiskStatistics> {
    const risks = await prisma.risk.findMany({
      where: { deletedAt: null },
    });

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byProbability: Record<number, number> = {};
    const byImpact: Record<number, number> = {};

    let totalRiskScore = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let openCount = 0;
    let mitigatedCount = 0;

    for (const risk of risks) {
      byCategory[risk.category] = (byCategory[risk.category] ?? 0) + 1;
      byStatus[risk.status] = (byStatus[risk.status] ?? 0) + 1;
      byProbability[risk.probability] = (byProbability[risk.probability] ?? 0) + 1;
      byImpact[risk.impact] = (byImpact[risk.impact] ?? 0) + 1;

      totalRiskScore += risk.riskScore;

      if (risk.riskScore >= 20) criticalCount++;
      else if (risk.riskScore >= 15) highCount++;
      else if (risk.riskScore >= 10) mediumCount++;
      else lowCount++;

      if (risk.status === 'Open') openCount++;
      if (risk.status === 'Mitigated') mitigatedCount++;
    }

    return {
      totalRisks: risks.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      risksByCategory: byCategory as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      risksByStatus: byStatus as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      risksByProbability: byProbability as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      risksByImpact: byImpact as any,
      averageRiskScore: risks.length > 0 ? totalRiskScore / risks.length : 0,
      criticalRisks: criticalCount,
      highRisks: highCount,
      mediumRisks: mediumCount,
      lowRisks: lowCount,
      openRisks: openCount,
      mitigatedRisks: mitigatedCount,
    };
  }
}

// ============================================================================
// BENEFIT SERVICE
// ============================================================================

export class BenefitService {
  /**
   * Get a single benefit with KPIs
   */
  static async getBenefit(benefitId: string): Promise<BenefitWithKPIs | null> {
    const benefit = await prisma.benefit.findUnique({
      where: { id: benefitId },
      include: { kpis: true },
    });

    if (!benefit) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...benefit,
      targetValue: Number(benefit.targetValue),
      actualValue: benefit.actualValue ? Number(benefit.actualValue) : null,
      kpis: benefit.kpis?.map((k) => ({
        ...k,
        baseline: Number(k.baseline),
        target: Number(k.target),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unit: k.unit as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionCadence: k.collectionCadence as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * List benefits with filtering
   */
  static async listBenefits(
    filter?: Partial<ListBenefitsFilter>
  ): Promise<{ benefits: Benefit[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null,
    };

    if (filter?.programId) where.programId = filter.programId;
    if (filter?.projectId) where.projectId = filter.projectId;

    if (filter?.category) {
      if (Array.isArray(filter.category)) {
        where.category = { in: filter.category };
      } else {
        where.category = filter.category;
      }
    }

    const [benefits, total] = await Promise.all([
      prisma.benefit.findMany({
        where,
        orderBy: {
          [filter?.sortBy || 'targetDate']: filter?.sortOrder || 'asc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.benefit.count({ where }),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      benefits: benefits.map((b) => ({
        ...b,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: b.category as any,
        targetValue: Number(b.targetValue),
        actualValue: b.actualValue ? Number(b.actualValue) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Create a new benefit
   */
  static async createBenefit(data: CreateBenefitRequest): Promise<Benefit> {
    if (!data.programId && !data.projectId) {
      throw new Error('Either programId or projectId is required');
    }

    const targetDate = typeof data.targetDate === 'string'
      ? new Date(data.targetDate)
      : data.targetDate;

    const benefit = await prisma.benefit.create({
      data: {
        programId: data.programId || null,
        projectId: data.projectId || null,
        name: data.name,
        description: data.description || null,
        category: data.category,
        targetValue: data.targetValue,
        targetDate,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...benefit,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: benefit.category as any,
      targetValue: Number(benefit.targetValue),
      actualValue: benefit.actualValue ? Number(benefit.actualValue) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update an existing benefit
   */
  static async updateBenefit(
    benefitId: string,
    data: UpdateBenefitRequest
  ): Promise<Benefit> {
    const existing = await prisma.benefit.findUnique({
      where: { id: benefitId },
    });

    if (!existing) {
      throw new Error('Benefit not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
    if (data.targetDate !== undefined) {
      updateData.targetDate = typeof data.targetDate === 'string'
        ? new Date(data.targetDate)
        : data.targetDate;
    }
    if (data.actualValue !== undefined) updateData.actualValue = data.actualValue;
    if (data.achievedDate !== undefined) {
      updateData.achievedDate = data.achievedDate
        ? (typeof data.achievedDate === 'string'
          ? new Date(data.achievedDate)
          : data.achievedDate)
        : null;
    }

    const updated = await prisma.benefit.update({
      where: { id: benefitId },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...updated,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: updated.category as any,
      targetValue: Number(updated.targetValue),
      actualValue: updated.actualValue ? Number(updated.actualValue) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Delete a benefit (soft delete)
   */
  static async deleteBenefit(benefitId: string): Promise<void> {
    const benefit = await prisma.benefit.findUnique({
      where: { id: benefitId },
    });

    if (!benefit) {
      throw new Error('Benefit not found');
    }

    await prisma.benefit.update({
      where: { id: benefitId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get benefit statistics
   */
  static async getBenefitStatistics(): Promise<BenefitStatistics> {
    const benefits = await prisma.benefit.findMany({
      where: { deletedAt: null },
    });

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    let totalTarget = 0;
    let totalAchieved = 0;
    let achievedCount = 0;
    let atRiskCount = 0;

    for (const benefit of benefits) {
      byCategory[benefit.category] = (byCategory[benefit.category] ?? 0) + 1;

      totalTarget += Number(benefit.targetValue);

      const actual = benefit.actualValue ? Number(benefit.actualValue) : 0;
      totalAchieved += actual;

      // Determine status
      if (!benefit.actualValue) {
        byStatus['Planned'] = (byStatus['Planned'] ?? 0) + 1;
        if (benefit.targetDate < new Date()) {
          atRiskCount++;
        }
      } else if (actual >= Number(benefit.targetValue)) {
        byStatus['Achieved'] = (byStatus['Achieved'] ?? 0) + 1;
        achievedCount++;
      } else if (actual > 0) {
        byStatus['Partial'] = (byStatus['Partial'] ?? 0) + 1;
      } else {
        byStatus['Not Achieved'] = (byStatus['Not Achieved'] ?? 0) + 1;
      }
    }

    return {
      totalBenefits: benefits.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      benefitsByCategory: byCategory as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      benefitsByStatus: byStatus as any,
      totalTargetValue: totalTarget,
      totalAchievedValue: totalAchieved,
      realizationPercentage: totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0,
      achievedBenefits: achievedCount,
      atRiskBenefits: atRiskCount,
    };
  }
}

// ============================================================================
// KPI SERVICE
// ============================================================================

export class KPIService {
  /**
   * Get a single KPI with measurements
   */
  static async getKPI(kpiId: string) {
    const kpi = await prisma.kPI.findUnique({
      where: { id: kpiId },
      include: { measurements: { orderBy: { measurementDate: 'desc' } } },
    });

    if (!kpi) return null;

    return {
      ...kpi,
      baseline: Number(kpi.baseline),
      target: Number(kpi.target),
      measurements: kpi.measurements?.map((m) => ({
        ...m,
        value: Number(m.value),
      })),
    };
  }

  /**
   * List KPIs with filtering
   */
  static async listKPIs(
    filter?: Partial<ListKPIsFilter>
  ): Promise<{ kpis: KPI[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter?.benefitId) where.benefitId = filter.benefitId;
    if (filter?.unit) where.unit = filter.unit;

    const [kpis, total] = await Promise.all([
      prisma.kPI.findMany({
        where,
        orderBy: {
          [filter?.sortBy || 'name']: filter?.sortOrder || 'asc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.kPI.count({ where }),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kpis: kpis.map((k) => ({
        ...k,
        baseline: Number(k.baseline),
        target: Number(k.target),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unit: k.unit as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionCadence: k.collectionCadence as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Create a new KPI
   */
  static async createKPI(data: CreateKPIRequest): Promise<KPI> {
    const kpi = await prisma.kPI.create({
      data: {
        benefitId: data.benefitId,
        name: data.name,
        unit: data.unit,
        baseline: data.baseline,
        target: data.target,
        collectionCadence: data.collectionCadence,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...kpi,
      baseline: Number(kpi.baseline),
      target: Number(kpi.target),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unit: kpi.unit as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collectionCadence: kpi.collectionCadence as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update an existing KPI
   */
  static async updateKPI(
    kpiId: string,
    data: UpdateKPIRequest
  ): Promise<KPI> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.baseline !== undefined) updateData.baseline = data.baseline;
    if (data.target !== undefined) updateData.target = data.target;
    if (data.collectionCadence !== undefined) updateData.collectionCadence = data.collectionCadence;

    const updated = await prisma.kPI.update({
      where: { id: kpiId },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...updated,
      baseline: Number(updated.baseline),
      target: Number(updated.target),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unit: updated.unit as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collectionCadence: updated.collectionCadence as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Create a KPI measurement
   */
  static async createMeasurement(data: CreateKPIMeasurementRequest): Promise<KPIMeasurement> {
    const measurementDate = typeof data.measurementDate === 'string'
      ? new Date(data.measurementDate)
      : data.measurementDate;

    const measurement = await prisma.kPIMeasurement.create({
      data: {
        kpiId: data.kpiId,
        value: data.value,
        measurementDate,
        notes: data.notes || null,
        recordedBy: data.recordedBy || null,
      },
    });

    return {
      ...measurement,
      value: Number(measurement.value),
    };
  }

  /**
   * Get KPI progress
   */
  static async getKPIProgress(kpiId: string): Promise<KPIProgress | null> {
    const kpi = await prisma.kPI.findUnique({
      where: { id: kpiId },
      include: {
        measurements: {
          orderBy: { measurementDate: 'desc' },
          take: 2,
        },
      },
    });

    if (!kpi || !kpi.measurements || kpi.measurements.length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastMeasurement = kpi.measurements[0] as any;
    const currentValue = Number(lastMeasurement.value);
    const targetValue = Number(kpi.target);
    const baselineValue = Number(kpi.baseline);

    const progress = baselineValue !== targetValue
      ? ((currentValue - baselineValue) / (targetValue - baselineValue)) * 100
      : currentValue === targetValue ? 100 : 0;

    // Determine trend
    let trend: 'Improving' | 'Declining' | 'Stable' = 'Stable';
    if (kpi.measurements.length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const previousValue = Number((kpi.measurements[1] as any).value);
      if (currentValue > previousValue) {
        trend = 'Improving';
      } else if (currentValue < previousValue) {
        trend = 'Declining';
      }
    }

    return {
      kpiId,
      currentValue,
      targetValue,
      baselineValue,
      progress: Math.min(100, Math.max(0, progress)),
      trend,
      lastMeasurement: {
        ...lastMeasurement,
        value: Number(lastMeasurement.value),
      },
    };
  }
}
