"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseMaterialCatalogForm,
  parsePrintQualityCatalogForm,
} from "@/lib/admin-catalog-utils";
import {
  buildAuditMetadata,
  normalizeAuditReason,
  normalizeOptionalAuditReason,
  parsePercentageInput,
  parsePositiveNumberInput,
} from "@/lib/admin-action-utils";
import type { AdminActionType, OrderStatus, PaymentStatus, PrinterStatus, Prisma, Role } from "@prisma/client";
import { loadMatchingConfig } from "@/lib/printer-matching/runtime-config";
import { resolvePrinterStateUpdate, validateAcceptingOrders } from "@/lib/printer-state";
import { processQueueForPrinter } from "@/lib/printer-matching";
import { decideAdminOrderStatusUpdate, shouldQueueAfterAdminAssignment } from "@/lib/admin-order-workflow";

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

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, isVerified: true, businessName: true },
  });
  if (!provider) throw new Error("Provider not found");

  const reason = nextVerified
    ? normalizeOptionalAuditReason(formData.get("reason"), `Provider verified by admin: ${provider.businessName}`)
    : normalizeAuditReason(formData.get("reason"));

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

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      printerId: true,
      totalPrice: true,
      payment: { select: { id: true, status: true } },
    },
  });
  if (!order) throw new Error("Order not found");

  const decision = decideAdminOrderStatusUpdate({
    currentStatus: order.status,
    requestedStatus: nextStatus,
    hasPrinter: Boolean(order.printerId),
    paymentStatus: order.payment?.status,
  });

  const requiresReason = ["PAYMENT_FAILED", "CANCELLED", "REFUNDED"].includes(nextStatus);
  const reason = requiresReason
    ? normalizeAuditReason(formData.get("reason"))
    : normalizeOptionalAuditReason(
        formData.get("reason"),
        `Order status updated from ${order.status} to ${decision.orderStatus} by admin`
      );

  await prisma.$transaction(async (tx) => {
    const queuePosition = decision.orderStatus === "IN_QUEUE" && order.printerId
      ? await tx.order.count({
          where: {
            printerId: order.printerId,
            status: "IN_QUEUE",
            id: { not: orderId },
          },
        }) + 1
      : null;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: decision.orderStatus,
        queuePosition,
        ...(decision.orderStatus === "PRINTING" ? { printStartedAt: new Date() } : {}),
        ...(decision.orderStatus === "POST_PROCESSING" ? { printCompletedAt: new Date() } : {}),
        ...(decision.orderStatus === "SHIPPED" ? { shippedAt: new Date() } : {}),
        ...(decision.orderStatus === "DELIVERED" || decision.orderStatus === "COMPLETED" ? { deliveredAt: new Date() } : {}),
      },
    });

    if (decision.markPaymentPaid) {
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "PAID", paidAt: new Date(), paymentMethod: "admin_override" },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId,
            invoiceNumber: `INV-${order.orderNumber}`,
            amount: order.totalPrice,
            status: "PAID",
            paidAt: new Date(),
            paymentMethod: "admin_override",
          },
        });
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: decision.orderStatus,
        note: `Admin override: ${reason}${nextStatus !== decision.orderStatus ? ` (requested ${nextStatus})` : ""}`,
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
        requested: nextStatus,
        after: decision.orderStatus,
        paymentReconciled: decision.markPaymentPaid,
      }),
    });
  });

  if (decision.shouldProcessQueue && order.printerId) {
    try {
      await processQueueForPrinter(order.printerId);
    } catch (error) {
      console.warn(`[adminUpdateOrderStatus] Queue processing failed for ${order.printerId}:`, error);
    }
  }

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
    select: {
      id: true,
      orderNumber: true,
      providerId: true,
      printerId: true,
      status: true,
      payment: { select: { status: true } },
    },
  });
  if (!order) throw new Error("Order not found");

  const printer = printerId
    ? await prisma.printer.findUnique({
        where: { id: printerId },
        select: { id: true, name: true, providerId: true },
      })
    : null;
  if (printerId && !printer) throw new Error("Printer not found");

  const shouldQueue = Boolean(printer && shouldQueueAfterAdminAssignment(order.status, order.payment?.status));
  const nextStatus: OrderStatus = shouldQueue
    ? "IN_QUEUE"
    : !printer && order.status === "IN_QUEUE"
      ? "CONFIRMED"
      : order.status;

  await prisma.$transaction(async (tx) => {
    const queuePosition = shouldQueue && printer
      ? await tx.order.count({
          where: {
            printerId: printer.id,
            status: "IN_QUEUE",
            id: { not: orderId },
          },
        }) + 1
      : null;

    await tx.order.update({
      where: { id: orderId },
      data: {
        printerId: printer?.id ?? null,
        providerId: printer?.providerId ?? null,
        status: nextStatus,
        queuePosition,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: nextStatus,
        note: `Admin assignment override: ${reason}${nextStatus !== order.status ? ` (${order.status} → ${nextStatus})` : ""}`,
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
        before: { providerId: order.providerId, printerId: order.printerId, status: order.status },
        after: { providerId: printer?.providerId ?? null, printerId: printer?.id ?? null, printerName: printer?.name ?? null, status: nextStatus },
      }),
    });
  });

  if (shouldQueue && printer) {
    try {
      await processQueueForPrinter(printer.id);
    } catch (error) {
      console.warn(`[adminAssignOrderPrinter] Queue processing failed for ${printer.id}:`, error);
    }
  }

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
  if (nextStatus === "PAID" && ["PENDING_PAYMENT", "PAYMENT_FAILED", "CONFIRMED"].includes(payment.order.status)) {
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
      const queuePosition = syncedOrderStatus === "IN_QUEUE" && payment.order.printerId
        ? await tx.order.count({
            where: {
              printerId: payment.order.printerId,
              status: "IN_QUEUE",
              id: { not: payment.orderId },
            },
          }) + 1
        : null;

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: syncedOrderStatus, queuePosition },
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

  if (syncedOrderStatus === "IN_QUEUE" && payment.order.printerId) {
    try {
      await processQueueForPrinter(payment.order.printerId);
    } catch (error) {
      console.warn(`[adminUpdatePaymentStatus] Queue processing failed for ${payment.order.printerId}:`, error);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
}

export async function adminUpdatePrinterState(formData: FormData) {
  const admin = await requireAdmin();
  const printerId = String(formData.get("printerId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as PrinterStatus;
  const isAcceptingOrders = formData.get("isAcceptingOrders") === "true";

  const printer = await prisma.printer.findUnique({
    where: { id: printerId },
    select: { id: true, name: true, status: true, isAcceptingOrders: true, lastSeenAt: true },
  });
  if (!printer) throw new Error("Printer not found");

  const reason = normalizeOptionalAuditReason(
    formData.get("reason"),
    `Printer ${printer.name} updated from ${printer.status} to ${nextStatus}`
  );

  const stateUpdate = resolvePrinterStateUpdate(nextStatus, isAcceptingOrders);
  const config = await loadMatchingConfig();
  stateUpdate.isAcceptingOrders = validateAcceptingOrders(
    stateUpdate.isAcceptingOrders,
    { status: stateUpdate.status, lastSeenAt: printer.lastSeenAt },
    new Date(),
    config.heartbeatTimeoutSeconds
  );

  await prisma.$transaction(async (tx) => {
    await tx.printer.update({
      where: { id: printerId },
      data: stateUpdate,
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
        after: stateUpdate,
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

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, name: true, isActive: true },
  });
  if (!material) throw new Error("Material not found");

  const reason = normalizeOptionalAuditReason(
    formData.get("reason"),
    `Material ${material.name} ${isActive ? "activated" : "deactivated"} by admin`
  );

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
  revalidatePath("/order");
  revalidatePath("/provider/dashboard/settings");
}

export async function upsertMaterialCatalogItem(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = parseMaterialCatalogForm(formData);
  const reason = normalizeOptionalAuditReason(
    formData.get("reason"),
    `Material ${parsed.data.name} catalog updated by admin`
  );

  const before = parsed.materialId
    ? await prisma.material.findUnique({
        where: { id: parsed.materialId },
        include: { colors: true },
      })
    : null;

  const materialId = parsed.materialId || parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!materialId) throw new Error("Material ID could not be generated");

  await prisma.$transaction(async (tx) => {
    await tx.material.upsert({
      where: { id: materialId },
      create: {
        id: materialId,
        ...parsed.data,
        colors: { create: parsed.colors },
      },
      update: {
        ...parsed.data,
        colors: {
          deleteMany: {},
          create: parsed.colors,
        },
      },
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: "MATERIAL_UPDATED",
      entityType: "Material",
      entityId: materialId,
      reason,
      metadata: buildAuditMetadata({
        before,
        after: { ...parsed.data, colors: parsed.colors },
      }),
    });
  });

  revalidatePath("/admin/settings");
  revalidatePath("/order");
  revalidatePath("/provider/dashboard/settings");
}

export async function setPrintQualityActive(formData: FormData) {
  const admin = await requireAdmin();
  const qualityId = String(formData.get("qualityId") ?? "");
  const isActive = formData.get("isActive") === "true";

  const quality = await prisma.printQuality.findUnique({
    where: { id: qualityId },
    select: { id: true, name: true, isActive: true },
  });
  if (!quality) throw new Error("Print quality not found");

  const reason = normalizeOptionalAuditReason(
    formData.get("reason"),
    `Print quality ${quality.name} ${isActive ? "activated" : "deactivated"} by admin`
  );

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
  revalidatePath("/order");
}

export async function upsertPrintQualityCatalogItem(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = parsePrintQualityCatalogForm(formData);
  const reason = normalizeOptionalAuditReason(
    formData.get("reason"),
    `Print quality ${parsed.data.name} catalog updated by admin`
  );

  const before = parsed.qualityId
    ? await prisma.printQuality.findUnique({ where: { id: parsed.qualityId } })
    : null;
  const qualityId = parsed.qualityId || parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!qualityId) throw new Error("Quality ID could not be generated");

  await prisma.$transaction(async (tx) => {
    await tx.printQuality.upsert({
      where: { id: qualityId },
      create: { id: qualityId, ...parsed.data },
      update: parsed.data,
    });

    await writeAudit(tx, {
      actorId: admin.id,
      action: "PRINT_QUALITY_UPDATED",
      entityType: "PrintQuality",
      entityId: qualityId,
      reason,
      metadata: buildAuditMetadata({ before, after: parsed.data }),
    });
  });

  revalidatePath("/admin/settings");
  revalidatePath("/order");
}

export async function updateSystemSettings(formData: FormData) {
  const admin = await requireAdmin();
  const reason = normalizeOptionalAuditReason(formData.get("reason"), "System settings updated by admin");
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
