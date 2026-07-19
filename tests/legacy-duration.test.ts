import assert from "node:assert/strict";
import {
  interpretLegacyDuration,
  parseLegacyDurationArguments,
} from "../src/lib/printer-matching/legacy-duration";

assert.equal(interpretLegacyDuration(61, "interpret-seconds"), 2);
assert.equal(interpretLegacyDuration(60, "interpret-seconds"), 1);
assert.equal(interpretLegacyDuration(61, "report-only"), null);
assert.equal(parseLegacyDurationArguments([]).apply, false);
assert.throws(
  () => parseLegacyDurationArguments(["--apply"]),
  /requires --interpret-seconds/
);
assert.deepEqual(
  parseLegacyDurationArguments(["--apply", "--interpret-seconds"]),
  { apply: true, mode: "interpret-seconds" }
);

console.log("legacy-duration tests passed");
