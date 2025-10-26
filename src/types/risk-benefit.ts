/**
 * Risk, Benefit, and KPI Type Definitions
 * Risk management, benefits realization, and KPI tracking
 */

// ============================================================================
// RISK TYPES
// ============================================================================

export type RiskCategory = 'Technical' | 'Financial' | 'Operational' | 'External' | 'Legal';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed' | 'Occurred';
export type RiskProbability = 1 | 2 | 3 | 4 | 5; // 1 = Very Low, 5 = Very High
export type RiskImpact = 1 | 2 | 3 | 4 | 5; // 1 = Minimal, 5 = Catastrophic

/**
 * Risk - Identifies threats that could affect programs/projects
 * Supports inheritance from program risks to project risks
 */
export interface Risk {
  id: string;
  programId: string | null; // Program-level risk
  projectId: string | null; // Project-level risk
  parentRiskId: string | null; // Inherited from parent risk

  // Definition
  name: string;
  description: string | null;

  // Categorization
  category: RiskCategory;

  // Assessment (1-5 scale)
  probability: RiskProbability;
  impact: RiskImpact;
  riskScore: number; // probability × impact (1-25)

  // Mitigation
  mitigation: string | null; // Risk mitigation strategy
  contingency: string | null; // Contingency plan

  // Ownership
  owner: string | null; // Responsible user ID

  // Status
  status: RiskStatus;

  // Tailoring (for inherited risks)
  isTailored: boolean;
  tailoredDescription: string | null;
  tailoredMitigation: string | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Create Risk Request
 */
export interface CreateRiskRequest {
  programId?: string | null; // Either program or project
  projectId?: string | null;
  parentRiskId?: string | null; // For inherited risks

  name: string;
  description?: string;
  category: RiskCategory;
  probability: RiskProbability;
  impact: RiskImpact;

  mitigation?: string;
  contingency?: string;
  owner?: string;
  status?: RiskStatus;
}

/**
 * Update Risk Request
 */
export interface UpdateRiskRequest {
  name?: string;
  description?: string | null;
  category?: RiskCategory;
  probability?: RiskProbability;
  impact?: RiskImpact;
  mitigation?: string | null;
  contingency?: string | null;
  owner?: string | null;
  status?: RiskStatus;
}

/**
 * Risk Response - API format
 */
export interface RiskResponse {
  id: string;
  programId: string | null;
  projectId: string | null;
  parentRiskId: string | null;
  name: string;
  description: string | null;
  category: RiskCategory;
  probability: RiskProbability;
  impact: RiskImpact;
  riskScore: number;
  mitigation: string | null;
  contingency: string | null;
  owner: string | null;
  ownerName?: string;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Risk with related data
 */
export interface RiskWithRelations extends Risk {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project?: any;
  parentRisk?: Risk | null;
  inheritedRisks?: Risk[];
}

/**
 * Risk Statistics
 */
export interface RiskStatistics {
  totalRisks: number;
  risksByCategory: Record<RiskCategory, number>;
  risksByStatus: Record<RiskStatus, number>;
  risksByProbability: Record<RiskProbability, number>;
  risksByImpact: Record<RiskImpact, number>;
  averageRiskScore: number;
  criticalRisks: number; // riskScore >= 20
  highRisks: number; // riskScore >= 15
  mediumRisks: number; // riskScore >= 10
  lowRisks: number; // riskScore < 10
  openRisks: number;
  mitigatedRisks: number;
}

// ============================================================================
// BENEFIT TYPES
// ============================================================================

export type BenefitCategory = 'Financial' | 'Strategic' | 'Operational' | 'Social';
export type BenefitStatus = 'Planned' | 'Achieved' | 'Partial' | 'Not Achieved';

/**
 * Benefit - Describes expected value realization
 * Can be associated with program or project
 */
export interface Benefit {
  id: string;
  programId: string | null;
  projectId: string | null;

  // Definition
  name: string;
  description: string | null;

  // Type
  category: BenefitCategory;

  // Target
  targetValue: number;
  targetDate: Date;

  // Achievement
  actualValue?: number | null;
  achievedDate?: Date | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Create Benefit Request
 */
export interface CreateBenefitRequest {
  programId?: string | null; // Either program or project
  projectId?: string | null;

  name: string;
  description?: string;
  category: BenefitCategory;
  targetValue: number;
  targetDate: Date | string;
}

/**
 * Update Benefit Request
 */
export interface UpdateBenefitRequest {
  name?: string;
  description?: string | null;
  category?: BenefitCategory;
  targetValue?: number;
  targetDate?: Date | string;
  actualValue?: number | null;
  achievedDate?: Date | string | null;
}

/**
 * Benefit Response - API format
 */
export interface BenefitResponse {
  id: string;
  programId: string | null;
  projectId: string | null;
  name: string;
  description: string | null;
  category: BenefitCategory;
  targetValue: number;
  targetDate: string;
  actualValue?: number | null;
  achievedDate?: string | null;
  status: BenefitStatus;
  realization: number; // percentage (actualValue / targetValue)
  createdAt: string;
  updatedAt: string;
}

/**
 * Benefit with KPI data
 */
export interface BenefitWithKPIs extends Benefit {
  kpis?: KPI[];
}

/**
 * Benefit Statistics
 */
export interface BenefitStatistics {
  totalBenefits: number;
  benefitsByCategory: Record<BenefitCategory, number>;
  benefitsByStatus: Record<BenefitStatus, number>;
  totalTargetValue: number;
  totalAchievedValue: number;
  realizationPercentage: number;
  achievedBenefits: number;
  atRiskBenefits: number;
}

// ============================================================================
// KPI TYPES
// ============================================================================

export type KPICadence = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
export type KPIUnit = 'USD' | 'Percentage' | 'Count' | 'Hours' | 'Days' | 'Custom';

/**
 * KPI - Key Performance Indicator for a benefit
 */
export interface KPI {
  id: string;
  benefitId: string;

  // Definition
  name: string;
  unit: KPIUnit;

  // Baselines
  baseline: number;
  target: number;

  // Tracking
  collectionCadence: KPICadence;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KPI Measurement - Actual measured value
 */
export interface KPIMeasurement {
  id: string;
  kpiId: string;

  // Value
  value: number;
  measurementDate: Date;
  notes: string | null;

  // Audit
  recordedBy: string | null;
  createdAt: Date;
}

/**
 * Create KPI Request
 */
export interface CreateKPIRequest {
  benefitId: string;

  name: string;
  unit: KPIUnit;
  baseline: number;
  target: number;
  collectionCadence: KPICadence;
}

/**
 * Update KPI Request
 */
export interface UpdateKPIRequest {
  name?: string;
  unit?: KPIUnit;
  baseline?: number;
  target?: number;
  collectionCadence?: KPICadence;
}

/**
 * Create KPI Measurement Request
 */
export interface CreateKPIMeasurementRequest {
  kpiId: string;
  value: number;
  measurementDate: Date | string;
  notes?: string;
  recordedBy?: string;
}

/**
 * KPI Response - API format
 */
export interface KPIResponse {
  id: string;
  benefitId: string;
  benefitName?: string;
  name: string;
  unit: KPIUnit;
  baseline: number;
  target: number;
  collectionCadence: KPICadence;
  currentValue?: number;
  progress?: number; // percentage toward target
  createdAt: string;
  updatedAt: string;
}

/**
 * KPI Measurement Response
 */
export interface KPIMeasurementResponse {
  id: string;
  kpiId: string;
  kpiName?: string;
  value: number;
  measurementDate: string;
  notes: string | null;
  recordedBy: string | null;
  recordedByName?: string;
  createdAt: string;
}

/**
 * KPI with measurements
 */
export interface KPIWithMeasurements extends KPI {
  measurements: KPIMeasurement[];
}

/**
 * KPI Progress
 */
export interface KPIProgress {
  kpiId: string;
  currentValue: number;
  targetValue: number;
  baselineValue: number;
  progress: number; // percentage
  trend: 'Improving' | 'Declining' | 'Stable'; // based on recent measurements
  lastMeasurement: KPIMeasurement | null;
}

/**
 * Filter options for listing risks
 */
export interface ListRisksFilter {
  programId?: string;
  projectId?: string;
  category?: RiskCategory | RiskCategory[];
  status?: RiskStatus | RiskStatus[];
  minRiskScore?: number;
  maxRiskScore?: number;
  sortBy?: 'name' | 'riskScore' | 'probability' | 'impact' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Filter options for listing benefits
 */
export interface ListBenefitsFilter {
  programId?: string;
  projectId?: string;
  category?: BenefitCategory | BenefitCategory[];
  status?: BenefitStatus | BenefitStatus[];
  sortBy?: 'name' | 'targetValue' | 'targetDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Filter options for listing KPIs
 */
export interface ListKPIsFilter {
  benefitId?: string;
  unit?: KPIUnit;
  sortBy?: 'name' | 'target' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Risk Heat Map - Probability vs Impact visualization
 */
export interface RiskHeatMap {
  critical: Risk[]; // High probability, High impact
  high: Risk[]; // Medium-high probability/impact
  medium: Risk[]; // Medium probability/impact
  low: Risk[]; // Low probability and/or impact
}
