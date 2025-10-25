import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  await prisma.kpiMeasurement.deleteMany();
  await prisma.kPI.deleteMany();
  await prisma.benefit.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.invoiceAllocation.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.costItem.deleteMany();
  await prisma.projectScoring.deleteMany();
  await prisma.scoringCriterion.deleteMany();
  await prisma.wbsItem.deleteMany();
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

  // Create test users for tenant1
  console.log('  Creating test users...');
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'admin@ministry-health.test',
      name: 'Admin User',
      passwordHash: 'hashed_password_placeholder',
      emailVerified: true,
      isActive: true,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'pm@ministry-health.test',
      name: 'Project Manager',
      passwordHash: 'hashed_password_placeholder',
      emailVerified: true,
      isActive: true,
    },
  });

  const sponsorUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'sponsor@ministry-health.test',
      name: 'Executive Sponsor',
      passwordHash: 'hashed_password_placeholder',
      emailVerified: true,
      isActive: true,
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'finance@ministry-health.test',
      name: 'Finance Manager',
      passwordHash: 'hashed_password_placeholder',
      emailVerified: true,
      isActive: true,
    },
  });

  const teamMember = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'team@ministry-health.test',
      name: 'Team Member',
      passwordHash: 'hashed_password_placeholder',
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
      name: 'Infrastructure Modernization',
      description: 'Upgrade of hospital infrastructure and facilities',
      status: 'Draft',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-06-30'),
      budget: 500000,
      actualCost: 0,
      complexityBand: 'Medium',
    },
  });

  console.log('  ✓ Created 2 test programs');

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
      name: 'Telehealth Platform',
      description: 'Build telehealth consultation platform',
      status: 'Active',
      requesterId: pmUser.id,
      pmId: pmUser.id,
      sponsorId: sponsorUser.id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-10-31'),
      budget: 250000,
      actualCost: 75000,
      complexityBand: 'Medium',
    },
  });

  console.log('  ✓ Created 2 test projects');

  // Create WBS Configuration for project 1
  console.log('  Creating WBS configurations...');
  await prisma.wBSConfiguration.create({
    data: {
      projectId: project1.id,
      levels: 3,
      levelNames: ['Phase', 'Workstream', 'Task'],
    },
  });

  // Create WBS items for project 1
  const phase1 = await prisma.wBSItem.create({
    data: {
      projectId: project1.id,
      level: 0,
      name: 'Phase 1: Planning & Design',
      status: 'Completed',
      plannedStartDate: new Date('2024-01-15'),
      plannedEndDate: new Date('2024-03-31'),
      percentComplete: 100,
      plannedCost: 75000,
      actualCost: 80000,
    },
  });

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
  const workstream1 = await prisma.wBSItem.create({
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

  const workstream2 = await prisma.wBSItem.create({
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

  console.log('  ✓ Created WBS structure');

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

  console.log('  ✓ Created 2 scoring criteria');

  // Score the projects
  console.log('  Creating project scores...');
  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion1.id,
      weight: 0.6,
      score: 85,
      justification: 'Excellent alignment with digital transformation strategy',
      evaluatedBy: adminUser.id,
    },
  });

  await prisma.projectScoring.create({
    data: {
      projectId: project1.id,
      criterionId: criterion2.id,
      weight: 0.4,
      score: 70,
      justification: 'Moderate risk due to tight timeline',
      evaluatedBy: adminUser.id,
    },
  });

  console.log('  ✓ Scored projects');

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
