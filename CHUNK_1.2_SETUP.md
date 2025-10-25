# CHUNK 1.2: Database Schema - Setup & Testing Guide

## Overview
This chunk sets up the PostgreSQL database schema for multi-tenancy using Prisma ORM.

## Prerequisites
- Docker and Docker Compose (for PostgreSQL and Redis)
- Node.js 18+ with npm
- All dependencies from CHUNK 1.1 installed

## Setup Steps

### 1. Start PostgreSQL and Redis
```bash
# Start the database and cache services
docker-compose up -d

# Verify services are running
docker-compose ps

# Should show:
# - masar-postgres (running)
# - masar-redis (running)
```

Wait for PostgreSQL to be ready (check logs):
```bash
docker-compose logs postgres
# Look for: "database system is ready to accept connections"
```

### 2. Install New Dependencies
```bash
npm install ts-node
```

### 3. Generate Prisma Client
```bash
# Generate the Prisma client from schema
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client
```

### 4. Run Migrations
```bash
# Create the database and run initial migration
npm run db:migrate

# You'll be prompted to name the migration:
# > Enter a name for the new migration: › init

# After migration completes:
# ✓ Prisma has created your database schema. Safe to deploy.
```

### 5. Seed Test Data
```bash
# Populate database with test data
npm run db:seed

# Expected output:
# 🌱 Seeding database...
#   Clearing existing data...
#   Creating test tenants...
#   ✓ Created tenants: Test Ministry of Health, Test Education Department
#   Creating test users...
#   ✓ Created 5 test users
#   Assigning roles to users...
#   ✓ Assigned roles to users
#   Creating test programs...
#   ✓ Created 2 test programs
#   Creating test projects...
#   ✓ Created 2 test projects
#   Creating WBS configurations...
#   ✓ Created WBS structure
#   Creating scoring criteria...
#   ✓ Created 2 scoring criteria
#   Creating project scores...
#   ✓ Scored projects
# ✅ Database seeded successfully!
```

### 6. Verify the Database
```bash
# Option A: Using Prisma Studio (GUI)
npx prisma studio

# Opens browser at http://localhost:5555
# Shows all tables and data visually

# Option B: Using psql directly
psql -h localhost -U dev_user -d masar_dev

# In psql, run:
# \dt  -- list all tables
# \d tenants  -- describe tenants table
# SELECT COUNT(*) FROM tenants;  -- count records
# \q  -- exit
```

## Acceptance Criteria

### ✅ Database Schema Created
- [ ] PostgreSQL database `masar_dev` exists
- [ ] All tables created from schema.prisma
- [ ] Primary keys, foreign keys, and indexes created

### ✅ Prisma Client Generated
- [ ] `npx prisma generate` succeeds
- [ ] No TypeScript errors from generated types

### ✅ Migrations Working
- [ ] `npm run db:migrate` creates migration file
- [ ] Migration SQL is correct
- [ ] Can re-run migrations multiple times safely

### ✅ Seed Data Populated
- [ ] 2 tenants created
- [ ] 5 users created per tenant
- [ ] Roles assigned to users
- [ ] 2 programs created
- [ ] 2 projects created
- [ ] WBS items created (hierarchical)
- [ ] Scoring criteria created
- [ ] Project scores created

### ✅ Multi-Tenancy Verified
- [ ] Data is isolated per tenant
- [ ] Users belong to single tenant
- [ ] Can query by tenant ID

## Troubleshooting

### PostgreSQL Connection Failed
```bash
# Check if postgres container is running
docker-compose ps

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### "database does not exist" Error
```bash
# Ensure Docker has started postgres
docker-compose up -d postgres

# Check if .env.local has correct DATABASE_URL
cat .env.local | grep DATABASE_URL

# Should be: postgresql://dev_user:dev_password@localhost:5432/masar_dev
```

### Prisma Client Generation Failed
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Regenerate
npx prisma generate
```

### Migration Conflicts
```bash
# Reset the database (CAREFUL - deletes all data)
npm run db:reset

# Then seed again
npm run db:seed
```

### Port Already in Use
```bash
# If port 5432 is already in use, modify docker-compose.yml:
# Change: ports: - '5432:5432'
# To:     ports: - '5433:5432'
# And update DATABASE_URL to localhost:5433
```

## What Was Created

### Prisma Schema (`prisma/schema.prisma`)
- 30+ models for complete portfolio management system
- Relations for multi-tenancy
- Indexes for performance
- Comments explaining each model

### Models in Phase 1.2
1. **Tenant** - Multi-tenancy support
2. **User** - User accounts
3. **UserRole** - Role-based access control
4. **Program** - Top-level work initiatives
5. **Project** - Sub-projects/initiatives
6. **WBSConfiguration** - Work breakdown structure setup
7. **WBSItem** - Hierarchical WBS items
8. **ScoringCriterion** - Portfolio scoring criteria
9. **ProjectScoring** - Scores for projects
10. **Benefit** - Benefit tracking
11. **KPI** - Key performance indicators
12. **KPIMeasurement** - KPI measurements
13. **Risk** - Risk management
14. **CostItem** - Cost tracking
15. **Invoice** - Financial invoicing
16. **InvoiceAllocation** - Invoice-to-WBS allocation
17. **WorkflowTemplate** - Workflow configurations
18. **WorkflowStage** - Workflow stages
19. **StageResponsibility** - Who approves each stage
20. **WorkflowInstance** - Active workflow instances
21. **StageAction** - Workflow actions/approvals
22. **AuditLog** - Complete audit trail

### Database Features
- Multi-tenancy with tenant isolation
- Row-level security preparation (RLS in Phase 2)
- Full referential integrity
- Soft deletes (deletedAt field)
- Audit logging for compliance
- Optimized indexes for performance

## Next Steps

After verifying this chunk works:
1. **CHUNK 1.3** - Authentication (NextAuth integration)
2. **CHUNK 1.4** - Tenant middleware enforcement
3. **CHUNK 1.5** - Environment configuration validation

## Testing Locally

```bash
# Create a simple test script to verify database
cat > test-db.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants`);

  const users = await prisma.user.findMany({
    include: { roles: true }
  });
  console.log(`Found ${users.length} users with roles`);

  const programs = await prisma.program.findMany({
    include: { projects: true }
  });
  console.log(`Found ${programs.length} programs with ${programs.reduce((sum, p) => sum + p.projects.length, 0)} projects`);
}

main().then(() => process.exit(0));
EOF

# Run the test
npx ts-node test-db.ts
```

---

## Complete Architecture Overview

**Database Layer** (this chunk)
↓
Prisma ORM provides type-safe access
↓
**API Layer** (Phase 4)
REST endpoints with validation
↓
**Business Logic** (Phase 3)
Services for workflows, aggregations, calculations
↓
**Frontend** (Phase 5-7)
React UI components
↓
**User**

---

## Key Concepts

### Multi-Tenancy
Data is isolated by `tenantId`. Each tenant has:
- Separate users with separate roles
- Separate programs, projects, and work items
- Separate configuration and audit logs

### Soft Deletes
Records are marked with `deletedAt` rather than deleted:
- Allows audit trails to remain valid
- Easy to restore deleted items
- Queries must filter by `deletedAt IS NULL`

### Aggregation Fields
Parent WBS items have `aggregated_*` fields calculated from children:
- `aggregatedStartDate` = MIN(children's planned start)
- `aggregatedEndDate` = MAX(children's planned end)
- `aggregatedCost` = SUM(children's costs)
- `aggregatedStatus` = Priority-based status

### Workflow Engine
Separates approval process from entity creation:
- Entities can be in different workflow states
- Multiple stakeholders approve at different stages
- SLA tracking for each stage
- Complete audit trail of all actions

---

**Status**: Ready to implement
**Expected Duration**: 30-60 minutes (if Docker is ready)
**Next Chunk**: 1.3 (Authentication)
