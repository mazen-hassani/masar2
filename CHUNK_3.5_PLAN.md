# CHUNK 3.5: Workflow Notifications & Audit Log - Implementation Plan

## Status: PAUSED - SCHEMA MIGRATION REQUIRED

CHUNK 3.5 requires new Prisma database models that are not yet in the schema:
- `Notification` table
- `NotificationTemplate` table
- `NotificationPreference` table
- `AuditLog` table

## What Was Created

### 1. Type Definitions ✅
- `src/types/notifications.ts` - Complete 500+ line notification and audit log type definitions

### 2. Services ✅ (Partially Implemented)
- `src/lib/services/notification-service.ts` - NotificationService with 9 methods
- `src/lib/services/audit-log-service.ts` - AuditLogService with 10 methods

### 3. Tests ✅ (Partially Implemented)
- `src/lib/__tests__/notification.test.ts` - 35+ test cases

## Required for Continuation

### Database Schema Update Needed
Before services can be fully implemented, add to `prisma/schema.prisma`:

```prisma
model Notification {
  id            String   @id @default(cuid())
  tenantId      String
  userId        String
  email         String
  eventType     String   // WorkflowAssigned, WorkflowApproved, etc.
  subject       String
  message       String
  data          Json     // Notification context data
  deliveryMethod String  // Email, InApp, Both
  status        String   // Pending, Sent, Failed, Read
  createdAt     DateTime @default(now())
  sentAt        DateTime?
  readAt        DateTime?
  failureReason String?
  workflowInstanceId String?
  
  @@index([tenantId])
  @@index([userId])
  @@index([status])
}

model NotificationTemplate {
  id                     String   @id @default(cuid())
  tenantId               String
  eventType              String   // Unique event type per tenant
  name                   String
  description            String?
  emailSubjectTemplate   String
  emailBodyTemplate      String
  inAppTitleTemplate     String
  inAppMessageTemplate   String
  deliveryMethod         String   // Email, InApp, Both
  isActive               Boolean  @default(true)
  createdBy              String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  @@unique([tenantId, eventType])
  @@index([tenantId])
}

model NotificationPreference {
  id                String   @id @default(cuid())
  tenantId          String
  userId            String
  eventType         String
  enabled           Boolean  @default(true)
  deliveryMethod    String   // Email, InApp, Both
  quietHoursStart   String?  // HH:mm format
  quietHoursEnd     String?  // HH:mm format
  quietHoursEnabled Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([tenantId, userId, eventType])
  @@index([tenantId])
  @@index([userId])
}

model AuditLog {
  id                String   @id @default(cuid())
  tenantId          String
  actionType        String   // WorkflowApproved, WorkflowRejected, etc.
  actionDescription String
  severity          String   // Info, Warning, Error, Critical
  entityType        String   // WorkflowInstance, Template, etc.
  entityId          String
  parentEntityId    String?
  actorId           String?
  actorName         String?
  actorEmail        String?
  changeDetails     Json     // What changed
  oldValues         Json?    // Previous values
  newValues         Json?    // New values
  ipAddress         String?
  userAgent         String?
  correlationId     String?
  workflowInstanceId String?
  createdAt         DateTime @default(now())
  timestamp         DateTime @default(now())
  
  @@index([tenantId])
  @@index([entityId])
  @@index([actorId])
  @@index([actionType])
  @@index([timestamp])
  @@index([workflowInstanceId])
}
```

## Next Steps

1. **Update Prisma Schema** - Add the 4 models above
2. **Generate Prisma Client** - Run `npx prisma generate`
3. **Run Migration** - Create database migration
4. **Fix Import Errors** - Services will then compile successfully
5. **Complete Tests** - Run notification tests against real database
6. **Integration** - Integrate with WorkflowExecutor

## Alternative Approach (Quick Path)

If schema update is delayed:
1. Create in-memory implementations for testing
2. Mock Prisma calls in services
3. Update services when schema becomes available

## Files Created
- `src/types/notifications.ts` - 500+ lines
- `src/lib/services/notification-service.ts` - 370 lines
- `src/lib/services/audit-log-service.ts` - 360 lines
- `src/lib/__tests__/notification.test.ts` - 700+ lines

## Estimated Time to Completion
- Schema update: 15-20 minutes
- Migration + generation: 5-10 minutes
- Testing & fixes: 20-30 minutes
- Integration with WorkflowExecutor: 15-20 minutes
- **Total: ~1-1.5 hours**

