"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildAuditMetadata,
  normalizeAuditReason,
  parsePercentageInput,
  parsePositiveNumberInput,
} from "@/lib/admin-action-utils";
import type { AdminActionType, OrderStatus, PaymentStatus, PrinterStatus, Prisma, Role } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Forbidden");
  return session.user;
}

async function writeAudit(tx: Prisma.TransactionClient, data: {
  actorId: string;
  action: AdminActionType;
  entityType: string;
  entityId: string;
  reason: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await tx.auditLog.create({ data });
}

export async function setProviderVerification(formData: FormData) {
  const admin = await requireAdmin();
  const providerId = String(formData.get("providerId") ?? "");
  const nextVerified = formData.get("isVerified") === "true";
  const reason = normalizeAuditReason(formData.get("reason"));

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, isVerified: true, businessName: true },
  });
  if (!provider) throw new Error("Provider not found");

  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: providerId },
      data: {
        isVerified: nextVerified,
        verifiedAt: nextVerified ? new Date() : null,
      },
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: nextVerified ? "PROVIDER_VERIFIED" : "PROVIDER_UNVERIFIED",
      entityType: "Provider",
      entityId: providerId,
      reason,
      metadata: buildAuditMetadata({
        businessName: provider.businessName,
        before: provider.isVerified,
        after: nextVerified,
      }),
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/providers");
  revalidatePath("/provider/dashboard");
}

export async function adminUpdateOrderStatus(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as OrderStatus;
  const reason = normalizeAuditReason(formData.get("reason"));

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true },
  });
  if (!order) throw new Error("Order not found");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        ...(nextStatus === "PRINTING" ? { printStartedAt: new Date() } : {}),
        ...(nextStatus === "POST_PROCESSING" ? { printCompletedAt: new Date() } : {}),
        ...(nextStatus === "SHIPPED" ? { shippedAt: new Date() } : {}),
        ...(nextStatus === "DELIVERED" || nextStatus === "COMPLETED" ? { deliveredAt: new Date() } : {}),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: nextStatus,
        note: `Admin override: ${reason}`,
        changedBy: admin.id,
      },
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: "ORDER_STATUS_CHANGED",
      entityType: "Order",
      entityId: orderId,
      reason,
      metadata: buildAuditMetadata({
        orderNumber: order.orderNumber,
        before: order.status,
        after: nextStatus,
      }),
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/dashboard/orders");
  revalidatePath("/provider/dashboard/orders");
}

export async function adminAssignOrderPrinter(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const printerIdValue = String(formData.get("printerId") ?? "");
  const printerId = printerIdValue === "UNASSIGNED" ? null : printerIdValue;
  const reason = normalizeAuditReason(formData.get("reason"));

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, providerId: true, printerId: true, status: true },
  });
  if (!order) throw new Error("Order not found");

  const printer = printerId
    ? await prisma.printer.findUnique({
        where: { id: printerId },
        select: { id: true, name: true, providerId: true },
      })
    : null;
  if (printerId && !printer) throw new Error("Printer not found");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        printerId: printer?.id ?? null,
        providerId: printer?.providerId ?? null,
        queuePosition: null,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        note: `Admin assignment override: ${reason}`,
        changedBy: admin.id,
      },
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: "ORDER_ASSIGNMENT_CHANGED",
      entityType: "Order",
      entityId: orderId,
      reason,
      metadata: buildAuditMetadata({
        orderNumber: order.orderNumber,
        before: { providerId: order.providerId, printerId: order.printerId },
        after: { providerId: printer?.providerId ?? null, printerId: printer?.id ?? null, printerName: printer?.name ?? null },
      }),
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/provider/dashboard/orders");
}

export async function adminUpdatePaymentStatus(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as PaymentStatus;
  const reason = normalizeAuditReason(formData.get("reason"));

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      orderId: true,
      order: { select: { status: true, orderNumber: true, providerId: true, printerId: true } },
    },
  });
  if (!payment) throw new Error("Payment not found");

  let syncedOrderStatus: OrderStatus | null = null;
  if (nextStatus === "PAID" && ["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(payment.order.status)) {
    syncedOrderStatus = payment.order.providerId && payment.order.printerId ? "IN_QUEUE" : "CONFIRMED";
  } else if ((nextStatus === "FAILED" || nextStatus === "EXPIRED") && payment.order.status === "PENDING_PAYMENT") {
    syncedOrderStatus = "PAYMENT_FAILED";
  } else if (nextStatus === "REFUNDED" && payment.order.status !== "REFUNDED") {
    syncedOrderStatus = "REFUNDED";
  } else if (nextStatus === "PENDING" && payment.order.status === "PAYMENT_FAILED") {
    syncedOrderStatus = "PENDING_PAYMENT";
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: nextStatus,
        paidAt: nextStatus === "PAID" ? new Date() : undefined,
        expiredAt: nextStatus === "EXPIRED" ? new Date() : undefined,
      },
    });

    if (syncedOrderStatus) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: syncedOrderStatus },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: syncedOrderStatus,
          note: `Admin payment reconciliation: ${reason}`,
          changedBy: admin.id,
        },
      });
    }

    await writeAudit(tx, {
      actorId: admin.id,
      action: "PAYMENT_STATUS_CHANGED",
      entityType: "Payment",
      entityId: paymentId,
      reason,
      metadata: buildAuditMetadata({
        invoiceNumber: payment.invoiceNumber,
        orderId: payment.orderId,
        before: payment.status,
        after: nextStatus,
        orderStatusSync: syncedOrderStatus
          ? { before: payment.order.status, after: syncedOrderStatus, orderNumber: payment.order.orderNumber }
          : null,
      }),
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
}

export async function adminUpdatePrinterState(formData: FormData) {
  const admin = await requireAdmin();
  const printerId = String(formData.get("printerId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as PrinterStatus;
  const isAcceptingOrders = formData.get("isAcceptingOrders") === "true";
  const reason = normalizeAuditReason(formData.get("reason"));

  const printer = await prisma.printer.findUnique({
    where: { id: printerId },
    select: { id: true, name: true, status: true, isAcceptingOrders: true },
  });
  if (!printer) throw new Error("Printer not found");

  await prisma.$transaction(async (tx) => {
    await tx.printer.update({
      where: { id: printerId },
      data: { status: nextStatus, isAcceptingOrders },
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: "PRINTER_UPDATED",
      entityType: "Printer",
      entityId: printerId,
      reason,
      metadata: buildAuditMetadata({
        name: printer.name,
        before: { status: printer.status, isAcceptingOrders: printer.isAcceptingOrders },
        after: { status: nextStatus, isAcceptingOrders },
      }),
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/printers");
  revalidatePath("/provider/dashboard/printers");
}

export async function adminUpdateUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("role") ?? "") as Role;
  const reason = normalizeAuditReason(formData.get("reason"));

  if (userId === admin.id && nextRole !== "ADMIN") {
    throw new Error("Admin cannot demote their own account");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: nextRole } });
    await writeAudit(tx, {
      actorId: admin.id,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: userId,
      reason,
      metadata: buildAuditMetadata({ email: user.email, before: user.role, after: nextRole }),
    });
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit-logs");
}

export async function setMaterialActive(formData: FormData) {
  const admin = await requireAdmin();
  const materialId = String(formData.get("materialId") ?? "");
  const isActive = formData.get("isActive") === "true";
  const reason = normalizeAuditReason(formData.get("reason"));

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, name: true, isActive: true },
  });
  if (!material) throw new Error("Material not found");

  await prisma.$transaction(async (tx) => {
    await tx.material.update({ where: { id: materialId }, data: { isActive } });
    await writeAudit(tx, {
      actorId: admin.id,
      action: "MATERIAL_UPDATED",
      entityType: "Material",
      entityId: materialId,
      reason,
      metadata: buildAuditMetadata({ name: material.name, before: material.isActive, after: isActive }),
    });
  });

  revalidatePath("/admin/settings");
}

export async function setPrintQualityActive(formData: FormData) {
  const admin = await requireAdmin();
  const qualityId = String(formData.get("qualityId") ?? "");
  const isActive = formData.get("isActive") === "true";
  const reason = normalizeAuditReason(formData.get("reason"));

  const quality = await prisma.printQuality.findUnique({
    where: { id: qualityId },
    select: { id: true, name: true, isActive: true },
  });
  if (!quality) throw new Error("Print quality not found");

  await prisma.$transaction(async (tx) => {
    await tx.printQuality.update({ where: { id: qualityId }, data: { isActive } });
    await writeAudit(tx, {
      actorId: admin.id,
      action: "PRINT_QUALITY_UPDATED",
      entityType: "PrintQuality",
      entityId: qualityId,
      reason,
      metadata: buildAuditMetadata({ name: quality.name, before: quality.isActive, after: isActive }),
    });
  });

  revalidatePath("/admin/settings");
}

export async function updateSystemSettings(formData: FormData) {
  const admin = await requireAdmin();
  const reason = normalizeAuditReason(formData.get("reason"));
  const nextSettings = {
    markupPercentage: parsePercentageInput(formData.get("markupPercentage")),
    platformFeePercentage: parsePercentageInput(formData.get("platformFeePercentage")),
    machineRatePerHour: parsePositiveNumberInput(formData.get("machineRatePerHour"), "Machine rate"),
    estimatedPrintSpeed: parsePositiveNumberInput(formData.get("estimatedPrintSpeed"), "Estimated print speed"),
    defaultInfillPercentage: parsePercentageInput(formData.get("defaultInfillPercentage")),
  };

  const before = await prisma.systemSettings.findUnique({ where: { id: "default" } });

  await prisma.$transaction(async (tx) => {
    await tx.systemSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...nextSettings },
      update: nextSettings,
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: "SYSTEM_SETTINGS_UPDATED",
      entityType: "SystemSettings",
      entityId: "default",
      reason,
      metadata: buildAuditMetadata({ before, after: nextSettings }),
    });
  });

  revalidatePath("/admin/settings");
  revalidatePath("/order");
}
