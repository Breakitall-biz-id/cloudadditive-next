import type { OrderStatus, PaymentStatus } from "@prisma/client";

type AdminOrderStatusUpdateInput = {
  currentStatus: OrderStatus;
  requestedStatus: OrderStatus;
  hasPrinter: boolean;
  paymentStatus: PaymentStatus | null | undefined;
};

type AdminOrderStatusUpdateDecision = {
  orderStatus: OrderStatus;
  markPaymentPaid: boolean;
  shouldProcessQueue: boolean;
};

const PAYMENT_PENDING_STATUSES: PaymentStatus[] = ["PENDING", "FAILED", "EXPIRED"];
const PAYMENT_GATE_ORDER_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED", "CONFIRMED", "IN_QUEUE"];

export function decideAdminOrderStatusUpdate({
  currentStatus,
  requestedStatus,
  hasPrinter,
  paymentStatus,
}: AdminOrderStatusUpdateInput): AdminOrderStatusUpdateDecision {
  const confirmsWork = requestedStatus === "CONFIRMED" || requestedStatus === "IN_QUEUE" || requestedStatus === "PRINTING";
  const markPaymentPaid = confirmsWork &&
    PAYMENT_GATE_ORDER_STATUSES.includes(currentStatus) &&
    Boolean(paymentStatus && PAYMENT_PENDING_STATUSES.includes(paymentStatus));
  const orderStatus = requestedStatus === "CONFIRMED" && hasPrinter ? "IN_QUEUE" : requestedStatus;

  return {
    orderStatus,
    markPaymentPaid,
    shouldProcessQueue: orderStatus === "IN_QUEUE" && hasPrinter,
  };
}

export function shouldQueueAfterAdminAssignment(status: OrderStatus, paymentStatus: PaymentStatus | null | undefined) {
  return status === "IN_QUEUE" || status === "CONFIRMED" || (status === "PENDING_PAYMENT" && paymentStatus === "PAID");
}
