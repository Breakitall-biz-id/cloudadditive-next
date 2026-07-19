import assert from "node:assert/strict";
import {
  buildPrinterHeartbeatUpdate,
  resolveRequestedReadiness,
} from "../src/lib/printer-state";

const now = new Date("2026-07-19T00:00:00.000Z");

for (const status of ["OFFLINE", "ERROR", "MAINTENANCE"] as const) {
  assert.deepEqual(buildPrinterHeartbeatUpdate(status, true, now), {
    status,
    isAcceptingOrders: false,
    lastSeenAt: now,
  });
}

assert.deepEqual(buildPrinterHeartbeatUpdate("ONLINE", false, now), {
  status: "ONLINE",
  isAcceptingOrders: false,
  lastSeenAt: now,
});

assert.equal(
  resolveRequestedReadiness(
    true,
    { status: "ONLINE", lastSeenAt: now },
    now,
    120
  ),
  true
);
assert.equal(
  resolveRequestedReadiness(
    false,
    { status: "OFFLINE", lastSeenAt: null },
    now,
    120
  ),
  false
);
assert.equal(
  resolveRequestedReadiness(
    undefined,
    { status: "OFFLINE", lastSeenAt: null },
    now,
    120
  ),
  undefined
);
assert.throws(
  () =>
    resolveRequestedReadiness(
      true,
      { status: "OFFLINE", lastSeenAt: now },
      now,
      120
    ),
  /ONLINE/
);

console.log("printer-state-ingress tests passed");
