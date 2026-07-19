import assert from "node:assert/strict";
import { formatPreCheckResult } from "../src/lib/printer-matching/pre-check";

assert.deepEqual(formatPreCheckResult({ success: false, code: "NO_AVAILABLE_PRINTER", error: "Tidak ada printer online yang tersedia", rejectionSummary: {} }), {
  success: false, availablePrinters: 0, error: "Tidak ada printer online yang tersedia",
});

const payload = formatPreCheckResult({
  success: true,
  bestPrinter: {
    printerId: "p1", providerId: "v1", printerName: "Printer 1", providerName: "Provider 1",
    providerCity: "Sleman", providerProvince: "DIY", coordinates: { lat: -7.75, lng: 110.4 },
    isVerified: true, status: "ONLINE", isAcceptingOrders: true, queuedOrders: 0,
    score: 99, canPrintImmediately: true,
    breakdown: { distanceKm: 0, waitMinutes: 0, jobsAhead: 0, projectedMinutesAfter: 70, projectedJobsAfter: 1, distanceScore: 100, queueDurationScore: 100, queueCountScore: 100, loadedMaterialScore: 100, materialMatch: true, queueTimeScore: 100, queueTimeMinutes: 0, materialMatchScore: 100 },
  },
  alternatives: [], availablePrinters: 1,
});
assert.equal(payload.success, true);
if (payload.success) assert.equal(payload.bestPrinter.providerName, "Provider 1");

console.log("pre-check route tests passed");
