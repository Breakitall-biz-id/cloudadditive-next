import { prisma } from "@/lib/prisma";
import { triggerPrinterEvent } from "@/lib/pusher";
import { loadMatchingConfig } from "@/lib/printer-matching/runtime-config";
import { getPrinterStartBlockReason } from "@/lib/printer-state";
import { resolveDownloadUrl } from "@/lib/r2-storage";

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

  const blockingPostProcessingOrder = await prisma.order.findFirst({
    where: {
      printerId: order.printerId,
      status: "POST_PROCESSING",
      id: { not: order.id },
    },
    select: { id: true },
  });

  if (blockingPostProcessingOrder) {
    return {
      success: false,
      error: "Printer belum siap: selesaikan post-processing order sebelumnya dan ubah status ke Packing sebelum start job berikutnya.",
    };
  }

  const baseName = order.stlFileName?.replace(/\.stl$/i, "").replace(/\.gcode$/i, "") || `order_${orderId}`;
  const gcodeFilename = `${baseName}.gcode`;

  const downloadUrl = await resolveDownloadUrl(order.gcodeFileUrl, 6 * 60 * 60);

  await triggerPrinterEvent(order.printerId, "job:start", {
    jobId: order.id,
    gcodeUrl: downloadUrl,
    filename: gcodeFilename,
  });

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { queuePosition: null },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        note: `Print command sent to ${order.printer.name}${options.source ? ` via ${options.source}` : ""}. Waiting for OctoPrint confirmation.`,
        changedBy: options.changedBy,
      },
    }),
  ]);

  return {
    success: true,
    message: `Print command sent to ${order.printer.name}`,
  };
}
