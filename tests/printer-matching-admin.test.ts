import assert from "node:assert/strict";
import {
  parseMatchingConfigFormData,
  type SimulationReadRepository,
} from "../src/lib/printer-matching/admin";

const valid = {
  algorithmMode: "NSGA2",
  distanceWeight: "25",
  queueDurationWeight: "35",
  queueCountWeight: "25",
  loadedMaterialWeight: "15",
  heartbeatTimeoutSeconds: "120",
  maxDistanceKm: "100",
  maxQueueMinutes: "1440",
  maxQueueJobs: "20",
  nsga2PopulationSize: "48",
  nsga2Generations: "60",
  nsga2MutationRate: "0.12",
  nsga2CrossoverRate: "0.9",
  nsga2Seed: "42",
  nsga2DecisionPolicy: "CLOSEST",
};

assert.deepEqual(parseMatchingConfigFormData(valid), {
  algorithmMode: "NSGA2",
  distanceWeight: 0.25,
  queueDurationWeight: 0.35,
  queueCountWeight: 0.25,
  loadedMaterialWeight: 0.15,
  heartbeatTimeoutSeconds: 120,
  maxDistanceKm: 100,
  maxQueueMinutes: 1440,
  maxQueueJobs: 20,
  nsga2: {
    populationSize: 48,
    generations: 60,
    mutationRate: 0.12,
    crossoverRate: 0.9,
    seed: 42,
    decisionPolicy: "CLOSEST",
  },
});
assert.throws(
  () => parseMatchingConfigFormData({ ...valid, distanceWeight: "26" }),
  /sum to 100/
);
assert.throws(
  () => parseMatchingConfigFormData({ ...valid, maxQueueJobs: "0" }),
  /positive/
);

const readOnlyRepository: SimulationReadRepository = {
  getMatchingSettings: async () => null,
  findPrinterCandidates: async () => [],
};
assert.deepEqual(Object.keys(readOnlyRepository).sort(), [
  "findPrinterCandidates",
  "getMatchingSettings",
]);

console.log("printer-matching-admin tests passed");
