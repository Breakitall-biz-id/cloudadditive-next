import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

const STARTABLE_STATUSES: OrderStatus[] = ["CONFIRMED", "IN_QUEUE", "SLICING"];

function stripExtension(value: string) {
  return value.replace(/\.[^/.]+$/, "").toLowerCase();
}

function filenameMatches(orderFileName: string, printerFileName: string) {
  const orderBase = stripExtension(orderFileName);
  const printerBase = stripExtension(printerFileName);
  return orderBase === printerBase || orderBase.includes(printerBase) || printerBase.includes(orderBase);
}

export async function markPrinterOrderStarted(params: {
  printerId: string;
  jobId?: string | null;
  filename?: string | null;
  timeRemaining?: number | null;
  progress?: number | null;
  source: string;
}) {
  const { printerId, jobId, filename, source } = params;

  const select = {
    id: true,
    status: true,
    stlFileName: true,
  } as const;

  let order = jobId
    ? await prisma.order.findFirst({
        where: { id: jobId, printerId },
        select,
      })
    : null;

  if (!order && filename) {
    const candidates = await prisma.order.findMany({
      where: {
        printerId,
        status: { in: ["PRINTING", ...STARTABLE_STATUSES] },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select,
    });
    order = candidates.find((candidate) => filenameMatches(candidate.stlFileName, filename)) ?? null;
  }

  if (!order) {
    order = await prisma.order.findFirst({
      where: {
        printerId,
        status: "PRINTING",
      },
      orderBy: [{ printStartedAt: "desc" }, { updatedAt: "desc" }],
      select,
    });
  }

  if (!order) {
    order = await prisma.order.findFirst({
      where: {
        printerId,
        status: { in: STARTABLE_STATUSES },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
      select,
    });
  }

  if (!order) return null;

  if (order.status !== "PRINTING") {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PRINTING",
          printStartedAt: new Date(),
          queuePosition: null,
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PRINTING",
          note: `Print confirmed by OctoPrint${filename ? ` for ${filename}` : ""} [${source}]`,
          changedBy: "SYSTEM",
        },
      }),
    ]);
  }

  return {
    id: order.id,
    filename: filename || order.stlFileName,
    timeRemaining: params.timeRemaining ?? null,
    progress: params.progress ?? 0,
  };
}
