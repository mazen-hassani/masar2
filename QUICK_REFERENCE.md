# MASAR IMPLEMENTATION - QUICK REFERENCE CARD

## 📊 PHASES AT A GLANCE

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: FOUNDATION (1 week, 6 hours)                          │
├─────────────────────────────────────────────────────────────────┤
│ 1.1 Next.js Setup → 1.2 Database → 1.3 Auth                   │
│ 1.4 Tenant Middleware → 1.5 Configuration                       │
│ ✅ Done When: User can login, tenant context works              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: MODELS (1 week, 10 hours)                             │
├─────────────────────────────────────────────────────────────────┤
│ 2.1 Programs/Projects → 2.2 WBS → 2.3 Scoring                 │
│ 2.4 Risk/Benefit/KPI → 2.5 Financial → 2.6 User Roles          │
│ ✅ Done When: All entities in DB, test data seeded              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: BUSINESS LOGIC (1 week, 11 hours)                     │
├─────────────────────────────────────────────────────────────────┤
│ 3.1 WBS Aggregation → 3.2 Workflows → 3.3 Routing              │
│ 3.4 Execution → 3.5 Risk Inheritance → 3.6 Financial Calcs     │
│ ✅ Done When: Workflows route, parents update, risks cascade    │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: APIS (2 weeks, 18 hours)                              │
├─────────────────────────────────────────────────────────────────┤
│ 4.1 Validators → 4.2 Program CRUD → 4.3 WBS APIs              │
│ 4.4 Scoring → 4.5 Workflow Templates → 4.6 Actions            │
│ 4.7 Risk → 4.8 Financial → 4.9 Benefits → 4.10 Audit           │
│ 4.11 Approval Queue                                             │
│ ✅ Done When: All endpoints working with validation             │
└─────────────────────────────────────────────────────────────────┘
           ↓                                    ↓
┌──────────────────────┐                ┌──────────────────────┐
│ PHASE 5: UI SETUP    │                │ Can start in         │
│ (1 week, 5 hours)    │                │ parallel with        │
├──────────────────────┤                │ Phase 4              │
│ 5.1 Layout           │                └──────────────────────┘
│ 5.2 Login UI         │
│ 5.3 Components       │
│ 5.4 State Management │
│ ✅ User can login    │
└──────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: CORE UI (2 weeks, 12 hours)                           │
├─────────────────────────────────────────────────────────────────┤
│ 6.1 Programs → 6.2 Projects → 6.3 WBS Tree → 6.4 Scoring      │
│ 6.5 Risk UI → 6.6 Benefits UI                                  │
│ ✅ Done When: Can manage programs/projects through UI           │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 7: ADVANCED (2 weeks, 18 hours)                          │
├─────────────────────────────────────────────────────────────────┤
│ 7.1 Approval Queue → 7.2 Actions → 7.3 Workflow Builder       │
│ 7.4 Financial UI → 7.5 Portfolio Dashboard → 7.6 Risk Heatmap  │
│ 7.7 KPI Dashboard → 7.8 Financial Dashboard                    │
│ ✅ Done When: Approvers can action, dashboards show data        │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 8: TESTING & DEPLOY (1 week, 13 hours)                  │
├─────────────────────────────────────────────────────────────────┤
│ 8.1 Unit Tests → 8.2 Integration → 8.3 E2E → 8.4 Performance  │
│ 8.5 Notifications → 8.6 Deployment                             │
│ ✅ Done When: Tests pass, deployed to production               │
└─────────────────────────────────────────────────────────────────┘

TOTAL: ~90 hours | 3-4 months | 2-3 developers
```

---

## 🎯 WHAT TO DO TODAY

### If You're a Backend Developer
1. ✅ Read ARCHITECTURE_BLUEPRINT.md (1 hour)
2. ✅ Read DEVELOPER_GUIDE.md (30 min)
3. ✅ Setup project (30 min): Follow CHUNK 1.1 prompt
4. ✅ Start Phase 1: Chunks 1.1 → 1.2 → 1.3 → 1.4 → 1.5
5. ✅ Move to Phase 2 once Phase 1 complete

**Time Commitment**: Phases 1-4 = ~45 hours over ~6 weeks

### If You're a Frontend Developer
1. ✅ Read ARCHITECTURE_BLUEPRINT.md section 5 (API)
2. ✅ Wait for Phase 4 APIs to be started by backend team
3. ✅ While waiting, read DEVELOPER_GUIDE.md and start Chunk 5.1
4. ✅ Once Phase 4 APIs available, test against them (Chunks 6-7)
5. ✅ Help with Phase 8 testing

**Time Commitment**: Phases 5-7 = ~35 hours over ~4 weeks

### If You're Managing This Project
1. ✅ Read README_IMPLEMENTATION_PLAN.md (20 min)
2. ✅ Read ARCHITECTURE_BLUEPRINT.md (1 hour)
3. ✅ Create GitHub issues or Jira tickets for each chunk
4. ✅ Assign chunks to developers
5. ✅ Track progress (each chunk 1-3 hours)
6. ✅ Ensure strict ordering (no skipping phases)

**Key Metrics**:
- Phase completion: All chunks passing tests
- Quality: TypeScript + ESLint passing, test coverage >80%
- Progress: ~2-3 chunks per week per developer

---

## 🧭 NAVIGATION GUIDE

### Find What You Need

**"I need to understand the project"**
→ Read: spec.md + ARCHITECTURE_BLUEPRINT.md

**"I need to implement a chunk"**
→ Find chunk in IMPLEMENTATION_PROMPTS.md
→ Copy prompt → Feed to LLM → Integrate code

**"I'm stuck on something"**
→ Check: DEVELOPER_GUIDE.md "Debugging Tips"
→ Or: Search spec.md for requirement details

**"I need to know dependencies"**
→ Check: ARCHITECTURE_BLUEPRINT.md Section 2 (Dependency Graph)
→ Or: See chunk "Integrates With" section

**"I need to know what to do next"**
→ Check: This QUICK_REFERENCE.md (phases diagram)
→ Or: IMPLEMENTATION_PROMPTS.md (chunk ordering)

---

## 📝 CHUNK TEMPLATE (For Easy Reference)

Every chunk follows this pattern:

```
## CHUNK X.Y: [Name]

**Timing**: 1-3 hours
**Difficulty**: Easy/Medium/Hard
**Orphaned Risk**: Low/Medium/High

### What
[Brief description of what to build]

### Why
[Why this chunk matters, what enables it]

### Dependencies
[List of chunks that must be done first]

### Integration
[How this fits with next chunk]

### Acceptance Criteria
[ ] Criterion 1
[ ] Criterion 2
...
```

---

## ⚡ QUICK COMMANDS

```bash
# Setup
npm install
docker-compose up -d
npm run db:setup
npm run db:seed
npm run dev

# During Development
npm run type-check          # Check TypeScript
npm run lint               # Check ESLint
npm test                   # Run tests
npm run build             # Build for production

# Database
npm run db:migrate        # Run migrations
npm run db:reset          # Fresh database
npm run db:studio         # GUI for database

# Debugging
npm run dev               # Watch console for logs
npm run db:logs          # Show database logs
```

---

## 📋 CHUNK CHECKLIST

**Before Starting a Chunk**:
- [ ] Previous chunks complete
- [ ] Acceptance criteria understood
- [ ] Dependencies clear
- [ ] Test strategy known

**While Implementing**:
- [ ] Tests written first
- [ ] Code follows patterns (see DEVELOPER_GUIDE.md)
- [ ] TypeScript strict mode
- [ ] No ESLint warnings
- [ ] Integration points clear

**Before Committing**:
- [ ] All tests passing
- [ ] TypeScript: `npm run type-check`
- [ ] Linting: `npm run lint`
- [ ] Coverage >80%
- [ ] Acceptance criteria met
- [ ] Next chunk can use this code
- [ ] Commit message references chunk

---

## 🚨 CRITICAL DO's and DON'Ts

### DO
✅ Read architecture document first
✅ Follow chunks in strict order
✅ Write tests before code
✅ Filter all queries by tenantId
✅ Check permissions at API level
✅ Test cross-tenant access fails
✅ Use Zod validation
✅ Log to audit trail
✅ Include relationships with Prisma
✅ Test acceptance criteria

### DON'T
❌ Skip Phase 1 or 2
❌ Start Phase 3 before Phase 2 done
❌ Write code without tests
❌ Forget tenant filtering
❌ Ignore error handling
❌ Leave console.logs in code
❌ Merge untested code
❌ Make circular dependencies
❌ Store passwords in plaintext
❌ Expose sensitive data in logs

---

## 📊 PROGRESS TRACKING

### Phase 1 (1 week)
```
Week 1: [ ] 1.1 [ ] 1.2 [ ] 1.3 [ ] 1.4 [ ] 1.5
Progress: 0% ────────────────────────── 100%
```

### Phase 2 (1 week)
```
Week 2: [ ] 2.1 [ ] 2.2 [ ] 2.3 [ ] 2.4 [ ] 2.5 [ ] 2.6
Progress: 0% ────────────────────────────────── 100%
```

### Phase 3 (1 week)
```
Week 3: [ ] 3.1 [ ] 3.2 [ ] 3.3 [ ] 3.4 [ ] 3.5 [ ] 3.6
Progress: 0% ─────────────────────────────────── 100%
```

### Phase 4 (2 weeks)
```
Week 4-5: [ ] 4.1-4.11
Progress: 0% ────────────────────────────────────── 100%
```

### Phase 5 (1 week) - Can start end of Week 3
```
Week 4-5: [ ] 5.1 [ ] 5.2 [ ] 5.3 [ ] 5.4 (parallel with Phase 4)
Progress: 0% ──────────────────────── 100%
```

### Phase 6 (2 weeks) - Depends on Phase 4
```
Week 6-7: [ ] 6.1-6.6
Progress: 0% ────────────────────────────── 100%
```

### Phase 7 (2 weeks)
```
Week 8-9: [ ] 7.1-7.8
Progress: 0% ──────────────────────────────── 100%
```

### Phase 8 (1 week)
```
Week 10: [ ] 8.1 [ ] 8.2 [ ] 8.3 [ ] 8.4 [ ] 8.5 [ ] 8.6
Progress: 0% ────────────────────────────────── 100%
```

---

## 📞 TROUBLESHOOTING QUICK ANSWERS

| Problem | Solution |
|---------|----------|
| **TypeScript errors** | `npm run type-check` and read error messages |
| **Tests failing** | Check test setup, verify dependencies installed |
| **Database connection fails** | Check DATABASE_URL in .env.local, Docker running |
| **CORS errors** | Check NEXTAUTH_URL config |
| **Multi-tenancy broken** | Verify middleware runs, check tenantId filtering |
| **Permission denied** | Check user role in DB, verify role checking code |
| **N+1 query problem** | Use Prisma `include` for relationships |
| **Audit trail missing** | Add logging in API route handler |
| **Production deploy fails** | Check all env vars set, migrations run, secrets configured |

---

## 🎓 KEY CONCEPTS

### Multi-Tenancy
- Database filtering by `tenantId`
- Middleware enforces tenant context
- No cross-tenant data access
- Row-Level Security (future)

### Workflow
- Template defines stages and responsibilities
- Instance created when entity needs approval
- Moves through stages as actions taken
- Final approval executes change

### Aggregation
- Parent WBS values calculated from children
- Automatic on child updates
- Used for progress, costs, dates, status

### Financial
- Invoices allocated to WBS items
- Allocations sum to 100%
- Costs roll up hierarchy
- Budget vs actual tracked

---

## 🚀 SUCCESS FORMULA

```
UNDERSTANDING        Read spec + architecture
    ↓
PLANNING            Map out chunks, dependencies
    ↓
SETUP               Install, configure, seed
    ↓
TEST-FIRST          Write tests before code
    ↓
IMPLEMENT           Generate code, review, refactor
    ↓
INTEGRATE           Verify next chunk works
    ↓
COMMIT              Clear message, tests pass
    ↓
REPEAT              Next chunk
    ↓
DEPLOY              Phase 8, production ready
```

---

## 📚 FILE MATRIX

| Need | File | Section |
|------|------|---------|
| Overview | README_IMPLEMENTATION_PLAN.md | All |
| Architecture | ARCHITECTURE_BLUEPRINT.md | 1-5 |
| Dependencies | ARCHITECTURE_BLUEPRINT.md | 2 |
| Code Prompts | IMPLEMENTATION_PROMPTS.md | Per phase |
| Patterns | DEVELOPER_GUIDE.md | "Common Patterns" |
| Setup | DEVELOPER_GUIDE.md | "Code Organization" |
| Debugging | DEVELOPER_GUIDE.md | "Debugging Tips" |
| Quick ref | QUICK_REFERENCE.md | This file |

---

## ⏱️ TIME ESTIMATES (ACTUAL DELIVERY)

Assuming experienced full-stack developers:

| Phase | Backend | Frontend | Total |
|-------|---------|----------|-------|
| 1 | 6h | - | 6h |
| 2 | 10h | - | 10h |
| 3 | 11h | - | 11h |
| 4 | 18h | - | 18h |
| 5 | - | 5h | 5h |
| 6 | - | 12h | 12h |
| 7 | - | 18h | 18h |
| 8 | 6h | 7h | 13h |
| **Total** | **51h** | **42h** | **93h** |

**Calendar Time** (2 developers): ~3 months
**Calendar Time** (3 developers): ~2.5 months
**Calendar Time** (1 developer): ~6 months

---

## ✅ FINAL CHECKLIST

Before deploying to production:

```
SECURITY
[ ] HTTPS enabled
[ ] NEXTAUTH_SECRET strong (32+ chars)
[ ] DATABASE credentials secure
[ ] API keys not in code
[ ] Passwords hashed with bcrypt
[ ] CORS configured correctly
[ ] Rate limiting enabled

TESTING
[ ] Unit tests >80% coverage
[ ] Integration tests all endpoints
[ ] E2E tests critical paths
[ ] Load tests passed (p95 <2s)
[ ] Security testing done

PERFORMANCE
[ ] Database queries optimized
[ ] Indexes created
[ ] N+1 problems fixed
[ ] Frontend code split
[ ] Images optimized

OPERATIONS
[ ] Monitoring configured
[ ] Alerting set up
[ ] Backups configured
[ ] Rollback plan documented
[ ] Team trained

DATA
[ ] Audit trail complete
[ ] All changes logged
[ ] Privacy compliant
[ ] GDPR ready

DEPLOYMENT
[ ] CI/CD pipeline working
[ ] Staging environment works
[ ] Production deployment tested
[ ] Rollback tested
```

---

## 🎉 YOU'RE READY!

You have:
1. ✅ Complete specification (spec.md)
2. ✅ Architecture blueprint (ARCHITECTURE_BLUEPRINT.md)
3. ✅ 51 implementation prompts (IMPLEMENTATION_PROMPTS.md)
4. ✅ Developer guide (DEVELOPER_GUIDE.md)
5. ✅ Implementation plan (README_IMPLEMENTATION_PLAN.md)
6. ✅ Quick reference (this file)

**Next Step**: Start CHUNK 1.1 from IMPLEMENTATION_PROMPTS.md

Good luck! 🚀

