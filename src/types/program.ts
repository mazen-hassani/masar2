/**
 * Program Type Definitions
 * Data transfer objects and type definitions for Programs
 */

export type ProgramStatus = 'Draft' | 'Pending' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled';
export type ComplexityBand = 'Low' | 'Medium' | 'High';

/**
 * Database representation of a Program
 */
export interface Program {
  id: string;
  tenantId: string;

  // Basic info
  name: string;
  description: string | null;

  // Status and complexity
  status: ProgramStatus;
  complexityBand: ComplexityBand;

  // People
  requesterId: string | null;
  pmId: string | null;
  sponsorId: string | null;

  // Timeline
  startDate: Date | null;
  endDate: Date | null;

  // Financial
  budget: number; // BigDecimal as number
  actualCost: number;
  scoreValue: number | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Request body for creating a Program
 */
export interface CreateProgramRequest {
  name: string;
  description?: string;
  status?: ProgramStatus;
  complexityBand?: ComplexityBand;
  requesterId?: string;
  pmId?: string;
  sponsorId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  budget?: number;
}

/**
 * Request body for updating a Program
 */
export interface UpdateProgramRequest {
  name?: string;
  description?: string | null;
  status?: ProgramStatus;
  complexityBand?: ComplexityBand;
  requesterId?: string | null;
  pmId?: string | null;
  sponsorId?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  budget?: number;
  actualCost?: number;
  scoreValue?: number | null;
}

/**
 * Response body for a Program
 */
export interface ProgramResponse {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  complexityBand: ComplexityBand;
  requesterId: string | null;
  pmId: string | null;
  sponsorId: string | null;
  startDate: string | null; // ISO format
  endDate: string | null; // ISO format
  budget: number;
  actualCost: number;
  scoreValue: number | null;
  projectCount?: number; // Optional: count of projects
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
  deletedAt: string | null; // ISO format
}

/**
 * Program with related data
 */
export interface ProgramWithRelations extends Program {
  requesterUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  pmUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  sponsorUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  projects?: ProjectSummary[];
  projectCount?: number;
}

/**
 * Simplified project summary for program context
 */
export interface ProjectSummary {
  id: string;
  name: string;
  type: 'Project' | 'Initiative';
  status: string;
  budget: number;
  actualCost: number;
}

/**
 * Filter options for listing programs
 */
export interface ListProgramsFilter {
  status?: ProgramStatus | ProgramStatus[];
  complexity?: ComplexityBand | ComplexityBand[];
  search?: string; // Search in name and description
  pmId?: string; // Filter by PM
  sponsorId?: string; // Filter by Sponsor
  startDateFrom?: Date;
  startDateTo?: Date;
  sortBy?: 'name' | 'createdAt' | 'startDate' | 'budget' | 'status';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

/**
 * Program statistics
 */
export interface ProgramStatistics {
  totalPrograms: number;
  programsByStatus: Record<ProgramStatus, number>;
  programsByComplexity: Record<ComplexityBand, number>;
  totalBudget: number;
  totalActualCost: number;
  budgetUtilization: number; // percentage
  averageScore: number | null;
}

/**
 * Program validation result
 */
export interface ProgramValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
