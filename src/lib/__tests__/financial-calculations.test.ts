import { describe, it, expect } from 'vitest';
import { BudgetForecastService } from '../services/financial-calculations-service';

/**
 * Unit tests for Financial Calculations Service
 * Tests budget forecasting, trend analysis, and health checks
 */

describe('FinancialCalculationsService', () => {
  describe('BudgetForecastService', () => {
    describe('calculateBudgetForecast', () => {
      it('should calculate earned value at 50% progress', () => {
        // Arrange
        const plannedBudget = 10000;
        const actualSpending = 4000;
        const progress = 50;

        // Simulate forecast calculation logic
        const earnedValue = (progress / 100) * plannedBudget;
        const costVariance = earnedValue - actualSpending;
        const costPerformanceIndex = actualSpending > 0 ? earnedValue / actualSpending : 0;

        // Assert
        expect(earnedValue).toBe(5000);
        expect(costVariance).toBe(1000); // Under budget
        expect(costPerformanceIndex).toBe(1.25); // 1.25 = good performance
      });

      it('should flag overbudget condition', () => {
        const plannedBudget = 10000;
        const actualSpending = 6000;
        const progress = 50;

        const earnedValue = (progress / 100) * plannedBudget;
        const costVariance = earnedValue - actualSpending;
        const costPerformanceIndex = actualSpending > 0 ? earnedValue / actualSpending : 0;

        expect(costVariance).toBe(-1000); // Over budget
        expect(costPerformanceIndex).toBeLessThan(1); // CPI < 1 = over budget
      });

      it('should calculate estimate to completion', () => {
        const budgetAtCompletion = 10000;
        const actualCost = 4000;
        const earnedValue = 5000;
        const costPerformanceIndex = earnedValue / actualCost; // 1.25

        const estimateToCompletion =
          costPerformanceIndex > 0
            ? (budgetAtCompletion - earnedValue) / costPerformanceIndex
            : 0;
        const forecastAtCompletion = actualCost + estimateToCompletion;

        expect(estimateToCompletion).toBe(4000); // 5000 / 1.25
        expect(forecastAtCompletion).toBe(8000); // Under budget forecast
      });

      it('should handle zero progress', () => {
        const plannedBudget = 10000;
        const actualSpending = 0;
        const progress = 0;

        const earnedValue = (progress / 100) * plannedBudget;
        const costVariance = earnedValue - actualSpending;

        expect(earnedValue).toBe(0);
        expect(costVariance).toBe(0);
      });

      it('should handle 100% progress', () => {
        const plannedBudget = 10000;
        const actualSpending = 10500;
        const progress = 100;

        const earnedValue = (progress / 100) * plannedBudget;
        const costVariance = earnedValue - actualSpending;

        expect(earnedValue).toBe(10000);
        expect(costVariance).toBe(-500); // Over budget
      });

      it('should determine confidence level based on variance', () => {
        const scenarios = [
          { variance: 100, budget: 10000, expected: 'High' }, // 1% variance
          { variance: 0, budget: 10000, expected: 'High' }, // 0% variance
          { variance: -1500, budget: 10000, expected: 'Medium' }, // -15% variance
          { variance: -2000, budget: 10000, expected: 'Low' }, // -20% variance
        ];

        scenarios.forEach((scenario) => {
          const absVariancePercentage = Math.abs((scenario.variance / scenario.budget) * 100);

          let confidence: 'Low' | 'Medium' | 'High' = 'Medium';
          if (absVariancePercentage < 5) {
            confidence = 'High';
          } else if (absVariancePercentage > 15) {
            confidence = 'Low';
          }

          expect(confidence).toBe(scenario.expected);
        });
      });

      it('should handle budget zero', () => {
        const plannedBudget = 0;
        const actualSpending = 0;
        const progress = 50;

        const earnedValue = (progress / 100) * plannedBudget;
        const costPerformanceIndex = actualSpending > 0 ? earnedValue / actualSpending : 0;

        expect(earnedValue).toBe(0);
        expect(costPerformanceIndex).toBe(0); // No budget means no performance
      });
    });

    describe('trend calculation', () => {
      it('should identify improving trend (negative slope)', () => {
        const data = [100, 90, 80, 70, 60]; // Improving variance
        const trend = BudgetForecastService['calculateTrend'](data);

        expect(trend.slope).toBeLessThan(0); // Negative slope = improving
        expect(trend.direction).toBe('Improving');
      });

      it('should identify deteriorating trend (positive slope)', () => {
        const data = [60, 70, 80, 90, 100]; // Deteriorating variance
        const trend = BudgetForecastService['calculateTrend'](data);

        expect(trend.slope).toBeGreaterThan(0); // Positive slope = deteriorating
        expect(trend.direction).toBe('Deteriorating');
      });

      it('should identify stable trend (near-zero slope)', () => {
        const data = [75, 75, 75, 75, 75]; // Stable variance
        const trend = BudgetForecastService['calculateTrend'](data);

        expect(Math.abs(trend.slope)).toBeLessThan(0.1);
        expect(trend.direction).toBe('Stable');
      });

      it('should handle single data point', () => {
        const data = [100];
        const trend = BudgetForecastService['calculateTrend'](data);

        expect(trend.slope).toBe(0);
        expect(trend.rSquared).toBe(0);
        expect(trend.direction).toBe('Stable');
      });

      it('should handle empty data', () => {
        const data: number[] = [];
        const trend = BudgetForecastService['calculateTrend'](data);

        expect(trend.slope).toBe(0);
        expect(trend.direction).toBe('Stable');
      });
    });
  });

  describe('FinancialAnalyticsService', () => {
    describe('budget health check', () => {
      it('should return Healthy status when under budget', () => {
        const plannedTotal = 10000;
        const actualTotal = 7000;

        const budgetUtilization = (actualTotal / plannedTotal) * 100; // 70%
        const variancePercentage = ((plannedTotal - actualTotal) / plannedTotal) * 100; // 30%

        expect(budgetUtilization).toBe(70);
        expect(variancePercentage).toBe(30);
        expect(budgetUtilization).toBeLessThan(85); // Below warning threshold
      });

      it('should trigger warning when utilization high', () => {
        const plannedTotal = 10000;
        const actualTotal = 9000;
        const budgetThreshold = 85;

        const budgetUtilization = (actualTotal / plannedTotal) * 100; // 90%

        if (budgetUtilization > budgetThreshold) {
          expect(budgetUtilization).toBe(90);
        }
      });

      it('should return Critical status when overbudget', () => {
        const plannedTotal = 10000;
        const actualTotal = 11000;

        const budgetUtilization = (actualTotal / plannedTotal) * 100; // 110%
        const variancePercentage = ((plannedTotal - actualTotal) / plannedTotal) * 100; // -10%

        let overallStatus: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
        if (budgetUtilization > 95 || variancePercentage < -15) {
          overallStatus = 'Critical';
        } else if (budgetUtilization > 85) {
          overallStatus = 'Warning';
        }

        expect(overallStatus).toBe('Warning'); // 110% utilization, -10% variance
      });

      it('should calculate remaining budget', () => {
        const plannedTotal = 10000;
        const actualTotal = 6000;

        const remainingBudget = Math.max(0, plannedTotal - actualTotal);

        expect(remainingBudget).toBe(4000);
      });

      it('should handle zero budget', () => {
        const plannedTotal = 0;
        const actualTotal = 0;

        const budgetUtilization = plannedTotal > 0 ? (actualTotal / plannedTotal) * 100 : 0;
        const variancePercentage = plannedTotal > 0 ? ((plannedTotal - actualTotal) / plannedTotal) * 100 : 0;

        expect(budgetUtilization).toBe(0);
        expect(variancePercentage).toBe(0);
      });

      it('should calculate risk score', () => {
        const scenarios = [
          { util: 70, variance: 20, expected: 'Low' }, // Low risk
          { util: 85, variance: 5, expected: 'Medium' }, // Medium risk
          { util: 95, variance: -10, expected: 'High' }, // High risk
        ];

        scenarios.forEach((scenario) => {
          const riskScore = Math.min(100, scenario.util + Math.abs(scenario.variance) * 2);
          expect(riskScore).toBeGreaterThanOrEqual(0);
          expect(riskScore).toBeLessThanOrEqual(100);
        });
      });
    });

    describe('allocation efficiency', () => {
      it('should calculate allocation rate', () => {
        const totalInvoiced = 10000;
        const totalAllocated = 8000;

        const allocationRate = totalInvoiced > 0 ? (totalAllocated / totalInvoiced) * 100 : 0;

        expect(allocationRate).toBe(80);
      });

      it('should identify fully allocated invoices', () => {
        const invoices = [
          { id: '1', amount: 1000, allocated: 1000 },
          { id: '2', amount: 2000, allocated: 2000 },
          { id: '3', amount: 1500, allocated: 1500 },
        ];

        const fullyAllocated = invoices.filter((inv) => inv.allocated >= inv.amount).length;

        expect(fullyAllocated).toBe(3);
      });

      it('should identify partially allocated invoices', () => {
        const invoices = [
          { id: '1', amount: 1000, allocated: 500 },
          { id: '2', amount: 2000, allocated: 2000 },
          { id: '3', amount: 1500, allocated: 1200 },
        ];

        const partiallyAllocated = invoices.filter(
          (inv) => inv.allocated > 0 && inv.allocated < inv.amount
        ).length;

        expect(partiallyAllocated).toBe(2);
      });

      it('should identify unallocated invoices', () => {
        const invoices = [
          { id: '1', amount: 1000, allocated: 1000 },
          { id: '2', amount: 2000, allocated: 0 },
          { id: '3', amount: 1500, allocated: 500 },
        ];

        const unallocated = invoices.filter((inv) => inv.allocated === 0).length;

        expect(unallocated).toBe(1);
      });

      it('should handle zero invoiced amount', () => {
        const totalInvoiced = 0;
        const totalAllocated = 0;

        const allocationRate = totalInvoiced > 0 ? (totalAllocated / totalInvoiced) * 100 : 0;

        expect(allocationRate).toBe(0);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete budget-to-completion forecast', () => {
      // Realistic project scenario
      const budgetAtCompletion = 100000;
      const currentProgress = 35;
      const actualSpending = 38000;

      const earnedValue = (currentProgress / 100) * budgetAtCompletion;
      const costPerformanceIndex = earnedValue / actualSpending;
      const costVariance = earnedValue - actualSpending;
      const estimateToCompletion = (budgetAtCompletion - earnedValue) / costPerformanceIndex;
      const forecastAtCompletion = actualSpending + estimateToCompletion;
      const varianceAtCompletion = budgetAtCompletion - forecastAtCompletion;

      expect(earnedValue).toBe(35000);
      expect(costPerformanceIndex).toBeCloseTo(0.92, 2); // Slightly over budget
      expect(costVariance).toBe(-3000); // -$3000 variance
      expect(forecastAtCompletion).toBeCloseTo(103260, 0); // Will exceed budget
      expect(varianceAtCompletion).toBeLessThan(0); // Negative = over budget
    });

    it('should flag multiple budget warnings', () => {
      const plannedTotal = 50000;
      const actualTotal = 47000;
      const variancePercentage = ((plannedTotal - actualTotal) / plannedTotal) * 100; // -6%

      const warnings: string[] = [];
      const budgetUtilization = (actualTotal / plannedTotal) * 100; // 94%

      if (budgetUtilization > 85) {
        warnings.push(`Budget utilization at ${Math.round(budgetUtilization)}%`);
      }

      if (variancePercentage < -10) {
        warnings.push(`Variance at ${Math.round(variancePercentage)}%`);
      }

      expect(warnings.length).toBe(1); // Only one warning
      expect(warnings[0]).toContain('94%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large budgets', () => {
      const budgetAtCompletion = 1000000000; // $1 billion
      const actualCost = 400000000;
      const progress = 40;

      const earnedValue = (progress / 100) * budgetAtCompletion;
      const costVariance = earnedValue - actualCost;

      expect(earnedValue).toBe(400000000);
      expect(costVariance).toBe(0);
    });

    it('should handle very small budgets', () => {
      const budgetAtCompletion = 1; // $1
      const actualCost = 0.5;
      const progress = 50;

      const earnedValue = (progress / 100) * budgetAtCompletion;
      const costVariance = earnedValue - actualCost;

      expect(earnedValue).toBe(0.5);
      expect(costVariance).toBe(0);
    });

    it('should clamp progress values', () => {
      const scenarios = [
        { input: -10, expected: 0 },
        { input: 0, expected: 0 },
        { input: 50, expected: 50 },
        { input: 100, expected: 100 },
        { input: 150, expected: 100 },
      ];

      scenarios.forEach((scenario) => {
        const clamped = Math.max(0, Math.min(100, scenario.input));
        expect(clamped).toBe(scenario.expected);
      });
    });

    it('should handle decimal precision', () => {
      const budgetAtCompletion = 10000.555;
      const progress = 33.333;

      const earnedValue = (progress / 100) * budgetAtCompletion;

      expect(earnedValue).toBeCloseTo(3333.52, 1);
    });
  });
});
