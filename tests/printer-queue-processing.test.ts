import assert from "node:assert/strict";
import {
  processQueueForPrinterWithDependencies,
  type QueueProcessingDependencies,
  type QueueProcessingPrinter,
} from "../src/lib/printer-matching";

const now = new Date("2026-07-19T00:00:00.000Z");

function printer(
  overrides: Partial<QueueProcessingPrinter> = {}
): QueueProcessingPrinter {
  return {
    id: "printer-1",
    status: "ONLINE",
    isAcceptingOrders: true,
    lastSeenAt: now,
    currentMaterialId: "pla",
    ...overrides,
  };
}

async function run(initial: QueueProcessingPrinter | null) {
  let starts = 0;
  let queueLookups = 0;
  const deps: QueueProcessingDependencies = {
    getPrinter: async () => initial,
    findNextOrder: async () => {
      queueLookups += 1;
      return { id: "order-1", materialId: "pla" };
    },
    startOrder: async () => {
      starts += 1;
      return { success: true };
    },
  };
  const result = await processQueueForPrinterWithDependencies(
    "printer-1",
    deps,
    { now: () => now, heartbeatTimeoutSeconds: 120 }
  );
  return { result, starts, queueLookups };
}

async function main() {
for (const blocked of [
  printer({ status: "OFFLINE" }),
  printer({ isAcceptingOrders: false }),
  printer({ lastSeenAt: new Date(now.getTime() - 120_001) }),
  printer({ lastSeenAt: null }),
  printer({ currentMaterialId: null }),
]) {
  const output = await run(blocked);
  assert.equal(output.starts, 0);
  assert.equal(output.queueLookups, 0);
}

let reads = 0;
let starts = 0;
const changesBeforeStart: QueueProcessingDependencies = {
  getPrinter: async () => {
    reads += 1;
    return reads === 1 ? printer() : printer({ status: "OFFLINE" });
  },
  findNextOrder: async () => ({ id: "order-1", materialId: "pla" }),
  startOrder: async () => {
    starts += 1;
    return { success: true };
  },
};
await processQueueForPrinterWithDependencies("printer-1", changesBeforeStart, {
  now: () => now,
  heartbeatTimeoutSeconds: 120,
});
assert.equal(reads, 2);
assert.equal(starts, 0);

const mismatch: QueueProcessingDependencies = {
  getPrinter: async () => printer(),
  findNextOrder: async () => ({ id: "order-1", materialId: "petg" }),
  startOrder: async () => ({ success: true }),
};
assert.deepEqual(
  await processQueueForPrinterWithDependencies("printer-1", mismatch, {
    now: () => now,
    heartbeatTimeoutSeconds: 120,
  }),
  { processed: 0, started: 0 }
);

const ready = await run(printer());
assert.deepEqual(ready.result, { processed: 1, started: 1 });
assert.equal(ready.starts, 1);

console.log("printer-queue-processing tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
