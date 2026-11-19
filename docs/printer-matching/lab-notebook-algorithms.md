# Notebook algorithms in Matching Lab

## Scope and isolation

The five research choices run through `runMatchingSimulationWithRepository` using only its two read methods. Their configuration is sent with each simulation request and is not persisted. Production `MatchingAlgorithmMode`, settings schema, order creation, dispatch, and printer control are unchanged. Existing saved-rule simulations remain available.

## Methods

| Lab choice | Notebook | Allocation / decision |
| --- | --- | --- |
| Nearest Feasible | V2_31 Juli Baseline | Dispatch by arrival, priority, deadline; rank printers by distance, finish time, availability, ID |
| EDD Feasible | V2_31 Juli Baseline | Dispatch by deadline, priority, arrival; rank printers by customer completion, distance, availability, ID |
| Least Loaded Feasible | V2_31 Juli Baseline | Dispatch by arrival, priority, deadline; rank printers by available workload minutes, finish time, distance, ID |
| MOPSO + AHP-TOPSIS | V3_MOPSO_AHP | Discrete PSO, historical Pareto archive, crowding tournament leaders, adaptive inertia and mutation; AHP-TOPSIS selection |
| NSGA-II + AHP-TOPSIS | V3_NSGA_AHP | Binary rank/crowding tournament, two-point crossover, individual and gene mutation, elitist survivors; AHP-TOPSIS selection |

Optimizer dominance uses four costs: operational violations, total distance, printer workload population standard deviation, weighted lateness. Violations are a separate Pareto dimension, as in the notebooks, not a large penalty or lexicographic dominance. TOPSIS first filters to the archive solutions with the fewest violations, then ranks the three study objectives. AHP uses the principal eigenvector; weights are reordered from matrix order (distance, lateness, load) to objective order (distance, load, lateness). The initial matrix comes from the study. A consistency ratio above 0.10 blocks optimizer runs.

## Inputs and defaults

- Arrival and deadline are minutes from the run start. Defaults: 0 and 1440. Priority 1/2/3 maps to lateness weights 3/2/1.
- Customer completion = print finish + distance * travel minutes/km. Tardiness is clamped at zero before priority weighting.
- Default print horizon is 1440 minutes. Printing that would finish beyond it is rejected without consuming printer capacity.
- Notebook travel defaults intentionally differ: baselines 0.5, NSGA-II 1.0, MOPSO 1.5 minutes/km. Set the same value when comparing algorithms under the same assumptions. Changing algorithm resets its options to the notebook defaults.
- NSGA-II: population 100, generations 100, crossover 0.8, individual mutation 0.2, gene mutation 0.05.
- MOPSO: particles 80, iterations 100, archive 100, inertia 0.9 to 0.4, cognitive/social 1.7, velocity limit 4, mutation 0.2 to 0.03.
- Seed 42. This TypeScript implementation uses its own deterministic generator, so stochastic allocations need not be bit-for-bit identical to Python random/NumPy with the same seed.
- Interactive request limits: 100 scenarios, population 120, iterations 150, archive 150. These bounds are validated server-side.
- Existing CSV uploads accept optional `arrival_minutes`, `deadline_minutes`, and `priority` columns. File analysis, materials, addresses, and physical dimensions continue to use the existing lab editor.

## Live-fleet adaptations (not an exact notebook experiment replay)

The notebooks start from synthetic printers with dimension classes and empty queues. The lab reads live printers, actual build dimensions, existing queue workloads, preprocessing time, and quantities. Eligibility continues to enforce online status, fresh heartbeat, accepting orders, verified provider, supported material, physical fit, distance and queue limits. These gates can therefore reject a printer that would be feasible in the synthetic notebook dataset.

No random printer failures, DES rescheduling, or actual printing are executed. The outputs describe a deterministic allocation and schedule, not the notebooks' later failure/rescheduling experiment. Baseline report objectives are calculated on their displayed dispatch schedules (EDD retains EDD order); the notebook's standalone standard-objective helper instead reorders fixed EDD allocations by the common arrival/priority/deadline rule. The lab avoids reporting metrics for a different schedule than the one displayed.

AHP/TOPSIS and the baseline ranking rules are ported from the notebook functions. Reference fixtures in `tests/fixtures/printer-matching-notebooks.json` were computed from those function definitions with NumPy and include source notebook SHA-256 hashes. The fixture verifies all three baseline allocations/dispatch orders, eigenvector weights, and consistency ratio. Additional tests cover constraints, scheduling, optimizer determinism, and production isolation.

## Outputs

The existing assignment table and distribution map are reused. Research runs show delivery/late minutes and the three objective values; weighted-score components are not presented as the reason for research selection. Optimizer runs include Pareto solutions, AHP weights, consistency ratio, TOPSIS score, and convergence history. JSON export includes the run options, results, capture time, shared gate configuration, scenarios, and fleet snapshot. Each run remains dependent on the live fleet snapshot, so equal seeds alone cannot reproduce results after fleet/queue changes.
