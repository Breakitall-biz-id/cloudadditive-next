import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminCurrency, formatAdminDateTime, getOrderRiskLabel, getPrinterHealthLabel, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";

const activeOrderStatuses = ["CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING", "PACKING", "SHIPPED"] as const;

export default async function AdminDashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalCustomers,
    totalProviders,
    pendingProviders,
    totalPrinters,
    onlinePrinters,
    activeOrders,
    totalOrders,
    revenue,
    paymentFailures,
    recentOrders,
    providerQueue,
    printerFleet,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.provider.count(),
    prisma.provider.count({ where: { isVerified: false } }),
    prisma.printer.count(),
    prisma.printer.count({ where: { status: { in: ["ONLINE", "PRINTING", "PAUSED"] } } }),
    prisma.order.count({ where: { status: { in: [...activeOrderStatuses] } } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { payment: { status: "PAID" } }, _sum: { totalPrice: true } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "EXPIRED"] } } }),
    prisma.order.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true } },
        provider: { select: { businessName: true } },
        payment: { select: { status: true } },
      },
    }),
    prisma.provider.findMany({
      where: { isVerified: false },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { user: { select: { email: true, name: true } }, printers: { select: { id: true } } },
    }),
    prisma.printer.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 6,
      include: { provider: { select: { businessName: true } }, currentMaterial: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Kontrol operasional lintas customer, provider, printer, order, payment, dan catalog. Semua data diambil langsung dari database produksi yang aktif."
        action={<Link href="/admin/orders" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-900">Open Orders</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total GMV Paid" value={formatAdminCurrency(revenue._sum.totalPrice)} caption="Sum dari payment PAID" />
        <StatCard label="Active Orders" value={activeOrders.toLocaleString("id-ID")} caption={`${totalOrders.toLocaleString("id-ID")} total orders`} />
        <StatCard label="Providers Pending" value={pendingProviders.toLocaleString("id-ID")} caption={`${totalProviders.toLocaleString("id-ID")} total providers`} />
        <StatCard label="Printer Online" value={`${onlinePrinters}/${totalPrinters}`} caption={`${totalCustomers.toLocaleString("id-ID")} customers, ${totalUsers.toLocaleString("id-ID")} users`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <DataCard title="Recent Order Signals" action={<Link href="/admin/orders" className="text-xs font-black text-teal-800">View all</Link>}>
          <div className="space-y-3">
            {recentOrders.length === 0 ? <p className="text-sm text-slate-500">Belum ada order.</p> : recentOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders?query=${encodeURIComponent(order.orderNumber)}`} className="grid gap-3 rounded-2xl border border-slate-100 p-4 hover:border-teal-200 hover:bg-teal-50/30 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">{order.orderNumber}</p>
                    <StatusPill className={getStatusTone(order.status)}>{humanizeEnum(order.status)}</StatusPill>
                    <StatusPill className={getStatusTone(order.payment?.status ?? "PENDING")}>{humanizeEnum(order.payment?.status ?? "PENDING")}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{order.user.name} • {order.provider?.businessName ?? "Belum assigned"}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-black text-slate-950">{formatAdminCurrency(order.totalPrice)}</p>
                  <p className="text-xs font-semibold text-slate-500">{getOrderRiskLabel(order.status, order.updatedAt)} • {formatAdminDateTime(order.updatedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </DataCard>

        <DataCard title="Operational Exceptions">
          <div className="space-y-4">
            <div className="rounded-2xl bg-rose-50 p-4 text-rose-900">
              <p className="text-3xl font-black">{paymentFailures.toLocaleString("id-ID")}</p>
              <p className="text-xs font-black uppercase tracking-widest">Failed/Expired Payments</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
              <p className="text-3xl font-black">{pendingProviders.toLocaleString("id-ID")}</p>
              <p className="text-xs font-black uppercase tracking-widest">Provider verification queue</p>
            </div>
          </div>
        </DataCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DataCard title="Provider Verification Queue" action={<Link href="/admin/providers" className="text-xs font-black text-teal-800">Review</Link>}>
          <div className="space-y-3">
            {providerQueue.length === 0 ? <p className="text-sm text-slate-500">Tidak ada provider yang menunggu verifikasi.</p> : providerQueue.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{provider.businessName}</p>
                    <p className="text-sm text-slate-500">{provider.user.name} • {provider.user.email}</p>
                  </div>
                  <StatusPill className="border-amber-200 bg-amber-50 text-amber-700">Pending</StatusPill>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">{provider.city}, {provider.province} • {provider.printers.length} printer registered</p>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Printer Fleet Snapshot" action={<Link href="/admin/printers" className="text-xs font-black text-teal-800">Monitor</Link>}>
          <div className="space-y-3">
            {printerFleet.length === 0 ? <p className="text-sm text-slate-500">Belum ada printer.</p> : printerFleet.map((printer) => {
              const health = getPrinterHealthLabel(printer.status, printer.lastSeenAt);
              return (
                <div key={printer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                  <div>
                    <p className="font-black text-slate-950">{printer.name}</p>
                    <p className="text-sm text-slate-500">{printer.provider.businessName} • {printer.currentMaterial?.name ?? "No material"}</p>
                  </div>
                  <StatusPill className={health === "Online" || health === "Printing" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : health === "Error" || health === "Offline" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{health}</StatusPill>
                </div>
              );
            })}
          </div>
        </DataCard>
      </section>
    </div>
  );
}
