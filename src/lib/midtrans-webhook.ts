import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTransactionStatus, verifyNotificationSignature } from "@/lib/midtrans";
import { assignOrderToPrinter, processQueueForPrinter } from "@/lib/printer-matching";
import { sendOrderNotifications } from "@/lib/order-notifications";

type MidtransNotificationPayload = {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
    transaction_status?: string;
    fraud_status?: string;
    payment_type?: string;
    transaction_id?: string;
};

type ProcessWebhookResult = {
    status: number;
    body: Record<string, unknown>;
};

const PAYMENT_PENDING_ORDER_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED"];

function mapTransactionStatusToPaymentStatus(
    transactionStatus: string | undefined,
    fraudStatus?: string
): PaymentStatus {
    const normalizedStatus = (transactionStatus || "").toLowerCase();
    const normalizedFraud = (fraudStatus || "").toLowerCase();

    if (normalizedStatus === "capture" || normalizedStatus === "settlement") {
        return normalizedFraud && normalizedFraud !== "accept" ? "FAILED" : "PAID";
    }

    if (normalizedStatus === "pending") {
        return "PENDING";
    }

    if (normalizedStatus === "expire") {
        return "EXPIRED";
    }

    if (normalizedStatus === "cancel" || normalizedStatus === "deny") {
        return "FAILED";
    }

    if (normalizedStatus === "refund" || normalizedStatus === "partial_refund") {
        return "REFUNDED";
    }

    return "FAILED";
}

function mapPaymentToOrderStatus(currentStatus: OrderStatus, paymentStatus: PaymentStatus, hasPrinter: boolean): OrderStatus | null {
    if (paymentStatus === "PAID") {
        if (!PAYMENT_PENDING_ORDER_STATUSES.includes(currentStatus)) {
            return null;
        }
        return hasPrinter ? "IN_QUEUE" : "CONFIRMED";
    }

    if (paymentStatus === "EXPIRED" || paymentStatus === "FAILED") {
        if (!PAYMENT_PENDING_ORDER_STATUSES.includes(currentStatus)) {
            return null;
        }
        return "PAYMENT_FAILED";
    }

    if (paymentStatus === "REFUNDED") {
        if (currentStatus === "REFUNDED" || currentStatus === "CANCELLED") {
            return null;
        }
        return "REFUNDED";
    }

    return null;
}

async function getAuthoritativeStatus(orderNumber: string, fallback: MidtransNotificationPayload) {
    try {
        const remote = await getTransactionStatus(orderNumber);
        return {
            transactionStatus: String(remote?.transaction_status || fallback.transaction_status || ""),
            fraudStatus: String(remote?.fraud_status || fallback.fraud_status || ""),
            paymentType: String(remote?.payment_type || fallback.payment_type || ""),
        };
    } catch (error) {
        console.warn("[MidtransWebhook] Failed to verify status via API, falling back to payload:", error);
        return {
            transactionStatus: String(fallback.transaction_status || ""),
            fraudStatus: String(fallback.fraud_status || ""),
            paymentType: String(fallback.payment_type || ""),
        };
    }
}

export async function processMidtransWebhook(
    payload: MidtransNotificationPayload,
    source: string
): Promise<ProcessWebhookResult> {
    const orderNumber = payload.order_id;
    const statusCode = payload.status_code;
    const grossAmount = payload.gross_amount;
    const signatureKey = payload.signature_key;

    if (!orderNumber || !statusCode || !grossAmount || !signatureKey) {
        return {
            status: 400,
            body: { error: "Invalid payload" },
        };
    }

    const isSignatureValid = verifyNotificationSignature(orderNumber, statusCode, grossAmount, signatureKey);
    if (!isSignatureValid) {
        console.error(`[MidtransWebhook:${source}] Invalid signature for order ${orderNumber}`);
        return {
            status: 403,
            body: { error: "Invalid signature" },
        };
    }

    const { transactionStatus, fraudStatus, paymentType } = await getAuthoritativeStatus(orderNumber, payload);
    const nextPaymentStatus = mapTransactionStatusToPaymentStatus(transactionStatus, fraudStatus);

    const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        include: { payment: true },
    });

    if (!existingOrder) {
        console.error(`[MidtransWebhook:${source}] Order not found for ${orderNumber}`);
        return {
            status: 404,
            body: { error: "Order not found" },
        };
    }

    const previousPaymentStatus = existingOrder.payment?.status ?? "PENDING";
    const targetOrderStatus = mapPaymentToOrderStatus(
        existingOrder.status,
        nextPaymentStatus,
        Boolean(existingOrder.printerId)
    );

    const updateResult = await prisma.$transaction(async (tx) => {
        if (existingOrder.payment) {
            const paymentUpdateData: Prisma.PaymentUpdateInput = {
                status: nextPaymentStatus,
                paymentMethod: paymentType || null,
                rawResponse: payload as Prisma.InputJsonValue,
            };

            if (nextPaymentStatus === "PAID" && existingOrder.payment.status !== "PAID") {
                paymentUpdateData.paidAt = new Date();
            }

            await tx.payment.update({
                where: { id: existingOrder.payment.id },
                data: paymentUpdateData,
            });
        } else {
            await tx.payment.create({
                data: {
                    orderId: existingOrder.id,
                    invoiceNumber: `INV-${existingOrder.orderNumber}`,
                    amount: existingOrder.totalPrice,
                    status: nextPaymentStatus,
                    paymentMethod: paymentType || null,
                    rawResponse: payload as Prisma.InputJsonValue,
                    paidAt: nextPaymentStatus === "PAID" ? new Date() : null,
                },
            });
        }

        let finalOrderStatus = existingOrder.status;
        if (targetOrderStatus && targetOrderStatus !== existingOrder.status) {
            const orderUpdateData: Prisma.OrderUpdateInput = {
                status: targetOrderStatus,
                queuePosition: targetOrderStatus === "IN_QUEUE" ? undefined : null,
            };

            if (targetOrderStatus === "IN_QUEUE" && existingOrder.printerId) {
                const queuedAhead = await tx.order.count({
                    where: {
                        printerId: existingOrder.printerId,
                        status: "IN_QUEUE",
                        id: { not: existingOrder.id },
                    },
                });
                orderUpdateData.queuePosition = queuedAhead + 1;
            }

            if (targetOrderStatus === "REFUNDED") {
                orderUpdateData.deliveredAt = null;
            }

            await tx.order.update({
                where: { id: existingOrder.id },
                data: orderUpdateData,
            });

            await tx.orderStatusHistory.create({
                data: {
                    orderId: existingOrder.id,
                    status: targetOrderStatus,
                    note: `Midtrans ${transactionStatus || "unknown"} (${nextPaymentStatus}) via ${paymentType || "unknown"} [${source}]`,
                    changedBy: "SYSTEM",
                },
            });

            finalOrderStatus = targetOrderStatus;
        }

        return { finalOrderStatus };
    });

    const transitionedToPaid = previousPaymentStatus !== "PAID" && nextPaymentStatus === "PAID";
    if (transitionedToPaid) {
        sendOrderNotifications(existingOrder.id).catch((err) =>
            console.error(`[MidtransWebhook:${source}] Notification dispatch failed:`, err)
        );

        try {
            if (existingOrder.printerId) {
                await processQueueForPrinter(existingOrder.printerId);
            } else {
                await assignOrderToPrinter(existingOrder.id);
            }
        } catch (queueError) {
            console.error(`[MidtransWebhook:${source}] Assignment/queue processing failed:`, queueError);
        }
    }

    return {
        status: 200,
        body: {
            success: true,
            orderNumber,
            orderId: existingOrder.id,
            paymentStatus: nextPaymentStatus,
            orderStatus: updateResult.finalOrderStatus,
            transactionStatus,
            source,
        },
    };
}
