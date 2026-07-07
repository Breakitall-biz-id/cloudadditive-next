import { prisma } from "@/lib/prisma";
import { processQueueForPrinter } from "@/lib/printer-matching";
import type { OrderStatus, Prisma } from "@prisma/client";

export type PrinterJobEvent = "PrintDone" | "PrintFailed" | "PrintCancelled";

interface PrinterJobEventPayload {
    filename?: string;
    time?: number;
    error?: string;
    reason?: string;
}

function mapEventToOrderStatus(event: PrinterJobEvent): OrderStatus {
    if (event === "PrintDone") {
        return "POST_PROCESSING";
    }
    return "IN_QUEUE";
}

function buildEventNote(event: PrinterJobEvent, payload?: PrinterJobEventPayload) {
    if (event === "PrintDone") {
        return `Print selesai${payload?.time ? ` dalam ${Math.round(payload.time)} detik` : ""}. Masuk tahap post-processing.`;
    }

    if (event === "PrintFailed") {
        return `Print gagal${payload?.error ? `: ${payload.error}` : payload?.reason ? `: ${payload.reason}` : ""}. Order dikembalikan ke antrian.`;
    }

    return `Print dibatalkan${payload?.reason ? `: ${payload.reason}` : ""}. Order dikembalikan ke antrian.`;
}

export async function handlePrinterJobEvent(params: {
    printerId: string;
    event: PrinterJobEvent;
    payload?: PrinterJobEventPayload;
    source: string;
}) {
    const { printerId, event, payload, source } = params;

    const activeOrder = await prisma.order.findFirst({
        where: {
            printerId,
            status: "PRINTING",
        },
        orderBy: [{ printStartedAt: "desc" }, { updatedAt: "desc" }],
        select: {
            id: true,
        },
    });

    if (!activeOrder) {
        console.log(`[PrinterJobEvent:${source}] No PRINTING order found for printer ${printerId}`);
        return { success: false, reason: "NO_ACTIVE_ORDER" as const };
    }

    const nextStatus = mapEventToOrderStatus(event);
    const note = buildEventNote(event, payload);

    await prisma.$transaction(async (tx) => {
        const orderUpdateData: Prisma.OrderUpdateInput = {
            status: nextStatus,
        };

        if (event === "PrintDone") {
            orderUpdateData.printCompletedAt = new Date();
            orderUpdateData.queuePosition = null;
        } else {
            const queuedStats = await tx.order.aggregate({
                where: {
                    printerId,
                    status: "IN_QUEUE",
                    id: { not: activeOrder.id },
                },
                _max: { queuePosition: true },
            });

            const maxQueuePosition = queuedStats._max.queuePosition ?? 0;
            orderUpdateData.queuePosition = maxQueuePosition + 1;
        }

        await tx.order.update({
            where: { id: activeOrder.id },
            data: orderUpdateData,
        });

        await tx.orderStatusHistory.create({
            data: {
                orderId: activeOrder.id,
                status: nextStatus,
                note: `${note} [${source}]`,
                changedBy: "SYSTEM",
            },
        });
    });

    try {
        await processQueueForPrinter(printerId);
    } catch (error) {
        console.error(`[PrinterJobEvent:${source}] Failed to process next queue on printer ${printerId}:`, error);
    }

    return { success: true, orderId: activeOrder.id, status: nextStatus };
}
