import assert from "node:assert/strict";
import { DEFAULT_MATCHING_CONFIG } from "../src/lib/printer-matching/config";
import {
  calculatePrinterScore,
  scoreEligiblePrinter,
  sortByScore,
} from "../src/lib/printer-matching/scoring";
import type { MatchingConfig } from "../src/lib/printer-matching/config";
import type { QueueProjection } from "../src/lib/printer-matching/projection";
import type { OrderForMatching, PrinterCandidate } from "../src/lib/printer-matching/types";

const printer: PrinterCandidate = {
  id: "printer-1",
  providerId: "provider-1",
  name: "Printer 1",
  buildWidth: 220,
  buildDepth: 220,
  buildHeight: 250,
  currentMaterialId: "pla",
  isAcceptingOrders: true,
  preprocessingTime: 10,
  status: "ONLINE",
  lastSeenAt: new Date("2026-07-19T00:00:00.000Z"),
  materialIds: ["pla"],
  provider: {
    latitude: 0,
    longitude: 0,
    city: "Test City",
    isVerified: true,
  },
  orders: [],
};

const order: OrderForMatching = {
  id: "order-1",
  materialId: "pla",
  modelWidth: 100,
  modelDepth: 100,
  modelHeight: 100,
  shippingLat: 0,
  shippingLng: 0,
  estimatedPrintTime: 60,
};

const config: MatchingConfig = {
  ...DEFAULT_MATCHING_CONFIG,
  maxDistanceKm: 100,
  maxQueueMinutes: 1000,
  maxQueueJobs: 20,
};

const projection: QueueProjection = {
  waitMinutes: 250,
  jobsAhead: 5,
  incomingMinutes: 100,
  projectedMinutesAfter: 350,
  projectedJobsAfter: 6,
};

const exactScore = scoreEligiblePrinter({
  printer,
  order,
  config,
  projection,
  distanceKm: 25,
});

assert.equal(exactScore.score, 78.75);
assert.deepEqual(exactScore.breakdown, {
  distanceKm: 25,
  waitMinutes: 250,
  jobsAhead: 5,
  projectedMinutesAfter: 350,
  projectedJobsAfter: 6,
  distanceScore: 75,
  queueDurationScore: 75,
  queueCountScore: 75,
  loadedMaterialScore: 100,
  materialMatch: true,
  queueTimeScore: 75,
  queueTimeMinutes: 250,
  materialMatchScore: 100,
});
assert.equal(exactScore.canPrintImmediately, false);

const distanceOnly = scoreEligiblePrinter({
  printer,
  order,
  projection,
  distanceKm: 25,
  config: {
    ...config,
    distanceWeight: 1,
    queueDurationWeight: 0,
    queueCountWeight: 0,
    loadedMaterialWeight: 0,
  },
});
const materialOnly = scoreEligiblePrinter({
  printer,
  order,
  projection,
  distanceKm: 25,
  config: {
    ...config,
    distanceWeight: 0,
    queueDurationWeight: 0,
    queueCountWeight: 0,
    loadedMaterialWeight: 1,
  },
});
assert.equal(distanceOnly.score, 75);
assert.equal(materialOnly.score, 100);

const clampedLow = scoreEligiblePrinter({
  printer: { ...printer, currentMaterialId: "petg" },
  order,
  config,
  projection: {
    ...projection,
    waitMinutes: config.maxQueueMinutes * 2,
    jobsAhead: config.maxQueueJobs * 2,
  },
  distanceKm: config.maxDistanceKm * 2,
});
assert.equal(clampedLow.score, 0);

const clampedHigh = scoreEligiblePrinter({
  printer,
  order,
  config,
  projection: { ...projection, waitMinutes: -1, jobsAhead: -1 },
  distanceKm: -1,
});
assert.equal(clampedHigh.score, 100);
assert.ok(clampedLow.score >= 0 && clampedLow.score <= 100);
assert.ok(clampedHigh.score >= 0 && clampedHigh.score <= 100);

assert.equal(
  scoreEligiblePrinter({
    printer,
    order,
    config,
    projection: { ...projection, waitMinutes: 0, jobsAhead: 0 },
    distanceKm: 0,
  }).canPrintImmediately,
  true
);
assert.equal(
  scoreEligiblePrinter({
    printer: { ...printer, currentMaterialId: "petg" },
    order,
    config,
    projection: { ...projection, waitMinutes: 0, jobsAhead: 0 },
    distanceKm: 0,
  }).canPrintImmediately,
  false
);

const tieConfig: MatchingConfig = {
  ...config,
  distanceWeight: 0,
  queueDurationWeight: 0,
  queueCountWeight: 0,
  loadedMaterialWeight: 1,
};

function tiedScore(
  printerId: string,
  waitMinutes: number,
  jobsAhead: number,
  distanceKm: number
) {
  return scoreEligiblePrinter({
    printer: { ...printer, id: printerId },
    order,
    config: tieConfig,
    projection: {
      ...projection,
      waitMinutes,
      jobsAhead,
      projectedMinutesAfter: waitMinutes + projection.incomingMinutes,
      projectedJobsAfter: jobsAhead + 1,
    },
    distanceKm,
  });
}

const sortedTies = sortByScore([
  tiedScore("z-wait", 30, 0, 0),
  tiedScore("z-jobs", 20, 2, 0),
  tiedScore("z-distance", 20, 1, 10),
  tiedScore("b-id", 20, 1, 5),
  tiedScore("a-id", 20, 1, 5),
]);
assert.deepEqual(
  sortedTies.map((score) => score.printerId),
  ["a-id", "b-id", "z-distance", "z-jobs", "z-wait"]
);

const legacyScore = calculatePrinterScore(printer, order);
assert.equal(legacyScore.breakdown.queueTimeMinutes, legacyScore.breakdown.waitMinutes);
assert.equal(legacyScore.breakdown.queueTimeScore, legacyScore.breakdown.queueDurationScore);
assert.equal(
  calculatePrinterScore({ ...printer, status: "OFFLINE" }, order).canPrintImmediately,
  false
);
assert.equal(
  calculatePrinterScore(
    {
      ...printer,
      preprocessingTime: 0,
      orders: [
        {
          id: "zero-buffer-order",
          status: "IN_QUEUE",
          estimatedPrintTime: 30,
          quantity: 1,
        },
      ],
    },
    order
  ).breakdown.waitMinutes,
  30
);

console.log("printer-scoring tests passed");
