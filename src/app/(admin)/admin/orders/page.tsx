import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminCurrency, formatAdminDateTime, getOrderRiskLabel, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminAssignOrderPrinter, adminUpdateOrderStatus } from "@/actions/admin";

const activeStatuses = ["CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING", "PACKING", "SHIPPED"] as const;

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
        <form className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input name="query" defaultValue={query} placeholder="Cari order, customer, provider, file..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" />
          <select name="status" defaultValue={status ?? "ALL"} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600">
            <option value="ALL">All status</option>
            {activeStatuses.map((item) => <option key={item} value={item}>{humanizeEnum(item)}</option>)}
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="PAYMENT_FAILED">Payment Failed</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Filter</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Provider / Printer</th>
                <th className="px-4 py-3">Config</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Admin Override</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-950">{order.orderNumber}</p>
                    <p className="mt-1 max-w-48 truncate text-xs font-semibold text-slate-500">{order.stlFileName}</p>
                    <p className="mt-1 text-xs text-slate-400">Updated {formatAdminDateTime(order.updatedAt)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800">{order.user.name}</p>
                    <p className="text-xs text-slate-500">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800">{order.provider?.businessName ?? "Belum assigned"}</p>
                    <p className="text-xs text-slate-500">{order.printer?.name ?? "No printer"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800">{order.material.name} • {order.quality.name}</p>
                    <p className="text-xs text-slate-500">Qty {order.quantity} • {order.estimatedPrintTime ?? 0} min</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusPill className={getStatusTone(order.status)}>{humanizeEnum(order.status)}</StatusPill>
                      <StatusPill className={getStatusTone(order.payment?.status ?? "PENDING")}>{humanizeEnum(order.payment?.status ?? "PENDING")}</StatusPill>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-slate-800">{getOrderRiskLabel(order.status, order.updatedAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.statusHistory[0]?.note ?? "No latest note"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <form key={`${order.id}-${order.status}`} action={adminUpdateOrderStatus} className="grid min-w-64 gap-2 rounded-2xl bg-slate-50 p-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <select name="status" defaultValue={order.status} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-teal-600">
                        <option value="PENDING_PAYMENT">Pending Payment</option>
                        <option value="PAYMENT_FAILED">Payment Failed</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="IN_QUEUE">In Queue</option>
                        <option value="SLICING">Slicing</option>
                        <option value="PRINTING">Printing</option>
                        <option value="POST_PROCESSING">Post Processing</option>
                        <option value="PACKING">Packing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                      <input name="reason" minLength={5} placeholder="Reason optional; wajib untuk cancel/refund/fail" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600" />
                      <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Apply</button>
                    </form>
                    <form key={`${order.id}-${order.printerId ?? "none"}`} action={adminAssignOrderPrinter} className="mt-3 grid min-w-64 gap-2 rounded-2xl bg-teal-50 p-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <select name="printerId" defaultValue={order.printerId ?? "UNASSIGNED"} className="rounded-xl border border-teal-100 px-3 py-2 text-xs font-bold outline-none focus:border-teal-700">
                        <option value="UNASSIGNED">Unassigned</option>
                        {printers.map((printer) => (
                          <option key={printer.id} value={printer.id}>{printer.provider.businessName} / {printer.name}</option>
                        ))}
                      </select>
                      <input name="reason" required minLength={5} placeholder="Assignment reason" className="rounded-xl border border-teal-100 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-700" />
                      <button className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-black text-white">Assign</button>
                    </form>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-slate-950">{formatAdminCurrency(order.totalPrice)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Tidak ada order sesuai filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}
