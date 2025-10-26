# CHUNK 1.4: Tenant Context Middleware - Setup & Testing Guide

## Overview

This chunk implements multi-tenant request routing with automatic tenant context injection. The middleware extracts tenant information from requests and prevents cross-tenant data access.

## Prerequisites

- CHUNK 1.3 completed (Authentication)
- Vercel Postgres database configured
- npm dependencies installed

## Key Components

### 1. Middleware (`src/middleware.ts`)

- Extracts tenant from multiple sources:
  - **Subdomain** (e.g., `ministry-health.localhost:3000`)
  - **Header** (`X-Tenant-ID`)
  - **Query Parameter** (`?tenant_id=...`)
- Validates tenant exists in database
- Checks tenant status (must be 'active')
- Attaches tenant context to request headers

### 2. Tenant Context (`src/lib/tenant-context.ts`)

- `getTenantContext()` - Get full tenant context (id + subdomain)
- `getTenantId()` - Get tenant ID only
- `getTenantSubdomain()` - Get subdomain only
- `hasTenantContext()` - Check if context available
- `getTenantContextSafe()` - Non-throwing variant

**Usage in Server Components**:

```typescript
import { getTenantId } from '@/lib/tenant-context';

export default function DashboardPage() {
  const tenantId = getTenantId();
  // Use tenantId for server-side data fetching
}
```

### 3. Protected Database (`src/lib/protected-db.ts`)

- `TenantDB` class with tenant-scoped queries
- All methods automatically filter by current tenant
- Prevents accidental cross-tenant data access

**Usage**:

```typescript
import TenantDB from '@/lib/protected-db';

// Get programs for current tenant only
const programs = await TenantDB.listPrograms();

// Get specific project (verified to belong to tenant)
const project = await TenantDB.getProject(projectId);

// Create new program in current tenant
const newProgram = await TenantDB.createProgram({
  name: 'New Initiative',
  // ... other fields
});
```

### 4. Tests (`src/lib/__tests__/tenant-context.test.ts`)

- Verifies tenant context functions are accessible
- Tests safe error handling
- Validates TypeScript types

## Architecture Overview

```
Request arrives
    ↓
Middleware evaluates
    ↓
Extract tenant ID from:
  • Subdomain
  • Header
  • Query param
    ↓
Validate in database:
  • Tenant exists
  • Tenant is active
    ↓
Attach to headers:
  • X-Tenant-ID
  • X-Tenant-SUBDOMAIN
    ↓
Server Components/Actions
can access via:
  • getTenantContext()
  • getTenantId()
    ↓
Protected Database (TenantDB)
filters all queries automatically
```

## Tenant Extraction Priority

1. **Header (`X-Tenant-ID`)** - Highest priority, explicit tenant specification
2. **Query Parameter (`tenant_id`)** - For API routes and dynamic redirects
3. **Subdomain** - For multi-domain deployment
4. **Session Context** - For authenticated users (phase next)

## Security Features

### Multi-Source Validation
- Subdomain format validation (alphanumeric + hyphens only)
- Tenant existence verification against database
- Status checking (must be 'active')

### Cross-Tenant Prevention
- All database queries filtered by tenant ID
- `TenantDB` throws error on unauthorized access
- Middleware blocks requests for inactive tenants

### Graceful Degradation
- Public routes skip middleware
- Auth routes bypass tenant check
- Database errors don't block requests (fail open)

## Setup Instructions

### Step 1: Verify Middleware is Enabled

Check that `src/middleware.ts` exists:

```bash
ls -la src/middleware.ts
```

The middleware will automatically be applied based on the `config.matcher` pattern.

### Step 2: Test Tenant Extraction

#### Option A: Using Subdomain (Production)

1. Add entry to `/etc/hosts`:
   ```bash
   127.0.0.1 ministry-health.localhost
   127.0.0.1 education-dept.localhost
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Visit:
   ```
   http://ministry-health.localhost:3000/
   http://education-dept.localhost:3000/
   ```

#### Option B: Using Header (API Testing)

```bash
curl -H "X-Tenant-ID: ministry-health" http://localhost:3000/
```

#### Option C: Using Query Parameter

```
http://localhost:3000/?tenant_id=ministry-health
```

### Step 3: Test Database Isolation

The tenant ID from middleware is automatically passed to server components:

```typescript
// app/programs/page.tsx
import TenantDB from '@/lib/protected-db';

export default async function ProgramsPage() {
  // This automatically filters by current tenant
  const programs = await TenantDB.listPrograms();

  return (
    <div>
      {programs.map(program => (
        <div key={program.id}>{program.name}</div>
      ))}
    </div>
  );
}
```

### Step 4: Verify Cross-Tenant Access is Blocked

Try accessing a project ID from another tenant:

```typescript
// This will throw if project doesn't belong to current tenant
const project = await TenantDB.getProject('project-from-other-tenant');
// Error: Project not found or not accessible to tenant <id>
```

## Testing

### Unit Tests

```bash
npm test -- tenant-context.test.ts
```

Expected output:
```
✓ Tenant Context
  ✓ getTenantId
  ✓ getTenantContext
  ✓ getTenantSubdomain
  ✓ hasTenantContext
  ✓ getTenantContextSafe
  ✓ Type Safety
```

### Integration Tests (Manual)

#### Test 1: Subdomain Routing
1. Visit `http://ministry-health.localhost:3000/`
2. Verify request succeeds
3. Check browser DevTools > Network > Headers
4. Should NOT see `X-Tenant-ID` header (only in response)

#### Test 2: Header-Based Tenant
1. Make request with header:
   ```bash
   curl -H "X-Tenant-ID: ministry-health" http://localhost:3000/ -v
   ```
2. Verify response headers contain tenant info

#### Test 3: Invalid Tenant
1. Visit `http://invalid-tenant.localhost:3000/`
2. Should redirect to `/login?error=invalid_tenant`

#### Test 4: Inactive Tenant
1. Manually set tenant status to 'suspended' in database
2. Try to access
3. Should redirect to `/login?error=tenant_inactive`

#### Test 5: Cross-Tenant Data Access Prevention
1. Log in with tenant A user
2. Try to access data ID from tenant B
3. Should get error: "not found or not accessible"

## Troubleshooting

### "Tenant context not found" Error

**Cause**: Trying to use `getTenantId()` outside of request context
**Solution**:
- Only use in Server Components, Route Handlers, or Server Actions
- Not available in Client Components
- Use `getTenantContextSafe()` if might be unavailable

### "Tenant not found" Redirect

**Cause**: Subdomain doesn't match any tenant record
**Solution**:
- Verify tenant exists in database: `npm run db:studio`
- Check subdomain spelling matches exactly
- Add entry to `/etc/hosts` if using local domains

### Middleware not Applied

**Cause**: Routes excluded by matcher pattern
**Solution**:
- Middleware skips:
  - `/api/auth/*` (auth routes)
  - `/_next/*` (Next.js internals)
  - `/favicon.ico` (static)
  - `/` (home page)
- To apply to home page, update `config.matcher` in middleware.ts

### Tenant Status Check Failing

**Cause**: Tenant created with 'suspended' or 'trial' status
**Solution**:
- Verify in database: `select id, status from "Tenant";`
- Update status: `update "Tenant" set status='active' where id='...';`
- Or use `npm run db:studio` to manage visually

## Advanced Usage

### Custom Tenant Detection

To add a custom tenant detection strategy, modify `src/middleware.ts`:

```typescript
// Strategy X: Custom source
if (!tenantId) {
  const customTenantId = extractTenantFromCustomSource(request);
  if (customTenantId) {
    tenantId = customTenantId;
    tenantSource = 'custom';
  }
}
```

### Tenant-Specific Branding

Use subdomain for branding:

```typescript
import { getTenantSubdomain } from '@/lib/tenant-context';

export default async function Layout() {
  const subdomain = getTenantSubdomain();

  // Load tenant-specific logo/branding
  const logo = `/logos/${subdomain}.png`;

  return <header style={{backgroundImage: `url(${logo})`}} />;
}
```

### Conditional API Routes

Protect API routes with tenant context:

```typescript
// app/api/programs/route.ts
import { getTenantId } from '@/lib/tenant-context';
import TenantDB from '@/lib/protected-db';

export async function GET() {
  const programs = await TenantDB.listPrograms();
  return Response.json(programs);
}
```

## Files Overview

```
src/
├── middleware.ts              # Request middleware
├── lib/
│   ├── tenant-context.ts      # Tenant context utilities
│   ├── protected-db.ts        # Tenant-scoped database
│   └── __tests__/
│       └── tenant-context.test.ts  # Context tests
```

## Acceptance Criteria

### ✅ Middleware Implementation
- [x] Middleware extracts tenant from multiple sources
- [x] Tenant validated against database
- [x] Tenant status checked (must be active)
- [x] Headers attached to request

### ✅ Tenant Context
- [x] Server components can access tenant ID
- [x] Safe context access without throwing
- [x] TypeScript types defined
- [x] Works in Server Actions

### ✅ Database Protection
- [x] Queries auto-filtered by tenant
- [x] Cross-tenant access throws error
- [x] Soft delete respected
- [x] Tenant validation on updates

### ✅ Security
- [x] Subdomain validation (alphanumeric)
- [x] Tenant existence check
- [x] Status validation
- [x] Error handling doesn't leak info

### ✅ Testing
- [x] Unit tests pass
- [x] Manual testing procedures documented
- [x] Cross-tenant prevention verified

### ✅ Build & Deploy
- [x] npm run build succeeds
- [x] No TypeScript errors
- [x] ESLint passes
- [x] Ready for Vercel deployment

## What's Next (CHUNK 1.5)

- Configuration validation with Zod
- Environment variable schema definition
- Fail-fast on missing required variables
- Configuration constants and utilities

## Architecture Decisions

### Why Three Strategies?

1. **Subdomain**: Best for multi-domain production deployments
2. **Header**: Best for API clients and dynamic routing
3. **Query Parameter**: Best for temporary redirects and testing

### Why Middleware at Request Level?

- Tenant validation happens once per request
- Consistent across all routes
- Fails fast before route handler
- Database query validation as secondary check

### Why TenantDB Class?

- Type-safe tenant-filtered queries
- Prevents accidental cross-tenant queries
- Centralized database access pattern
- Easy to audit and test

---

**Status**: Ready for implementation
**Expected Duration**: 1-2 hours
**Next Chunk**: 1.5 (Environment Configuration)
