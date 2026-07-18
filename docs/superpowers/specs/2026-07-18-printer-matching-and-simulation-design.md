# Configurable Printer Matching and Simulation Lab

## Goal

Make printer assignment operationally correct, configurable by admins, and explainable before settings are deployed. The same eligibility and scoring rules must be used by customer pre-check, order creation, payment assignment, queue processing, and the admin dry-run simulator.

## Scope

- Fix selection of offline, stale, or non-accepting printers.
- Ensure offline/error/maintenance printers automatically stop accepting new orders.
- Reject customer checkout before payment when no eligible printer exists.
- Add configurable matching rules to the admin dashboard.
- Add an admin-only dry-run lab supporting manual batch scenarios and CSV import.
- Show simulation output as a detailed table and a geographic distribution map.
- Preserve the existing admin visual system and navigation patterns.

## Non-Goals

- The simulation does not create orders, payment records, queue rows, or audit records.
- The simulation does not send printer commands.
- The customer order flow does not gain a map preview.
- This change does not implement automatic refunds for the rare case where every printer goes offline after a payment has already settled.

## Availability Rules

A printer is eligible only when all conditions are true:

1. Printer status is `ONLINE`.
2. `isAcceptingOrders` is `true`.
3. `lastSeenAt` is newer than the configured heartbeat cutoff.
4. The provider is verified.
5. The printer supports the requested material.
6. The model fits the printer build volume.
7. Provider coordinates are valid.
8. Distance and queue limits configured by the admin are not exceeded.

Offline, error, and maintenance status updates always set `isAcceptingOrders` to `false`. Returning online does not automatically opt a provider back into accepting orders; the provider must enable it explicitly.

## Configurable Scoring

Matching configuration is stored on the existing singleton `SystemSettings` row and edited by admins. Defaults:

| Setting | Default |
| --- | ---: |
| Distance weight | 25% |
| Queue duration weight | 35% |
| Queue count weight | 25% |
| Loaded material weight | 15% |
| Heartbeat timeout | 120 seconds |
| Maximum distance | 100 km |
| Maximum queue duration | 1,440 minutes |
| Maximum queue jobs | 20 |

Weights must each be between 0 and 100 and sum to exactly 100%. Limits must be positive. Invalid settings are rejected server-side and the previous configuration remains active.

Each component is normalized to 0-100:

- `distanceScore = clamp(1 - distanceKm / maxDistanceKm) * 100`
- `queueDurationScore = clamp(1 - waitMinutes / maxQueueMinutes) * 100`
- `queueCountScore = clamp(1 - jobsAhead / maxQueueJobs) * 100`
- `loadedMaterialScore = 100` when the currently loaded material matches, otherwise `0`

The final score is the weighted sum. Ties are resolved deterministically by projected queue duration, queue count, distance, then printer ID.

Queue duration includes active `IN_QUEUE`, `SLICING`, and `PRINTING` orders. Each order contributes `estimatedPrintTime * quantity + preprocessingTime`. Queue count is the number of active jobs, not the sum of item quantities.

`Order.estimatedPrintTime` has one canonical unit: whole minutes. The customer flow currently submits G-code/slicer time in seconds, so order creation converts it with `Math.ceil(seconds / 60)` before persistence. Pre-check and simulation inputs are normalized to minutes at their boundaries. Missing or invalid durations use a documented conservative fallback derived from system print-speed settings rather than zero. Existing values created by the current order action are normalized once from seconds to minutes during rollout, with a dry-run report before the data update.

Queue projection has explicit before/after semantics:

- `waitMinutes` and `jobsAhead` describe real plus virtual work already assigned before the incoming order.
- `incomingMinutes = estimatedPrintTimeMinutes * quantity + preprocessingTime`.
- `projectedMinutesAfter = waitMinutes + incomingMinutes`.
- `projectedJobsAfter = jobsAhead + 1`; quantity does not create extra queue jobs.
- Queue score components use `waitMinutes` and `jobsAhead`, because those determine expected start time.
- Maximum queue limits are enforced against `projectedMinutesAfter` and `projectedJobsAfter`, so a large incoming order cannot silently overflow a printer.

These formulas are shared by pre-check, order revalidation, payment-time reassignment, and simulation.

## Runtime Assignment Flow

### Customer Pre-Check

The pre-check uses the shared matching service and returns only eligible candidates. If none exist, it returns a user-facing unavailable response and the wizard cannot continue.

### Order Creation

The server recomputes the best candidate immediately before creating the order and Midtrans transaction. The computed printer must match the `printerId` shown during pre-check; otherwise creation is rejected and the customer is asked to search again. The server derives `providerId` exclusively from that recomputed printer and never trusts the client-supplied provider identity. No order, payment, or Midtrans transaction is created when revalidation fails.

### Payment Callback

When payment settles, the assigned printer is checked again. If it is still eligible, the order enters that printer's queue. If not, the shared matcher attempts to select another eligible compatible printer. If no printer is available after payment, the order remains `CONFIRMED` and unassigned for admin intervention; it is never sent to an offline printer.

Settlement is idempotent and single-writer. Inside a database transaction, a conditional payment transition claims the first `PENDING -> PAID` settlement. Only the callback that successfully claims that transition may move or assign the order and trigger queue processing. Duplicate or concurrent callbacks return the already-settled result without assigning again, incrementing queue position, or sending a second printer command.

### Queue Processing

Queue processing starts work only when the printer remains online, accepting, fresh, and has matching loaded material. Assignment into the provider queue and physical print start are separate states. A printer can receive an `IN_QUEUE` order when it supports the material, while automatic print start requires that material to be currently loaded.

### Printer State Transitions

| Input state | Persisted status | `isAcceptingOrders` | Notes |
| --- | --- | --- | --- |
| Valid `idle` heartbeat | `ONLINE` | unchanged | Reconnection alone does not opt in a printer that was explicitly disabled. |
| `printing` heartbeat | `PRINTING` | unchanged | Existing work may continue; this status is not eligible for a new assignment. |
| `paused` heartbeat | `PAUSED` | unchanged | Not eligible for new assignment. |
| Plugin disconnect/offline | `OFFLINE` | forced `false` | Applied by both printer status and event endpoints. |
| Plugin error | `ERROR` | forced `false` | Applied by both printer status and event endpoints. |
| Provider/admin maintenance | `MAINTENANCE` | forced `false` | Applied by every manual status action. |
| Heartbeat older than cutoff | `OFFLINE` | forced `false` | Reconciled with an atomic conditional update before production matching; simulator derives the same effective state without writing. |

Setting `isAcceptingOrders=true` is rejected unless the printer is currently `ONLINE` with a fresh heartbeat. The shared transition helper is used by plugin status, plugin event, provider status/readiness, and admin printer actions.

## Admin Configuration UI

Add `/admin/printer-matching` and a `Matching Lab` item to the existing `AdminShell` navigation. The page reuses `AdminPageHeader`, `StatCard`, `DataCard`, existing typography, teal/slate palette, spacing, controls, and responsive behavior.

The configuration card contains weights and eligibility limits. It shows a live 100% total, explains each factor, validates inputs, and writes an audit log only when configuration is saved.

## Dry-Run Batch Simulator

The simulator is admin-only and has no database writes.

Input modes:

- Manual scenario rows with add, duplicate, edit, and remove controls.
- CSV import with validation preview.
- One shared `.stl` or `.gcode` file for all scenarios.
- Different files per scenario, matched through the CSV `file_name` column.
- Multiple file upload with missing and duplicate filename detection.

Each scenario contains a name, file, material, quality, quantity, delivery address, latitude, and longitude. File analysis reuses the existing G-code parser and slicer integration. Temporary inputs are used only for the simulation and are not persisted as orders or payments.

File handling is explicit:

- STL dimensions are parsed once per unique file. Print duration is sliced once per unique `(file hash, material, quality)` combination, so a shared STL used with different settings receives the correct duration for each scenario.
- G-code metadata and duration are parsed once per unique file. The scenario's selected material remains authoritative for compatibility matching; quality is displayed as informational because an existing G-code file is not re-sliced. The UI shows this clearly rather than pretending quality changed the G-code.
- File assignments are resolved before simulation. Missing, duplicate, unsupported, or failed analyses become row-level validation errors.

CSV columns:

```csv
scenario_name,file_name,material_id,quality_id,quantity,address,latitude,longitude
```

The initial safety limit is 100 scenarios per run. Invalid rows are shown before execution and do not silently disappear.

## Sequential Adaptive Simulation

Scenarios are processed in their displayed order against a snapshot of the real printer fleet and queues. After a scenario is matched, its estimated duration and job count are added to that printer's in-memory virtual queue. The next scenario therefore sees the projected load created by earlier scenarios. No virtual state is written to Prisma.

For every scenario, retain the selected candidate, all scored alternatives, score breakdown, eligibility rejection reasons, real queue state, and projected queue state.

## Results

The summary reports total scenarios, matched scenarios, rejected scenarios, providers used, printers used, and projected makespan.

The table includes:

- Scenario and file
- Material, quality, and quantity
- Selected provider and printer
- Final score and component breakdown
- Distance
- Queue jobs before and after simulation
- Queue minutes before and after simulation
- Expected start and finish offsets
- Rejection reason when unmatched

The map shows customer scenario points, provider/printer locations, allocation lines, and per-printer assigned counts. Multiple printers at one provider location are grouped visually but remain individually inspectable. Rejected scenarios use a distinct state. The map uses the project's existing Google Maps configuration and is confined to the admin page.

## Architecture

- `printer-matching/config`: defaults, database mapping, and validation.
- `printer-matching/availability`: shared eligibility checks and rejection reasons.
- `printer-matching/scoring`: pure normalized score calculation.
- `printer-matching/queue-time`: queue duration and count projections including quantity.
- `printer-matching/service`: Prisma candidate loading and production assignment.
- `printer-matching/simulation`: pure sequential batch allocation using virtual queue state.
- Admin server actions: save configuration and retrieve current candidate data.
- Admin route/API: validate and run dry simulations under admin authorization.

Production matching and simulation call the same pure availability and scoring modules. The simulator must not contain a second copy of the algorithm.

## Error Handling and Security

- All configuration writes and simulations require an admin session server-side.
- Numeric inputs, CSV fields, coordinates, file extensions, file sizes, and scenario counts are validated.
- A bad scenario produces a row-level error without corrupting other inputs.
- A failed configuration save leaves existing settings unchanged.
- No client-provided provider ID or computed score is trusted.
- Simulation responses contain operational printer data only for authenticated admins.

## Testing

- Unit tests for config validation and exact 100% weights.
- Unit tests for eligibility: offline, stale, non-accepting, unverified, incompatible, oversized, and available printers.
- Unit tests for queue duration including quantity and preprocessing time.
- Unit tests for score normalization and deterministic tie-breaking.
- Unit tests proving offline printers cannot outrank online printers because they never become candidates.
- Unit tests for sequential simulation and virtual queue redistribution.
- Integration tests for pre-check rejection and server-side order revalidation.
- Integration tests proving failed revalidation creates no order, payment, or Midtrans side effect.
- Integration tests for payment-time reassignment, no-candidate fallback, duplicate callbacks, and concurrent settlement claims.
- Tests that offline/error/maintenance status updates disable accepting orders.
- Tests for exact heartbeat cutoff boundaries and stale-printer reconciliation.
- Tests for second-to-minute conversion, null-duration fallback, quantity multiplication, and existing-data normalization.
- Admin authorization and configuration persistence tests.
- CSV shared-file, per-row-file, mixed STL settings, G-code informational quality, duplicate filename, and missing filename tests.
- Build, scoped lint, and end-to-end customer/provider/admin validation.
