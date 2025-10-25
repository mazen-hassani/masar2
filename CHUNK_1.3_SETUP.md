# CHUNK 1.3: Authentication - Setup & Testing Guide

## Overview
This chunk implements JWT-based authentication using NextAuth.js with bcrypt password hashing.

## Prerequisites
- CHUNK 1.2 completed (database schema)
- PostgreSQL and Redis running (docker-compose up -d)
- npm dependencies installed
- Database seeded with test users (npm run db:seed)

## Key Components

### 1. Authentication Utilities (`src/lib/auth.ts`)
- `hashPassword()` - Hash password using bcrypt
- `verifyPassword()` - Verify password against hash
- `authenticateUser()` - Authenticate user by email/password/tenant
- `getUserRoles()` - Get user's roles for a context
- `hasRole()` - Check if user has specific role
- `hasAnyRole()` - Check if user has any of multiple roles

### 2. NextAuth Configuration (`src/lib/auth-config.ts`)
- Credentials provider for email/password login
- JWT session strategy (24-hour expiration)
- Callbacks for JWT and session tokens
- Redirect after login
- Event logging

### 3. NextAuth Route Handler (`src/app/api/auth/[...nextauth]/route.ts`)
- Exposes NextAuth endpoints at `/api/auth/*`
- Handles signin, signout, callback, etc.

### 4. Login Page (`src/app/login/page.tsx`)
- User-friendly login form
- Test credential helpers for development
- Error display
- Redirect to dashboard on success

### 5. useAuth Hook (`src/hooks/useAuth.ts`)
- React hook for accessing auth state in components
- Type-safe user object
- Helper functions (hasRole, logout)
- Loading states

## Setup Steps

### 1. Verify Environment Variables
```bash
cat .env.local | grep -E "NEXTAUTH|JWT"

# Should show:
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=http://localhost:3000
# JWT_SECRET=...
```

### 2. Ensure Database is Running
```bash
docker-compose ps

# Should show postgres and redis running
```

### 3. Seed Database with Test Users
```bash
npm run db:seed

# Output should include:
# ✓ Created 5 test users
# Test credentials:
# - admin@ministry-health.test (password: admin)
# - pm@ministry-health.test (password: pm)
# - sponsor@ministry-health.test (password: sponsor)
# - finance@ministry-health.test (password: finance)
# - team@ministry-health.test (password: team)
```

### 4. Run Tests
```bash
npm test -- auth.test.ts

# Expected output:
# ✓ Authentication Utilities (6 tests)
#   ✓ hashPassword
#     ✓ should hash a password
#     ✓ should create different hashes for the same password
#     ✓ should handle special characters
#   ✓ verifyPassword
#     ✓ should verify correct password
#     ✓ should reject incorrect password
#     ✓ should handle special characters in password
#     ✓ should be case sensitive
#     ✓ should reject null password against hash
#   ✓ password hashing security (2 tests)
#     ✓ should not expose original password in hash
#     ✓ should create bcrypt-formatted hashes
```

### 5. Start Development Server
```bash
npm run dev

# Output should include:
# ▲ Next.js 14.2.33
# - Local: http://localhost:3000
```

### 6. Test Login Flow

#### Option A: Using Browser
1. Navigate to `http://localhost:3000/login`
2. Click "Show Test Credentials (Development)"
3. Click on a test credential to auto-fill the form
4. Click "Sign In"
5. Should redirect to home page with authenticated session

#### Option B: Using Test Credentials
```
Email: admin@ministry-health.test
Password: admin
Tenant ID: test-tenant-1
```

After login:
- Should be redirected to `/` (home page)
- Session should be available to components using `useAuth()` hook
- Network tab shows auth cookie set

## Acceptance Criteria

### ✅ Authentication Setup
- [ ] NextAuth installed and configured
- [ ] Credentials provider working
- [ ] JWT tokens generated correctly

### ✅ Password Security
- [ ] Passwords hashed with bcrypt (10 rounds)
- [ ] bcrypt tests all pass
- [ ] plaintext passwords never stored

### ✅ User Authentication
- [ ] Valid credentials allow login
- [ ] Invalid credentials reject login
- [ ] User redirects to home page on successful login
- [ ] User last_login timestamp updated

### ✅ Session Management
- [ ] Session created after login
- [ ] Session contains user info (id, email, tenantId, roles)
- [ ] Session expires after 24 hours
- [ ] Session cookie set as HTTP-only

### ✅ Role-Based Access
- [ ] User roles fetched from database
- [ ] Roles included in session
- [ ] hasRole() function works
- [ ] hasAnyRole() function works

### ✅ UI/UX
- [ ] Login page displays correctly
- [ ] Error messages shown on failed login
- [ ] Test credentials easily accessible in dev mode
- [ ] Loading state shown during sign-in

### ✅ Testing
- [ ] Password hashing tests pass
- [ ] Password verification tests pass
- [ ] All edge cases handled

## Testing Checklist

### Manual Testing
```bash
# 1. Login with valid credentials
- Go to http://localhost:3000/login
- Use: admin@ministry-health.test / admin / test-tenant-1
- Should redirect to home page

# 2. Try invalid credentials
- Go to http://localhost:3000/login
- Use: admin@ministry-health.test / wrongpassword
- Should show error message

# 3. Try wrong tenant
- Go to http://localhost:3000/login
- Use: admin@ministry-health.test / admin / wrong-tenant
- Should show error message

# 4. Check session in browser
- After login, open browser DevTools → Application → Cookies
- Should see: __Secure-next-auth.session-token (HTTP-only)

# 5. Test logout (will implement in CHUNK 1.4)
```

### Unit Test Results
```bash
npm test -- auth.test.ts

# All tests should pass:
# ✓ Authentication Utilities
#   ✓ hashPassword (3 tests)
#   ✓ verifyPassword (5 tests)
#   ✓ password hashing security (2 tests)
```

## Architecture Overview

```
User Login
  ↓
POST /api/auth/signin
  ↓
NextAuth Credentials Provider
  ↓
authenticateUser() function
  ↓
Query Prisma: User + verify password
  ↓
Generate JWT token
  ↓
Store in HTTP-only cookie
  ↓
Redirect to dashboard
  ↓
useAuth() hook reads session
  ↓
UI renders authenticated state
```

## Key Security Features

### 1. Password Hashing
- Bcrypt with 10 salt rounds
- Unique hash per password (salted)
- Passwords never visible in database
- Cannot reverse hash to get password

### 2. JWT Tokens
- Signed with JWT_SECRET
- 24-hour expiration
- Stored in HTTP-only cookies (not accessible via JavaScript)
- Contains user ID, email, tenantId, roles

### 3. Multi-Tenancy
- Users belong to single tenant
- Login requires tenantId
- Cannot login to another tenant's account
- Session scoped to tenant

### 4. Session Security
- HTTP-only cookies prevent XSS attacks
- Secure flag set (HTTPS only in production)
- SameSite flag set (CSRF protection)
- Server-side session validation on each request

## Troubleshooting

### "Invalid email or password" on correct credentials
**Cause**: Database not seeded or wrong tenant ID
**Solution**:
```bash
npm run db:seed
# Use tenant ID from test data: test-tenant-1
```

### "Tenant ID is required" error
**Cause**: Tenant ID field empty
**Solution**: Enter the tenant ID (test data uses: test-tenant-1)

### Session not persisting across page reloads
**Cause**: NEXTAUTH_SECRET not set or invalid
**Solution**:
```bash
# Check .env.local
grep NEXTAUTH_SECRET .env.local

# Should be 32+ characters
# If missing or invalid, update and restart dev server
```

### Password verification failing
**Cause**: Password hashing algorithm version mismatch
**Solution**:
```bash
# Reseed database with new hashes
npm run db:reset
npm run db:seed
```

### Tests failing
**Cause**: Dependencies not installed
**Solution**:
```bash
npm install
npm run build
npm test
```

## What's Next (CHUNK 1.4)

- Tenant context middleware
- Permission checking on API routes
- Logout functionality with session invalidation
- Protected page redirects

## Environment Variables Reference

```
NEXTAUTH_SECRET    - JWT secret (32+ chars)
NEXTAUTH_URL       - App URL for auth callbacks
JWT_SECRET         - Signing secret for tokens
DATABASE_URL       - PostgreSQL connection string
```

## File Structure
```
src/
├── lib/
│   ├── auth.ts                          # Authentication utilities
│   ├── auth-config.ts                   # NextAuth configuration
│   └── __tests__/
│       └── auth.test.ts                 # Authentication tests
├── app/
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts                     # NextAuth API routes
│   └── login/
│       └── page.tsx                     # Login page
└── hooks/
    └── useAuth.ts                       # React hook for auth state
```

---

**Status**: Ready to implement
**Expected Duration**: 1-2 hours (if database is running)
**Next Chunk**: 1.4 (Tenant Context Middleware)
