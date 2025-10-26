/**
 * Zod validation schemas for Financial models
 */

import { z } from 'zod';

// ============================================================================
// COST ITEM SCHEMAS
// ============================================================================

/**
 * Cost item category enum
 */
export const costItemCategorySchema = z.enum([
  'Labor',
  'Material',
  'Equipment',
  'Service',
  'Other',
]);

/**
 * Entity type enum (Program or Project)
 */
export const entityTypeSchema = z.enum(['Program', 'Project']);

/**
 * Schema for creating a cost item
 */
export const createCostItemSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z
    .string()
    .min(1, 'Entity ID is required'),
  wbsItemId: z.string().optional().nullable(),

  category: costItemCategorySchema,
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),

  plannedAmount: z
    .number()
    .min(0, 'Planned amount must be non-negative'),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .default('USD'),
});

/**
 * Schema for updating a cost item
 */
export const updateCostItemSchema = z.object({
  category: costItemCategorySchema.optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  plannedAmount: z
    .number()
    .min(0, 'Planned amount must be non-negative')
    .optional(),
  actualAmount: z
    .number()
    .min(0, 'Actual amount must be non-negative')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .optional(),
  wbsItemId: z.string().optional().nullable(),
});

/**
 * Schema for listing cost items
 */
export const listCostItemsFilterSchema = z.object({
  entityType: entityTypeSchema.optional(),
  entityId: z.string().optional(),
  wbsItemId: z.string().optional(),
  category: z
    .union([costItemCategorySchema, z.array(costItemCategorySchema)])
    .optional(),
  currency: z.string().optional(),
  sortBy: z
    .enum(['plannedAmount', 'actualAmount', 'category', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

/**
 * Invoice status enum
 */
export const invoiceStatusSchema = z.enum([
  'Draft',
  'Submitted',
  'Approved',
  'Paid',
  'Cancelled',
]);

/**
 * Schema for creating an invoice
 */
export const createInvoiceSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z
    .string()
    .min(1, 'Entity ID is required'),

  invoiceNumber: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number must be 100 characters or less'),
  vendorName: z
    .string()
    .min(1, 'Vendor name is required')
    .max(255, 'Vendor name must be 255 characters or less'),

  amount: z
    .number()
    .min(0, 'Amount must be non-negative'),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .default('USD'),

  invoiceDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string()),
  dueDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string()),

  status: invoiceStatusSchema.optional().default('Draft'),
  createdBy: z.string().optional(),
});

/**
 * Schema for updating an invoice
 */
export const updateInvoiceSchema = z.object({
  vendorName: z
    .string()
    .min(1, 'Vendor name is required')
    .max(255, 'Vendor name must be 255 characters or less')
    .optional(),
  amount: z
    .number()
    .min(0, 'Amount must be non-negative')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .optional(),
  invoiceDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string())
    .optional(),
  dueDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string())
    .optional(),
  status: invoiceStatusSchema.optional(),
});

/**
 * Schema for listing invoices
 */
export const listInvoicesFilterSchema = z.object({
  entityType: entityTypeSchema.optional(),
  entityId: z.string().optional(),
  status: z
    .union([invoiceStatusSchema, z.array(invoiceStatusSchema)])
    .optional(),
  vendorName: z.string().optional(),
  currency: z.string().optional(),
  fromDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string())
    .optional(),
  toDate: z
    .union([z.date(), z.string().datetime()])
    .or(z.string())
    .optional(),
  sortBy: z
    .enum(['invoiceDate', 'amount', 'status', 'createdAt'])
    .default('invoiceDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

// ============================================================================
// INVOICE ALLOCATION SCHEMAS
// ============================================================================

/**
 * Schema for creating an invoice allocation
 */
export const createInvoiceAllocationSchema = z.object({
  invoiceId: z
    .string()
    .min(1, 'Invoice ID is required'),
  wbsItemId: z
    .string()
    .min(1, 'WBS Item ID is required'),

  amount: z
    .number()
    .min(0, 'Amount must be non-negative'),
  percentage: z
    .number()
    .min(0, 'Percentage must be non-negative')
    .max(100, 'Percentage must not exceed 100'),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional(),
});

/**
 * Schema for updating an invoice allocation
 */
export const updateInvoiceAllocationSchema = z.object({
  amount: z
    .number()
    .min(0, 'Amount must be non-negative')
    .optional(),
  percentage: z
    .number()
    .min(0, 'Percentage must be non-negative')
    .max(100, 'Percentage must not exceed 100')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable(),
});

/**
 * Schema for listing invoice allocations
 */
export const listInvoiceAllocationsFilterSchema = z.object({
  invoiceId: z.string().optional(),
  wbsItemId: z.string().optional(),
  sortBy: z
    .enum(['amount', 'percentage', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CreateCostItemRequest = z.infer<typeof createCostItemSchema>;
export type UpdateCostItemRequest = z.infer<typeof updateCostItemSchema>;
export type ListCostItemsFilter = z.infer<typeof listCostItemsFilterSchema>;

export type CreateInvoiceRequest = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceRequest = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesFilter = z.infer<typeof listInvoicesFilterSchema>;

export type CreateInvoiceAllocationRequest = z.infer<typeof createInvoiceAllocationSchema>;
export type UpdateInvoiceAllocationRequest = z.infer<typeof updateInvoiceAllocationSchema>;
export type ListInvoiceAllocationsFilter = z.infer<typeof listInvoiceAllocationsFilterSchema>;
