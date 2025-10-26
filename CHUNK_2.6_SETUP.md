# CHUNK 2.6: User Roles with Context-Specific Access Setup Guide

## Overview

This document describes the implementation of CHUNK 2.6: User Roles with Context-Specific Access for the Masar portfolio management system. This chunk introduces comprehensive role-based access control (RBAC) with support for Global, Program, and Project-level roles.

## What Was Implemented

### 1. Role Hierarchy & Permission System

Created comprehensive RBAC type definitions in `src/types/rbac.ts`:

**Role Types:**
- `Admin` - System administrator with global access
- `PMO` - Program Management Office with oversight
- `Sponsor` - Executive sponsor with approval power
- `PM` - Project Manager with project-level control
- `Management` - Manager with review/approval permissions
- `Finance` - Finance team for budget tracking
- `TeamMember` - Team member with limited access

**Role Hierarchy (High to Low):**
```
Admin (7) > PMO (6) > Sponsor (5) > PM (3) > Management (4) > Finance (2) > TeamMember (1)
```

**Context Types:**
- `Global` - System-wide role (grants permissions everywhere)
- `Program` - Program-level role (for a specific program)
- `Project` - Project-level role (for a specific project)

**Actions:**
- `view` - View entity details
- `create` - Create new entities
- `update` - Modify existing entities
- `delete` - Remove entities
- `approve` - Approve workflow transitions
- `execute` - Execute actions/transitions
- `manage` - Administrative management

**Permission Matrix:**
```
Admin:    Global(all) | Program(all) | Project(all)
PMO:      Global(v,c,u,a,m) | Program(v,c,u,a,m) | Project(v,u,a)
Sponsor:  Global(v,a) | Program(v,a) | Project(v,a)
PM:       Global(v) | Program(v,c,u,e) | Project(v,c,u,e)
Management: Global(v) | Program(v,a) | Project(v,a)
Finance:  Global(v) | Program(v) | Project(v,u)
TeamMember: Global() | Program(v) | Project(v,u)
```

### 2. Type Definitions

**Core Types in `src/types/rbac.ts`:**

- `UserRole` - Union type of all roles
- `RoleContextType` - Global, Program, Project
- `Action` - Specific actions user can perform
- `EntityType` - Type of entity being accessed
- `UserRoleAssignment` - Role assignment record with validity period
- `UserRolesContext` - All roles for a user, organized by context
- `AccessCheckResult` - Result of permission check with reasoning
- `AssignRoleRequest` - Request DTO for role assignment
- `UpdateRoleRequest` - Request DTO for role updates
- `RoleFilter` - Filter options for role queries

**Enums:**
- `RoleHierarchy` - Numeric levels for role comparison
- `contextHierarchy` - Numeric levels for context hierarchy

### 3. RBAC Service

Created `src/lib/services/rbac-service.ts` with 8 core methods:

**Public Methods:**

1. **getRolesForUser(userId)** - Get all roles for a user
   - Returns UserRolesContext with organized roles
   - Handles role inheritance and validity
   - Identifies highest role in hierarchy

2. **canUserAccess(userId, entityType, entityId, action)** - Check permission
   - Context-aware access checking
   - Role hierarchy and inheritance support
   - Returns AccessCheckResult with reasoning

3. **assignRole(data, assignedBy)** - Assign role to user
   - Creates role assignment record
   - Supports optional validity period
   - Tracks who assigned the role

4. **updateRole(roleId, data)** - Update role assignment
   - Modify role, validity, or active status
   - Granular field updates

5. **revokeRole(roleId)** - Revoke role assignment
   - Marks role as inactive
   - Soft delete pattern

6. **listUserRoles(userId, filter)** - Get user's role assignments
   - Filtered listing with pagination
   - Optional filtering by role, context, status

7. **getUsersWithRole(role, contextType, contextId)** - Get users by role
   - Find all users with specific role
   - Supports context filtering

8. **Additional Helpers:**
   - `isAdmin(userId)` - Check if user is admin
   - `isPMO(userId)` - Check if user has PMO role
   - `getApprovers(contextType, contextId)` - Get users who can approve

### 4. Helper Functions

Created `src/lib/helpers/rbac-helpers.ts` with 25+ utility functions:

**Role Checking:**
- `hasGlobalRole()` - Check global role
- `hasProgramRole()` - Check program-level role
- `hasProjectRole()` - Check project-level role
- `hasAnyRole()` - Check if has any of roles
- `hasAllRoles()` - Check if has all roles
- `getHighestRole()` - Get user's highest role

**Action Checking:**
- `canPerformAction()` - Generic action check
- `canView()` - Can view entity
- `canCreate()` - Can create entity type
- `canUpdate()` - Can update entity
- `canDelete()` - Can delete entity
- `canApprove()` - Can approve
- `canExecute()` - Can execute
- `canManage()` - Can manage

**Security Checks (Throw on Fail):**
- `requireAccess()` - Require specific permission
- `requireAnyRole()` - Require one of roles
- `requireAllRoles()` - Require all roles
- `requireAdmin()` - Require admin privilege

**Advanced:**
- `filterByAccess()` - Filter array by permissions
- Role caching with 5-minute TTL
- Cache invalidation helpers

### 5. Middleware Extension

Created `src/lib/middleware/rbac-middleware.ts` with request-level RBAC:

**Core Functions:**

1. **rbacMiddleware(request)** - Main middleware
   - Attaches RBAC context to request
   - Sets custom headers with role information

2. **getRBACContextFromRequest(request)** - Extract from headers
   - Parses roles from request headers
   - Reconstructs UserRolesContext

3. **withRBAC(handler)** - Protect API route
   - Wraps handler with role context
   - Passes context to handler

4. **withRequiredRoles(...roles)** - Enforce role requirement
   - Returns 403 if role not found
   - Higher-order function wrapper

5. **withAdminRequired()** - Admin-only routes
6. **withPMORequired()** - PMO/Admin routes

**Helper Functions:**
- `isAdminRequest()` - Check admin from request
- `isPMORequest()` - Check PMO from request
- `hasRoleInRequest()` - Check specific role
- `attachRolesToResponse()` - Add roles to response

### 6. Role Validation

**Permission Validation:**
- Role hierarchy enforcement
- Context-specific access control
- Validity period checking
- Active status verification

**Access Logic:**
1. Check Global roles first (highest precedence)
2. Check context-specific roles (Program/Project)
3. Check role hierarchy (higher roles inherit permissions)
4. Check context inheritance (Program roles apply to Projects)
5. Return detailed AccessCheckResult with reasoning

### 7. Build Verification

Implementation verified with:
- ✅ TypeScript strict mode compilation
- ✅ ESLint validation (proper disable comments for type casts)
- ✅ Next.js production build successful
- ✅ All imports and exports validated

## Usage Examples

### Get User's Roles

```typescript
import { RBACService } from '@/lib/services/rbac-service';

const rolesContext = await RBACService.getRolesForUser('user_123');

console.log(rolesContext.globalRoles);      // ['Admin']
console.log(rolesContext.programRoles);     // Map of program roles
console.log(rolesContext.projectRoles);     // Map of project roles
console.log(rolesContext.highestRole);      // 'Admin'
console.log(rolesContext.allRoles);         // All unique roles
```

### Check Permission

```typescript
import { RBACService } from '@/lib/services/rbac-service';

const result = await RBACService.canUserAccess(
  'user_123',
  'Project',
  'proj_456',
  'update'
);

if (result.allowed) {
  console.log(`Allowed: ${result.reason}`);
} else {
  console.log(`Denied: ${result.reason}`);
  console.log(`Missing: ${result.missingPermission}`);
}
```

### Use Helpers

```typescript
import { canUpdate, requireAdmin, getRolesForUserCached } from '@/lib/helpers/rbac-helpers';

// Simple permission check
if (await canUpdate('user_123', 'Project', 'proj_456')) {
  // Proceed with update
}

// Require admin (throws if not admin)
try {
  await requireAdmin('user_123');
  // User is admin
} catch (error) {
  // User is not admin
}

// Get roles with caching
const rolesContext = await getRolesForUserCached('user_123', true);
```

### Protect API Routes

```typescript
import { withAdminRequired, withRequiredRoles } from '@/lib/middleware/rbac-middleware';

// Admin-only endpoint
export const GET = withAdminRequired(async (request, rolesContext) => {
  // Only admins can reach here
  return NextResponse.json({ data: 'admin-only' });
});

// Require PMO or Admin
export const POST = withRequiredRoles('PMO', 'Admin')(async (request, rolesContext) => {
  // Only PMO or Admin can reach here
  return NextResponse.json({ data: 'created' });
});
```

### Assign Role to User

```typescript
import { RBACService } from '@/lib/services/rbac-service';

const role = await RBACService.assignRole(
  {
    userId: 'user_123',
    role: 'PM',
    contextType: 'Project',
    contextId: 'proj_456',
    validUntil: new Date('2025-12-31'),
  },
  'admin_user_id' // who assigned this role
);

console.log(`Role assigned: ${role.role} for ${role.contextType}`);
```

### Find Users with Role

```typescript
import { RBACService } from '@/lib/services/rbac-service';

// Get all admins
const admins = await RBACService.getUsersWithRole('Admin', 'Global');

// Get all PMs for a project
const projectPMs = await RBACService.getUsersWithRole('PM', 'Project', 'proj_456');

// Get approvers for a program
const approvers = await RBACService.getApprovers('Program', 'prog_123');
```

## Architecture

### Context Hierarchy

```
Global Role
  └─ Applies to all programs and projects

Program Role
  └─ Applies to program and its projects

Project Role
  └─ Applies only to specific project
```

### Role Inheritance

```
Admin Global Role
  ├─ Grants all permissions everywhere
  └─ No inheritance needed (covers all)

PM Program Role
  ├─ Grants project access to all projects in program
  └─ Inherited by child projects
```

### Permission Evaluation

```
1. Get all active roles for user
2. For each role (in hierarchy order):
   - Check if role applies to context
   - Check if role has permission for action
   - If yes, return allowed
3. If no role allows, return denied
```

## Type Safety & Conversions

**Decimal/Number Conversions:**
- Not needed for RBAC (roles are strings)

**String to Enum Conversions:**
- Role field cast with eslint-disable
- Context type cast with eslint-disable
- Proper type guards throughout

**Null Handling:**
- contextId: Optional for Global roles
- validUntil: Optional for indefinite roles
- highestRole: Nullable if no roles assigned

## Database Schema Reference

**UserRole Table:**
```sql
id          String     PRIMARY KEY
userId      String     FOREIGN KEY
role        String     (Admin, PMO, Sponsor, PM, Finance, TeamMember, Management)
contextType String     (Global, Program, Project)
contextId   String?    (Program or Project ID)
isActive    Boolean    DEFAULT true
validUntil  DateTime?  (Role expires if set)
assignedAt  DateTime   (When role was assigned)
assignedBy  String     FOREIGN KEY (who assigned)
```

## Performance Considerations

1. **Query Optimization:**
   - Single query to load all roles for user
   - Context parsing in memory
   - Efficient role hierarchy checks

2. **Caching:**
   - 5-minute TTL role cache
   - Cache invalidation on role changes
   - Optional cache bypass for fresh data

3. **Indexing:**
   - Indexes on userId, contextType, contextId
   - Indexes on isActive, validUntil for filtering
   - Foreign key indexes on assignedBy

## Security Considerations

1. **Validation:**
   - All role assignments validated
   - Role names enum-validated
   - Context type validated

2. **Audit Trail:**
   - assignedBy tracks who assigned role
   - assignedAt tracks when
   - Soft delete on revoke (no data loss)

3. **Expiration:**
   - validUntil enforced at query time
   - Expired roles excluded from access checks
   - Can set indefinite (null) expiration

## Files Created

- `src/types/rbac.ts` (360+ lines) - Type definitions and enums
- `src/lib/services/rbac-service.ts` (360+ lines) - Core RBAC service
- `src/lib/helpers/rbac-helpers.ts` (280+ lines) - Helper utilities
- `src/lib/middleware/rbac-middleware.ts` (200+ lines) - Middleware extensions

## What's Next (CHUNK 2.7+)

Future chunks will build on this RBAC foundation:
- CHUNK 3.1: WBS Aggregation Service (parent value calculations)
- CHUNK 3.2+: Workflow system with role-based routing

## Testing Strategy

The RBAC system should be tested with:

1. **Unit Tests:**
   - Role hierarchy comparisons
   - Permission matrix lookups
   - Context inheritance logic
   - Role cache behavior

2. **Integration Tests:**
   - Full permission checks
   - Multi-context scenarios
   - Role expiration
   - Middleware behavior

3. **Scenarios to Test:**
   - Admin accessing any resource (should succeed)
   - PM accessing their project (should succeed)
   - TeamMember accessing non-assigned project (should fail)
   - Expired roles (should not be counted)
   - Inactive roles (should not be counted)
   - Program role applying to child project (should work)

## Best Practices

1. **Always use permission helpers** - Don't check roles directly
2. **Cache roles for performance** - Use cached helper functions
3. **Invalidate cache on role changes** - Call invalidateRoleCache()
4. **Use requireX() for critical operations** - Fail fast on permission denial
5. **Log permission checks** - For security audit trail
6. **Test permission logic thoroughly** - Complex role interactions

## Troubleshooting

**User can't perform action they should be able to:**
1. Check if user has active role assignment
2. Verify role hasn't expired (validUntil)
3. Verify role context matches (Global/Program/Project)
4. Check if role has permission for action
5. Verify parent context (program roles apply to projects)

**Role not appearing in getRolesForUser():**
1. Check isActive = true in database
2. Check validUntil is null or in future
3. Clear role cache with invalidateRoleCache()
4. Verify userId is correct

**API route returns 403 when it shouldn't:**
1. Check middleware is properly configured
2. Verify roles attached to request headers
3. Check withRequiredRoles roles match user's roles
4. Verify role permissions for that action

## Summary

CHUNK 2.6 successfully implements:

- ✅ **Role Hierarchy** - 7 role levels with clear inheritance
- ✅ **Context Types** - Global, Program, Project level roles
- ✅ **Permission Matrix** - Action-based access control
- ✅ **Service Layer** - 8 core RBAC methods
- ✅ **Helper Functions** - 25+ utilities for common operations
- ✅ **Middleware Integration** - Request-level role attachment
- ✅ **Type Safety** - Full TypeScript support with validation
- ✅ **Build Success** - All checks passing

Progress: Phase 2 now at 6/6 = 100% (ALL CHUNKS COMPLETE!)

Next: Move to Phase 3 Business Logic
