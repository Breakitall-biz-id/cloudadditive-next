import assert from "node:assert/strict";
import { DEFAULT_MATCHING_CONFIG } from "../src/lib/printer-matching/config";
import { simulateMatchingBatch } from "../src/lib/printer-matching/simulation";
import type { PrinterCandidate } from "../src/lib/printer-matching/types";

const now = new Date("2026-07-19T00:00:00.000Z");
function candidate(id: string, overrides: Partial<PrinterCandidate> = {}): PrinterCandidate {
  return {
    id,
    providerId: `provider-${id}`,
    name: id,
    buildWidth: 220,
    buildDepth: 220,
    buildHeight: 250,
    currentMaterialId: "pla",
    isAcceptingOrders: true,
    preprocessingTime: 0,
    status: "ONLINE",
    lastSeenAt: now,
    materialIds: ["pla"],
    provider: {
      businessName: `Provider ${id}`,
      city: "Sleman",
      province: "DIY",
      latitude: -7.75,
      longitude: 110.4,
      isVerified: true,
    },
    orders: [],
    ...overrides,
  };
}

const printers = [candidate("p1"), candidate("p2")];
const snapshot = JSON.stringify(printers);
const scenarios = ["s1", "s2"].map((id) => ({
  id,
  label: id,
  materialId: "pla",
  modelWidth: 20,
  modelHeight: 20,
  modelDepth: 20,
  shippingLat: -7.75,
  shippingLng: 110.4,
  estimatedPrintTime: 100,
  quantity: 1,
}));

const result = simulateMatchingBatch({
  scenarios,
  printers,
  config: { ...DEFAULT_MATCHING_CONFIG, maxQueueMinutes: 1000 },
  now,
  fallbackMinutes: 60,
});

assert.equal(result.results.length, 2);
assert.equal(result.results[0].success, true);
assert.equal(result.results[1].success, true);
if (result.results[0].success && result.results[1].success) {
  assert.equal(result.results[0].selected.printerId, "p1");
  assert.equal(result.results[1].selected.printerId, "p2");
  assert.equal(result.results[0].queueBeforeMinutes, 0);
  assert.equal(result.results[0].queueAfterMinutes, 100);
  assert.equal(result.results[0].expectedStartOffsetMinutes, 0);
  assert.equal(result.results[0].expectedFinishOffsetMinutes, 100);
}
assert.equal(JSON.stringify(printers), snapshot);
assert.deepEqual(result.distribution, { p1: 1, p2: 1 });

const rejected = simulateMatchingBatch({
  scenarios: [scenarios[0]],
  printers: [candidate("offline", { status: "OFFLINE", isAcceptingOrders: false })],
  config: DEFAULT_MATCHING_CONFIG,
  now,
  fallbackMinutes: 60,
});
assert.equal(rejected.results[0].success, false);
if (!rejected.results[0].success) {
  assert.equal(rejected.results[0].rejectionSummary.OFFLINE, 1);
}

console.log("printer-simulation tests passed");
