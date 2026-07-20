import assert from "node:assert/strict";
import {
  claimPaidOrderTransition,
  decidePaidAssignment,
  mapPaymentToOrderStatus,
} from "../src/lib/midtrans-webhook";
import type { PrinterMatchingResult } from "../src/lib/printer-matching/service";

const onlineMatch: PrinterMatchingResult = {
  success: true,
  availablePrinters: 1,
  alternatives: [],
  bestPrinter: {
    printerId: "online-printer",
    providerId: "online-provider",
    printerName: "Printer",
    providerName: "Provider",
    providerCity: "Sleman",
    providerProvince: "DIY",
    coordinates: { lat: -7.75, lng: 110.4 },
    isVerified: true,
    status: "ONLINE",
    isAcceptingOrders: true,
    queuedOrders: 0,
    score: 100,
    canPrintImmediately: true,
    breakdown: {
      distanceKm: 0, waitMinutes: 0, jobsAhead: 0,
      projectedMinutesAfter: 60, projectedJobsAfter: 1,
      distanceScore: 100, queueDurationScore: 100,
      queueCountScore: 100, loadedMaterialScore: 100,
      materialMatch: true, queueTimeScore: 100,
      queueTimeMinutes: 0, materialMatchScore: 100,
    },
  },
};

assert.deepEqual(decidePaidAssignment("offline-old", onlineMatch), {
  status: "IN_QUEUE",
  printerId: "online-printer",
  providerId: "online-provider",
  reassigned: true,
});

assert.deepEqual(
  decidePaidAssignment("offline-old", {
    success: false,
    code: "NO_AVAILABLE_PRINTER",
    error: "none",
    rejectionSummary: { OFFLINE: 1 },
  }),
  {
    status: "CONFIRMED",
    printerId: null,
    providerId: null,
    reassigned: false,
  }
);

assert.equal(mapPaymentToOrderStatus("CONFIRMED", "PAID", true), "IN_QUEUE");
assert.equal(mapPaymentToOrderStatus("CONFIRMED", "PAID", false), "CONFIRMED");
assert.equal(mapPaymentToOrderStatus("CONFIRMED", "FAILED", true), null);

async function main() {
  let claimed = false;
  let sideEffects = 0;
  const claim = async () => {
    if (claimed) return 0;
    claimed = true;
    return 1;
  };

  const results = await Promise.all([
    claimPaidOrderTransition(claim),
    claimPaidOrderTransition(claim),
  ]);
  for (const result of results) {
    if (result) sideEffects += 1;
  }
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal(sideEffects, 1);

  console.log("midtrans-assignment tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
