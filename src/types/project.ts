/**
 * Project Type Definitions
 * Data transfer objects and type definitions for Projects
 */

export type ProjectType = 'Project' | 'Initiative';
export type ProjectStatus = 'Draft' | 'Pending' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled';
export type ComplexityBand = 'Low' | 'Medium' | 'High';

/**
 * Database representation of a Project
 */
export interface Project {
  id: string;
  tenantId: string;
  programId: string | null;

  // Type and basic info
  type: ProjectType;
  name: string;
  description: string | null;

  // Status and complexity
  status: ProjectStatus;
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
 * Request body for creating a Project
 */
export interface CreateProjectRequest {
  programId?: string;
  type: ProjectType;
  name: string;
  description?: string;
  status?: ProjectStatus;
  complexityBand?: ComplexityBand;
  requesterId?: string;
  pmId?: string;
  sponsorId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  budget?: number;
}

/**
 * Request body for updating a Project
 */
export interface UpdateProjectRequest {
  programId?: string | null;
  type?: ProjectType;
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
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
 * Response body for a Project
 */
export interface ProjectResponse {
  id: string;
  tenantId: string;
  programId: string | null;
  type: ProjectType;
  name: string;
  description: string | null;
  status: ProjectStatus;
  complexityBand: ComplexityBand;
  requesterId: string | null;
  pmId: string | null;
  sponsorId: string | null;
  startDate: string | null; // ISO format
  endDate: string | null; // ISO format
  budget: number;
  actualCost: number;
  scoreValue: number | null;
  programName?: string; // Optional: program name for context
  wbsConfigured?: boolean; // Optional: whether WBS is set up
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
  deletedAt: string | null; // ISO format
}

/**
 * Project with related data
 */
export interface ProjectWithRelations extends Project {
  program?: {
    id: string;
    name: string;
    status: string;
  } | null;
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
  wbsConfig?: {
    id: string;
    levels: number;
    levelNames: string[];
  } | null;
  wbsItemCount?: number;
  scoreCount?: number;
}

/**
 * Filter options for listing projects
 */
export interface ListProjectsFilter {
  programId?: string;
  type?: ProjectType;
  status?: ProjectStatus | ProjectStatus[];
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
 * Project statistics
 */
export interface ProjectStatistics {
  totalProjects: number;
  projectsByStatus: Record<ProjectStatus, number>;
  projectsByComplexity: Record<ComplexityBand, number>;
  projectsByType: Record<ProjectType, number>;
  totalBudget: number;
  totalActualCost: number;
  budgetUtilization: number; // percentage
  averageScore: number | null;
  projectsWithWBS: number;
  projectsScored: number;
}

/**
 * Project validation result
 */
export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Project health status
 */
export interface ProjectHealthStatus {
  projectId: string;
  overallHealth: 'Healthy' | 'AtRisk' | 'Critical';
  budgetHealth: 'Healthy' | 'AtRisk' | 'Critical'; // Based on budget vs actual
  scheduleHealth: 'Healthy' | 'AtRisk' | 'Critical'; // Based on timeline
  scopeHealth: 'Healthy' | 'AtRisk' | 'Critical'; // Based on WBS completion
  issues: string[];
  recommendations: string[];
}
