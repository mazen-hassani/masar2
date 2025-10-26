/**
 * Zod validation schemas for Risk, Benefit, and KPI operations
 */

import { z } from 'zod';

/**
 * Risk category enum
 */
export const riskCategorySchema = z.enum([
  'Technical',
  'Financial',
  'Operational',
  'External',
  'Legal',
]);

/**
 * Risk status enum
 */
export const riskStatusSchema = z.enum(['Open', 'Mitigated', 'Closed', 'Occurred']);

/**
 * Risk probability (1-5 scale)
 */
export const riskProbabilitySchema = z
  .number()
  .min(1, 'Probability must be 1-5')
  .max(5, 'Probability must be 1-5');

/**
 * Risk impact (1-5 scale)
 */
export const riskImpactSchema = z
  .number()
  .min(1, 'Impact must be 1-5')
  .max(5, 'Impact must be 1-5');

/**
 * Schema for creating a risk
 */
export const createRiskSchema = z.object({
  programId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  parentRiskId: z.string().optional().nullable(),

  name: z
    .string()
    .min(1, 'Risk name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  category: riskCategorySchema,
  probability: riskProbabilitySchema,
  impact: riskImpactSchema,

  mitigation: z
    .string()
    .max(2000, 'Mitigation must be 2000 characters or less')
    .optional(),
  contingency: z
    .string()
    .max(2000, 'Contingency must be 2000 characters or less')
    .optional(),
  owner: z.string().optional(),
  status: riskStatusSchema.optional(),
});

/**
 * Schema for updating a risk
 */
export const updateRiskSchema = z.object({
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
  category: riskCategorySchema.optional(),
  probability: riskProbabilitySchema.optional(),
  impact: riskImpactSchema.optional(),
  mitigation: z
    .string()
    .max(2000, 'Mitigation must be 2000 characters or less')
    .optional()
    .nullable(),
  contingency: z
    .string()
    .max(2000, 'Contingency must be 2000 characters or less')
    .optional()
    .nullable(),
  owner: z.string().optional().nullable(),
  status: riskStatusSchema.optional(),
});

/**
 * Schema for listing risks
 */
export const listRisksFilterSchema = z.object({
  programId: z.string().optional(),
  projectId: z.string().optional(),
  category: z
    .union([riskCategorySchema, z.array(riskCategorySchema)])
    .optional(),
  status: z
    .union([riskStatusSchema, z.array(riskStatusSchema)])
    .optional(),
  minRiskScore: z.number().min(1).max(25).optional(),
  maxRiskScore: z.number().min(1).max(25).optional(),
  sortBy: z
    .enum(['name', 'riskScore', 'probability', 'impact', 'createdAt'])
    .default('riskScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

// ============================================================================
// BENEFIT SCHEMAS
// ============================================================================

/**
 * Benefit category enum
 */
export const benefitCategorySchema = z.enum([
  'Financial',
  'Strategic',
  'Operational',
  'Social',
]);

/**
 * Benefit status enum
 */
export const benefitStatusSchema = z.enum([
  'Planned',
  'Achieved',
  'Partial',
  'Not Achieved',
]);

/**
 * Schema for creating a benefit
 */
export const createBenefitSchema = z.object({
  programId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),

  name: z
    .string()
    .min(1, 'Benefit name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  category: benefitCategorySchema,
  targetValue: z.number().min(0, 'Target value must be non-negative'),
  targetDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string()),
});

/**
 * Schema for updating a benefit
 */
export const updateBenefitSchema = z.object({
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
  category: benefitCategorySchema.optional(),
  targetValue: z.number().min(0, 'Target value must be non-negative').optional(),
  targetDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string())
    .optional(),
  actualValue: z.number().min(0).optional().nullable(),
  achievedDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string())
    .optional()
    .nullable(),
});

/**
 * Schema for listing benefits
 */
export const listBenefitsFilterSchema = z.object({
  programId: z.string().optional(),
  projectId: z.string().optional(),
  category: z
    .union([benefitCategorySchema, z.array(benefitCategorySchema)])
    .optional(),
  status: z
    .union([benefitStatusSchema, z.array(benefitStatusSchema)])
    .optional(),
  sortBy: z
    .enum(['name', 'targetValue', 'targetDate', 'createdAt'])
    .default('targetDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

// ============================================================================
// KPI SCHEMAS
// ============================================================================

/**
 * KPI unit enum
 */
export const kpiUnitSchema = z.enum([
  'USD',
  'Percentage',
  'Count',
  'Hours',
  'Days',
  'Custom',
]);

/**
 * KPI cadence enum
 */
export const kpiCadenceSchema = z.enum([
  'Weekly',
  'Monthly',
  'Quarterly',
  'Annually',
]);

/**
 * Schema for creating a KPI
 */
export const createKPISchema = z.object({
  benefitId: z
    .string()
    .min(1, 'Benefit ID is required'),
  name: z
    .string()
    .min(1, 'KPI name is required')
    .max(255, 'Name must be 255 characters or less'),
  unit: kpiUnitSchema,
  baseline: z.number(),
  target: z.number(),
  collectionCadence: kpiCadenceSchema,
});

/**
 * Schema for updating a KPI
 */
export const updateKPISchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .optional(),
  unit: kpiUnitSchema.optional(),
  baseline: z.number().optional(),
  target: z.number().optional(),
  collectionCadence: kpiCadenceSchema.optional(),
});

/**
 * Schema for creating a KPI measurement
 */
export const createKPIMeasurementSchema = z.object({
  kpiId: z
    .string()
    .min(1, 'KPI ID is required'),
  value: z.number(),
  measurementDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string()),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional(),
  recordedBy: z.string().optional(),
});

/**
 * Schema for listing KPIs
 */
export const listKPIsFilterSchema = z.object({
  benefitId: z.string().optional(),
  unit: kpiUnitSchema.optional(),
  sortBy: z
    .enum(['name', 'target', 'createdAt'])
    .default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CreateRiskRequest = z.infer<typeof createRiskSchema>;
export type UpdateRiskRequest = z.infer<typeof updateRiskSchema>;
export type ListRisksFilter = z.infer<typeof listRisksFilterSchema>;

export type CreateBenefitRequest = z.infer<typeof createBenefitSchema>;
export type UpdateBenefitRequest = z.infer<typeof updateBenefitSchema>;
export type ListBenefitsFilter = z.infer<typeof listBenefitsFilterSchema>;

export type CreateKPIRequest = z.infer<typeof createKPISchema>;
export type UpdateKPIRequest = z.infer<typeof updateKPISchema>;
export type CreateKPIMeasurementRequest = z.infer<typeof createKPIMeasurementSchema>;
export type ListKPIsFilter = z.infer<typeof listKPIsFilterSchema>;
