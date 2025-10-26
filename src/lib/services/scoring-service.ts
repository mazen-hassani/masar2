/**
 * Scoring Service
 * Multi-criteria project evaluation and scoring
 */

import { PrismaClient } from '@prisma/client';
import { getTenantId } from '@/lib/tenant-context';
import {
  ScoringCriterion,
  ProjectScoring,
  ScoringResult,
  ProjectScoresSummary,
  ScoringStatistics,
} from '@/types/scoring';

const prisma = new PrismaClient();
import type {
  CreateScoringCriterionRequest,
  UpdateScoringCriterionRequest,
  CreateProjectScoringRequest,
  UpdateProjectScoringRequest,
  ListScoringCriteriaFilter,
  ListProjectScoresFilter,
} from '@/lib/validation/scoring-schema';

export class ScoringService {
  /**
   * Get a single scoring criterion
   */
  static async getScoringCriterion(criterionId: string): Promise<ScoringCriterion | null> {
    const tenantId = getTenantId();

    const criterion = await prisma.scoringCriterion.findFirst({
      where: {
        id: criterionId,
        tenantId,
      },
    });

    if (!criterion) return null;

    return {
      ...criterion,
      minScore: Number(criterion.minScore),
      maxScore: Number(criterion.maxScore),
    };
  }

  /**
   * List scoring criteria with filtering
   */
  static async listScoringCriteria(
    filter?: Partial<ListScoringCriteriaFilter>
  ): Promise<{ criteria: ScoringCriterion[]; total: number }> {
    const tenantId = getTenantId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId,
    };

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    const [criteria, total] = await Promise.all([
      prisma.scoringCriterion.findMany({
        where,
        orderBy: {
          [filter?.sortBy || 'name']: filter?.sortOrder || 'asc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.scoringCriterion.count({ where }),
    ]);

    return {
      criteria: criteria.map((c) => ({
        ...c,
        minScore: Number(c.minScore),
        maxScore: Number(c.maxScore),
      })),
      total,
    };
  }

  /**
   * Create a new scoring criterion
   */
  static async createScoringCriterion(
    data: CreateScoringCriterionRequest
  ): Promise<ScoringCriterion> {
    const tenantId = getTenantId();

    // Validate max > min
    if (data.maxScore !== undefined && data.minScore !== undefined) {
      if (data.maxScore <= data.minScore) {
        throw new Error('Max score must be greater than min score');
      }
    }

    const minScore = data.minScore ?? 0;
    const maxScore = data.maxScore ?? 100;

    const criterion = await prisma.scoringCriterion.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        minScore,
        maxScore,
        isActive: data.isActive ?? true,
      },
    });

    return {
      ...criterion,
      minScore: Number(criterion.minScore),
      maxScore: Number(criterion.maxScore),
    };
  }

  /**
   * Update an existing scoring criterion
   */
  static async updateScoringCriterion(
    criterionId: string,
    data: UpdateScoringCriterionRequest
  ): Promise<ScoringCriterion> {
    const tenantId = getTenantId();

    // Verify criterion belongs to tenant
    const existing = await prisma.scoringCriterion.findFirst({
      where: {
        id: criterionId,
        tenantId,
      },
    });

    if (!existing) {
      throw new Error(`Scoring criterion not found or not accessible to tenant ${tenantId}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.minScore !== undefined) updateData.minScore = data.minScore;
    if (data.maxScore !== undefined) updateData.maxScore = data.maxScore;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Validate max > min if both are being updated
    const minScore = updateData.minScore ?? existing.minScore;
    const maxScore = updateData.maxScore ?? existing.maxScore;
    if (maxScore <= minScore) {
      throw new Error('Max score must be greater than min score');
    }

    const updated = await prisma.scoringCriterion.update({
      where: { id: criterionId },
      data: updateData,
    });

    return {
      ...updated,
      minScore: Number(updated.minScore),
      maxScore: Number(updated.maxScore),
    };
  }

  /**
   * Delete a scoring criterion (and all associated scores)
   */
  static async deleteScoringCriterion(criterionId: string): Promise<void> {
    const tenantId = getTenantId();

    const criterion = await prisma.scoringCriterion.findFirst({
      where: {
        id: criterionId,
        tenantId,
      },
    });

    if (!criterion) {
      throw new Error(`Scoring criterion not found or not accessible to tenant ${tenantId}`);
    }

    // Delete all scores for this criterion
    await prisma.projectScoring.deleteMany({
      where: { criterionId },
    });

    // Delete the criterion
    await prisma.scoringCriterion.delete({
      where: { id: criterionId },
    });
  }

  /**
   * Get a single project score
   */
  static async getProjectScore(scoreId: string): Promise<ProjectScoring | null> {
    const score = await prisma.projectScoring.findUnique({
      where: { id: scoreId },
    });

    if (!score) return null;

    return {
      ...score,
      weight: Number(score.weight),
      score: Number(score.score),
    };
  }

  /**
   * List project scores with filtering
   */
  static async listProjectScores(
    filter: ListProjectScoresFilter
  ): Promise<{ scores: ProjectScoring[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      projectId: filter.projectId,
    };

    if (filter.criterionId) {
      where.criterionId = filter.criterionId;
    }

    if (filter.minScore !== undefined) {
      where.score = { gte: filter.minScore };
    }

    if (filter.maxScore !== undefined) {
      if (where.score) {
        where.score.lte = filter.maxScore;
      } else {
        where.score = { lte: filter.maxScore };
      }
    }

    const [scores, total] = await Promise.all([
      prisma.projectScoring.findMany({
        where,
        include: {
          criterion: true,
        },
        orderBy: {
          [filter.sortBy || 'criterion.name']: filter.sortOrder || 'asc',
        },
        skip: filter.skip || 0,
        take: filter.take || 20,
      }),
      prisma.projectScoring.count({ where }),
    ]);

    return {
      scores: scores.map((s) => ({
        ...s,
        weight: Number(s.weight),
        score: Number(s.score),
      })),
      total,
    };
  }

  /**
   * Create a project score
   */
  static async createProjectScore(
    data: CreateProjectScoringRequest
  ): Promise<ProjectScoring> {
    const tenantId = getTenantId();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new Error(`Project not found or not accessible to tenant ${tenantId}`);
    }

    // Verify criterion exists and is active
    const criterion = await prisma.scoringCriterion.findFirst({
      where: {
        id: data.criterionId,
        tenantId,
      },
    });

    if (!criterion) {
      throw new Error(`Scoring criterion not found or not accessible to tenant ${tenantId}`);
    }

    if (!criterion.isActive) {
      throw new Error('Cannot score against an inactive criterion');
    }

    // Validate score is within criterion range
    if (data.score < criterion.minScore || data.score > criterion.maxScore) {
      throw new Error(
        `Score must be between ${criterion.minScore} and ${criterion.maxScore}`
      );
    }

    // Check for duplicate score
    const existing = await prisma.projectScoring.findUnique({
      where: {
        projectId_criterionId: {
          projectId: data.projectId,
          criterionId: data.criterionId,
        },
      },
    });

    if (existing) {
      // Update existing instead of creating
      return this.updateProjectScore(existing.id, {
        score: data.score,
        weight: data.weight,
        justification: data.justification,
      });
    }

    const score = await prisma.projectScoring.create({
      data: {
        projectId: data.projectId,
        criterionId: data.criterionId,
        weight: data.weight,
        score: data.score,
        justification: data.justification ?? null,
        evaluatedBy: data.evaluatedBy ?? null,
      },
    });

    return {
      ...score,
      weight: Number(score.weight),
      score: Number(score.score),
    };
  }

  /**
   * Update a project score
   */
  static async updateProjectScore(
    scoreId: string,
    data: UpdateProjectScoringRequest
  ): Promise<ProjectScoring> {
    const score = await prisma.projectScoring.findUnique({
      where: { id: scoreId },
      include: { criterion: true },
    });

    if (!score) {
      throw new Error('Project score not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.justification !== undefined) updateData.justification = data.justification;

    if (data.score !== undefined) {
      // Validate score within criterion range
      if (data.score < score.criterion.minScore || data.score > score.criterion.maxScore) {
        throw new Error(
          `Score must be between ${score.criterion.minScore} and ${score.criterion.maxScore}`
        );
      }
      updateData.score = data.score;
    }

    updateData.updatedAt = new Date();

    const updated = await prisma.projectScoring.update({
      where: { id: scoreId },
      data: updateData,
    });

    return {
      ...updated,
      weight: Number(updated.weight),
      score: Number(updated.score),
    };
  }

  /**
   * Delete a project score
   */
  static async deleteProjectScore(scoreId: string): Promise<void> {
    const score = await prisma.projectScoring.findUnique({
      where: { id: scoreId },
    });

    if (!score) {
      throw new Error('Project score not found');
    }

    await prisma.projectScoring.delete({
      where: { id: scoreId },
    });
  }

  /**
   * Get all scores for a project with calculated results
   */
  static async getProjectScores(projectId: string): Promise<ProjectScoresSummary> {
    // Get all scores with criterion details
    const scores = await prisma.projectScoring.findMany({
      where: { projectId },
      include: {
        criterion: true,
        evaluatedByUser: {
          select: { id: true, name: true },
        },
      },
    });

    // Calculate result
    const result = this.calculateScoringResult(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scores as any,
      projectId
    );

    return {
      projectId,
      scores: scores.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        criterionId: s.criterionId,
        criterionName: s.criterion.name,
        weight: Number(s.weight),
        score: Number(s.score),
        justification: s.justification,
        evaluatedBy: s.evaluatedBy,
        evaluatedByName: s.evaluatedByUser?.name ?? null,
        evaluatedAt: s.evaluatedAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      result,
    };
  }

  /**
   * Calculate scoring result for a project
   */
  private static calculateScoringResult(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores: any[],
    projectId: string
  ): ScoringResult {
    if (scores.length === 0) {
      return {
        projectId,
        totalScore: 0,
        averageScore: 0,
        weightedScore: 0,
        criteriaCount: 0,
        lastEvaluated: new Date(),
      };
    }

    // Calculate simple average
    const averageScore =
      scores.reduce((sum, s) => sum + Number(s.score), 0) / scores.length;

    // Calculate weighted average
    const totalWeight = scores.reduce((sum, s) => sum + Number(s.weight), 0);
    const weightedScore =
      totalWeight > 0
        ? scores.reduce((sum, s) => sum + Number(s.score) * Number(s.weight), 0) /
          totalWeight
        : 0;

    // Total score (simple sum)
    const totalScore = scores.reduce((sum, s) => sum + Number(s.score), 0);

    // Most recent evaluation date
    const lastEvaluated = new Date(
      Math.max(...scores.map((s) => new Date(s.evaluatedAt).getTime()))
    );

    return {
      projectId,
      totalScore,
      averageScore,
      weightedScore,
      criteriaCount: scores.length,
      lastEvaluated,
    };
  }

  /**
   * Get scoring statistics
   */
  static async getStatistics(): Promise<ScoringStatistics> {
    const tenantId = getTenantId();

    const [totalCriteria, activeCriteria, totalScores, scores] = await Promise.all([
      prisma.scoringCriterion.count({
        where: { tenantId },
      }),
      prisma.scoringCriterion.count({
        where: { tenantId, isActive: true },
      }),
      prisma.projectScoring.count(),
      prisma.projectScoring.findMany({
        select: { score: true },
      }),
    ]);

    const projectsWithScores = await prisma.projectScoring.groupBy({
      by: ['projectId'],
    });

    // Calculate score ranges
    const scoresByRange = {
      excellent: scores.filter((s) => Number(s.score) >= 80).length,
      good: scores.filter((s) => Number(s.score) >= 60 && Number(s.score) < 80).length,
      fair: scores.filter((s) => Number(s.score) >= 40 && Number(s.score) < 60).length,
      poor: scores.filter((s) => Number(s.score) < 40).length,
    };

    const averageProjectScore =
      scores.length > 0 ? scores.reduce((sum, s) => sum + Number(s.score), 0) / scores.length : 0;

    const highestScore = scores.length > 0 ? Math.max(...scores.map((s) => Number(s.score))) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores.map((s) => Number(s.score))) : 0;

    return {
      totalCriteria,
      activeCriteria,
      totalScores,
      projectsWithScores: projectsWithScores.length,
      averageProjectScore,
      highestScore,
      lowestScore,
      scoresByRange,
    };
  }

  /**
   * Bulk score a project against multiple criteria
   */
  static async bulkScoreProject(
    projectId: string,
    scores: CreateProjectScoringRequest[]
  ): Promise<ProjectScoring[]> {
    const results: ProjectScoring[] = [];

    for (const scoreData of scores) {
      const score = await this.createProjectScore({
        ...scoreData,
        projectId,
      });
      results.push(score);
    }

    return results;
  }

  /**
   * Compare projects by average score
   */
  static async compareProjects(projectIds: string[]): Promise<
    Array<{
      projectId: string;
      averageScore: number;
      totalScores: number;
    }>
  > {
    const results = [];

    for (const projectId of projectIds) {
      const scores = await prisma.projectScoring.findMany({
        where: { projectId },
        select: { score: true },
      });

      if (scores.length > 0) {
        const averageScore =
          scores.reduce((sum, s) => sum + Number(s.score), 0) / scores.length;
        results.push({
          projectId,
          averageScore,
          totalScores: scores.length,
        });
      } else {
        results.push({
          projectId,
          averageScore: 0,
          totalScores: 0,
        });
      }
    }

    return results.sort((a, b) => b.averageScore - a.averageScore);
  }
}
