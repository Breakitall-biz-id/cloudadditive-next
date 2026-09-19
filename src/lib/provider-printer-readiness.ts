import { isHeartbeatFresh } from "@/lib/printer-state";
import type { OrderStatus, PrinterStatus } from "@prisma/client";

export type PrinterReadinessOrder = {
  id: string;
  status: OrderStatus | string;
  materialId: string | null;
  gcodeFileUrl: string | null;
  queuePosition: number | null;
  createdAt: Date | string;
};

export type PrinterReadinessInput = {
  id: string;
  name: string;
  status: PrinterStatus | string;
  isAcceptingOrders: boolean;
  lastSeenAt: Date | string | null;
  currentMaterialId: string | null;
  currentMaterial?: { name: string } | null;
  orders?: PrinterReadinessOrder[];
};

export type PrinterReadinessState = {
  printerId: string;
  printerName: string;
  canAcceptOrders: boolean;
  canAutoStart: boolean;
  summary: string;
  instruction: string;
  severity: "ready" | "busy" | "blocked" | "offline";
  activeOrder?: PrinterReadinessOrder;
  nextOrder?: PrinterReadinessOrder;
};

const STARTABLE_ORDER_STATUSES = new Set(["CONFIRMED", "IN_QUEUE", "SLICING"]);
const ACTIVE_PRINT_STATUSES = new Set(["PRINTING", "POST_PROCESSING"]);

export function getProviderPrinterReadiness(
  printer: PrinterReadinessInput,
  options: { now?: Date; heartbeatTimeoutSeconds?: number } = {}
): PrinterReadinessState {
  const now = options.now ?? new Date();
  const heartbeatTimeoutSeconds = options.heartbeatTimeoutSeconds ?? 120;
  const orders = printer.orders ?? [];
  const status = String(printer.status).toUpperCase();
  const heartbeatFresh = isHeartbeatFresh(printer.lastSeenAt, now, heartbeatTimeoutSeconds);
  const activeOrder = orders.find((order) => ACTIVE_PRINT_STATUSES.has(String(order.status)));
  const nextOrder = orders
    .filter((order) => STARTABLE_ORDER_STATUSES.has(String(order.status)))
    .sort((a, b) => {
      const aQueue = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
      const bQueue = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
      if (aQueue !== bQueue) return aQueue - bQueue;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];

  const canAcceptOrders = Boolean(printer.isAcceptingOrders && status !== "OFFLINE" && status !== "ERROR" && status !== "MAINTENANCE");

  if (!heartbeatFresh || status === "OFFLINE") {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders: false,
      canAutoStart: false,
      severity: "offline",
      activeOrder,
      nextOrder,
      summary: "Printer belum terhubung / heartbeat stale.",
      instruction: "Pastikan OctoPrint dan plugin CloudPrint aktif sampai status live kembali. Auto-start ditahan sampai heartbeat fresh.",
    };
  }

  if (!printer.isAcceptingOrders) {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders: false,
      canAutoStart: false,
      severity: "blocked",
      activeOrder,
      nextOrder,
      summary: "Auto-accept sedang nonaktif.",
      instruction: "Aktifkan Auto-Accepting jika printer boleh menerima order baru dari matching system.",
    };
  }

  if (status === "ERROR" || status === "MAINTENANCE") {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "blocked",
      activeOrder,
      nextOrder,
      summary: `Printer sedang ${status.toLowerCase()}.`,
      instruction: "Selesaikan kondisi error/maintenance terlebih dahulu sebelum auto-start order berikutnya.",
    };
  }

  if (status === "PRINTING" || activeOrder?.status === "PRINTING") {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "busy",
      activeOrder,
      nextOrder,
      summary: "Printer sedang mencetak. Order baru boleh masuk antrian, tapi auto-start ditahan.",
      instruction: "Tunggu OctoPrint mengirim PrintDone. Setelah print selesai, ambil hasil dari bed dan lanjutkan post-processing sebelum menyiapkan job berikutnya.",
    };
  }

  if (activeOrder?.status === "POST_PROCESSING") {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "busy",
      activeOrder,
      nextOrder,
      summary: "Hasil print sebelumnya masih tahap post-processing.",
      instruction: "Angkat hasil print dari bed, lakukan finishing awal, lalu ubah status order ke Packing. Setelah status Packing, printer dianggap kosong dan queue berikutnya boleh jalan.",
    };
  }

  if (!printer.currentMaterialId) {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "blocked",
      activeOrder,
      nextOrder,
      summary: "Material loaded belum diset.",
      instruction: "Set material yang sedang terpasang di printer agar sistem bisa mencocokkan order berikutnya.",
    };
  }

  if (!nextOrder) {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "ready",
      activeOrder,
      summary: "Printer siap menerima order, belum ada antrian yang bisa dijalankan.",
      instruction: "Auto-start akan berjalan saat ada order antrian dengan material yang cocok dan G-code tersedia.",
    };
  }

  if (!nextOrder.gcodeFileUrl) {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "blocked",
      nextOrder,
      summary: "Order berikutnya belum punya G-code.",
      instruction: "Tunggu slicing selesai atau upload G-code manual sebelum auto-start bisa dijalankan.",
    };
  }

  if (nextOrder.materialId !== printer.currentMaterialId) {
    return {
      printerId: printer.id,
      printerName: printer.name,
      canAcceptOrders,
      canAutoStart: false,
      severity: "blocked",
      nextOrder,
      summary: "Material order berikutnya tidak cocok dengan material loaded.",
      instruction: `Ganti material printer ke material order berikutnya, atau jalankan order lain yang cocok dengan ${printer.currentMaterial?.name ?? "material saat ini"}.`,
    };
  }

  return {
    printerId: printer.id,
    printerName: printer.name,
    canAcceptOrders,
    canAutoStart: true,
    severity: "ready",
    nextOrder,
    summary: "Printer siap auto-start order berikutnya.",
    instruction: "Sistem dapat mengirim job berikutnya otomatis saat queue processor berjalan atau saat tombol Start Next Job ditekan.",
  };
}
