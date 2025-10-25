# DEVELOPER QUICK REFERENCE GUIDE - MASAR IMPLEMENTATION

## PURPOSE
This guide helps developers understand how to use the prompts and avoid common pitfalls.

---

## QUICK START

### Before You Start: Read These
1. **ARCHITECTURE_BLUEPRINT.md** - Understand system design (20 min)
2. **IMPLEMENTATION_PROMPTS.md** - See the full sequence (30 min)
3. **spec.md** - Understand requirements (1 hour)

### Development Setup (Chunk 1.5)
```bash
# Clone repo
git clone <repo-url>
cd masar2

# Copy environment
cp .env.example .env.local
# Edit .env.local with your values

# Setup Docker
docker-compose up -d

# Install deps & run migrations
npm install
npm run db:setup
npm run db:seed

# Start dev server
npm run dev

# Verify everything
npm run type-check
npm run lint
npm run test
```

### Working with Chunks
1. **Pick next chunk** from IMPLEMENTATION_PROMPTS.md
2. **Read the prompt** - understand requirements
3. **Check dependencies** - ensure previous chunks done
4. **Write code** - following acceptance criteria
5. **Write tests** - test-driven approach
6. **Verify** - run test, check types, lint
7. **Integrate** - if next chunk exists, verify it works with your code
8. **Commit** - with clear message referencing chunk

---

## CHUNK WORKFLOW

### Step 1: Understand Dependencies
```
Check "Integrates With" section in chunk prompt

Example: CHUNK 4.2 (Program CRUD)
├─ Uses 2.1 (Program model exists)
├─ Uses 1.4 (Tenant middleware works)
├─ Uses 4.1 (Zod validators exist)
└─ Uses 1.3 (Auth working)

If any dependency not done → DO THAT FIRST
```

### Step 2: Write Tests First
```typescript
// Example test structure
describe('CreateProgram API', () => {
  it('should create program with valid data', async () => {
    // Setup: create test user, tenant
    // Act: call POST /api/programs
    // Assert: verify response, check DB
  });

  it('should reject unauthorized user', async () => {
    // Same but with user who shouldn't have access
  });

  it('should validate required fields', async () => {
    // Send incomplete data, verify 400
  });
});
```

### Step 3: Implement
Write code to make tests pass. Don't over-engineer.

### Step 4: Integration Test
```typescript
// If next chunk depends on this:
import { createProgram } from './api/programs';

it('Program CRUD integrates with Project creation', async () => {
  const program = await createProgram({...});
  const project = await createProject({
    programId: program.id,  // <-- Make sure this works
    ...
  });
  expect(project.program).toEqual(program);
});
```

---

## COMMON PATTERNS

### 1. Multi-Tenant Filtering

**Pattern**: Always filter by tenant
```typescript
// ✅ CORRECT
const programs = await prisma.program.findMany({
  where: {
    tenantId: req.tenantId,  // FROM MIDDLEWARE (1.4)
    deletedAt: null,         // Soft delete check
  },
});

// ❌ WRONG - Leaks data across tenants
const programs = await prisma.program.findMany();
```

### 2. Permission Checking

**Pattern**: Check role before allowing action
```typescript
// ✅ CORRECT
const canCreate = await checkPermission(
  userId,
  'Program',
  'Create',
  tenantId,
  programId  // context
);

if (!canCreate) {
  return res.status(403).json({ error: 'Forbidden' });
}

// ❌ WRONG - No permission check
const program = await prisma.program.create({ ... });
```

### 3. Validation

**Pattern**: Validate at route handler before business logic
```typescript
// ✅ CORRECT
import { CreateProgramSchema } from '@/lib/validators';

export async function POST(req: Request) {
  const body = await req.json();
  const validated = CreateProgramSchema.parse(body);

  // Now safe to use validated data
}

// ❌ WRONG - No validation
const program = await prisma.program.create({
  data: body,  // Could be anything
});
```

### 4. Business Logic in Services

**Pattern**: Extract to service, not inline in route
```typescript
// ✅ CORRECT - /lib/services/workflow.ts
export async function processApprovalAction(
  instanceId: string,
  action: 'Approve' | 'Reject' | 'Return',
  actorId: string,
  comment?: string
): Promise<WorkflowInstance> {
  // Complex logic here
}

// Then use in route handler
export async function POST(req: Request) {
  const result = await processApprovalAction(...);
  return res.json(result);
}

// ❌ WRONG - Logic in route
export async function POST(req: Request) {
  // 500 lines of complex logic here
}
```

### 5. Relationships & Include

**Pattern**: Use Prisma `include` for related data
```typescript
// ✅ CORRECT - Fetches relationships
const program = await prisma.program.findUnique({
  where: { id: programId },
  include: {
    projects: true,      // Include related projects
    pm: true,            // Include user relationship
    benefits: true,
  },
});

// ❌ WRONG - Separate queries (N+1 problem)
const program = await prisma.program.findUnique({
  where: { id: programId },
});
const projects = await prisma.project.findMany({
  where: { programId },  // Separate DB call
});
```

### 6. Aggregations

**Pattern**: Calculate from children, update parent
```typescript
// ✅ CORRECT - Calculate parent from children
async function updateWBSAggregates(parentId: string) {
  const children = await prisma.wbsItem.findMany({
    where: { parentId },
  });

  const aggregated = calculateAggregates(children);

  await prisma.wbsItem.update({
    where: { id: parentId },
    data: aggregated,
  });
}

// ❌ WRONG - Manually maintaining parent values
// If child updates, parent gets out of sync
```

### 7. Audit Logging

**Pattern**: Log all mutations
```typescript
// ✅ CORRECT
export async function POST(req: Request) {
  const program = await prisma.program.create({...});

  await prisma.auditLog.create({
    data: {
      tenantId,
      entityType: 'Program',
      entityId: program.id,
      action: 'CREATE',
      actorId: userId,
      changes: { created: program },
      createdAt: new Date(),
    },
  });

  return res.json(program);
}

// ❌ WRONG - No audit trail
```

### 8. Error Handling

**Pattern**: Standardized error responses
```typescript
// ✅ CORRECT
export async function POST(req: Request) {
  try {
    const body = CreateProgramSchema.parse(await req.json());
    const program = await createProgram(body);
    return res.json({ success: true, data: program });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: error.issues },
      });
    }

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  }
}

// ❌ WRONG - Inconsistent error handling
```

---

## TESTING CHECKLIST

Before marking chunk done, verify:

### Unit Tests
```
[ ] Function works with valid input
[ ] Function rejects invalid input
[ ] Edge cases handled (null, empty, bounds)
[ ] Error cases throw/return correct error
```

### Integration Tests
```
[ ] API returns 200 for valid request
[ ] API returns 400 for invalid request
[ ] API returns 401 for unauthenticated
[ ] API returns 403 for unauthorized (wrong role)
[ ] API returns 404 for not found
[ ] Data persisted to DB correctly
[ ] Relationships loaded correctly
```

### Multi-Tenancy Tests
```
[ ] User from Tenant A can't access Tenant B data
[ ] Query filters by tenantId
[ ] Error returned for cross-tenant access
```

### Accessibility Tests
```
[ ] TypeScript: No type errors
[ ] Runtime: No console errors
[ ] Validation: All constraints checked
[ ] Permissions: All access verified
```

---

## DEBUGGING TIPS

### Database Issues

```sql
-- Check tenant isolation
SELECT id, name, tenant_id FROM programs LIMIT 5;

-- Check soft deletes
SELECT id, deleted_at FROM programs WHERE deleted_at IS NOT NULL;

-- Check relationships
SELECT p.id, proj.id FROM programs p
LEFT JOIN projects proj ON p.id = proj.program_id;

-- Check index usage
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM programs WHERE tenant_id = '...';
```

### API Issues

```bash
# Check request details
curl -v -X POST http://localhost:3000/api/programs \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# Check authentication
curl -H "Authorization: Bearer $(cat .token)" \
  http://localhost:3000/api/programs

# Check logs
npm run dev  # Watch console for errors
```

### TypeScript Issues

```bash
# Full type check
npm run type-check

# Show errors
npx tsc --noEmit

# Fix common issues
npx eslint --fix src/
```

---

## CODE ORGANIZATION

```
/src
  /app                          # Next.js App Router
    /api
      /programs
        /route.ts               # POST /api/programs, GET /api/programs
      /[...]/route.ts           # Other API routes
    /(dashboard)
      /programs
        /page.tsx               # /programs UI
        /[id]/page.tsx          # /programs/:id UI

  /lib
    /validators
      /programs.ts              # Zod schemas for programs
    /services
      /programs.ts              # Business logic for programs
    /api-client
      /programs.ts              # Frontend API calls
    /utils
      /helpers.ts
    /config.ts                  # Configuration
    /tenant-context.ts          # Tenant utilities

  /hooks
    /usePrograms.ts             # React hook for program operations

  /components
    /ui                         # shadcn/ui components (auto-installed)
    /programs
      /ProgramForm.tsx          # Form component
      /ProgramCard.tsx          # Display component

  /types
    /index.ts                   # TypeScript interfaces

  /middleware.ts                # Next.js middleware

/prisma
  /schema.prisma                # Database schema
  /migrations                   # Database migrations
  /seed.ts                      # Seed test data
```

---

## COMMIT MESSAGES

```
# Format: [CHUNK-X.Y] Brief description

# Examples:
[CHUNK-1.1] Initialize Next.js project with dependencies
[CHUNK-2.1] Add Program and Project Prisma models
[CHUNK-3.1] Implement WBS aggregation service
[CHUNK-4.2] Add Program CRUD API endpoints
[CHUNK-6.1] Create Program list and detail pages

# Include context in body:
[CHUNK-4.2] Add Program CRUD API endpoints

- POST /api/programs (create with validation)
- GET /api/programs (list with pagination)
- GET /api/programs/:id (detail with relationships)
- PUT /api/programs/:id (update)
- DELETE /api/programs/:id (soft delete)

Tests:
- Unit tests for all validators
- Integration tests for all endpoints
- Multi-tenancy isolation verified
```

---

## PERFORMANCE TIPS

### Database
```typescript
// ✅ Use indexes for frequently filtered columns
CREATE INDEX idx_programs_tenant_status
ON programs(tenant_id, status);

// ✅ Use select to limit columns
const programs = await prisma.program.findMany({
  select: { id: true, name: true, status: true },
});

// ❌ Don't fetch unnecessary relationships
const programs = await prisma.program.findMany({
  include: {
    projects: {
      include: {
        wbsItems: {
          include: { children: true },  // Too deep
        },
      },
    },
  },
});
```

### API
```typescript
// ✅ Paginate list endpoints
const programs = await prisma.program.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// ✅ Cache expensive calculations
const score = cacheGet('program-score-' + id)
  || await calculateScore(id);

// ❌ Don't load everything
const programs = await prisma.program.findMany(); // All records
```

### Frontend
```typescript
// ✅ Use SWR for caching & revalidation
const { data: programs } = useSWR('/api/programs', fetcher);

// ✅ Memoize expensive computations
const sortedPrograms = useMemo(
  () => sortBy(programs, sort),
  [programs, sort]
);

// ❌ Don't recalculate on every render
```

---

## WHEN STUCK

### Problem: "Chunk depends on thing that's not done"
**Solution**: Do the dependency first. Don't skip steps.

### Problem: "Tests are failing"
**Solution**:
1. Run individual test: `npm test -- programs.test.ts`
2. Check error message carefully
3. Log inside test to debug: `console.log(result)`
4. Compare with working example

### Problem: "TypeScript errors everywhere"
**Solution**:
1. Run `npm run type-check` to see all errors
2. Read error message (usually says what's wrong)
3. Check imports (did you export the function?)
4. Check types (did you use right interface?)

### Problem: "Code works locally but different in production"
**Solution**:
1. Check environment variables
2. Check database version matches
3. Run same tests in Docker
4. Check logs from production

### Problem: "Multi-tenancy seems broken"
**Solution**:
1. Verify middleware runs on your route: `console.log(req.tenantId)`
2. Verify all queries filter by tenant: `WHERE tenant_id = ?`
3. Check Prisma query logs: `DEBUG=prisma:query`
4. Check if route is in excluded list (auth routes)

---

## FINAL CHECKLIST BEFORE MARKING CHUNK DONE

```
Code Quality
[ ] No TypeScript errors
[ ] No ESLint warnings
[ ] Code formatted consistently
[ ] Variable names are clear
[ ] Functions have JSDoc comments
[ ] No commented-out code

Testing
[ ] Unit tests written and passing
[ ] Integration tests written and passing
[ ] All acceptance criteria verified
[ ] Edge cases tested
[ ] Error cases tested
[ ] Coverage >80%

Integration
[ ] Next chunk can use this code
[ ] No breaking changes to previous chunks
[ ] Tests from previous chunks still pass
[ ] No orphaned code
[ ] Clear integration points documented

Documentation
[ ] README updated if needed
[ ] Function signatures documented
[ ] API responses documented
[ ] Database schema changes documented

Git
[ ] Code committed with clear message
[ ] Commit references chunk number
[ ] All tests passing on commit
[ ] Ready for code review
```

---

## RESOURCES

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Zod Docs**: https://zod.dev
- **shadcn/ui**: https://ui.shadcn.com
- **NextAuth**: https://next-auth.js.org
- **Zustand**: https://github.com/pmndrs/zustand
- **Playwright**: https://playwright.dev
- **Vitest**: https://vitest.dev

---

## QUICK COMMANDS

```bash
# Development
npm run dev                  # Start dev server
npm run type-check         # Check TypeScript
npm run lint               # Check ESLint
npm run format             # Fix formatting

# Database
npm run db:migrate         # Run pending migrations
npm run db:seed           # Seed test data
npm run db:reset          # Drop and recreate DB
npm run db:studio         # Open Prisma Studio

# Testing
npm test                  # Run all tests
npm test -- --watch      # Watch mode
npm test -- programs     # Single file tests
npm run test:coverage    # Coverage report

# Build
npm run build            # Production build
npm run start            # Start production server

# Git
git status              # See changes
git diff               # See diffs
git commit -m "msg"    # Commit with message
```

---

Good luck! Start with Phase 1, follow the chunks in order, and don't skip steps. 🚀

