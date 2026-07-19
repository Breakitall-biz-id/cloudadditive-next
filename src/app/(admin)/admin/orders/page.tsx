import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminActionPanel, AdminButton, AdminFilterForm, AdminInput, AdminSearchInput, AdminSelect } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { formatAdminCurrency, formatAdminDateTime, getOrderRiskLabel, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminAssignOrderPrinter, adminUpdateOrderStatus } from "@/actions/admin";

const activeStatuses = ["CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING", "PACKING", "SHIPPED"] as const;
const orderStatusOptions = [
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_QUEUE", label: "In Queue" },
  { value: "SLICING", label: "Slicing" },
  { value: "PRINTING", label: "Printing" },
  { value: "POST_PROCESSING", label: "Post Processing" },
  { value: "PACKING", label: "Packing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];
const filterStatusOptions = [
  { value: "ALL", label: "All status" },
  ...activeStatuses.map((item) => ({ value: item, label: humanizeEnum(item) })),
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

type PageProps = {
  searchParams: Promise<{ query?: string; status?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query?.trim();
  const status = params.status?.trim();

  const where: Prisma.OrderWhereInput = {
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query } },
            { stlFileName: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { email: { contains: query } } },
            { provider: { businessName: { contains: query } } },
          ],
        }
      : {}),
    ...(status && status !== "ALL" ? { status: status as Prisma.EnumOrderStatusFilter["equals"] } : {}),
  };

  const [orders, printers, totalOrders, activeOrders, unassignedOrders, paidRevenue] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 60,
      include: {
        user: { select: { name: true, email: true } },
        provider: { select: { businessName: true } },
        printer: { select: { name: true } },
        material: { select: { name: true } },
        quality: { select: { name: true } },
        payment: { select: { status: true, invoiceNumber: true, paymentMethod: true } },
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.printer.findMany({
      orderBy: [{ provider: { businessName: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, providerId: true, provider: { select: { businessName: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { status: { in: [...activeStatuses] } } }),
    prisma.order.count({ where: { providerId: null, status: { notIn: ["PENDING_PAYMENT", "PAYMENT_FAILED", "CANCELLED", "REFUNDED"] } } }),
    prisma.order.aggregate({ where: { payment: { status: "PAID" } }, _sum: { totalPrice: true } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Orders" description="Pantau semua order lintas customer dan provider, termasuk payment, assignment printer, dan status workflow." />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Filtered Orders" value={totalOrders.toLocaleString("id-ID")} />
        <StatCard label="Active Workflow" value={activeOrders.toLocaleString("id-ID")} />
        <StatCard label="Unassigned" value={unassignedOrders.toLocaleString("id-ID")} />
        <StatCard label="Paid Revenue" value={formatAdminCurrency(paidRevenue._sum.totalPrice)} />
      </section>

      <DataCard title="Order Management">
        <AdminFilterForm>
          <AdminSearchInput name="query" defaultValue={query} placeholder="Cari order, customer, provider, file..." />
          <AdminSelect name="status" defaultValue={status ?? "ALL"} options={filterStatusOptions} />
          <AdminButton>Filter</AdminButton>
        </AdminFilterForm>

        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]">
              <CardContent className="p-4">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto] xl:items-start">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{order.stlFileName}</p>
                    <p className="mt-1 text-xs text-slate-400">Updated {formatAdminDateTime(order.updatedAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Customer</p>
                    <p className="mt-1 truncate font-semibold text-slate-800">{order.user.name}</p>
                    <p className="truncate text-xs text-slate-500">{order.user.email}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Provider / Printer</p>
                    <p className="mt-1 truncate font-semibold text-slate-800">{order.provider?.businessName ?? "Belum assigned"}</p>
                    <p className="truncate text-xs text-slate-500">{order.printer?.name ?? "No printer"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Config & Risk</p>
                    <p className="mt-1 font-semibold text-slate-800">{order.material.name} • {order.quality.name}</p>
                    <p className="text-xs text-slate-500">Qty {order.quantity} • {order.estimatedPrintTime ?? 0} min</p>
                    <p className="mt-2 text-xs font-semibold text-slate-800">{getOrderRiskLabel(order.status, order.updatedAt)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{order.statusHistory[0]?.note ?? "No latest note"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <StatusPill className={getStatusTone(order.status)}>{humanizeEnum(order.status)}</StatusPill>
                    <StatusPill className={getStatusTone(order.payment?.status ?? "PENDING")}>{humanizeEnum(order.payment?.status ?? "PENDING")}</StatusPill>
                    <p className="basis-full text-left text-lg font-semibold text-slate-950 xl:text-right">{formatAdminCurrency(order.totalPrice)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-[var(--admin-line-soft)] pt-4 xl:grid-cols-2">
                  <form key={`${order.id}-${order.status}`} action={adminUpdateOrderStatus}>
                    <AdminActionPanel className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
                      <input type="hidden" name="orderId" value={order.id} />
                      <AdminSelect name="status" defaultValue={order.status} options={orderStatusOptions} triggerClassName="h-8 text-xs" />
                      <AdminInput name="reason" minLength={5} placeholder="Reason optional; wajib untuk cancel/refund/fail" className="h-8 text-xs" />
                      <AdminButton className="h-8 bg-[#17201d] text-xs text-white hover:bg-[#075e57]">Apply</AdminButton>
                    </AdminActionPanel>
                  </form>
                  <form key={`${order.id}-${order.printerId ?? "none"}`} action={adminAssignOrderPrinter}>
                    <AdminActionPanel className="grid gap-2 border-[#d1e1dc] bg-[#eef5f2] sm:grid-cols-[minmax(220px,1fr)_1fr_auto]">
                      <input type="hidden" name="orderId" value={order.id} />
                      <AdminSelect
                        name="printerId"
                        defaultValue={order.printerId ?? "UNASSIGNED"}
                        options={[
                          { value: "UNASSIGNED", label: "Unassigned" },
                          ...printers.map((printer) => ({ value: printer.id, label: `${printer.provider.businessName} / ${printer.name}` })),
                        ]}
                        triggerClassName="h-8 border-[#c6ddd6] text-xs"
                      />
                      <AdminInput name="reason" required minLength={5} placeholder="Assignment reason" className="h-8 border-[#c6ddd6] text-xs" />
                      <AdminButton className="h-8 bg-[#075e57] text-xs text-white hover:bg-[#064f49]">Assign</AdminButton>
                    </AdminActionPanel>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
          {orders.length === 0 && (
            <Card className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]">
              <CardContent className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Tidak ada order sesuai filter.</CardContent>
            </Card>
          )}
        </div>
      </DataCard>
    </div>
  );
}
