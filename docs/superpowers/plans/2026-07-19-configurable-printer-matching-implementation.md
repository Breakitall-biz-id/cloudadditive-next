# Configurable Printer Matching Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make production printer assignment correct and admin-configurable, then add an admin-only dry-run batch Matching Lab with table and map results.

**Architecture:** Production and simulation share pure configuration, eligibility, queue projection, and scoring modules. Prisma-backed services only load snapshots and persist production transitions; the simulator applies virtual queue updates in memory. The admin UI follows the existing `AdminShell`/`DataCard` design and keeps heavy CSV, file, and map behavior in focused client components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6/MySQL, Zod 4, Three.js STL loader, existing slicer API, Google Maps JavaScript API, Node assert tests executed with `tsx`.

**Deployment constraint:** Do not commit or push during implementation. The user will explicitly request commit/push after reviewing the full local diff because the deployment pipeline auto-deploys pushed commits.

**Design spec:** `docs/superpowers/specs/2026-07-18-printer-matching-and-simulation-design.md`

---

## File Structure

### Shared production matching

- Create `src/lib/printer-matching/config.ts`: defaults, DB mapping, normalization, and config validation.
- Create `src/lib/printer-matching/availability.ts`: pure eligibility evaluation and rejection codes.
- Create `src/lib/printer-matching/projection.ts`: canonical minute conversion, queue before/after calculations, and duration fallback.
- Create `src/lib/printer-matching/service.ts`: Prisma snapshot loading, stale reconciliation, pre-check, revalidation, and assignment orchestration.
- Create `src/lib/printer-matching/repository.ts`: narrow Prisma interface replaceable by fakes in orchestration tests.
- Modify `src/lib/printer-matching/types.ts`: canonical shared candidate/config/result contracts.
- Modify `src/lib/printer-matching/scoring.ts`: configurable four-factor scoring and deterministic tie-breakers.
- Modify `src/lib/printer-matching/queue-time.ts`: delegate to projection and include quantity.
- Modify `src/lib/printer-matching/index.ts`: compatibility exports and safe assignment/queue behavior.

### Production ingress fixes

- Create `src/lib/printer-state.ts`: pure status/readiness transition rules.
- Modify `src/app/api/orders/pre-check/route.ts`: call shared matching service.
- Modify `src/actions/create-order.ts`: canonical minutes and authoritative server revalidation.
- Modify `src/lib/midtrans-webhook.ts`: idempotent settlement claim and safe reassignment.
- Modify `src/app/api/printer/status/route.ts`: force non-operational printers to stop accepting.
- Modify `src/app/api/printer/event/route.ts`: use the same state transition helper.
- Modify `src/actions/printer.ts`: validate manual status/readiness updates.
- Modify `src/actions/provider-order.ts`: validate readiness and queue processing.
- Modify `src/actions/admin.ts`: validate admin printer transitions and save matching settings.
- Modify `prisma/schema.prisma`: add matching configuration fields to `SystemSettings`.
- Modify `prisma/seed.ts`: seed matching defaults and fresh heartbeat for the sample online printer.
- Create `scripts/audit-estimated-print-time.ts`: report legacy duration values; apply normalization only with an explicit flag after review.

### Admin Matching Lab

- Create `src/lib/printer-matching/simulation.ts`: pure sequential adaptive batch simulation.
- Create `src/lib/printer-matching/csv.ts`: CSV schema parsing/mapping around a standards-compliant CSV parser.
- Create `src/actions/printer-matching-admin.ts`: authenticated config and simulation actions.
- Create `src/app/api/admin/printer-matching/slice/route.ts`: admin-only validated slicer proxy.
- Create `src/app/(admin)/admin/printer-matching/page.tsx`: server page and initial data.
- Create `src/app/(admin)/admin/printer-matching/MatchingLabClient.tsx`: scenario/config/results workflow.
- Create `src/app/(admin)/admin/printer-matching/MatchingConfigForm.tsx`: validated rule controls.
- Create `src/app/(admin)/admin/printer-matching/ScenarioEditor.tsx`: manual rows, shared/per-row file assignment, and CSV preview.
- Create `src/app/(admin)/admin/printer-matching/SimulationResults.tsx`: summary and detailed result table.
- Create `src/app/(admin)/admin/printer-matching/MatchingDistributionMap.tsx`: client-only Google map.
- Modify `src/components/admin/AdminShell.tsx`: add Matching Lab navigation.

### Tests

- Create `tests/printer-matching-config.test.ts`.
- Create `tests/printer-availability.test.ts`.
- Create `tests/printer-projection.test.ts`.
- Create `tests/printer-scoring.test.ts`.
- Create `tests/printer-matching-service.test.ts`.
- Create `tests/pre-check-route.test.ts`.
- Create `tests/printer-state.test.ts`.
- Create `tests/printer-state-ingress.test.ts`.
- Create `tests/printer-queue-processing.test.ts`.
- Create `tests/create-order-orchestration.test.ts`.
- Create `tests/legacy-duration.test.ts`.
- Create `tests/printer-simulation.test.ts`.
- Create `tests/printer-matching-csv.test.ts`.
- Create `tests/printer-matching-admin.test.ts`.
- Create `tests/stl-analysis.test.ts`.
- Create `tests/admin-slicer-route.test.ts`.
- Create `tests/midtrans-assignment.test.ts` for extracted pure settlement decisions and conditional-claim behavior.
- Modify `tests/admin-actions.test.ts` for matching-setting input validation.

---

## Chunk 1: Production Matching Correctness

### Task 1: Matching Configuration Contract

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `src/lib/printer-matching/config.ts`
- Create: `tests/printer-matching-config.test.ts`

- [ ] **Step 1: Write failing config tests**

Test defaults, percent-to-fraction mapping, positive limits, individual 0-100 bounds, exact 100% weight total, and a stable fallback when the singleton row is absent.

```ts
assert.deepEqual(validateMatchingConfig({
  distanceWeight: 25,
  queueDurationWeight: 35,
  queueCountWeight: 25,
  loadedMaterialWeight: 15,
  heartbeatTimeoutSeconds: 120,
  maxDistanceKm: 100,
  maxQueueMinutes: 1440,
  maxQueueJobs: 20,
}), DEFAULT_MATCHING_CONFIG)

assert.throws(() => validateMatchingConfig({ ...valid, distanceWeight: 30 }), /sum to 100/)
```

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/printer-matching-config.test.ts`

Expected: FAIL because `config.ts` does not exist.

- [ ] **Step 3: Add Prisma fields and pure config module**

Add these `SystemSettings` fields with defaults: `matchingDistanceWeight`, `matchingQueueDurationWeight`, `matchingQueueCountWeight`, `matchingLoadedMaterialWeight`, `matchingHeartbeatTimeoutSeconds`, `matchingMaxDistanceKm`, `matchingMaxQueueMinutes`, and `matchingMaxQueueJobs`.

Store weights as fractions (`0.25`, not `25`) and expose admin form values as percentages. Keep `DEFAULT_MATCHING_CONFIG` independent of Prisma so tests and simulation can run without a database.

- [ ] **Step 4: Run GREEN test and Prisma validation**

Run:

```bash
npx tsx tests/printer-matching-config.test.ts
npx prisma validate
npx prisma generate
```

Expected: config test passes and Prisma commands exit 0.

- [ ] **Step 5: Review checkpoint without commit**

Run `git diff --check`. Do not commit or push.

### Task 2: Canonical Queue Projection

**Files:**
- Create: `src/lib/printer-matching/projection.ts`
- Modify: `src/lib/printer-matching/queue-time.ts`
- Modify: `src/lib/printer-matching/types.ts`
- Create: `tests/printer-projection.test.ts`

- [ ] **Step 1: Write failing projection tests**

Cover minutes as canonical storage, second-to-minute ceiling conversion, quantity multiplication, one preprocessing buffer per order, job count independent of quantity, active status filtering, virtual workloads, and conservative fallback for null duration.

```ts
assert.deepEqual(projectQueue({
  orders: [{ status: "IN_QUEUE", estimatedPrintTime: 90, quantity: 2 }],
  preprocessingTime: 10,
  incomingMinutes: 60,
  incomingQuantity: 3,
}), {
  waitMinutes: 190,
  jobsAhead: 1,
  incomingMinutes: 190,
  projectedMinutesAfter: 380,
  projectedJobsAfter: 2,
})
```

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/printer-projection.test.ts`

Expected: FAIL because projection API is missing.

- [ ] **Step 3: Implement projection primitives**

Use only `IN_QUEUE`, `SLICING`, and `PRINTING` for workload. Name every value with a `Minutes` suffix. Keep legacy `calculateQueueTime` as a thin compatibility wrapper during migration.

- [ ] **Step 4: Run GREEN tests**

Run:

```bash
npx tsx tests/printer-projection.test.ts
npx tsx tests/admin-metrics.test.ts
```

Expected: both pass.

### Task 3: Eligibility and State Transitions

**Files:**
- Create: `src/lib/printer-matching/availability.ts`
- Create: `src/lib/printer-state.ts`
- Create: `tests/printer-availability.test.ts`
- Create: `tests/printer-state.test.ts`

- [ ] **Step 1: Write failing availability tests**

Test every rejection independently: offline, printing, paused, error, maintenance, stale at `cutoff - 1ms`, not accepting, unverified provider, unsupported material, oversized model, missing coordinates, too far, projected queue duration overflow, and projected job overflow. Test that exactly-on-cutoff is treated consistently as stale.

- [ ] **Step 2: Write failing transition tests**

```ts
assert.deepEqual(resolvePrinterStateUpdate("OFFLINE", true), {
  status: "OFFLINE",
  isAcceptingOrders: false,
})
assert.throws(() => validateAcceptingOrders(true, { status: "ONLINE", lastSeenAt: stale }), /fresh heartbeat/)
```

- [ ] **Step 3: Run RED tests**

Run:

```bash
npx tsx tests/printer-availability.test.ts
npx tsx tests/printer-state.test.ts
```

Expected: both fail because modules are missing.

- [ ] **Step 4: Implement pure eligibility and transition modules**

Return structured rejection codes such as `OFFLINE`, `STALE_HEARTBEAT`, `NOT_ACCEPTING`, `MATERIAL_UNSUPPORTED`, `MODEL_TOO_LARGE`, and `QUEUE_LIMIT`. Do not bury eligibility inside the score.

- [ ] **Step 5: Run GREEN tests**

Run both test files again; expected pass.

### Task 4: Configurable Scoring and Deterministic Ranking

**Files:**
- Modify: `src/lib/printer-matching/scoring.ts`
- Modify: `src/lib/printer-matching/types.ts`
- Create: `tests/printer-scoring.test.ts`

- [ ] **Step 1: Write failing scoring tests**

Test exact component normalization, configurable weight influence, loaded-material bonus, score range 0-100, and tie order: wait minutes, jobs ahead, distance, printer ID.

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/printer-scoring.test.ts`

Expected: fail because current scorer has only three factors and hard-coded weights.

- [ ] **Step 3: Implement four-factor scorer**

The scorer accepts only already-eligible candidates and a validated config. It must not make online/offline decisions.

- [ ] **Step 4: Run GREEN tests plus legacy matching tests**

Run all `tests/printer-*.test.ts` implemented so far.

### Task 5: Shared Prisma Matching Service and Pre-Check

**Files:**
- Create: `src/lib/printer-matching/service.ts`
- Create: `src/lib/printer-matching/repository.ts`
- Modify: `src/lib/printer-matching/index.ts`
- Modify: `src/app/api/orders/pre-check/route.ts`
- Test: `tests/printer-matching-service.test.ts`
- Test: `tests/pre-check-route.test.ts`

- [ ] **Step 1: Write service-level RED tests**

Use a fake narrow repository. Prove an offline nearby empty printer is excluded while an online accepting fresh printer is selected, no eligible candidate returns `NO_AVAILABLE_PRINTER`, and `lastSeenAt < cutoff` invokes exactly one conditional stale transition. Run matching twice to prove reconciliation is idempotent and stale printers never re-enter candidates.

Run: `npx tsx tests/printer-matching-service.test.ts`

Expected: FAIL because the service and repository contract do not exist.

- [ ] **Step 2: Implement stale reconciliation and candidate snapshot loading**

Before production matching, conditionally update stale operational printers to `{ status: OFFLINE, isAcceptingOrders: false }` using `lastSeenAt < cutoff`. Load provider verification, coordinates, materials, dimensions, current material, and active order quantities.

- [ ] **Step 3: Replace pre-check's local query/scoring**

Validate request with Zod, call the shared service, return structured errors, and preserve the existing customer response shape required by `useOrderWizard`.

Add a testable route-contract function and prove `NO_AVAILABLE_PRINTER` maps to the exact `{ success: false, availablePrinters: 0, error }` payload consumed by the wizard.

Run: `npx tsx tests/pre-check-route.test.ts`

- [ ] **Step 4: Verify focused tests and route lint**

Run:

```bash
npx tsx tests/printer-matching-service.test.ts
npx tsx tests/pre-check-route.test.ts
npx tsx tests/printer-availability.test.ts
npx tsx tests/printer-scoring.test.ts
npx eslint src/lib/printer-matching src/app/api/orders/pre-check/route.ts tests/printer-matching-service.test.ts
```

Expected: tests pass and ESLint exits 0.

### Task 6: Enforce State Rules at Every Printer Ingress

**Files:**
- Modify: `src/app/api/printer/status/route.ts`
- Modify: `src/app/api/printer/event/route.ts`
- Modify: `src/actions/printer.ts`
- Modify: `src/actions/provider-order.ts`
- Modify: `src/actions/admin.ts`
- Test: `tests/printer-state-ingress.test.ts`

- [ ] **Step 1: Add regression tests in `tests/printer-state-ingress.test.ts`**

Extract small pure update builders where necessary so tests can assert every `OFFLINE`, `ERROR`, and `MAINTENANCE` path forces accepting false and an enable request requires online+fresh.

- [ ] **Step 2: Run RED tests**

Run: `npx tsx tests/printer-state-ingress.test.ts`

Expected: FAIL because current routes/actions preserve stale `isAcceptingOrders=true`.

- [ ] **Step 3: Route every update through `printer-state.ts`**

Do not auto-enable accepting on reconnect. Trigger queue processing only after a validated `false -> true` readiness transition.

- [ ] **Step 4: Run GREEN tests and scoped lint**

Run:

```bash
npx tsx tests/printer-state.test.ts
npx tsx tests/printer-state-ingress.test.ts
npx eslint src/lib/printer-state.ts src/app/api/printer/status/route.ts src/app/api/printer/event/route.ts src/actions/printer.ts src/actions/provider-order.ts src/actions/admin.ts tests/printer-state-ingress.test.ts
```

Expected: tests pass and ESLint exits 0.

### Task 6A: Safe Queue Start

**Files:**
- Modify: `src/lib/printer-matching/index.ts`
- Test: `tests/printer-queue-processing.test.ts`

- [ ] **Step 1: Write queue-start RED tests**

Use dependency injection around queue lookup and printer start. Prove queue processing does not start work for stale, offline, non-accepting, or null-loaded-material printers; does not start an order whose material differs from the loaded material; and starts at most the first eligible queued job for an online accepting fresh printer.

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/printer-queue-processing.test.ts`

Expected: FAIL because current processing ignores heartbeat freshness and treats null material as an omitted Prisma filter.

- [ ] **Step 3: Implement safe queue processing**

Require fresh `ONLINE`, accepting, and non-null loaded material before loading a queue candidate. Keep assignment to `IN_QUEUE` separate from physical start. Recheck printer state immediately before `startOrderPrint`.

- [ ] **Step 4: Run GREEN tests and lint**

```bash
npx tsx tests/printer-queue-processing.test.ts
npx tsx tests/printer-availability.test.ts
npx eslint src/lib/printer-matching/index.ts tests/printer-queue-processing.test.ts
```

### Task 7: Authoritative Order Creation and Time Units

**Files:**
- Modify: `src/actions/create-order.ts`
- Create: `scripts/audit-estimated-print-time.ts`
- Test: `tests/create-order-orchestration.test.ts`
- Test: `tests/legacy-duration.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Extract `createOrderWithDependencies(input, deps)` behind the authenticated server action. Use spies/fakes to prove slicer/G-code seconds are converted with `Math.ceil(seconds / 60)`, provider ID comes from the server candidate, mismatched/stale selected printer is rejected, and rejection invokes zero `order.create`, zero `payment.create`, and zero `snap.createTransaction` calls.

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/create-order-orchestration.test.ts`

Expected: FAIL because current action stores seconds, trusts client IDs, and has no dependency-injected orchestration seam.

- [ ] **Step 3: Reorder creation flow**

Validate material/quality, recompute ranking from authoritative inputs, require selected printer equality, derive provider, then create order and Midtrans transaction. Keep external Midtrans call after all availability checks.

- [ ] **Step 4: Add guarded legacy audit script**

Extract pure row interpretation and CLI-argument guard logic. Default mode prints order number, current duration, interpreted minutes, and affected queue status without writes. `--apply` must be explicit and require a second explicit interpretation flag; do not run apply automatically.

Run `npx tsx tests/legacy-duration.test.ts`; expected RED before implementation and GREEN after. Tests must prove second-based rows use ceiling conversion, ambiguous rows remain report-only, and `--apply` without the interpretation flag is rejected.

- [ ] **Step 5: Run tests, script dry-run, and scoped lint**

Run:

```bash
npx tsx tests/create-order-orchestration.test.ts
npx tsx tests/legacy-duration.test.ts
npx tsx scripts/audit-estimated-print-time.ts
npx eslint src/actions/create-order.ts scripts/audit-estimated-print-time.ts tests/create-order-orchestration.test.ts
```

Expected: test passes; audit script reports only. No remote data updates in this task.

### Task 8: Idempotent Payment Assignment

**Files:**
- Modify: `src/lib/midtrans-webhook.ts`
- Create: `tests/midtrans-assignment.test.ts`

- [ ] **Step 1: Write failing settlement tests**

Test first callback claims settlement, duplicate callback does not assign again, concurrent conditional claim has one winner, assigned offline printer is replaced, and no candidate yields `CONFIRMED` plus null printer/provider.

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/midtrans-assignment.test.ts`

Expected: current webhook assignment side effect is outside a concurrency-safe claim.

- [ ] **Step 3: Implement conditional settlement claim**

Use a transaction and conditional `updateMany`/status guard so only the winning `PENDING -> PAID` transition may perform assignment and queue-position mutation. Invoke printer commands only after the transaction commits.

- [ ] **Step 4: Run GREEN tests and matching regression suite**

Run all matching, state, Midtrans, and existing admin tests.

### Task 9: Core Schema and Build Checkpoint

- [ ] **Step 1: Run schema push against the configured development database only after reviewing `DATABASE_URL` target**

Run: `npx prisma db push`

Expected: matching fields added without destructive warnings. Do not normalize order durations yet.

- [ ] **Step 2: Run full build**

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 3: Inspect diff and runtime smoke test**

Verify offline candidate rejection, online candidate selection, and no-candidate response locally. Do not commit/push.

---

## Chunk 2: Admin Matching Lab

### Task 10: Admin Configuration Action and Navigation

**Files:**
- Create: `src/actions/printer-matching-admin.ts`
- Modify: `src/components/admin/AdminShell.tsx`
- Modify: `tests/admin-actions.test.ts`
- Test: `tests/printer-matching-admin.test.ts`

- [ ] **Step 1: Write failing admin config input tests**

Test exact 100% validation, positive limits, audit metadata, fallback errors, forbidden non-admin access, and a simulation repository interface that exposes reads but no write methods.

Run: `npx tsx tests/printer-matching-admin.test.ts`

Expected: FAIL because the admin matching action does not exist.

- [ ] **Step 2: Implement authenticated save action**

Require admin server-side, validate before transaction, upsert singleton settings, write `SYSTEM_SETTINGS_UPDATED` audit metadata with before/after values, and revalidate `/admin/printer-matching`.

- [ ] **Step 3: Add `Matching Lab` navigation**

Use a Lucide route/scale icon and the same desktop/mobile nav rendering as existing items.

- [ ] **Step 4: Run tests and scoped lint**

### Task 11: Sequential Adaptive Simulation Engine

**Files:**
- Create: `src/lib/printer-matching/simulation.ts`
- Create: `tests/printer-simulation.test.ts`

- [ ] **Step 1: Write failing simulation tests**

Cover deterministic scenario order, virtual queue mutation, redistribution after a printer becomes less favorable/full, rejection reasons, alternative rankings, and proof that input printer snapshots remain immutable.

- [ ] **Step 2: Run RED test**

Run: `npx tsx tests/printer-simulation.test.ts`

- [ ] **Step 3: Implement pure simulation**

Use a `Map<printerId, VirtualQueueState>` for O(1) projected load updates. Call the same eligibility and scoring functions as production. Return before/after queue fields and expected start/finish offsets.

- [ ] **Step 4: Run GREEN test and all matching tests**

### Task 12: CSV and File Assignment Validation

**Files:**
- Modify: `package.json`
- Modify: lockfile
- Create: `src/lib/printer-matching/csv.ts`
- Create: `tests/printer-matching-csv.test.ts`

- [ ] **Step 1: Add a standards-compliant CSV parser dependency**

Use `papaparse` plus types rather than a custom parser because addresses may contain quoted commas/newlines.

- [ ] **Step 2: Write failing CSV tests**

Cover quoted address commas, required columns, shared-file mode, per-row `file_name`, duplicate uploaded names, missing files, invalid coordinates/quantity, unsupported extension, and 100-row limit.

Also test that G-code scenarios are tagged `qualityMode: "informational"` so changing the quality label never schedules re-slicing.

- [ ] **Step 3: Implement parser and file resolver**

Return `{ validRows, rowErrors, globalErrors }`; never drop malformed rows silently.

- [ ] **Step 4: Run GREEN tests and dependency audit**

Run `npm audit --omit=dev` and record any existing vs newly introduced advisories.

### Task 13: Admin Simulation Action

**Files:**
- Modify: `src/actions/printer-matching-admin.ts`
- Test: `tests/printer-matching-admin.test.ts`

- [ ] **Step 1: Write failing authorization and no-write tests**

Prove non-admin sessions are forbidden and the injected simulation repository surface only reads settings/printers/orders/materials/qualities. Assert the fake records zero writes.

Run: `npx tsx tests/printer-matching-admin.test.ts`

- [ ] **Step 2: Implement admin-only snapshot and simulation action**

Accept normalized analyzed scenarios, reload authoritative fleet/config, run pure simulation, and return serializable result objects. Do not call Prisma create/update/delete or write audit logs.

- [ ] **Step 3: Run tests and scoped lint**

### Task 14: File Analysis Pipeline

**Files:**
- Create: `src/lib/stl-analysis.ts` or extract reusable geometry analysis from `src/components/order/Model3DViewer.tsx`
- Create: `src/app/api/admin/printer-matching/slice/route.ts`
- Test: `tests/stl-analysis.test.ts`
- Test: `tests/admin-slicer-route.test.ts`

- [ ] **Step 1: Write and run RED tests**

Write STL dimensions/hash tests plus route tests for forbidden anonymous/non-admin access, unsupported extension, oversized file, missing/inactive material, missing/inactive quality, and one valid forwarded request.

Run:

```bash
npx tsx tests/stl-analysis.test.ts
npx tsx tests/admin-slicer-route.test.ts
```

Expected: both fail because analysis and route modules do not exist.

- [ ] **Step 2: Implement STL analysis**

Keep rendering concerns in `Model3DViewer`; expose pure buffer analysis for the Matching Lab. G-code uses existing `parseGcodeFile`.

- [ ] **Step 3: Add a separate admin-only slicer endpoint**

Do not make the existing customer slicer route admin-only. In the new admin route, validate admin auth, extension, size, material, and quality before forwarding. Slice one request per unique `(file hash, material, quality)` combination and cache results only for the active client run.

- [ ] **Step 4: Verify pure file analysis and route lint**

Run:

```bash
npx tsx tests/stl-analysis.test.ts
npx tsx tests/admin-slicer-route.test.ts
npx eslint src/lib/stl-analysis.ts src/app/api/admin/printer-matching/slice/route.ts tests/stl-analysis.test.ts tests/admin-slicer-route.test.ts
```

### Task 15: Matching Lab Page and Configuration UI

**Files:**
- Create: `src/app/(admin)/admin/printer-matching/page.tsx`
- Create: `src/app/(admin)/admin/printer-matching/MatchingLabClient.tsx`
- Create: `src/app/(admin)/admin/printer-matching/MatchingConfigForm.tsx`
- Create: `src/app/(admin)/admin/printer-matching/ScenarioEditor.tsx`

- [ ] **Step 1: Build server page using existing admin components**

Use `AdminPageHeader`, `StatCard`, and `DataCard`. Load settings/materials/qualities in parallel. Match the existing slate/teal palette, rounded cards, typography, spacing, responsive width, and form styles.

- [ ] **Step 2: Build accessible config form**

Show live weight total, inline validation, explanatory copy, pending state, and success/error feedback. Disable save unless total is exactly 100.

- [ ] **Step 3: Build batch scenario editor**

Support add, duplicate, remove, CSV import preview, shared/per-row files, analysis progress, row-level failures, and an explicit run button. Do not upload files to R2 or create database records. Preserve inputs when a simulation error occurs.

For G-code rows, visibly label quality as informational and explain that the uploaded G-code is used as-is; changing quality must not call the slicer endpoint. Verify manually with one STL, one G-code, and mixed settings.

- [ ] **Step 4: Run responsive and accessibility checks**

Check keyboard labels, table overflow, mobile stacking, and no hydration warnings.

### Task 16: Results Table and Distribution Map

**Files:**
- Create: `src/app/(admin)/admin/printer-matching/SimulationResults.tsx`
- Create: `src/app/(admin)/admin/printer-matching/MatchingDistributionMap.tsx`

- [ ] **Step 1: Build result summary and explainable table**

Include matched/rejected totals, providers/printers used, projected makespan, selected provider/printer, component scores, distance, queue before/after, timing offsets, alternatives, and rejection reasons.

- [ ] **Step 2: Load Google Maps only after results exist**

Use a client-only dynamic component and the existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Render scenario markers, grouped provider/printer markers, assignment polylines, per-printer counts, fit bounds, and a clear missing-key fallback. A grouped provider marker opens an inspectable list of each colocated printer with its own assigned count and projected queue. Avoid loading Maps on unrelated admin pages.

- [ ] **Step 3: Verify map/table consistency**

Every matched table row must have one map allocation and every rejected row must remain visibly rejected without an allocation line. Verify each individual printer remains selectable/inspectable inside a grouped provider marker.

### Task 17: Full Verification and Staging Inspection

- [ ] **Step 1: Run all focused tests**

```bash
npx tsx tests/printer-matching-config.test.ts
npx tsx tests/printer-projection.test.ts
npx tsx tests/printer-availability.test.ts
npx tsx tests/printer-state.test.ts
npx tsx tests/printer-scoring.test.ts
npx tsx tests/printer-matching-service.test.ts
npx tsx tests/pre-check-route.test.ts
npx tsx tests/printer-state-ingress.test.ts
npx tsx tests/printer-queue-processing.test.ts
npx tsx tests/create-order-orchestration.test.ts
npx tsx tests/legacy-duration.test.ts
npx tsx tests/midtrans-assignment.test.ts
npx tsx tests/printer-simulation.test.ts
npx tsx tests/printer-matching-csv.test.ts
npx tsx tests/printer-matching-admin.test.ts
npx tsx tests/stl-analysis.test.ts
npx tsx tests/admin-slicer-route.test.ts
npx tsx tests/admin-actions.test.ts
npx tsx tests/admin-metrics.test.ts
```

Expected: every file exits 0.

- [ ] **Step 2: Run scoped ESLint**

Lint every created/modified source and test file. Record unrelated pre-existing full-lint failures separately if `npm run lint` still fails outside scope.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit 0 and `/admin/printer-matching` appears in route output.

- [ ] **Step 4: Run local end-to-end scenarios**

Verify:

1. Offline nearby printer is never selected.
2. Online accepting fresh printer receives paid order in its provider queue.
3. Offline/error/maintenance forces not accepting.
4. No eligible printer blocks checkout before payment.
5. Config save changes ranking predictably.
6. Batch manual and CSV simulations produce identical allocation for equivalent data.
7. Shared and per-row files both work.
8. Table and map counts agree.
9. Simulation creates no order/payment/audit rows.

- [ ] **Step 5: Inspect deployed staging read-only if its version contains the relevant code**

Do not assume staging reflects uncommitted local changes. Use staging only to capture current baseline behavior and later, after an explicit user-approved deploy, verify the deployed fix.

- [ ] **Step 6: Present diff and verification evidence**

Do not commit or push. Ask the user to review before deployment.
