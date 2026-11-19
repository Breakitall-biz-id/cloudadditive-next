import assert from "node:assert/strict";
import { defaultLabOptions, labOptionsSchema, type ResearchAlgorithm } from "../src/lib/printer-matching/lab-config";
import { calculateAhp, selectTopsis, paretoArchive } from "../src/lib/printer-matching/lab-pareto";
import { simulateResearchBatch } from "../src/lib/printer-matching/lab-simulation";
import { DEFAULT_MATCHING_CONFIG, matchingConfigToSettingsData } from "../src/lib/printer-matching/config";
import { runMatchingSimulationWithRepository } from "../src/lib/printer-matching/admin";
import type { PrinterCandidate } from "../src/lib/printer-matching/types";
import type { MatchingScenario } from "../src/lib/printer-matching/simulation";
import reference from "./fixtures/printer-matching-notebooks.json";

const now = new Date("2026-11-19T00:00:00Z");
const scenario: MatchingScenario = { id: "task", label: "Task", materialId: "pla", modelWidth: 20, modelDepth: 20, modelHeight: 20,
  shippingLat: 0, shippingLng: 0, estimatedPrintTime: 10, quantity: 1, arrivalMinutes: 0, deadlineMinutes: 1440, priority: 3 };
function printer(id: string, longitude = 0, overrides: Partial<PrinterCandidate> = {}): PrinterCandidate {
  return { id, name: id, providerId: `provider-${id}`, status: "ONLINE", lastSeenAt: now, buildWidth: 200, buildDepth: 200, buildHeight: 200,
    isAcceptingOrders: true, currentMaterialId: "pla", materialIds: ["pla"], preprocessingTime: 0, orders: [],
    provider: { businessName: id, city: "City", province: "Province", latitude: 0, longitude, isVerified: true }, ...overrides };
}
const algorithms: ResearchAlgorithm[] = ["NEAREST_FEASIBLE", "EDD_FEASIBLE", "LEAST_LOADED_FEASIBLE", "MOPSO_AHP_TOPSIS", "NSGA2_AHP_TOPSIS"];
const config = { ...DEFAULT_MATCHING_CONFIG, maxDistanceKm: 1000 };
const input = { scenarios: [scenario], printers: [printer("a"), printer("b", 0.01)], config, now, fallbackMinutes: 60 };
function run(algorithm: ResearchAlgorithm, overrides: Partial<typeof input> = {}) {
  return simulateResearchBatch({ ...input, ...overrides, options: { ...defaultLabOptions(algorithm), populationSize: 12, iterations: 8 } });
}
const selected = (data: ReturnType<typeof run>) => data.results.filter((r) => r.success).map((r) => r.selected.printerId);

assert.deepEqual(selected(run("NEAREST_FEASIBLE")), ["a"]);
const loaded = [printer("a", 0, { orders: [{ id: "existing", status: "IN_QUEUE", quantity: 1, estimatedPrintTime: 100 }] }), printer("b", 0.01)];
assert.deepEqual(selected(run("LEAST_LOADED_FEASIBLE", { printers: loaded })), ["b"]);
assert.deepEqual(selected(run("EDD_FEASIBLE", { printers: loaded })), ["b"]);
assert.deepEqual(selected(run("NEAREST_FEASIBLE", { printers: loaded })), ["a"]);
const deadlines = [{ ...scenario, id: "later", deadlineMinutes: 100 }, { ...scenario, id: "urgent", deadlineMinutes: 5 }];
assert.equal(run("EDD_FEASIBLE", { scenarios: deadlines, printers: [printer("a")] }).results[0].scenarioId, "urgent");
const priorityOrder = run("NEAREST_FEASIBLE", { scenarios: [{ ...scenario, id: "low", priority: 3 }, { ...scenario, id: "high", priority: 1 }], printers: [printer("a")] });
assert.equal(priorityOrder.results[0].scenarioId, "high");

for (const algorithm of algorithms) {
  const data = run(algorithm);
  assert.equal(data.algorithm, algorithm);
  assert.equal(data.matched, 1);
  assert.equal(data.research?.objectives.violations, 0);
  assert.deepEqual(data, run(algorithm), `${algorithm} must be reproducible`);
  const unavailable = run(algorithm, { printers: [printer("offline", 0, { status: "OFFLINE" }), printer("wrong-material", 0, { materialIds: ["abs"] }), printer("small", 0, { buildWidth: 1 })] });
  assert.equal(unavailable.matched, 0);
  assert.equal(unavailable.rejected, 1);
  assert.equal(run(algorithm, { printers: [] }).rejected, 1);
  const noRoom = run(algorithm, { printers: [printer("a")], scenarios: [{ ...scenario, estimatedPrintTime: 1500 }] });
  assert.equal(noRoom.rejected, 1);
  const nonMutation = structuredClone(input);
  const before = JSON.stringify(nonMutation);
  run(algorithm, nonMutation);
  assert.equal(JSON.stringify(nonMutation), before);
}

const horizon = simulateResearchBatch({ ...input, scenarios: [scenario, { ...scenario, id: "second" }], printers: [printer("a")], options: { ...defaultLabOptions("NEAREST_FEASIBLE"), horizonMinutes: 15 } });
assert.equal(horizon.matched, 1);
assert.equal(horizon.results[1].success, false);
if (!horizon.results[1].success) assert.deepEqual(horizon.results[1].rejectionSummary, { SIMULATION_HORIZON: 1 });

const workload = run("NEAREST_FEASIBLE", { scenarios: [{ ...scenario, quantity: 2, arrivalMinutes: 5, deadlineMinutes: 10, priority: 1 }], printers: [printer("a", 0, { preprocessingTime: 5 }), printer("b", 0.02)] });
assert.equal(workload.research?.objectives.loadStdMinutes, 15); // printer loads [30, 0], population SD
assert.equal(workload.research?.objectives.weightedLatenessMinutes, 60); // (30 - 10) * 3
const first = workload.results[0];
assert.ok(first.success);
if (first.success) { assert.equal(first.expectedStartOffsetMinutes, 5); assert.equal(first.expectedFinishOffsetMinutes, 30); }

const travel = simulateResearchBatch({ ...input, printers: [printer("a", 0.01)], scenarios: [{ ...scenario, deadlineMinutes: 10, priority: 1 }], options: { ...defaultLabOptions("NEAREST_FEASIBLE"), travelMinutesPerKm: 2 } });
assert.ok(Math.abs(travel.research!.objectives.weightedLatenessMinutes - travel.research!.objectives.distanceKm * 6) < 1e-8);

const ahp = calculateAhp(defaultLabOptions().ahpMatrix);
assert.ok(Math.abs(ahp.weights.reduce((a, b) => a + b, 0) - 1) < 1e-12);
assert.ok(ahp.weights[2] > ahp.weights[0] && ahp.weights[2] > ahp.weights[1]);
assert.ok(ahp.consistencyRatio < 0.1);
ahp.weights.forEach((w, i) => assert.ok(Math.abs(w - reference.ahp.weights[i]) < 1e-10));
assert.ok(Math.abs(ahp.consistencyRatio - reference.ahp.consistencyRatio) < 1e-10);
const referenceScenarios = reference.tasks.map((task) => ({ ...scenario, id: task.id, label: task.id,
  shippingLng: task.longitude, shippingLat: task.latitude, estimatedPrintTime: task.processing_time,
  arrivalMinutes: task.arrival_time, deadlineMinutes: task.deadline, priority: task.priority }));
for (const [algorithm, rule] of [["NEAREST_FEASIBLE", "nearest_feasible"], ["EDD_FEASIBLE", "edd_feasible"], ["LEAST_LOADED_FEASIBLE", "least_loaded_feasible"]] as const) {
  const actual = run(algorithm, { scenarios: referenceScenarios, printers: [printer("a"), printer("b", 0.1)] });
  const assignments = new Map(actual.results.filter((r) => r.success).map((r) => [r.scenarioId, r.selected.printerId]));
  assert.deepEqual(referenceScenarios.map((s) => assignments.get(s.id)), reference.baseline[rule].assignments, `${algorithm} must match notebook allocations`);
  assert.deepEqual(actual.results.map((r) => r.scenarioId), reference.baseline[rule].dispatchIds);
}
assert.deepEqual(calculateAhp([[1, 1, 1], [1, 1, 1], [1, 1, 1]]).weights, [1 / 3, 1 / 3, 1 / 3]);
const feasibleSolution = { genes: [0], objectives: [0, 10, 5, 2] };
const infeasibleSolution = { genes: [1], objectives: [1, 0, 0, 0] };
assert.equal(paretoArchive([feasibleSolution, infeasibleSolution]).length, 2); // notebook 4D Pareto, not lexicographic constraints
assert.equal(selectTopsis([infeasibleSolution, feasibleSolution], ahp.weights).selected, feasibleSolution);
assert.equal(selectTopsis([feasibleSolution], ahp.weights).score, 1);
assert.equal(selectTopsis([{ genes: [0], objectives: [0, 0, 0, 0] }], ahp.weights).score, 1);
assert.throws(() => labOptionsSchema.parse({ ...defaultLabOptions(), populationSize: 100000 }));
assert.throws(() => labOptionsSchema.parse({ ...defaultLabOptions(), travelMinutesPerKm: NaN }));

async function checkBoundary() {
  const settings = matchingConfigToSettingsData(DEFAULT_MATCHING_CONFIG);
  const before = JSON.stringify(settings);
  const repository = Object.freeze({ getMatchingSettings: async () => settings, findPrinterCandidates: async () => input.printers });
  for (const algorithm of algorithms) {
    const result = await runMatchingSimulationWithRepository({ scenarios: [scenario], lab: { ...defaultLabOptions(algorithm), populationSize: 8, iterations: 3 } }, repository, now);
    assert.equal(result.data.algorithm, algorithm);
    assert.equal(JSON.stringify(settings), before, "lab must not update saved production settings");
  }
  assert.equal((await runMatchingSimulationWithRepository([scenario], repository, now)).data.algorithm, "WEIGHTED_SCORE");
  await assert.rejects(() => runMatchingSimulationWithRepository({ scenarios: [scenario, scenario], lab: defaultLabOptions() }, repository, now), /unique/);
  console.log("printer-matching-lab tests passed");
}
checkBoundary().catch((error) => { console.error(error); process.exitCode = 1; });
