/**
 * Zod validation schemas for WBS operations
 */

import { z } from 'zod';

/**
 * Validation for WBS Item status
 */
export const wbsItemStatusSchema = z.enum([
  'NotStarted',
  'InProgress',
  'Delayed',
  'Completed',
  'Cancelled',
]);

/**
 * Schema for creating a new WBS Item
 */
export const createWBSItemSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project ID is required'),
  parentId: z
    .string()
    .optional()
    .nullable(),
  name: z
    .string()
    .min(1, 'WBS item name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  plannedStartDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  plannedEndDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  actualStartDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  actualEndDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  ownerId: z
    .string()
    .optional()
    .nullable(),
  status: wbsItemStatusSchema.default('NotStarted'),
  plannedCost: z
    .number()
    .min(0, 'Planned cost must be a positive number')
    .optional()
    .nullable(),
  actualCost: z
    .number()
    .min(0, 'Actual cost must be a positive number')
    .optional()
    .nullable(),
  percentComplete: z
    .number()
    .min(0, 'Percent complete must be 0-100')
    .max(100, 'Percent complete must be 0-100')
    .default(0),
});

/**
 * Schema for updating a WBS Item
 */
export const updateWBSItemSchema = z.object({
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
  plannedStartDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  plannedEndDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  actualStartDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  actualEndDate: z
    .union([z.date(), z.string().datetime()])
    .optional()
    .nullable(),
  ownerId: z
    .string()
    .optional()
    .nullable(),
  status: wbsItemStatusSchema.optional(),
  plannedCost: z
    .number()
    .min(0, 'Planned cost must be positive')
    .optional()
    .nullable(),
  actualCost: z
    .number()
    .min(0, 'Actual cost must be positive')
    .optional()
    .nullable(),
  percentComplete: z
    .number()
    .min(0, 'Must be 0-100')
    .max(100, 'Must be 0-100')
    .optional(),
});

/**
 * Schema for listing WBS items with filters
 */
export const listWBSItemsFilterSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  parentId: z.string().optional(),
  level: z.number().min(0).optional(),
  status: z
    .union([wbsItemStatusSchema, z.array(wbsItemStatusSchema)])
    .optional(),
  search: z.string().optional(),
  ownerId: z.string().optional(),
  hasChildren: z.boolean().optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'plannedStartDate', 'status', 'level'])
    .default('level'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

/**
 * Schema for creating WBS Configuration
 */
export const createWBSConfigurationSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  levels: z
    .number()
    .min(1, 'At least 1 level required')
    .max(5, 'Maximum 5 levels allowed'),
  levelNames: z
    .array(z.string().min(1, 'Level name cannot be empty'))
    .min(1, 'At least one level name required'),
});

/**
 * Inferred types from schemas
 */
export type CreateWBSItemRequest = z.infer<typeof createWBSItemSchema>;
export type UpdateWBSItemRequest = z.infer<typeof updateWBSItemSchema>;
export type ListWBSItemsFilter = z.infer<typeof listWBSItemsFilterSchema>;
export type CreateWBSConfigurationRequest = z.infer<typeof createWBSConfigurationSchema>;
