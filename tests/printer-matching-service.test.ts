import assert from "node:assert/strict";
import { DEFAULT_MATCHING_CONFIG, matchingConfigToSettingsData } from "../src/lib/printer-matching/config";
import { createPrinterMatchingService, type MatchingRepository } from "../src/lib/printer-matching/service";
import type { OrderForMatching, PrinterCandidate } from "../src/lib/printer-matching/types";

const now = new Date("2026-07-19T00:00:00.000Z");
const order: OrderForMatching = {
  id: "pre-check", materialId: "pla", modelWidth: 50, modelDepth: 50, modelHeight: 50,
  shippingLat: -7.75, shippingLng: 110.4, estimatedPrintTime: 60, quantity: 1,
};

function candidate(id: string, overrides: Partial<PrinterCandidate> = {}): PrinterCandidate {
  return {
    id, providerId: `provider-${id}`, name: id, buildWidth: 220, buildDepth: 220,
    buildHeight: 250, currentMaterialId: "pla", isAcceptingOrders: true,
    preprocessingTime: 10, status: "ONLINE", lastSeenAt: now, materialIds: ["pla"],
    provider: { latitude: -7.75, longitude: 110.4, city: "Sleman", province: "DIY", businessName: `Provider ${id}`, isVerified: true },
    orders: [], ...overrides,
  };
}

let reconciliations = 0;
const candidates = [
  candidate("offline-near", { status: "OFFLINE", lastSeenAt: null }),
  candidate("online-far", { provider: { ...candidate("x").provider, latitude: -7.8 } }),
];
const repository: MatchingRepository = {
  getMatchingSettings: async () => matchingConfigToSettingsData(DEFAULT_MATCHING_CONFIG),
  reconcileStalePrinters: async () => { reconciliations += 1; return 0; },
  findPrinterCandidates: async () => candidates,
  findOrderForMatching: async () => order,
};

async function main() {
  const service = createPrinterMatchingService(repository, { now: () => now, fallbackMinutes: 60 });
  const result = await service.match(order);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.bestPrinter.printerId, "online-far");
  assert.equal(reconciliations, 1);

  const none = await createPrinterMatchingService({ ...repository, findPrinterCandidates: async () => [candidates[0]] }, { now: () => now, fallbackMinutes: 60 }).match(order);
  assert.deepEqual(none.success ? null : none.code, "NO_AVAILABLE_PRINTER");

  let staleCandidates = [candidate("stale", { lastSeenAt: new Date(now.getTime() - 120_001) })];
  let staleUpdates = 0;
  const staleRepo: MatchingRepository = {
    ...repository,
    reconcileStalePrinters: async () => { staleUpdates += 1; staleCandidates = staleCandidates.map((p) => ({ ...p, status: "OFFLINE", isAcceptingOrders: false })); return 1; },
    findPrinterCandidates: async () => staleCandidates,
  };
  const staleService = createPrinterMatchingService(staleRepo, { now: () => now, fallbackMinutes: 60 });
  assert.equal((await staleService.match(order)).success, false);
  assert.equal((await staleService.match(order)).success, false);
  assert.equal(staleUpdates, 2);

  const cutoff = candidate("cutoff", { lastSeenAt: new Date(now.getTime() - 120_000) });
  const cutoffResult = await createPrinterMatchingService({ ...repository, findPrinterCandidates: async () => [cutoff] }, { now: () => now, fallbackMinutes: 60 }).match(order);
  assert.equal(cutoffResult.success, true);

  console.log("printer-matching-service tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
