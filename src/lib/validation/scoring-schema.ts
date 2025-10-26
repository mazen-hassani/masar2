/**
 * Zod validation schemas for Scoring operations
 */

import { z } from 'zod';

/**
 * Schema for creating a scoring criterion
 */
export const createScoringCriterionSchema = z.object({
  name: z
    .string()
    .min(1, 'Criterion name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  minScore: z
    .number()
    .min(0, 'Min score must be 0 or greater')
    .default(0),
  maxScore: z
    .number()
    .min(1, 'Max score must be at least 1')
    .default(100),
  isActive: z.boolean().default(true),
});

/**
 * Schema for updating a scoring criterion
 */
export const updateScoringCriterionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  minScore: z
    .number()
    .min(0, 'Min score must be 0 or greater')
    .optional(),
  maxScore: z
    .number()
    .min(1, 'Max score must be at least 1')
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for creating a project score
 */
export const createProjectScoringSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project ID is required'),
  criterionId: z
    .string()
    .min(1, 'Criterion ID is required'),
  weight: z
    .number()
    .min(0, 'Weight must be 0 or greater')
    .max(1, 'Weight must be 1 or less'),
  score: z
    .number()
    .min(0, 'Score must be 0 or greater')
    .max(100, 'Score must be 100 or less'),
  justification: z
    .string()
    .max(2000, 'Justification must be 2000 characters or less')
    .optional(),
  evaluatedBy: z
    .string()
    .optional(),
});

/**
 * Schema for updating a project score
 */
export const updateProjectScoringSchema = z.object({
  weight: z
    .number()
    .min(0, 'Weight must be 0 or greater')
    .max(1, 'Weight must be 1 or less')
    .optional(),
  score: z
    .number()
    .min(0, 'Score must be 0 or greater')
    .max(100, 'Score must be 100 or less')
    .optional(),
  justification: z
    .string()
    .max(2000, 'Justification must be 2000 characters or less')
    .optional()
    .nullable(),
});

/**
 * Schema for filtering scoring criteria
 */
export const listScoringCriteriaFilterSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'maxScore'])
    .default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

/**
 * Schema for filtering project scores
 */
export const listProjectScoresFilterSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project ID is required'),
  criterionId: z.string().optional(),
  minScore: z.number().min(0).optional(),
  maxScore: z.number().min(0).optional(),
  sortBy: z
    .enum(['weight', 'score', 'evaluatedAt', 'criterionName'])
    .default('criterionName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

/**
 * Inferred types from schemas
 */
export type CreateScoringCriterionRequest = z.infer<typeof createScoringCriterionSchema>;
export type UpdateScoringCriterionRequest = z.infer<typeof updateScoringCriterionSchema>;
export type CreateProjectScoringRequest = z.infer<typeof createProjectScoringSchema>;
export type UpdateProjectScoringRequest = z.infer<typeof updateProjectScoringSchema>;
export type ListScoringCriteriaFilter = z.infer<typeof listScoringCriteriaFilterSchema>;
export type ListProjectScoresFilter = z.infer<typeof listProjectScoresFilterSchema>;
