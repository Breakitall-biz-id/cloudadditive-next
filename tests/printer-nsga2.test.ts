import assert from "node:assert/strict";
import { DEFAULT_MATCHING_CONFIG } from "../src/lib/printer-matching/config";
import { nonDominatedSort, simulateMatchingBatchNsga2 } from "../src/lib/printer-matching/nsga2";
import type { MatchingScenario } from "../src/lib/printer-matching/simulation";
import type { PrinterCandidate } from "../src/lib/printer-matching/types";

const fronts = nonDominatedSort([
  [1, 5],
  [2, 2],
  [5, 1],
  [3, 3],
]);
assert.deepEqual(fronts[0].sort((a, b) => a - b), [0, 1, 2]);
assert.deepEqual(fronts[1], [3]);

const now = new Date("2026-07-20T00:00:00.000Z");

function printer(id: string, providerId: string, lat: number, lng: number): PrinterCandidate {
  return {
    id,
    providerId,
    name: id,
    buildWidth: 220,
    buildDepth: 220,
    buildHeight: 250,
    currentMaterialId: "pla",
    isAcceptingOrders: true,
    preprocessingTime: 10,
    status: "ONLINE",
    lastSeenAt: now,
    materialIds: ["pla"],
    provider: {
      businessName: providerId,
      city: "Sleman",
      province: "DIY",
      latitude: lat,
      longitude: lng,
      isVerified: true,
    },
    orders: [],
  };
}

const scenarios: MatchingScenario[] = Array.from({ length: 4 }).map((_, index) => ({
  id: `scenario-${index + 1}`,
  label: `Scenario ${index + 1}`,
  materialId: "pla",
  modelWidth: 20,
  modelDepth: 20,
  modelHeight: 20,
  shippingLat: -7.75,
  shippingLng: 110.4,
  estimatedPrintTime: 60,
  quantity: 1,
}));

const result = simulateMatchingBatchNsga2({
  scenarios,
  printers: [
    printer("printer-a", "provider-a", -7.75, 110.4),
    printer("printer-b", "provider-b", -7.751, 110.401),
  ],
  config: DEFAULT_MATCHING_CONFIG,
  now,
  fallbackMinutes: 60,
  options: {
    populationSize: 24,
    generations: 24,
    mutationRate: 0.2,
    crossoverRate: 0.9,
    seed: 7,
    decisionPolicy: "BALANCED",
  },
});

assert.equal(result.algorithm, "NSGA2");
assert.equal(result.matched, 4);
assert.equal(Object.keys(result.distribution).length, 2);
assert.ok(result.nsga2);
assert.ok(result.nsga2.paretoFrontSize >= 1);

console.log("printer-nsga2 tests passed");
