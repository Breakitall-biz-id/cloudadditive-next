import assert from "node:assert/strict";
import {
  buildAuditMetadata,
  normalizeAuditReason,
  parsePercentageInput,
  parsePositiveNumberInput,
} from "../src/lib/admin-action-utils";

assert.equal(normalizeAuditReason("  approve verified documents  "), "approve verified documents");
assert.throws(() => normalizeAuditReason(" "), /Audit reason is required/);
assert.throws(() => normalizeAuditReason("ok"), /at least 5 characters/);

assert.equal(parsePercentageInput("15"), 0.15);
assert.equal(parsePercentageInput("0.15"), 0.15);
assert.throws(() => parsePercentageInput("120"), /between 0 and 100/);

assert.equal(parsePositiveNumberInput("10000", "Machine rate"), 10000);
assert.throws(() => parsePositiveNumberInput("-1", "Machine rate"), /must be positive/);

assert.deepEqual(buildAuditMetadata({ before: "PENDING", after: "VERIFIED" }), {
  before: "PENDING",
  after: "VERIFIED",
});

console.log("admin-actions tests passed");
