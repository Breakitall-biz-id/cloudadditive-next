import assert from "node:assert/strict";
import { decideAdminOrderStatusUpdate } from "../src/lib/admin-order-workflow";

function main() {
  assert.deepEqual(
    decideAdminOrderStatusUpdate({
      currentStatus: "PENDING_PAYMENT",
      requestedStatus: "CONFIRMED",
      hasPrinter: true,
      paymentStatus: "PENDING",
    }),
    { orderStatus: "IN_QUEUE", markPaymentPaid: true, shouldProcessQueue: true }
  );

  assert.deepEqual(
    decideAdminOrderStatusUpdate({
      currentStatus: "PENDING_PAYMENT",
      requestedStatus: "CONFIRMED",
      hasPrinter: false,
      paymentStatus: "PENDING",
    }),
    { orderStatus: "CONFIRMED", markPaymentPaid: true, shouldProcessQueue: false }
  );

  assert.deepEqual(
    decideAdminOrderStatusUpdate({
      currentStatus: "CONFIRMED",
      requestedStatus: "CONFIRMED",
      hasPrinter: true,
      paymentStatus: "PAID",
    }),
    { orderStatus: "IN_QUEUE", markPaymentPaid: false, shouldProcessQueue: true }
  );

  assert.deepEqual(
    decideAdminOrderStatusUpdate({
      currentStatus: "CONFIRMED",
      requestedStatus: "CONFIRMED",
      hasPrinter: true,
      paymentStatus: "PENDING",
    }),
    { orderStatus: "IN_QUEUE", markPaymentPaid: true, shouldProcessQueue: true }
  );

  assert.deepEqual(
    decideAdminOrderStatusUpdate({
      currentStatus: "CONFIRMED",
      requestedStatus: "CANCELLED",
      hasPrinter: true,
      paymentStatus: "PENDING",
    }),
    { orderStatus: "CANCELLED", markPaymentPaid: false, shouldProcessQueue: false }
  );

  console.log("admin-order-workflow tests passed");
}

main();
