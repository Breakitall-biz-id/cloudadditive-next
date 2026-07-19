import assert from "node:assert/strict";
import { DEFAULT_MATCHING_CONFIG } from "../src/lib/printer-matching/config";
import {
  type AvailabilityRejectionCode,
  evaluatePrinterAvailability,
} from "../src/lib/printer-matching/availability";
import type { QueueProjection } from "../src/lib/printer-matching/projection";
import type { OrderForMatching, PrinterCandidate } from "../src/lib/printer-matching/types";

const now = new Date("2026-07-19T00:00:00.000Z");

const basePrinter: PrinterCandidate = {
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
  lastSeenAt: now,
  materialIds: ["pla", "petg"],
  provider: {
    latitude: -7.75,
    longitude: 110.4,
    city: "Sleman",
    isVerified: true,
  },
  orders: [],
};

const baseOrder: OrderForMatching = {
  id: "order-1",
  materialId: "pla",
  modelWidth: 100,
  modelDepth: 100,
  modelHeight: 100,
  shippingLat: -7.75,
  shippingLng: 110.4,
  estimatedPrintTime: 60,
};

const baseProjection: QueueProjection = {
  waitMinutes: 0,
  jobsAhead: 0,
  incomingMinutes: 70,
  projectedMinutesAfter: 70,
  projectedJobsAfter: 1,
};

function evaluate({
  printer = basePrinter,
  order = baseOrder,
  projection = baseProjection,
}: {
  printer?: PrinterCandidate;
  order?: OrderForMatching;
  projection?: QueueProjection;
} = {}) {
  return evaluatePrinterAvailability({
    printer,
    order,
    projection,
    config: DEFAULT_MATCHING_CONFIG,
    now,
  });
}

function assertRejectedWith(
  code: AvailabilityRejectionCode,
  result: ReturnType<typeof evaluate>
) {
  assert.equal(result.eligible, false);
  assert.ok(result.rejectionCodes.includes(code));
}

for (const status of ["OFFLINE", "PRINTING", "PAUSED", "ERROR", "MAINTENANCE"] as const) {
  assertRejectedWith(status, evaluate({ printer: { ...basePrinter, status } }));
}

assertRejectedWith(
  "STALE_HEARTBEAT",
  evaluate({
    printer: {
      ...basePrinter,
      lastSeenAt: new Date(now.getTime() - 120_001),
    },
  })
);
assert.equal(
  evaluate({
    printer: {
      ...basePrinter,
      lastSeenAt: new Date(now.getTime() - 120_000),
    },
  }).eligible,
  true
);
assertRejectedWith(
  "MISSING_HEARTBEAT",
  evaluate({ printer: { ...basePrinter, lastSeenAt: null } })
);
assertRejectedWith(
  "NOT_ACCEPTING",
  evaluate({ printer: { ...basePrinter, isAcceptingOrders: false } })
);
assertRejectedWith(
  "PROVIDER_UNVERIFIED",
  evaluate({
    printer: {
      ...basePrinter,
      provider: { ...basePrinter.provider, isVerified: false },
    },
  })
);
assertRejectedWith(
  "MATERIAL_UNSUPPORTED",
  evaluate({ printer: { ...basePrinter, materialIds: ["petg"] } })
);

for (const dimensions of [
  { modelWidth: 221 },
  { modelDepth: 221 },
  { modelHeight: 251 },
]) {
  assertRejectedWith("MODEL_TOO_LARGE", evaluate({ order: { ...baseOrder, ...dimensions } }));
}

for (const coordinates of [
  { latitude: null, longitude: 110.4 },
  { latitude: -7.75, longitude: null },
  { latitude: Number.NaN, longitude: 110.4 },
  { latitude: -7.75, longitude: Number.POSITIVE_INFINITY },
]) {
  assertRejectedWith(
    "LOCATION_UNAVAILABLE",
    evaluate({
      printer: {
        ...basePrinter,
        provider: { ...basePrinter.provider, ...coordinates },
      },
    })
  );
}

assertRejectedWith(
  "TOO_FAR",
  evaluate({ order: { ...baseOrder, shippingLat: -7.75, shippingLng: 112.4 } })
);
assertRejectedWith(
  "QUEUE_DURATION_LIMIT",
  evaluate({
    projection: {
      ...baseProjection,
      projectedMinutesAfter: DEFAULT_MATCHING_CONFIG.maxQueueMinutes + 1,
    },
  })
);
assertRejectedWith(
  "QUEUE_JOB_LIMIT",
  evaluate({
    projection: {
      ...baseProjection,
      projectedJobsAfter: DEFAULT_MATCHING_CONFIG.maxQueueJobs + 1,
    },
  })
);

assert.deepEqual(evaluate(), {
  eligible: true,
  distanceKm: 0,
  rejectionCodes: [],
});

console.log("printer-availability tests passed");
