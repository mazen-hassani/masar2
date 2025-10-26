/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Delete existing data (in order of dependencies)
  console.log('  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.stageAction.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.stageResponsibility.deleteMany();
  await prisma.workflowStage.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.kPIMeasurement.deleteMany();
  await prisma.kPI.deleteMany();
  await prisma.benefit.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.invoiceAllocation.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.costItem.deleteMany();
  await prisma.projectScoring.deleteMany();
  await prisma.scoringCriterion.deleteMany();
  await prisma.wBSItem.deleteMany();
  await prisma.wBSConfiguration.deleteMany();
  await prisma.project.deleteMany();
  await prisma.program.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create test tenants
  console.log('  Creating test tenants...');
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Test Ministry of Health',
      subdomain: 'ministry-health',
      status: 'active',
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'yyyy-MM-dd',
        fiscalYearStart: '01-01',
      },
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Test Education Department',
      subdomain: 'education-dept',
      status: 'active',
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'yyyy-MM-dd',
        fiscalYearStart: '07-01',
      },
    },
  });

  console.log(`  ✓ Created tenants: ${tenant1.name}, ${tenant2.name}`);
  // Note: tenant2 is created for future multi-tenancy testing

  // Create test users for tenant1
  console.log('  Creating test users...');

  // Hash passwords for test users
  const adminPassword = await hashPassword('admin');
  const pmPassword = await hashPassword('pm');
  const sponsorPassword = await hashPassword('sponsor');
  const financePassword = await hashPassword('finance');
  const teamPassword = await hashPassword('team');

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'admin@ministry-health.test',
      name: 'Admin User',
      passwordHash: adminPassword,
      emailVerified: true,
      isActive: true,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'pm@ministry-health.test',
      name: 'Project Manager',
      passwordHash: pmPassword,
      emailVerified: true,
      isActive: true,
    },
  });

  const sponsorUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'sponsor@ministry-health.test',
      name: 'Executive Sponsor',
      passwordHash: sponsorPassword,
      emailVerified: true,
      isActive: true,
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'finance@ministry-health.test',
      name: 'Finance Manager',
      passwordHash: financePassword,
      emailVerified: true,
      isActive: true,
    },
  });

  const teamMember = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'team@ministry-health.test',
      name: 'Team Member',
      passwordHash: teamPassword,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('  ✓ Created 5 test users');

  // Assign roles to users
  console.log('  Assigning roles to users...');
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      role: 'Admin',
      contextType: 'Global',
      assignedBy: adminUser.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: pmUser.id,
      role: 'PM',
      contextType: 'Global',
      assignedBy: adminUser.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: sponsorUser.id,
      role: 'Sponsor',
      contextType: 'Global',
      assignedBy: adminUser.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: financeUser.id,
      role: 'Finance',
      contextType: 'Global',
      assignedBy: adminUser.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: teamMember.id,
      role: 'TeamMember',
      contextType: 'Global',
      assignedBy: adminUser.id,
    },
  });

  console.log('  ✓ Assigned roles to users');

  // Create test programs
  console.log('  Creating test programs...');
  const program1 = await prisma.program.create({
    data: {
      tenantId: tenant1.id,
      name: 'Digital Health Transformation',
      description: 'Comprehensive digital transformation of healthcare delivery systems',
      status: 'Active',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
      budget: 1000000,
      actualCost: 250000,
      complexityBand: 'High',
    },
  });

  const program2 = await prisma.program.create({
    data: {
      tenantId: tenant1.id,
      name: 'Healthcare Data Analytics Platform',
      description: 'Build advanced analytics and reporting platform for healthcare data insights',
      status: 'Active',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-06-30'),
      budget: 500000,
      actualCost: 80000,
      complexityBand: 'Medium',
    },
  });

  void await prisma.program.create({
    data: {
      tenantId: tenant1.id,
      name: 'Telemedicine Infrastructure',
      description: 'Deploy secure telemedicine infrastructure for remote consultations',
      status: 'Pending',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-03-31'),
      budget: 300000,
      actualCost: 0,
      complexityBand: 'High',
    },
  });

  void await prisma.program.create({
    data: {
      tenantId: tenant1.id,
      name: 'Patient Engagement System',
      description: 'Develop mobile and web patient engagement platform',
      status: 'Draft',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: null,
      endDate: null,
      budget: 400000,
      actualCost: 0,
      complexityBand: 'Medium',
    },
  });

  console.log('  ✓ Created 4 test programs');

  // Create test projects
  console.log('  Creating test projects...');
  const project1 = await prisma.project.create({
    data: {
      tenantId: tenant1.id,
      programId: program1.id,
      type: 'Project',
      name: 'EHR Implementation',
      description: 'Implement Electronic Health Records system',
      status: 'Active',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-12-31'),
      budget: 450000,
      actualCost: 150000,
      complexityBand: 'High',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      tenantId: tenant1.id,
      programId: program1.id,
      type: 'Initiative',
      name: 'Pharmacy Integration',
      description: 'Integrate pharmacy systems with EHR',
      status: 'Pending',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-10-31'),
      budget: 200000,
      actualCost: 35000,
      complexityBand: 'Medium',
    },
  });

  const project3 = await prisma.project.create({
    data: {
      tenantId: tenant1.id,
      programId: program2.id,
      type: 'Project',
      name: 'Analytics Dashboard Development',
      description: 'Build analytics dashboard for healthcare data',
      status: 'Active',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-03-15'),
      endDate: new Date('2025-03-15'),
      budget: 350000,
      actualCost: 70000,
      complexityBand: 'High',
    },
  });

  const project4 = await prisma.project.create({
    data: {
      tenantId: tenant1.id,
      programId: null,
      type: 'Project',
      name: 'Standalone Security Audit',
      description: 'Security audit of existing systems (not part of program)',
      status: 'Draft',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: null,
      endDate: null,
      budget: 100000,
      actualCost: 0,
      complexityBand: 'Low',
    },
  });

  console.log('  ✓ Created 4 test projects');

  // Create WBS Configuration for projects
  console.log('  Creating WBS configurations...');
  await prisma.wBSConfiguration.create({
    data: {
      projectId: project1.id,
      levels: 3,
      levelNames: ['Phase', 'Workstream', 'Task'],
    },
  });

  await prisma.wBSConfiguration.create({
    data: {
      projectId: project3.id,
      levels: 2,
      levelNames: ['Workstream', 'Task'],
    },
  });

  // Create WBS items for project 1
  const phase2 = await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      level: 0,
      name: 'Phase 2: Development',
      status: 'InProgress',
      plannedStartDate: new Date('2024-04-01'),
      plannedEndDate: new Date('2024-09-30'),
      percentComplete: 60,
      plannedCost: 200000,
      actualCost: 70000,
    },
  });

  // Create workstreams under Phase 2
  const backend = await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      parentId: phase2.id,
      level: 1,
      name: 'Backend Development',
      status: 'InProgress',
      plannedStartDate: new Date('2024-04-01'),
      plannedEndDate: new Date('2024-08-31'),
      percentComplete: 75,
      plannedCost: 100000,
      actualCost: 40000,
      ownerId: pmUser.id,
    },
  });

  void await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      parentId: phase2.id,
      level: 1,
      name: 'Frontend Development',
      status: 'NotStarted',
      plannedStartDate: new Date('2024-06-01'),
      plannedEndDate: new Date('2024-09-30'),
      percentComplete: 0,
      plannedCost: 100000,
      actualCost: 30000,
      ownerId: teamMember.id,
    },
  });

  // Create tasks under backend
  await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      parentId: backend.id,
      level: 2,
      name: 'Database Schema Design',
      status: 'Completed',
      plannedStartDate: new Date('2024-04-01'),
      plannedEndDate: new Date('2024-04-15'),
      actualStartDate: new Date('2024-04-01'),
      actualEndDate: new Date('2024-04-14'),
      percentComplete: 100,
      plannedCost: 20000,
      actualCost: 18000,
      ownerId: teamMember.id,
    },
  });

  // Create WBS items for project 3 (Analytics)
  const reporting = await prisma.wBSItem.create({
    data: {
      projectId: project3.id,
      level: 0,
      name: 'Data Integration & Reporting',
      status: 'InProgress',
      plannedStartDate: new Date('2024-03-15'),
      plannedEndDate: new Date('2024-12-31'),
      percentComplete: 45,
      plannedCost: 200000,
      actualCost: 50000,
      ownerId: pmUser.id,
    },
  });

  const dataWarehouse = await prisma.wBSItem.create({
    data: {
      projectId: project3.id,
      parentId: reporting.id,
      level: 1,
      name: 'Data Warehouse Setup',
      status: 'InProgress',
      plannedStartDate: new Date('2024-03-15'),
      plannedEndDate: new Date('2024-06-30'),
      percentComplete: 80,
      plannedCost: 100000,
      actualCost: 35000,
      ownerId: teamMember.id,
    },
  });

  // Create tasks under data warehouse
  await prisma.wBSItem.create({
    data: {
      projectId: project3.id,
      parentId: dataWarehouse.id,
      level: 2,
      name: 'Schema Design & Setup',
      status: 'Completed',
      plannedStartDate: new Date('2024-03-15'),
      plannedEndDate: new Date('2024-04-15'),
      actualStartDate: new Date('2024-03-15'),
      actualEndDate: new Date('2024-04-10'),
      percentComplete: 100,
      plannedCost: 30000,
      actualCost: 28000,
      ownerId: teamMember.id,
    },
  });

  // More tasks for project1 - create another Frontend task
  const frontend = await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      parentId: phase2.id,
      level: 1,
      name: 'QA & Testing',
      status: 'NotStarted',
      plannedStartDate: new Date('2024-08-01'),
      plannedEndDate: new Date('2024-09-30'),
      percentComplete: 0,
      plannedCost: 80000,
      actualCost: 0,
      ownerId: teamMember.id,
    },
  });

  // Create test cases task
  await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      parentId: frontend.id,
      level: 2,
      name: 'Test Case Development',
      status: 'NotStarted',
      plannedStartDate: new Date('2024-08-01'),
      plannedEndDate: new Date('2024-08-31'),
      percentComplete: 0,
      plannedCost: 30000,
      actualCost: 0,
      ownerId: teamMember.id,
    },
  });

  // Create API integration task
  await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      parentId: backend.id,
      level: 2,
      name: 'API Development & Integration',
      status: 'InProgress',
      plannedStartDate: new Date('2024-05-01'),
      plannedEndDate: new Date('2024-08-31'),
      percentComplete: 65,
      plannedCost: 60000,
      actualCost: 20000,
      ownerId: pmUser.id,
    },
  });

  // Create WBS Configuration for project2
  await prisma.wBSConfiguration.create({
    data: {
      projectId: project2.id,
      levels: 2,
      levelNames: ['Workstream', 'Task'],
    },
  });

  // Create WBS items for project 2 (Pharmacy Integration)
  const integration = await prisma.wBSItem.create({
    data: {
      projectId: project2.id,
      level: 0,
      name: 'Pharmacy Integration',
      status: 'Pending',
      plannedStartDate: new Date('2024-06-01'),
      plannedEndDate: new Date('2024-12-31'),
      percentComplete: 10,
      plannedCost: 200000,
      actualCost: 5000,
      ownerId: pmUser.id,
    },
  });

  // Requirements and design
  await prisma.wBSItem.create({
    data: {
      projectId: project2.id,
      parentId: integration.id,
      level: 1,
      name: 'Requirements & Design',
      status: 'InProgress',
      plannedStartDate: new Date('2024-06-01'),
      plannedEndDate: new Date('2024-07-31'),
      percentComplete: 90,
      plannedCost: 40000,
      actualCost: 5000,
      ownerId: teamMember.id,
    },
  });

  // Development workstream
  const development = await prisma.wBSItem.create({
    data: {
      projectId: project2.id,
      parentId: integration.id,
      level: 1,
      name: 'Development & Deployment',
      status: 'NotStarted',
      plannedStartDate: new Date('2024-08-01'),
      plannedEndDate: new Date('2024-11-30'),
      percentComplete: 0,
      plannedCost: 120000,
      actualCost: 0,
      ownerId: pmUser.id,
    },
  });

  // System integration tasks
  await prisma.wBSItem.create({
    data: {
      projectId: project2.id,
      parentId: development.id,
      level: 2,
      name: 'System Integration',
      status: 'NotStarted',
      plannedStartDate: new Date('2024-08-01'),
      plannedEndDate: new Date('2024-10-31'),
      percentComplete: 0,
      plannedCost: 70000,
      actualCost: 0,
      ownerId: teamMember.id,
    },
  });

  // UAT task
  await prisma.wBSItem.create({
    data: {
      projectId: project2.id,
      parentId: development.id,
      level: 2,
      name: 'User Acceptance Testing',
      status: 'NotStarted',
      plannedStartDate: new Date('2024-10-15'),
      plannedEndDate: new Date('2024-11-30'),
      percentComplete: 0,
      plannedCost: 50000,
      actualCost: 0,
      ownerId: teamMember.id,
    },
  });

  console.log('  ✓ Created WBS structure with 15 items across 3 projects');

  // Create scoring criteria
  console.log('  Creating scoring criteria...');
  const criterion1 = await prisma.scoringCriterion.create({
    data: {
      tenantId: tenant1.id,
      name: 'Strategic Alignment',
      description: 'How well does the project align with organizational strategy?',
      minScore: 0,
      maxScore: 100,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const criterion2 = await prisma.scoringCriterion.create({
    data: {
      tenantId: tenant1.id,
      name: 'Risk Level',
      description: 'Assessment of project risk (lower is better)',
      minScore: 0,
      maxScore: 100,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const criterion3 = await prisma.scoringCriterion.create({
    data: {
      tenantId: tenant1.id,
      name: 'Financial Impact',
      description: 'Expected financial return and cost efficiency',
      minScore: 0,
      maxScore: 100,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const criterion4 = await prisma.scoringCriterion.create({
    data: {
      tenantId: tenant1.id,
      name: 'Feasibility',
      description: 'Technical feasibility and resource availability',
      minScore: 0,
      maxScore: 100,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const criterion5 = await prisma.scoringCriterion.create({
    data: {
      tenantId: tenant1.id,
      name: 'Timeline Feasibility',
      description: 'Realistic timeline to completion',
      minScore: 0,
      maxScore: 100,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  console.log('  ✓ Created 5 scoring criteria');

  // Score the projects
  console.log('  Creating project scores...');

  // Project 1 scores (EHR Implementation)
  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion1.id,
      weight: 0.25,
      score: 85,
      justification: 'Excellent alignment with digital transformation strategy',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion2.id,
      weight: 0.2,
      score: 70,
      justification: 'Moderate risk due to tight timeline and integration complexity',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion3.id,
      weight: 0.25,
      score: 78,
      justification: 'Good ROI expected with operational efficiencies',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion4.id,
      weight: 0.15,
      score: 72,
      justification: 'Proven technology stack but complex integration needed',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion5.id,
      weight: 0.15,
      score: 65,
      justification: 'Ambitious timeline with multiple dependencies',
      evaluatedBy: adminUser.id,
    },
  });

  // Project 2 scores (Pharmacy Integration)
  await prisma.projectScoring.create({
    data: {
      projectId: project2.id,
      criterionId: criterion1.id,
      weight: 0.25,
      score: 75,
      justification: 'Good alignment with healthcare integration goals',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project2.id,
      criterionId: criterion2.id,
      weight: 0.2,
      score: 65,
      justification: 'Integration complexity introduces moderate risk',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project2.id,
      criterionId: criterion3.id,
      weight: 0.25,
      score: 82,
      justification: 'Strong cost savings from operational improvements',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project2.id,
      criterionId: criterion4.id,
      weight: 0.15,
      score: 80,
      justification: 'Mature integration platform available',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project2.id,
      criterionId: criterion5.id,
      weight: 0.15,
      score: 75,
      justification: 'Realistic timeline with manageable milestones',
      evaluatedBy: adminUser.id,
    },
  });

  // Project 3 scores (Analytics Dashboard)
  await prisma.projectScoring.create({
    data: {
      projectId: project3.id,
      criterionId: criterion1.id,
      weight: 0.25,
      score: 90,
      justification: 'Critical strategic importance for data-driven decisions',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project3.id,
      criterionId: criterion2.id,
      weight: 0.2,
      score: 55,
      justification: 'High technical complexity and timeline pressure',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project3.id,
      criterionId: criterion3.id,
      weight: 0.25,
      score: 88,
      justification: 'Significant value from insights and reporting improvements',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project3.id,
      criterionId: criterion4.id,
      weight: 0.15,
      score: 68,
      justification: 'Emerging tech stack requires skill development',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project3.id,
      criterionId: criterion5.id,
      weight: 0.15,
      score: 60,
      justification: 'Aggressive schedule with potential delays in data preparation',
      evaluatedBy: adminUser.id,
    },
  });

  // Project 4 scores (Standalone Security Audit)
  await prisma.projectScoring.create({
    data: {
      projectId: project4.id,
      criterionId: criterion1.id,
      weight: 0.25,
      score: 70,
      justification: 'Supports regulatory compliance objectives',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project4.id,
      criterionId: criterion2.id,
      weight: 0.2,
      score: 85,
      justification: 'Well-defined scope minimizes execution risk',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project4.id,
      criterionId: criterion3.id,
      weight: 0.25,
      score: 60,
      justification: 'Limited direct financial returns but necessary for compliance',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project4.id,
      criterionId: criterion4.id,
      weight: 0.15,
      score: 90,
      justification: 'Clear requirements and available expertise',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project4.id,
      criterionId: criterion5.id,
      weight: 0.15,
      score: 92,
      justification: 'Simple project with short, achievable timeline',
      evaluatedBy: adminUser.id,
    },
  });

  console.log('  ✓ Created 5 criteria and scored 4 projects (20 total scores)');

  // Create program-level risks
  console.log('  Creating risks and benefits...');

  // Program risks
  await prisma.risk.create({
    data: {
      programId: program1.id,
      name: 'Technology Obsolescence',
      description: 'Selected technology stack may become obsolete during long implementation',
      category: 'Technical',
      probability: 2,
      impact: 4,
      riskScore: 8,
      mitigation: 'Regular technology assessment and vendor evaluation',
      contingency: 'Plan for technology refresh or migration',
      owner: pmUser.id,
      status: 'Open',
    },
  });

  await prisma.risk.create({
    data: {
      programId: program1.id,
      name: 'Budget Overrun',
      description: 'Scope creep and unforeseen technical challenges may increase costs',
      category: 'Financial',
      probability: 3,
      impact: 4,
      riskScore: 12,
      mitigation: 'Strict change management and contingency budget (15%)',
      contingency: 'Reduce scope or extend timeline',
      owner: sponsorUser.id,
      status: 'Open',
    },
  });

  // Project risks
  await prisma.risk.create({
    data: {
      projectId: project1.id,
      name: 'Integration Complexity',
      description: 'Legacy system integration may be more complex than anticipated',
      category: 'Technical',
      probability: 4,
      impact: 3,
      riskScore: 12,
      mitigation: 'Dedicated integration team and early proof-of-concept',
      contingency: 'Extend timeline or use integration platform',
      owner: pmUser.id,
      status: 'Open',
    },
  });

  await prisma.risk.create({
    data: {
      projectId: project2.id,
      name: 'Regulatory Compliance',
      description: 'Pharmacy integration may require additional regulatory approvals',
      category: 'Legal',
      probability: 3,
      impact: 5,
      riskScore: 15,
      mitigation: 'Early engagement with regulatory authorities',
      contingency: 'Delay implementation until approvals obtained',
      owner: sponsorUser.id,
      status: 'Open',
    },
  });

  await prisma.risk.create({
    data: {
      projectId: project3.id,
      name: 'Data Quality Issues',
      description: 'Historical data quality may be poor, affecting dashboard accuracy',
      category: 'Operational',
      probability: 2,
      impact: 3,
      riskScore: 6,
      mitigation: 'Data quality assessment and cleansing activities',
      contingency: 'Implement data quality monitoring',
      owner: pmUser.id,
      status: 'Mitigated',
    },
  });

  console.log('  ✓ Created 5 risks');

  // Create program-level benefits
  const benefit1 = await prisma.benefit.create({
    data: {
      programId: program1.id,
      name: 'Operational Efficiency Gains',
      description: 'Reduced manual processes and improved data accessibility',
      category: 'Operational',
      targetValue: 250000, // Cost savings
      targetDate: new Date('2025-12-31'),
    },
  });

  const benefit2 = await prisma.benefit.create({
    data: {
      projectId: project1.id,
      name: 'Patient Experience Improvement',
      description: 'Better access to health records and faster service delivery',
      category: 'Social',
      targetValue: 85, // Satisfaction score out of 100
      targetDate: new Date('2025-06-30'),
    },
  });

  // Update benefit2 with actual values
  await prisma.benefit.update({
    where: { id: benefit2.id },
    data: {
      actualValue: 78,
      achievedDate: new Date('2025-08-15'),
    },
  });

  const benefit3 = await prisma.benefit.create({
    data: {
      projectId: project2.id,
      name: 'Pharmacy Error Reduction',
      description: 'Reduced medication errors through automated integration',
      category: 'Operational',
      targetValue: 90, // % reduction
      targetDate: new Date('2025-09-30'),
    },
  });

  const benefit4 = await prisma.benefit.create({
    data: {
      projectId: project3.id,
      name: 'Improved Decision Making',
      description: 'Real-time data analytics enabling faster decision making',
      category: 'Strategic',
      targetValue: 30, // % improvement in decision speed
      targetDate: new Date('2025-12-31'),
    },
  });

  console.log('  ✓ Created 4 benefits');

  // Create KPIs for benefits
  await prisma.kPI.create({
    data: {
      benefitId: benefit1.id,
      name: 'Cost Savings Realized',
      unit: 'USD',
      baseline: 0,
      target: 250000,
      collectionCadence: 'Monthly',
    },
  });

  await prisma.kPI.create({
    data: {
      benefitId: benefit2.id,
      name: 'Patient Satisfaction Score',
      unit: 'Percentage',
      baseline: 65,
      target: 85,
      collectionCadence: 'Quarterly',
    },
  });

  await prisma.kPI.create({
    data: {
      benefitId: benefit3.id,
      name: 'Medication Error Rate Reduction',
      unit: 'Percentage',
      baseline: 100,
      target: 10,
      collectionCadence: 'Monthly',
    },
  });

  await prisma.kPI.create({
    data: {
      benefitId: benefit4.id,
      name: 'Decision Cycle Time',
      unit: 'Days',
      baseline: 14,
      target: 10,
      collectionCadence: 'Monthly',
    },
  });

  console.log('  ✓ Created 4 KPIs with baselines and targets');

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
