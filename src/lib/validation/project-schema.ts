/**
 * Zod validation schemas for Project operations
 */

import { z } from 'zod';

/**
 * Validation for Project type
 */
export const projectTypeSchema = z.enum(['Project', 'Initiative']);

/**
 * Validation for Project status
 */
export const projectStatusSchema = z.enum([
  'Draft',
  'Pending',
  'Active',
  'OnHold',
  'Completed',
  'Cancelled',
]);

/**
 * Validation for complexity band
 */
export const complexityBandSchema = z.enum(['Low', 'Medium', 'High']);

/**
 * Schema for creating a new Project
 */
export const createProjectSchema = z.object({
  programId: z.string().optional().nullable(),
  type: projectTypeSchema,
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be 255 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  status: projectStatusSchema.default('Draft'),
  complexityBand: complexityBandSchema.default('Low'),
  requesterId: z.string().optional().nullable(),
  pmId: z.string().optional().nullable(),
  sponsorId: z.string().optional().nullable(),
  startDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  endDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  budget: z
    .number()
    .min(0, 'Budget must be a positive number')
    .default(0),
});

/**
 * Schema for updating a Project
 */
export const updateProjectSchema = z.object({
  programId: z.string().optional().nullable(),
  type: projectTypeSchema.optional(),
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be 255 characters or less')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  status: projectStatusSchema.optional(),
  complexityBand: complexityBandSchema.optional(),
  requesterId: z.string().optional().nullable(),
  pmId: z.string().optional().nullable(),
  sponsorId: z.string().optional().nullable(),
  startDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  endDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  budget: z
    .number()
    .min(0, 'Budget must be a positive number')
    .optional(),
  actualCost: z
    .number()
    .min(0, 'Actual cost must be a positive number')
    .optional(),
  scoreValue: z
    .number()
    .min(0, 'Score must be between 0 and 100')
    .max(100)
    .optional()
    .nullable(),
});

/**
 * Schema for list projects filter
 */
export const listProjectsFilterSchema = z.object({
  programId: z.string().optional(),
  type: projectTypeSchema.optional(),
  status: z
    .union([projectStatusSchema, z.array(projectStatusSchema)])
    .optional(),
  complexity: z
    .union([complexityBandSchema, z.array(complexityBandSchema)])
    .optional(),
  search: z.string().optional(),
  pmId: z.string().optional(),
  sponsorId: z.string().optional(),
  startDateFrom: z
    .union([z.date(), z.string().datetime()])
    .optional(),
  startDateTo: z
    .union([z.date(), z.string().datetime()])
    .optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'startDate', 'budget', 'status'])
    .default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

/**
 * Inferred types from schemas
 */
export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type ListProjectsFilter = z.infer<typeof listProjectsFilterSchema>;
