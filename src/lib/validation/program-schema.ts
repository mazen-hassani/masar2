/**
 * Zod validation schemas for Program operations
 */

import { z } from 'zod';

/**
 * Validation for Program status
 */
export const programStatusSchema = z.enum([
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
 * Schema for creating a new Program
 */
export const createProgramSchema = z.object({
  name: z
    .string()
    .min(1, 'Program name is required')
    .max(255, 'Program name must be 255 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  status: programStatusSchema.default('Draft'),
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
 * Schema for updating a Program
 */
export const updateProgramSchema = z.object({
  name: z
    .string()
    .min(1, 'Program name is required')
    .max(255, 'Program name must be 255 characters or less')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  status: programStatusSchema.optional(),
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
 * Schema for list programs filter
 */
export const listProgramsFilterSchema = z.object({
  status: z
    .union([programStatusSchema, z.array(programStatusSchema)])
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
export type CreateProgramRequest = z.infer<typeof createProgramSchema>;
export type UpdateProgramRequest = z.infer<typeof updateProgramSchema>;
export type ListProgramsFilter = z.infer<typeof listProgramsFilterSchema>;
