/**
 * Scoring Matrix Type Definitions
 * Multi-criteria project evaluation and scoring system
 */

/**
 * Scoring Criterion - Defines a single evaluation dimension
 * Used across multiple projects for consistent evaluation
 */
export interface ScoringCriterion {
  id: string;
  tenantId: string;

  // Definition
  name: string;
  description: string | null;

  // Range
  minScore: number; // Minimum allowed score (typically 0)
  maxScore: number; // Maximum allowed score (typically 100)

  // Status
  isActive: boolean; // Can be deactivated to prevent new scores

  // Audit
  createdBy: string | null; // User who created this criterion
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project Scoring - Score for a single project against a single criterion
 * Multiple scores per project form the complete evaluation
 */
export interface ProjectScoring {
  id: string;
  projectId: string;
  criterionId: string;

  // Scoring
  weight: number; // Weighting factor (0.0 - 1.0 or percentage)
  score: number; // Actual score (minScore to maxScore)

  // Context
  justification: string | null; // Explanation for the score

  // Audit
  evaluatedBy: string | null; // User who assigned this score
  evaluatedAt: Date;
  updatedAt: Date;
}

/**
 * Scoring Result - Complete evaluation for a project
 * Aggregates all criteria scores with weighting
 */
export interface ScoringResult {
  projectId: string;
  totalScore: number; // Weighted sum of all scores
  averageScore: number; // Simple average
  weightedScore: number; // Weighted average
  criteriaCount: number; // Total number of criteria scores
  lastEvaluated: Date;
}

/**
 * Create Scoring Criterion Request
 */
export interface CreateScoringCriterionRequest {
  name: string; // Required, 1-255 chars
  description?: string; // Optional
  minScore?: number; // Defaults to 0
  maxScore?: number; // Defaults to 100
  isActive?: boolean; // Defaults to true
}

/**
 * Update Scoring Criterion Request
 */
export interface UpdateScoringCriterionRequest {
  name?: string;
  description?: string | null;
  minScore?: number;
  maxScore?: number;
  isActive?: boolean;
}

/**
 * Create Project Scoring Request
 */
export interface CreateProjectScoringRequest {
  projectId: string; // Required
  criterionId: string; // Required
  weight: number; // Required, 0.0-1.0
  score: number; // Required, within criterion range
  justification?: string; // Optional
  evaluatedBy?: string; // Optional, current user if not provided
}

/**
 * Update Project Scoring Request
 */
export interface UpdateProjectScoringRequest {
  weight?: number;
  score?: number;
  justification?: string | null;
}

/**
 * Scoring Criterion Response - API format
 */
export interface ScoringCriterionResponse {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  minScore: number;
  maxScore: number;
  isActive: boolean;
  createdBy: string | null;
  createdByName?: string; // Included with relations
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
}

/**
 * Project Scoring Response - API format
 */
export interface ProjectScoringResponse {
  id: string;
  projectId: string;
  criterionId: string;
  criterionName: string; // Included with relations
  weight: number;
  score: number;
  justification: string | null;
  evaluatedBy: string | null;
  evaluatedByName?: string | null; // Included with relations
  evaluatedAt: string; // ISO format
  updatedAt: string; // ISO format
}

/**
 * Project Scores Summary - All scores for a project
 */
export interface ProjectScoresSummary {
  projectId: string;
  scores: ProjectScoringResponse[];
  result: ScoringResult;
}

/**
 * Filter options for listing scoring criteria
 */
export interface ListScoringCriteriaFilter {
  tenantId?: string; // Automatically set from context
  search?: string; // Search in name/description
  isActive?: boolean; // Filter by active status
  sortBy?: 'name' | 'createdAt' | 'maxScore';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Filter options for listing project scores
 */
export interface ListProjectScoresFilter {
  projectId: string; // Required
  criterionId?: string; // Filter by specific criterion
  minScore?: number; // Filter scores >= this value
  maxScore?: number; // Filter scores <= this value
  sortBy?: 'weight' | 'score' | 'evaluatedAt' | 'criterionName';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Scoring Statistics
 */
export interface ScoringStatistics {
  totalCriteria: number;
  activeCriteria: number;
  totalScores: number;
  projectsWithScores: number;
  averageProjectScore: number;
  highestScore: number;
  lowestScore: number;
  scoresByRange: {
    excellent: number; // 80-100
    good: number; // 60-79
    fair: number; // 40-59
    poor: number; // 0-39
  };
}

/**
 * Scoring with Criterion Details
 */
export interface ProjectScoringWithCriterion extends ProjectScoring {
  criterion: ScoringCriterion;
}

/**
 * Criterion with all its project scores
 */
export interface ScoringCriterionWithScores extends ScoringCriterion {
  scores: ProjectScoring[];
}
