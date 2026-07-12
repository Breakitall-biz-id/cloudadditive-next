import type { OrderStatus, PaymentStatus, PrinterStatus, Role } from "@prisma/client";

const STALE_PRINTER_MS = 5 * 60 * 1000;

export function formatAdminCurrency(value: number | string | { toString(): string } | null | undefined) {
  const numeric = Number(value ?? 0);
  return `Rp ${Math.round(Number.isFinite(numeric) ? numeric : 0).toLocaleString("id-ID")}`;
}

export function formatAdminDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatAdminDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskBankAccount(value: string | null | undefined) {
  if (!value) return "Belum diisi";
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return "•".repeat(compact.length);
  return `•••• ••${compact.slice(-4)}`;
}

export function getPrinterHealthLabel(status: PrinterStatus | string, lastSeenAt: Date | string | null | undefined) {
  if (status === "ERROR") return "Error";
  if (status === "MAINTENANCE") return "Maintenance";
  if (status === "OFFLINE" || !lastSeenAt) return "Offline";

  const lastSeen = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  if (Number.isNaN(lastSeen.getTime())) return "Offline";
  if (Date.now() - lastSeen.getTime() > STALE_PRINTER_MS) return "Stale";

  if (status === "PRINTING") return "Printing";
  if (status === "PAUSED") return "Paused";
  return "Online";
}

export function getStatusTone(status: OrderStatus | PaymentStatus | PrinterStatus | Role | string) {
  if (["PAID", "COMPLETED", "DELIVERED", "ONLINE", "ADMIN"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (["PRINTING", "IN_QUEUE", "CONFIRMED", "SLICING", "PROVIDER"].includes(status)) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (["PENDING", "PENDING_PAYMENT", "POST_PROCESSING", "PACKING", "SHIPPED", "PAUSED", "MAINTENANCE"].includes(status)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (["FAILED", "PAYMENT_FAILED", "CANCELLED", "REFUNDED", "ERROR", "OFFLINE", "EXPIRED"].includes(status)) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function humanizeEnum(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getOrderRiskLabel(status: OrderStatus | string, updatedAt: Date | string) {
  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const ageHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);

  if (["PAYMENT_FAILED", "CANCELLED", "REFUNDED"].includes(status)) return "Needs review";
  if (["PRINTING", "SLICING", "IN_QUEUE", "CONFIRMED"].includes(status) && ageHours >= 24) return "Stale workflow";
  if (status === "PENDING_PAYMENT" && ageHours >= 6) return "Payment stale";
  return "Normal";
}
