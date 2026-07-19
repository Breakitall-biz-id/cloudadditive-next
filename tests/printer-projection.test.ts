import assert from "node:assert/strict";
import {
  calculateOrderWorkMinutes,
  projectQueue,
  secondsToWholeMinutes,
} from "../src/lib/printer-matching/projection";
import { calculateQueueTime } from "../src/lib/printer-matching/queue-time";

assert.equal(secondsToWholeMinutes(1), 1);
assert.equal(secondsToWholeMinutes(60), 1);
assert.equal(secondsToWholeMinutes(61), 2);
assert.equal(secondsToWholeMinutes(90), 2);

assert.equal(
  calculateOrderWorkMinutes(
    { estimatedPrintTime: 90, quantity: 2 },
    10,
    60
  ),
  190
);

assert.equal(
  calculateOrderWorkMinutes(
    { estimatedPrintTime: null, quantity: 2 },
    10,
    60
  ),
  130
);
assert.equal(
  calculateOrderWorkMinutes(
    { estimatedPrintTime: Number.NaN, quantity: 1 },
    10,
    60
  ),
  70
);
assert.equal(
  calculateOrderWorkMinutes(
    { estimatedPrintTime: -5, quantity: 1 },
    10,
    60
  ),
  70
);

assert.deepEqual(
  projectQueue({
    orders: [{ status: "IN_QUEUE", estimatedPrintTime: 90, quantity: 2 }],
    preprocessingTime: 10,
    incomingEstimatedMinutes: 60,
    incomingQuantity: 3,
    fallbackMinutes: 60,
  }),
  {
    waitMinutes: 190,
    jobsAhead: 1,
    incomingMinutes: 190,
    projectedMinutesAfter: 380,
    projectedJobsAfter: 2,
  }
);

assert.deepEqual(
  projectQueue({
    orders: [
      { status: "IN_QUEUE", estimatedPrintTime: 10, quantity: 1 },
      { status: "SLICING", estimatedPrintTime: 20, quantity: 1 },
      { status: "PRINTING", estimatedPrintTime: 30, quantity: 1 },
      { status: "CONFIRMED", estimatedPrintTime: 100, quantity: 1 },
      { status: "COMPLETED", estimatedPrintTime: 100, quantity: 1 },
    ],
    preprocessingTime: 5,
    incomingEstimatedMinutes: 10,
    incomingQuantity: 1,
    fallbackMinutes: 60,
  }),
  {
    waitMinutes: 75,
    jobsAhead: 3,
    incomingMinutes: 15,
    projectedMinutesAfter: 90,
    projectedJobsAfter: 4,
  }
);

assert.deepEqual(
  projectQueue({
    orders: [],
    preprocessingTime: 2,
    incomingEstimatedMinutes: null,
    incomingQuantity: 2,
    fallbackMinutes: 30,
    virtual: { minutes: 50, jobs: 2 },
  }),
  {
    waitMinutes: 50,
    jobsAhead: 2,
    incomingMinutes: 62,
    projectedMinutesAfter: 112,
    projectedJobsAfter: 3,
  }
);

assert.equal(
  calculateQueueTime({
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
    provider: { latitude: 0, longitude: 0, city: "Test City" },
    orders: [
      {
        id: "order-1",
        status: "IN_QUEUE",
        estimatedPrintTime: 90,
        quantity: 2,
      },
      {
        id: "order-2",
        status: "COMPLETED",
        estimatedPrintTime: 500,
        quantity: 1,
      },
    ],
  }),
  190
);

assert.equal(
  calculateQueueTime({
    id: "printer-zero-buffer",
    providerId: "provider-1",
    name: "Printer Zero Buffer",
    buildWidth: 220,
    buildDepth: 220,
    buildHeight: 250,
    currentMaterialId: "pla",
    isAcceptingOrders: true,
    preprocessingTime: 0,
    status: "ONLINE",
    provider: { latitude: 0, longitude: 0, city: "Test City" },
    orders: [
      {
        id: "order-zero-buffer",
        status: "IN_QUEUE",
        estimatedPrintTime: 30,
        quantity: 1,
      },
    ],
  }),
  30
);

console.log("printer-projection tests passed");
