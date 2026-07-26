import assert from "node:assert/strict";
import { extractR2ObjectKeyFromUrl } from "../src/lib/r2-storage";

process.env.R2_ACCOUNT_ID = "account123";
process.env.R2_BUCKET_NAME = "cloudprint-files";

assert.equal(
  extractR2ObjectKeyFromUrl("https://account123.r2.cloudflarestorage.com/gcode/order/file.gcode"),
  "gcode/order/file.gcode"
);

assert.equal(
  extractR2ObjectKeyFromUrl("https://account123.r2.cloudflarestorage.com/cloudprint-files/gcode/order/file.gcode"),
  "gcode/order/file.gcode"
);

assert.equal(
  extractR2ObjectKeyFromUrl("https://cloudprint-files.account123.r2.cloudflarestorage.com/gcode/order/file.gcode"),
  "gcode/order/file.gcode"
);

assert.equal(extractR2ObjectKeyFromUrl("https://files.example.com/gcode/order/file.gcode"), null);

console.log("r2-storage tests passed");
