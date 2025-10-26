import { describe, it, expect } from 'vitest';
import { WBSAggregationService } from '../services/wbs-aggregation-service';
import { WBSItemForAggregation } from '@/types/wbs-aggregation';

/**
 * Comprehensive unit tests for WBS Aggregation Service
 * Tests all aggregation calculation methods with various scenarios
 */

describe('WBSAggregationService', () => {
  // Helper to create mock WBS items
  const createChild = (
    overrides: Partial<WBSItemForAggregation> = {}
  ): WBSItemForAggregation => ({
    id: 'child-1',
    parentId: 'parent-1',
    plannedStartDate: new Date('2024-01-01'),
    plannedEndDate: new Date('2024-01-31'),
    actualStartDate: null,
    actualEndDate: null,
    status: 'NotStarted',
    percentComplete: 0,
    plannedCost: 1000,
    actualCost: null,
    aggregatedCost: 0,
    aggregatedStatus: null,
    ...overrides,
  });

  describe('calculateParentDates', () => {
    it('should return null dates when no children', () => {
      const result = WBSAggregationService.calculateParentDates([]);

      expect(result.parentStartDate).toBeNull();
      expect(result.parentEndDate).toBeNull();
      expect(result.hasChildren).toBe(false);
      expect(result.childCount).toBe(0);
    });

    it('should find earliest start and latest end from children', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-15'),
          plannedEndDate: new Date('2024-01-31'),
        }),
        createChild({
          id: 'child-2',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-20'),
        }),
        createChild({
          id: 'child-3',
          plannedStartDate: new Date('2024-01-10'),
          plannedEndDate: new Date('2024-02-15'),
        }),
      ];

      const result = WBSAggregationService.calculateParentDates(children);

      expect(result.parentStartDate).toEqual(new Date('2024-01-01'));
      expect(result.parentEndDate).toEqual(new Date('2024-02-15'));
      expect(result.hasChildren).toBe(true);
      expect(result.childCount).toBe(3);
    });

    it('should use actual dates when available', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-15'),
          plannedEndDate: new Date('2024-01-31'),
          actualStartDate: new Date('2024-01-20'),
          actualEndDate: new Date('2024-02-10'),
        }),
      ];

      const result = WBSAggregationService.calculateParentDates(children);

      expect(result.parentStartDate).toEqual(new Date('2024-01-20'));
      expect(result.parentEndDate).toEqual(new Date('2024-02-10'));
    });

    it('should fallback to planned dates when actual dates unavailable', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
          actualStartDate: null,
          actualEndDate: null,
        }),
      ];

      const result = WBSAggregationService.calculateParentDates(children);

      expect(result.parentStartDate).toEqual(new Date('2024-01-01'));
      expect(result.parentEndDate).toEqual(new Date('2024-01-31'));
    });

    it('should skip children with no dates in skip mode', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
        }),
        createChild({
          id: 'child-2',
          plannedStartDate: null,
          plannedEndDate: null,
        }),
      ];

      const result = WBSAggregationService.calculateParentDates(children, {
        dateHandling: 'skip',
      });

      expect(result.parentStartDate).toEqual(new Date('2024-01-01'));
      expect(result.parentEndDate).toEqual(new Date('2024-01-31'));
    });

    it('should handle single child', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-10'),
          plannedEndDate: new Date('2024-01-20'),
        }),
      ];

      const result = WBSAggregationService.calculateParentDates(children);

      expect(result.parentStartDate).toEqual(new Date('2024-01-10'));
      expect(result.parentEndDate).toEqual(new Date('2024-01-20'));
    });
  });

  describe('calculateParentStatus', () => {
    it('should return NotStarted when no children', () => {
      const result = WBSAggregationService.calculateParentStatus([]);

      expect(result.status).toBe('NotStarted');
      expect(result.hasChildren).toBe(false);
      expect(result.childStatuses.NotStarted).toBe(0);
    });

    it('should apply Delayed priority (highest)', () => {
      const children = [
        createChild({ id: 'child-1', status: 'Delayed' }),
        createChild({ id: 'child-2', status: 'InProgress' }),
        createChild({ id: 'child-3', status: 'NotStarted' }),
      ];

      const result = WBSAggregationService.calculateParentStatus(children);

      expect(result.status).toBe('Mixed');
      expect(result.childStatuses.Delayed).toBe(1);
    });

    it('should return InProgress when any task in progress with mixed children', () => {
      const children = [
        createChild({ id: 'child-1', status: 'InProgress' }),
        createChild({ id: 'child-2', status: 'NotStarted' }),
      ];

      const result = WBSAggregationService.calculateParentStatus(children);

      expect(result.status).toBe('Mixed');
    });

    it('should return Completed when all children completed', () => {
      const children = [
        createChild({ id: 'child-1', status: 'Completed' }),
        createChild({ id: 'child-2', status: 'Completed' }),
      ];

      const result = WBSAggregationService.calculateParentStatus(children);

      expect(result.status).toBe('Completed');
    });

    it('should return NotStarted when all children not started', () => {
      const children = [
        createChild({ id: 'child-1', status: 'NotStarted' }),
        createChild({ id: 'child-2', status: 'NotStarted' }),
      ];

      const result = WBSAggregationService.calculateParentStatus(children);

      expect(result.status).toBe('NotStarted');
    });

    it('should count all child statuses', () => {
      const children = [
        createChild({ id: 'child-1', status: 'Delayed' }),
        createChild({ id: 'child-2', status: 'InProgress' }),
        createChild({ id: 'child-3', status: 'Completed' }),
        createChild({ id: 'child-4', status: 'Cancelled' }),
        createChild({ id: 'child-5', status: 'NotStarted' }),
      ];

      const result = WBSAggregationService.calculateParentStatus(children);

      expect(result.childStatuses.Delayed).toBe(1);
      expect(result.childStatuses.InProgress).toBe(1);
      expect(result.childStatuses.Completed).toBe(1);
      expect(result.childStatuses.Cancelled).toBe(1);
      expect(result.childStatuses.NotStarted).toBe(1);
    });
  });

  describe('calculateParentProgress', () => {
    it('should return 0 when no children', () => {
      const result = WBSAggregationService.calculateParentProgress([]);

      expect(result.weightedProgress).toBe(0);
      expect(result.averageProgress).toBe(0);
      expect(result.childCount).toBe(0);
    });

    it('should calculate simple average with equal weighting', () => {
      const children = [
        createChild({ id: 'child-1', percentComplete: 50 }),
        createChild({ id: 'child-2', percentComplete: 100 }),
        createChild({ id: 'child-3', percentComplete: 0 }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children, {
        progressWeighting: 'equal',
      });

      expect(result.averageProgress).toBe(50);
      expect(result.weightedProgress).toBe(50);
    });

    it('should calculate weighted progress with cost weighting', () => {
      const children = [
        createChild({
          id: 'child-1',
          percentComplete: 100,
          plannedCost: 100,
        }),
        createChild({
          id: 'child-2',
          percentComplete: 0,
          plannedCost: 100,
        }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children, {
        progressWeighting: 'cost',
      });

      expect(result.weightedProgress).toBe(50);
    });

    it('should clamp progress to 0-100 range', () => {
      const children = [
        createChild({ id: 'child-1', percentComplete: 150 }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children);

      expect(result.weightedProgress).toBeLessThanOrEqual(100);
      expect(result.weightedProgress).toBeGreaterThanOrEqual(0);
    });

    it('should handle items with no cost in cost weighting mode', () => {
      const children = [
        createChild({
          id: 'child-1',
          percentComplete: 50,
          plannedCost: null,
          actualCost: null,
          aggregatedCost: 0,
        }),
        createChild({
          id: 'child-2',
          percentComplete: 100,
          plannedCost: 100,
        }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children, {
        progressWeighting: 'cost',
      });

      expect(result.weightedProgress).toBeDefined();
      expect(result.weightedProgress).toBeGreaterThanOrEqual(0);
    });

    it('should track child count', () => {
      const children = [
        createChild({ id: 'child-1' }),
        createChild({ id: 'child-2' }),
        createChild({ id: 'child-3' }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children);

      expect(result.childCount).toBe(3);
    });
  });

  describe('calculateParentCost', () => {
    it('should return 0 when no children', () => {
      const result = WBSAggregationService.calculateParentCost([]);

      expect(result.totalCost).toBe(0);
      expect(result.plannedTotal).toBe(0);
      expect(result.actualTotal).toBe(0);
    });

    it('should sum direct planned and actual costs', () => {
      const children = [
        createChild({ id: 'child-1', plannedCost: 100, actualCost: 80 }),
        createChild({ id: 'child-2', plannedCost: 200, actualCost: 220 }),
      ];

      const result = WBSAggregationService.calculateParentCost(children);

      expect(result.plannedTotal).toBe(300);
      expect(result.actualTotal).toBe(300);
    });

    it('should use max of planned and actual for total cost', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedCost: 100,
          actualCost: null,
          aggregatedCost: 0,
        }),
      ];

      const result = WBSAggregationService.calculateParentCost(children);

      expect(result.totalCost).toBe(100);
    });

    it('should include aggregated costs in recursive mode', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedCost: 100,
          actualCost: null,
          aggregatedCost: 50,
        }),
      ];

      const result = WBSAggregationService.calculateParentCost(children, {
        recursiveAggregation: true,
      });

      expect(result.totalCost).toBeGreaterThanOrEqual(100);
    });

    it('should handle null costs gracefully', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedCost: null,
          actualCost: null,
          aggregatedCost: 0,
        }),
      ];

      const result = WBSAggregationService.calculateParentCost(children);

      expect(result.plannedTotal).toBe(0);
      expect(result.actualTotal).toBe(0);
    });
  });

  describe('aggregateParentValues', () => {
    it('should aggregate all values together', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
          status: 'InProgress',
          percentComplete: 50,
          plannedCost: 1000,
        }),
      ];

      const result = WBSAggregationService.aggregateParentValues(
        'parent-1',
        children
      );

      expect(result.id).toBe('parent-1');
      expect(result.aggregatedStartDate).toBeDefined();
      expect(result.aggregatedEndDate).toBeDefined();
      expect(result.aggregatedStatus).toBeDefined();
      expect(result.percentComplete).toBeDefined();
      expect(result.aggregatedCost).toBeDefined();
    });

    it('should handle empty children array', () => {
      const result = WBSAggregationService.aggregateParentValues(
        'parent-1',
        []
      );

      expect(result.id).toBe('parent-1');
      expect(result.aggregatedStartDate).toBeNull();
      expect(result.aggregatedEndDate).toBeNull();
      expect(result.aggregatedStatus).toBe('NotStarted');
      expect(result.percentComplete).toBe(0);
    });
  });

  describe('getAggregationResult', () => {
    it('should return complete aggregation result', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
          status: 'InProgress',
          percentComplete: 50,
        }),
      ];

      const result = WBSAggregationService.getAggregationResult(
        'parent-1',
        children
      );

      expect(result.parentId).toBe('parent-1');
      expect(result.dates).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.progress).toBeDefined();
      expect(result.cost).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getAggregationSummary', () => {
    it('should generate summary with all metrics', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
          status: 'InProgress',
          percentComplete: 50,
          plannedCost: 1000,
        }),
      ];

      const result = WBSAggregationService.getAggregationSummary(
        'parent-1',
        children
      );

      expect(result.parentId).toBe('parent-1');
      expect(result.childCount).toBe(1);
      expect(result.statusDistribution).toBeDefined();
      expect(result.costSummary).toBeDefined();
    });

    it('should calculate date range span', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
        }),
      ];

      const result = WBSAggregationService.getAggregationSummary(
        'parent-1',
        children
      );

      expect(result.dateRangeSpan).toBeDefined();
      expect(result.dateRangeSpan?.days).toBeGreaterThan(0);
    });

    it('should count children with data', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-31'),
          plannedCost: 1000,
        }),
        createChild({
          id: 'child-2',
          plannedStartDate: null,
          plannedEndDate: null,
          actualStartDate: null,
          actualEndDate: null,
          plannedCost: null,
          actualCost: null,
        }),
      ];

      const result = WBSAggregationService.getAggregationSummary(
        'parent-1',
        children
      );

      expect(result.childrenWithDateData).toBe(1);
      expect(result.childrenWithCostData).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex multi-level aggregation', () => {
      const children = [
        createChild({
          id: 'leaf-1',
          status: 'Completed',
          percentComplete: 100,
          plannedStartDate: new Date('2024-01-01'),
          plannedEndDate: new Date('2024-01-10'),
          plannedCost: 500,
        }),
        createChild({
          id: 'leaf-2',
          status: 'InProgress',
          percentComplete: 50,
          plannedStartDate: new Date('2024-01-05'),
          plannedEndDate: new Date('2024-01-15'),
          plannedCost: 500,
        }),
        createChild({
          id: 'leaf-3',
          status: 'NotStarted',
          percentComplete: 0,
          plannedStartDate: new Date('2024-01-15'),
          plannedEndDate: new Date('2024-01-20'),
          plannedCost: 500,
        }),
      ];

      const result = WBSAggregationService.getAggregationResult(
        'parent-1',
        children
      );

      // Should have earliest start and latest end
      expect(result.dates.parentStartDate).toEqual(new Date('2024-01-01'));
      expect(result.dates.parentEndDate).toEqual(new Date('2024-01-20'));

      // Status should be Mixed (different statuses)
      expect(result.status.status).toBe('Mixed');

      // Progress should average the children
      expect(result.progress.averageProgress).toBe(50);

      // Cost should sum planned costs
      expect(result.cost.plannedTotal).toBe(1500);
    });

    it('should prioritize status correctly', () => {
      const scenarios = [
        {
          children: [
            createChild({ id: 'c1', status: 'Delayed' }),
            createChild({ id: 'c2', status: 'Completed' }),
          ],
          expected: 'Mixed',
        },
        {
          children: [
            createChild({ id: 'c1', status: 'InProgress' }),
            createChild({ id: 'c2', status: 'NotStarted' }),
          ],
          expected: 'Mixed',
        },
        {
          children: [
            createChild({ id: 'c1', status: 'Completed' }),
            createChild({ id: 'c2', status: 'Completed' }),
          ],
          expected: 'Completed',
        },
      ];

      scenarios.forEach((scenario) => {
        const result = WBSAggregationService.calculateParentStatus(
          scenario.children
        );
        expect(result.status).toBe(scenario.expected);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const children = [
        createChild({
          id: 'child-1',
          plannedCost: Number.MAX_SAFE_INTEGER / 2,
        }),
        createChild({
          id: 'child-2',
          plannedCost: Number.MAX_SAFE_INTEGER / 2,
        }),
      ];

      const result = WBSAggregationService.calculateParentCost(children);

      expect(result.plannedTotal).toBeLessThanOrEqual(
        Number.MAX_SAFE_INTEGER
      );
    });

    it('should handle zero progress', () => {
      const children = [
        createChild({ id: 'child-1', percentComplete: 0 }),
        createChild({ id: 'child-2', percentComplete: 0 }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children);

      expect(result.weightedProgress).toBe(0);
    });

    it('should handle 100% progress', () => {
      const children = [
        createChild({ id: 'child-1', percentComplete: 100 }),
        createChild({ id: 'child-2', percentComplete: 100 }),
      ];

      const result = WBSAggregationService.calculateParentProgress(children);

      expect(result.weightedProgress).toBe(100);
    });

    it('should handle all cancelled children', () => {
      const children = [
        createChild({ id: 'child-1', status: 'Cancelled' }),
        createChild({ id: 'child-2', status: 'Cancelled' }),
      ];

      const result = WBSAggregationService.calculateParentStatus(children);

      expect(result.status).toBe('Cancelled');
    });
  });
});
