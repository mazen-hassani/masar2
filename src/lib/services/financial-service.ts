/**
 * Financial Service
 * Cost items, invoices, and invoice allocations management
 */

import { PrismaClient } from '@prisma/client';
import {
  CostItem,
  Invoice,
  InvoiceAllocation,
  CostStatistics,
  InvoiceStatistics,
  BudgetVariance,
  CostBreakdown,
  PaymentSummary,
  CostItemResponse,
  InvoiceResponse,
  InvoiceWithAllocations,
} from '@/types/financial';
import type {
  CreateCostItemRequest,
  UpdateCostItemRequest,
  ListCostItemsFilter,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  ListInvoicesFilter,
  CreateInvoiceAllocationRequest,
  UpdateInvoiceAllocationRequest,
  ListInvoiceAllocationsFilter,
} from '@/lib/validation/financial-schema';

const prisma = new PrismaClient();

// ============================================================================
// COST ITEM SERVICE
// ============================================================================

export class CostItemService {
  /**
   * Get a single cost item
   */
  static async getCostItem(costItemId: string): Promise<CostItemResponse | null> {
    const item = await prisma.costItem.findUnique({
      where: { id: costItemId },
    });

    if (!item) return null;

    const planned = Number(item.plannedAmount);
    const actual = Number(item.actualAmount);
    const variance = planned - actual;
    const variancePercentage = planned > 0 ? (variance / planned) * 100 : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...item,
      plannedAmount: planned,
      actualAmount: actual,
      variance,
      variancePercentage,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: item.category as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityType: item.entityType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * List cost items with filtering
   */
  static async listCostItems(
    filter?: Partial<ListCostItemsFilter>
  ): Promise<{ items: CostItemResponse[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.entityId) where.entityId = filter.entityId;
    if (filter?.wbsItemId) where.wbsItemId = filter.wbsItemId;
    if (filter?.currency) where.currency = filter.currency;

    if (filter?.category) {
      if (Array.isArray(filter.category)) {
        where.category = { in: filter.category };
      } else {
        where.category = filter.category;
      }
    }

    const [items, total] = await Promise.all([
      prisma.costItem.findMany({
        where,
        orderBy: {
          [filter?.sortBy || 'createdAt']: filter?.sortOrder || 'asc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.costItem.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const planned = Number(item.plannedAmount);
        const actual = Number(item.actualAmount);
        const variance = planned - actual;
        const variancePercentage = planned > 0 ? (variance / planned) * 100 : 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {
          ...item,
          plannedAmount: planned,
          actualAmount: actual,
          variance,
          variancePercentage,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: item.category as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          entityType: item.entityType as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }),
      total,
    };
  }

  /**
   * Create a new cost item
   */
  static async createCostItem(data: CreateCostItemRequest): Promise<CostItem> {
    const item = await prisma.costItem.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        wbsItemId: data.wbsItemId || null,
        category: data.category,
        description: data.description || null,
        plannedAmount: data.plannedAmount,
        currency: data.currency || 'USD',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...item,
      plannedAmount: Number(item.plannedAmount),
      actualAmount: Number(item.actualAmount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: item.category as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityType: item.entityType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update a cost item
   */
  static async updateCostItem(
    costItemId: string,
    data: UpdateCostItemRequest
  ): Promise<CostItem> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.plannedAmount !== undefined) updateData.plannedAmount = data.plannedAmount;
    if (data.actualAmount !== undefined) updateData.actualAmount = data.actualAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.wbsItemId !== undefined) updateData.wbsItemId = data.wbsItemId;

    const item = await prisma.costItem.update({
      where: { id: costItemId },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...item,
      plannedAmount: Number(item.plannedAmount),
      actualAmount: Number(item.actualAmount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: item.category as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityType: item.entityType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Delete a cost item
   */
  static async deleteCostItem(costItemId: string): Promise<void> {
    await prisma.costItem.delete({
      where: { id: costItemId },
    });
  }

  /**
   * Get cost statistics
   */
  static async getCostStatistics(
    entityType?: string,
    entityId?: string
  ): Promise<CostStatistics> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const items = await prisma.costItem.findMany({ where });

    const byCategory: Record<string, number> = {};
    let totalPlanned = 0;
    let totalActual = 0;
    let overBudgetCount = 0;

    for (const item of items) {
      byCategory[item.category] = (byCategory[item.category] ?? 0) + Number(item.plannedAmount);
      totalPlanned += Number(item.plannedAmount);
      totalActual += Number(item.actualAmount);

      if (Number(item.actualAmount) > Number(item.plannedAmount)) {
        overBudgetCount++;
      }
    }

    const variance = totalPlanned - totalActual;
    const variancePercentage = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      totalPlanned,
      totalActual,
      totalVariance: variance,
      variancePercentage,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      costsByCategory: byCategory as any,
      overBudgetItems: overBudgetCount,
      currency: 'USD',
    };
  }

  /**
   * Get cost breakdown by category
   */
  static async getCostBreakdown(
    entityType?: string,
    entityId?: string
  ): Promise<CostBreakdown[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const items = await prisma.costItem.findMany({ where });

    // Group by category
    const breakdown: Record<string, CostBreakdown> = {};

    for (const item of items) {
      if (!breakdown[item.category]) {
        breakdown[item.category] = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: item.category as any,
          plannedAmount: 0,
          actualAmount: 0,
          variance: 0,
          items: [],
        };
      }

      const bd = breakdown[item.category];
      if (bd) {
        const planned = Number(item.plannedAmount);
        const actual = Number(item.actualAmount);
        bd.plannedAmount += planned;
        bd.actualAmount += actual;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bd.items.push(item as any);
      }
    }

    // Calculate variances
    for (const key of Object.keys(breakdown)) {
      const bd = breakdown[key];
      if (bd) {
        bd.variance = bd.plannedAmount - bd.actualAmount;
      }
    }

    return Object.values(breakdown).filter((bd): bd is CostBreakdown => bd !== undefined);
  }

  /**
   * Get budget variance analysis
   */
  static async getBudgetVariance(
    entityType?: string,
    entityId?: string
  ): Promise<BudgetVariance[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const items = await prisma.costItem.findMany({ where });

    return items.map((item) => {
      const planned = Number(item.plannedAmount);
      const actual = Number(item.actualAmount);
      const variance = planned - actual;
      const variancePercentage = planned > 0 ? (variance / planned) * 100 : 0;

      // Determine status based on variance percentage
      let status: 'Under' | 'On-Target' | 'Over' = 'On-Target';
      if (variancePercentage > 5) {
        status = 'Under';
      } else if (variancePercentage < -5) {
        status = 'Over';
      }

      return {
        itemId: item.id,
        description: item.description,
        planned,
        actual,
        variance,
        variancePercentage,
        status,
      };
    });
  }
}

// ============================================================================
// INVOICE SERVICE
// ============================================================================

export class InvoiceService {
  /**
   * Get a single invoice with allocations
   */
  static async getInvoice(invoiceId: string): Promise<InvoiceWithAllocations | null> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { allocations: true },
    });

    if (!invoice) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...invoice,
      amount: Number(invoice.amount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allocations: invoice.allocations.map((a) => ({
        ...a,
        amount: Number(a.amount),
        percentage: Number(a.percentage),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: invoice.status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityType: invoice.entityType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * List invoices with filtering
   */
  static async listInvoices(
    filter?: Partial<ListInvoicesFilter>
  ): Promise<{ invoices: InvoiceResponse[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.entityId) where.entityId = filter.entityId;
    if (filter?.vendorName) where.vendorName = { contains: filter.vendorName, mode: 'insensitive' };
    if (filter?.currency) where.currency = filter.currency;

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status };
      } else {
        where.status = filter.status;
      }
    }

    if (filter?.fromDate || filter?.toDate) {
      where.invoiceDate = {};
      if (filter?.fromDate) {
        where.invoiceDate.gte = typeof filter.fromDate === 'string'
          ? new Date(filter.fromDate)
          : filter.fromDate;
      }
      if (filter?.toDate) {
        where.invoiceDate.lte = typeof filter.toDate === 'string'
          ? new Date(filter.toDate)
          : filter.toDate;
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { allocations: true },
        orderBy: {
          [filter?.sortBy || 'invoiceDate']: filter?.sortOrder || 'desc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices: invoices.map((inv) => {
        const totalAllocated = inv.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
        const amount = Number(inv.amount);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {
          ...inv,
          amount,
          allocatedAmount: totalAllocated,
          unallocatedAmount: amount - totalAllocated,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: inv.status as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          entityType: inv.entityType as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }),
      total,
    };
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    const invoiceDate = typeof data.invoiceDate === 'string'
      ? new Date(data.invoiceDate)
      : data.invoiceDate;
    const dueDate = typeof data.dueDate === 'string'
      ? new Date(data.dueDate)
      : data.dueDate;

    const invoice = await prisma.invoice.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        invoiceNumber: data.invoiceNumber,
        vendorName: data.vendorName,
        amount: data.amount,
        currency: data.currency || 'USD',
        invoiceDate,
        dueDate,
        status: data.status || 'Draft',
        createdBy: data.createdBy || null,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...invoice,
      amount: Number(invoice.amount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: invoice.status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityType: invoice.entityType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update an invoice
   */
  static async updateInvoice(
    invoiceId: string,
    data: UpdateInvoiceRequest
  ): Promise<Invoice> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.vendorName !== undefined) updateData.vendorName = data.vendorName;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.invoiceDate !== undefined) {
      updateData.invoiceDate = typeof data.invoiceDate === 'string'
        ? new Date(data.invoiceDate)
        : data.invoiceDate;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = typeof data.dueDate === 'string'
        ? new Date(data.dueDate)
        : data.dueDate;
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...invoice,
      amount: Number(invoice.amount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: invoice.status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityType: invoice.entityType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Delete an invoice
   */
  static async deleteInvoice(invoiceId: string): Promise<void> {
    await prisma.invoice.delete({
      where: { id: invoiceId },
    });
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStatistics(
    entityType?: string,
    entityId?: string
  ): Promise<InvoiceStatistics> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { allocations: true },
    });

    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    let totalAllocated = 0;
    let overdueCount = 0;
    const now = new Date();

    for (const inv of invoices) {
      byStatus[inv.status] = (byStatus[inv.status] ?? 0) + 1;
      const amount = Number(inv.amount);
      totalAmount += amount;

      const allocated = inv.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
      totalAllocated += allocated;

      if (inv.dueDate < now && inv.status !== 'Paid') {
        overdueCount++;
      }
    }

    const avgAmount = invoices.length > 0 ? totalAmount / invoices.length : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      totalInvoices: invoices.length,
      totalAmount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoicesByStatus: byStatus as any,
      totalAllocated,
      totalUnallocated: totalAmount - totalAllocated,
      averageInvoiceAmount: avgAmount,
      overdueInvoices: overdueCount,
      currency: 'USD',
    };
  }

  /**
   * Get payment summary
   */
  static async getPaymentSummary(
    entityType?: string,
    entityId?: string
  ): Promise<PaymentSummary> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const invoices = await prisma.invoice.findMany({ where });

    const summary: PaymentSummary = {
      draft: 0,
      submitted: 0,
      approved: 0,
      paid: 0,
      cancelled: 0,
      totalAmount: 0,
      paidAmount: 0,
    };

    for (const inv of invoices) {
      const amount = Number(inv.amount);
      summary.totalAmount += amount;

      switch (inv.status) {
        case 'Draft':
          summary.draft++;
          break;
        case 'Submitted':
          summary.submitted++;
          break;
        case 'Approved':
          summary.approved++;
          break;
        case 'Paid':
          summary.paid++;
          summary.paidAmount += amount;
          break;
        case 'Cancelled':
          summary.cancelled++;
          break;
      }
    }

    return summary;
  }
}

// ============================================================================
// INVOICE ALLOCATION SERVICE
// ============================================================================

export class InvoiceAllocationService {
  /**
   * Get a single allocation
   */
  static async getAllocation(allocationId: string): Promise<InvoiceAllocation | null> {
    const allocation = await prisma.invoiceAllocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...allocation,
      amount: Number(allocation.amount),
      percentage: Number(allocation.percentage),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * List allocations with filtering
   */
  static async listAllocations(
    filter?: Partial<ListInvoiceAllocationsFilter>
  ): Promise<{ allocations: InvoiceAllocation[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter?.invoiceId) where.invoiceId = filter.invoiceId;
    if (filter?.wbsItemId) where.wbsItemId = filter.wbsItemId;

    const [allocations, total] = await Promise.all([
      prisma.invoiceAllocation.findMany({
        where,
        orderBy: {
          [filter?.sortBy || 'createdAt']: filter?.sortOrder || 'desc',
        },
        skip: filter?.skip || 0,
        take: filter?.take || 20,
      }),
      prisma.invoiceAllocation.count({ where }),
    ]);

    return {
      allocations: allocations.map((a) => ({
        ...a,
        amount: Number(a.amount),
        percentage: Number(a.percentage),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      total,
    };
  }

  /**
   * Create a new allocation
   */
  static async createAllocation(
    data: CreateInvoiceAllocationRequest
  ): Promise<InvoiceAllocation> {
    const allocation = await prisma.invoiceAllocation.create({
      data: {
        invoiceId: data.invoiceId,
        wbsItemId: data.wbsItemId,
        amount: data.amount,
        percentage: data.percentage,
        notes: data.notes || null,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...allocation,
      amount: Number(allocation.amount),
      percentage: Number(allocation.percentage),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Update an allocation
   */
  static async updateAllocation(
    allocationId: string,
    data: UpdateInvoiceAllocationRequest
  ): Promise<InvoiceAllocation> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.percentage !== undefined) updateData.percentage = data.percentage;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const allocation = await prisma.invoiceAllocation.update({
      where: { id: allocationId },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...allocation,
      amount: Number(allocation.amount),
      percentage: Number(allocation.percentage),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  /**
   * Delete an allocation
   */
  static async deleteAllocation(allocationId: string): Promise<void> {
    await prisma.invoiceAllocation.delete({
      where: { id: allocationId },
    });
  }
}
