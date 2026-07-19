import assert from "node:assert/strict";
import {
  getPrinterStartBlockReason,
  isHeartbeatFresh,
  resolvePrinterStateUpdate,
  validateAcceptingOrders,
} from "../src/lib/printer-state";

const now = new Date("2026-07-19T00:00:00.000Z");
const timeoutSeconds = 120;
const exactCutoff = new Date(now.getTime() - timeoutSeconds * 1000);
const stale = new Date(exactCutoff.getTime() - 1);

assert.equal(isHeartbeatFresh(exactCutoff, now, timeoutSeconds), true);
assert.equal(isHeartbeatFresh(stale, now, timeoutSeconds), false);
assert.equal(isHeartbeatFresh(null, now, timeoutSeconds), false);
assert.equal(isHeartbeatFresh("not-a-date", now, timeoutSeconds), false);

for (const status of ["OFFLINE", "ERROR", "MAINTENANCE"] as const) {
  assert.deepEqual(resolvePrinterStateUpdate(status, true), {
    status,
    isAcceptingOrders: false,
  });
}

for (const status of ["ONLINE", "PRINTING", "PAUSED"] as const) {
  assert.deepEqual(resolvePrinterStateUpdate(status, true), {
    status,
    isAcceptingOrders: true,
  });
  assert.deepEqual(resolvePrinterStateUpdate(status, false), {
    status,
    isAcceptingOrders: false,
  });
}

assert.equal(
  validateAcceptingOrders(
    true,
    { status: "ONLINE", lastSeenAt: exactCutoff },
    now,
    timeoutSeconds
  ),
  true
);
assert.equal(
  validateAcceptingOrders(
    false,
    { status: "OFFLINE", lastSeenAt: null },
    now,
    timeoutSeconds
  ),
  false
);
assert.throws(
  () =>
    validateAcceptingOrders(
      true,
      { status: "PRINTING", lastSeenAt: now },
      now,
      timeoutSeconds
    ),
  /ONLINE/
);
assert.throws(
  () =>
    validateAcceptingOrders(
      true,
      { status: "ONLINE", lastSeenAt: null },
      now,
      timeoutSeconds
    ),
  /fresh heartbeat/
);
assert.throws(
  () =>
    validateAcceptingOrders(
      true,
      { status: "ONLINE", lastSeenAt: stale },
      now,
      timeoutSeconds
    ),
  /fresh heartbeat/
);

assert.equal(
  getPrinterStartBlockReason(
    { status: "ONLINE", isAcceptingOrders: true, lastSeenAt: exactCutoff },
    now,
    timeoutSeconds
  ),
  null
);
assert.match(
  getPrinterStartBlockReason(
    { status: "OFFLINE", isAcceptingOrders: true, lastSeenAt: now },
    now,
    timeoutSeconds
  ) ?? "",
  /offline/i
);
assert.match(
  getPrinterStartBlockReason(
    { status: "ONLINE", isAcceptingOrders: false, lastSeenAt: now },
    now,
    timeoutSeconds
  ) ?? "",
  /not accepting/i
);
assert.match(
  getPrinterStartBlockReason(
    { status: "ONLINE", isAcceptingOrders: true, lastSeenAt: null },
    now,
    timeoutSeconds
  ) ?? "",
  /heartbeat/i
);
assert.match(
  getPrinterStartBlockReason(
    { status: "ONLINE", isAcceptingOrders: true, lastSeenAt: stale },
    now,
    timeoutSeconds
  ) ?? "",
  /stale/i
);

console.log("printer-state tests passed");
