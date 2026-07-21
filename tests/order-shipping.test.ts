import assert from "node:assert/strict";
import {
  buildShipmentHistoryNote,
  formatCourierLabel,
  parseCourierSelection,
} from "../src/lib/order-shipping";

assert.deepEqual(parseCourierSelection("jne-reg"), {
  courierCode: "jne",
  courierService: "reg",
});

assert.deepEqual(parseCourierSelection("grab-instant-bike"), {
  courierCode: "grab",
  courierService: "instant-bike",
});

assert.deepEqual(parseCourierSelection(null), {
  courierCode: null,
  courierService: null,
});

assert.equal(formatCourierLabel("jne", "reg"), "JNE REG");
assert.equal(formatCourierLabel("jne-reg", null), "JNE REG");
assert.equal(formatCourierLabel(null, null), "Courier tersimpan");

assert.equal(
  buildShipmentHistoryNote({ trackingNumber: "ABC123", courierCode: "jne", courierService: "reg" }),
  "Shipped via JNE REG, tracking: ABC123"
);

console.log("order-shipping tests passed");
