import { prisma } from "@/lib/prisma";
import { triggerPrinterEvent } from "@/lib/pusher";
import { loadMatchingConfig } from "@/lib/printer-matching/runtime-config";
import { getPrinterStartBlockReason } from "@/lib/printer-state";

type StartPrinterOrderOptions = {
  providerId?: string;
  changedBy?: string;
  source?: string;
};

export async function startPrinterOrder(orderId: string, options: StartPrinterOrderOptions = {}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...(options.providerId ? { providerId: options.providerId } : {}),
    },
    select: {
      id: true,
      status: true,
      gcodeFileUrl: true,
      stlFileName: true,
      printerId: true,
      materialId: true,
      printer: {
        select: {
          id: true,
          name: true,
          status: true,
          isAcceptingOrders: true,
          lastSeenAt: true,
          currentMaterialId: true,
        },
      },
    },
  });

  if (!order) return { success: false, error: "Order not found" };
  if (!order.printerId) return { success: false, error: "Order not assigned to a printer" };
  if (!order.gcodeFileUrl) return { success: false, error: "Order has no G-code file. Please slice the model first." };
  if (!order.printer) return { success: false, error: "Printer not found" };

  const config = await loadMatchingConfig();
  const startBlockReason = getPrinterStartBlockReason(
    order.printer,
    new Date(),
    config.heartbeatTimeoutSeconds
  );
  if (startBlockReason) return { success: false, error: startBlockReason };

  if (!order.printer.currentMaterialId || order.printer.currentMaterialId !== order.materialId) {
    return { success: false, error: "Loaded material does not match the order" };
  }

  const baseName = order.stlFileName?.replace(/\.stl$/i, "").replace(/\.gcode$/i, "") || `order_${orderId}`;
  const gcodeFilename = `${baseName}.gcode`;

  await triggerPrinterEvent(order.printerId, "job:start", {
    jobId: order.id,
    gcodeUrl: order.gcodeFileUrl,
    filename: gcodeFilename,
  });

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PRINTING",
        printStartedAt: new Date(),
        queuePosition: null,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: "PRINTING",
        note: `Print started on ${order.printer.name}${options.source ? ` via ${options.source}` : ""}`,
        changedBy: options.changedBy,
      },
    }),
  ]);

  return {
    success: true,
    message: `Print started on ${order.printer.name}`,
  };
}
