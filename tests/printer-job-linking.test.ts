import assert from "node:assert/strict";

function stripExtension(value: string) {
  return value.replace(/\.[^/.]+$/, "").toLowerCase();
}

function filenameMatches(orderFileName: string, printerFileName: string) {
  const orderBase = stripExtension(orderFileName);
  const printerBase = stripExtension(printerFileName);
  return orderBase === printerBase || orderBase.includes(printerBase) || printerBase.includes(orderBase);
}

assert.equal(filenameMatches("Ring_Universal_Output.gcode", "Ring_Universal_Output.gcode"), true);
assert.equal(filenameMatches("Ring_Universal_Output.gcode", "Ring_Universal_Output"), true);
assert.equal(filenameMatches("Ring.STL", "Ring.gcode"), true);
assert.equal(filenameMatches("Cube.gcode", "Ring.gcode"), false);

console.log("printer-job-linking tests passed");
