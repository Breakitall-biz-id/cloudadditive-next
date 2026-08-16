import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/printer-dispatch.ts", "utf8");

assert.equal(source.includes("startOrderPrint"), false, "printer dispatch must not call direct OctoPrint startOrderPrint");
assert.equal(source.includes("@/lib/octoprint"), false, "printer dispatch must not import direct OctoPrint client");
assert.equal(source.includes("triggerPrinterEvent"), true, "printer dispatch must send start command through Pusher");
assert.equal(source.includes('"job:start"'), true, "printer dispatch must emit plugin job:start event");

console.log("printer-dispatch-plugin tests passed");
