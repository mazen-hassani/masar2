# CHUNK 2.4: Risk, Benefit, and KPI Models Setup Guide

## Overview

This document describes the implementation of CHUNK 2.4: Risk, Benefit, and KPI Models for the Masar portfolio management system. This chunk introduces comprehensive risk management, benefits realization tracking, and KPI measurement capabilities.

## What Was Implemented

### 1. Database Schema Enhancements

Added Risk, Benefit, KPI, and KPIMeasurement models to Prisma schema with the following features:

#### Risk Model
- **Multi-level support**: Program-level and project-level risks
- **Risk inheritance**: Projects inherit risks from programs with child/parent relationships
- **Risk assessment**: 5-point probability and impact scales (1-5)
- **Automatic scoring**: Risk score calculated as probability × impact (1-25 range)
- **Soft deletes**: Risks can be marked as deleted without removing data
- **Tailoring support**: For inherited risks, support local customization

**Fields:**
- `id`, `programId`, `projectId`, `parentRiskId` - Identifiers and relationships
- `name`, `description` - Definition
- `category` - Risk type (Technical, Financial, Operational, External, Legal)
- `probability`, `impact` - 1-5 scale assessments
- `riskScore` - Calculated field (probability × impact)
- `mitigation`, `contingency` - Risk response strategies
- `owner` - Responsible user
- `status` - Open, Mitigated, Closed, Occurred
- `isTailored`, `tailoredDescription`, `tailoredMitigation` - Inheritance customization
- `createdAt`, `updatedAt`, `deletedAt` - Audit fields

#### Benefit Model
- **Multi-level support**: Program-level and project-level benefits
- **Achievement tracking**: Actual vs target value comparison
- **Status calculation**: Planned, Achieved, Partial, Not Achieved
- **KPI linking**: Each benefit can have multiple KPIs
- **Soft deletes**: Benefits can be marked as deleted

**Fields:**
- `id`, `programId`, `projectId` - Identifiers and relationships
- `name`, `description` - Definition
- `category` - Benefit type (Financial, Strategic, Operational, Social)
- `targetValue`, `targetDate` - Expected value and timeline
- `actualValue`, `achievedDate` - Realized value and date
- `createdAt`, `updatedAt`, `deletedAt` - Audit fields

#### KPI Model
- **Key Performance Indicators**: Measure progress toward benefits
- **Measurement tracking**: Multiple measurements over time
- **Cadence support**: Weekly, Monthly, Quarterly, Annually
- **Units support**: USD, Percentage, Count, Hours, Days, Custom

**Fields:**
- `id`, `benefitId` - Identifier and benefit relationship
- `name` - KPI name
- `unit` - Measurement unit
- `baseline`, `target` - Starting point and goal
- `collectionCadence` - Measurement frequency
- `createdAt`, `updatedAt` - Audit fields

#### KPIMeasurement Model
- **Historical tracking**: Records actual measurements over time
- **Date tracking**: When measurements were taken
- **Notes support**: Context for measurements
- **Audit trail**: Who recorded the measurement

**Fields:**
- `id`, `kpiId` - Identifier and KPI relationship
- `value` - Measured value
- `measurementDate` - When the measurement was taken
- `notes` - Additional context
- `recordedBy` - User who recorded measurement
- `createdAt` - Timestamp

### 2. Type Definitions

Created comprehensive TypeScript interfaces in `src/types/risk-benefit.ts`:

- **Risk Types**: Risk, RiskResponse, RiskWithRelations, RiskStatistics, RiskHeatMap
- **Risk Enums**: RiskCategory, RiskStatus, RiskProbability (1-5), RiskImpact (1-5)
- **Benefit Types**: Benefit, BenefitResponse, BenefitWithKPIs, BenefitStatistics
- **Benefit Enums**: BenefitCategory, BenefitStatus
- **KPI Types**: KPI, KPIMeasurement, KPIResponse, KPIProgress, KPIWithMeasurements
- **KPI Enums**: KPICadence, KPIUnit
- **Request/Response DTOs**: CreateRiskRequest, UpdateRiskRequest, CreateBenefitRequest, UpdateBenefitRequest, CreateKPIRequest, UpdateKPIRequest, CreateKPIMeasurementRequest
- **Filter Types**: ListRisksFilter, ListBenefitsFilter, ListKPIsFilter

### 3. Zod Validation Schemas

Created comprehensive validation schemas in `src/lib/validation/risk-benefit-schema.ts`:

- **Risk schemas**: createRiskSchema, updateRiskSchema, listRisksFilterSchema
- **Benefit schemas**: createBenefitSchema, updateBenefitSchema, listBenefitsFilterSchema
- **KPI schemas**: createKPISchema, updateKPISchema, createKPIMeasurementSchema, listKPIsFilterSchema
- **Validation features**:
  - 1-5 range validation for probability and impact
  - Enum validation for categories and statuses
  - Optional field handling
  - Array support for filter criteria
  - Type inference exports

### 4. Service Layer Implementation

Created three service classes in `src/lib/services/risk-benefit-service.ts`:

#### RiskService (7 methods)
1. **getRisk(riskId)** - Retrieve single risk with type conversions
2. **listRisks(filter)** - List risks with filtering by category, status, risk score range
3. **createRisk(data)** - Create new risk with automatic score calculation
4. **updateRisk(riskId, data)** - Update risk with dynamic score recalculation
5. **deleteRisk(riskId)** - Soft delete risk
6. **inheritProgramRisks(programId, projectId)** - Copy program risks to project as children
7. **getRiskHeatMap(filter)** - Organize risks by quadrant (critical, high, medium, low)
8. **getRiskStatistics()** - Count by category, status, probability, impact with severity ranges

**Risk Score Calculation:**
- Formula: `probability × impact`
- Range: 1-25
- Heat map categories:
  - Critical: ≥20
  - High: ≥15
  - Medium: ≥10
  - Low: <10

**Risk Inheritance:**
- Program risks are copied to projects as parent-child relationships
- Inherited risks marked with `isTailored: false` initially
- Projects can customize inherited risks with `tailoredDescription` and `tailoredMitigation`

#### BenefitService (5 methods)
1. **getBenefit(benefitId)** - Retrieve single benefit with KPIs
2. **listBenefits(filter)** - List benefits with filtering
3. **createBenefit(data)** - Create new benefit
4. **updateBenefit(benefitId, data)** - Update benefit including achievement tracking
5. **deleteBenefit(benefitId)** - Soft delete benefit
6. **getBenefitStatistics()** - Calculate realization metrics

**Benefit Achievement:**
- Status calculated from actualValue vs targetValue
- Realization percentage: (actualValue / targetValue) × 100
- At-risk benefits: Planned benefits past their targetDate

#### KPIService (6 methods)
1. **getKPI(kpiId)** - Retrieve KPI with measurements ordered by date
2. **listKPIs(filter)** - List KPIs with filtering
3. **createKPI(data)** - Create new KPI
4. **updateKPI(kpiId, data)** - Update KPI baseline/target
5. **createMeasurement(data)** - Record new measurement
6. **getKPIProgress(kpiId)** - Calculate progress percentage and trend

**KPI Progress Tracking:**
- Progress percentage: ((current - baseline) / (target - baseline)) × 100
- Trend analysis: Improving, Declining, Stable (based on last 2 measurements)
- Range: 0-100% (clamped)

### 5. Test Data & Seed

Expanded `prisma/seed.ts` with realistic test data:

**Risks (5 total):**
- 2 program-level risks (Technology Obsolescence, Budget Overrun)
- 3 project-level risks (Integration Complexity, Regulatory Compliance, Data Quality)

**Benefits (4 total):**
- Program benefit: Operational Efficiency Gains
- Project benefits: Patient Experience Improvement, Pharmacy Error Reduction, Improved Decision Making
- One benefit includes actual achievement values

**KPIs (4 total):**
- Cost Savings Realized (USD, Monthly)
- Patient Satisfaction Score (Percentage, Quarterly)
- Medication Error Rate Reduction (Percentage, Monthly)
- Decision Cycle Time (Days, Monthly)

## Database Migration

The schema was updated with:
1. Added `actualValue` and `achievedDate` fields to Benefit model
2. Added `deletedAt` field to Risk model for soft delete support
3. Added indexes for performance:
   - `deletedAt` indexes for soft delete queries
   - Foreign key indexes

Run migrations with:
```bash
npx prisma db push --skip-generate
npx prisma generate
npm run db:seed
```

## Type Safety & Conversions

The service layer handles critical type conversions:

1. **Decimal to Number**: Prisma returns Decimal fields as Decimal type
   - All `targetValue`, `actualValue`, `baseline`, `target` converted to Number
   - Formula: `Number(decimalField)`

2. **String to Enum**: Prisma returns enum fields as strings
   - Risk `category`, `status`, `probability`, `impact` cast to proper types
   - Benefit `category` cast to proper type
   - KPI `unit`, `collectionCadence` cast to proper types
   - Methods use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for casts

3. **Null Handling**: Proper null checks for optional fields
   - `actualValue`, `achievedDate`, `notes`, `recordedBy` properly handled as nullable

## Usage Examples

### Create a Risk
```typescript
const risk = await RiskService.createRisk({
  projectId: 'proj_123',
  name: 'Integration Complexity',
  description: 'Complex API integrations may delay deployment',
  category: 'Technical',
  probability: 4,
  impact: 3,
  mitigation: 'Establish early API contracts',
  owner: 'tech_lead_001',
});
// Risk score automatically calculated: 4 × 3 = 12
```

### List Risks with Filtering
```typescript
const { risks, total } = await RiskService.listRisks({
  projectId: 'proj_123',
  minRiskScore: 10,
  maxRiskScore: 25,
  status: ['Open', 'Mitigated'],
  sortBy: 'riskScore',
  sortOrder: 'desc',
});
```

### Get Risk Heat Map
```typescript
const heatMap = await RiskService.getRiskHeatMap({
  projectId: 'proj_123',
});
// Returns: { critical: [...], high: [...], medium: [...], low: [...] }
```

### Create a Benefit with KPIs
```typescript
const benefit = await BenefitService.createBenefit({
  projectId: 'proj_123',
  name: 'Patient Experience Improvement',
  category: 'Social',
  targetValue: 85,
  targetDate: '2025-06-30',
});

const kpi = await KPIService.createKPI({
  benefitId: benefit.id,
  name: 'Patient Satisfaction Score',
  unit: 'Percentage',
  baseline: 65,
  target: 85,
  collectionCadence: 'Quarterly',
});
```

### Record KPI Measurement
```typescript
const measurement = await KPIService.createMeasurement({
  kpiId: kpi_123,
  value: 72,
  measurementDate: new Date(),
  notes: 'Based on Q2 survey feedback',
  recordedBy: 'analyst_001',
});

const progress = await KPIService.getKPIProgress(kpi_123);
// Returns: { currentValue: 72, progress: 35, trend: 'Improving', ... }
```

### Inherit Program Risks to Project
```typescript
const inheritedRisks = await RiskService.inheritProgramRisks(
  'prog_123',
  'proj_456'
);
// Program risks copied as children with Open status and isTailored: false
```

## Files Modified/Created

### Created:
- `src/types/risk-benefit.ts` (430 lines) - Type definitions
- `src/lib/validation/risk-benefit-schema.ts` (323 lines) - Zod schemas
- `src/lib/services/risk-benefit-service.ts` (850+ lines) - Service implementations

### Modified:
- `prisma/schema.prisma` - Added/enhanced Risk, Benefit, KPI, KPIMeasurement models
- `prisma/seed.ts` - Added test data for risks, benefits, and KPIs

### Configuration:
- No new environment variables required
- Existing database connection used

## Testing

The implementation was verified with:
1. ✅ TypeScript strict mode compilation
2. ✅ ESLint validation (all rules passing)
3. ✅ Next.js build (production build successful)
4. ✅ Type inference tests (Zod schemas tested)

## Performance Considerations

1. **Indexing**: Added indexes on frequently filtered fields:
   - `deletedAt` for soft delete queries
   - Foreign keys for relationships

2. **Query Optimization**:
   - Risk heat map uses single query with post-processing
   - Statistics queries aggregate in memory
   - Measurements ordered DESC, limited to 2 for trend analysis

3. **Type Conversions**: All Decimal and string conversions handled client-side to avoid database constraints

## What's Next (CHUNK 2.5)

The next chunk will implement:
- Financial models (CostItem, Invoice, InvoiceAllocation)
- Cost aggregation logic
- Budget tracking and analysis
- Financial reporting capabilities

## Rollback Instructions

If needed to revert this chunk:

1. Remove type definitions: `git rm src/types/risk-benefit.ts`
2. Remove validation schemas: `git rm src/lib/validation/risk-benefit-schema.ts`
3. Remove services: `git rm src/lib/services/risk-benefit-service.ts`
4. Revert Prisma schema changes: `git checkout prisma/schema.prisma`
5. Revert seed changes: `git checkout prisma/seed.ts`
6. Reset database: `npx prisma db push --skip-generate`

## Additional Resources

- Risk Management best practices: [ISO 31000](https://www.iso.org/iso-31000-risk-management.html)
- Benefits Realization Management: [APM BRG](https://www.apm.org.uk/)
- KPI Design: [SMART Criteria](https://en.wikipedia.org/wiki/SMART_criteria)
- Prisma Documentation: [https://www.prisma.io/docs/](https://www.prisma.io/docs/)
