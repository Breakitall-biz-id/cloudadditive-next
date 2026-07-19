import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Printer,
  Route,
  ShieldAlert,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminHeroCard, AdminWorkspace, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminActivityChart } from "@/components/admin/AdminActivityChart";
import { AdminDashboardMotion } from "@/components/admin/AdminDashboardMotion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getOrderRiskLabel,
  getPrinterHealthLabel,
  getStatusTone,
  humanizeEnum,
} from "@/lib/admin-metrics";

const activeOrderStatuses = ["CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING", "PACKING", "SHIPPED"] as const;

interface MonthlyActivity {
  key: string;
  label: string;
  orders: number;
  paidRevenue: number;
  completed: number;
}

function buildMonthSeries(start: Date): MonthlyActivity[] {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
      orders: 0,
      paidRevenue: 0,
      completed: 0,
    };
  });
}

function getTrend(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "New activity" : "No change";
  const percentage = ((current - previous) / previous) * 100;
  return `${percentage >= 0 ? "+" : ""}${percentage.toLocaleString("id-ID", { maximumFractionDigits: 0 })}% vs last month`;
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  rangeStart.setHours(0, 0, 0, 0);

  const [
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
    monthlyOrders,
  ] = await Promise.all([
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
      take: 7,
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
    prisma.order.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: {
        createdAt: true,
        status: true,
        totalPrice: true,
        payment: { select: { status: true } },
      },
    }),
  ]);

  const series = buildMonthSeries(rangeStart);
  const seriesByKey = new Map(series.map((item) => [item.key, item]));
  for (const order of monthlyOrders) {
    const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
    const month = seriesByKey.get(key);
    if (!month) continue;
    month.orders += 1;
    if (order.payment?.status === "PAID") month.paidRevenue += Number(order.totalPrice);
    if (order.status === "COMPLETED" || order.status === "DELIVERED") month.completed += 1;
  }

  const currentMonth = series.at(-1) ?? series[0];
  const previousMonth = series.at(-2) ?? currentMonth;
  const completedInRange = series.reduce((total, month) => total + month.completed, 0);
  const ordersInRange = series.reduce((total, month) => total + month.orders, 0);
  const completionRate = ordersInRange > 0 ? Math.round((completedInRange / ordersInRange) * 100) : 0;
  const disconnectedPrinters = Math.max(totalPrinters - onlinePrinters, 0);

  return (
    <AdminDashboardMotion>
      <AdminWorkspace>
        <div data-admin-reveal>
          <AdminHeroCard
            title={<>Welcome, Admin</>}
            description="Pantau order, payment, provider, dan fleet printer dari satu workspace."
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-lg border-[var(--admin-line)] bg-white px-4 text-sm font-medium text-[#202229] shadow-[var(--admin-shadow-control)] hover:border-[#d8dbe1] hover:bg-[#f8f9fb]"
                >
                  <Link href="/admin/printer-matching">
                    <Route className="text-[#08746b]" strokeWidth={1.8} />
                    Test matching
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-11 rounded-lg bg-[#090914] px-5 text-sm font-medium text-white shadow-[var(--admin-shadow-control)] hover:bg-[#202032]"
                >
                  <Link href="/admin/orders">
                    Open orders
                    <ArrowUpRight strokeWidth={1.8} />
                  </Link>
                </Button>
              </div>
            }
          />
        </div>

        <section data-admin-reveal className="grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key operational metrics">
          <StatCard label="Total GMV paid" value={formatAdminCurrency(revenue._sum.totalPrice)} caption="Paid transactions" />
          <StatCard label="Active orders" value={activeOrders.toLocaleString("id-ID")} caption={`${totalOrders.toLocaleString("id-ID")} total orders`} />
          <StatCard label="Provider review" value={pendingProviders.toLocaleString("id-ID")} caption={`${totalProviders.toLocaleString("id-ID")} providers`} />
          <StatCard label="Printer connected" value={`${onlinePrinters}/${totalPrinters}`} caption={`${totalCustomers.toLocaleString("id-ID")} customers`} />
        </section>

        <section className="grid grid-flow-dense gap-4 xl:grid-cols-12">
          <Card data-admin-reveal className="gap-0 overflow-hidden rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] xl:col-span-8">
            <CardHeader className="flex flex-col gap-4 border-b border-[var(--admin-line-soft)] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardDescription className="text-[12px] font-medium text-[#858a93]">Last 12 months</CardDescription>
                <CardTitle className="mt-1 text-[22px] font-semibold tracking-[-0.045em] text-[#090914]">Order & revenue activity</CardTitle>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#737883]">
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#9ac8b6]" />Paid revenue</span>
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#075e57]" />Order volume</span>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-4 lg:min-w-[310px]">
                <div>
                  <dt className="text-[11px] font-medium text-[#858a93]">This month</dt>
                  <dd className="mt-1 text-[22px] font-semibold tracking-[-0.045em] tabular-nums text-[#090914]">{currentMonth.orders}</dd>
                  <p className="mt-1 text-[10px] text-[#71807a]">{getTrend(currentMonth.orders, previousMonth.orders)}</p>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-[#858a93]">Paid GMV</dt>
                  <dd className="mt-1 text-[22px] font-semibold tracking-[-0.045em] tabular-nums text-[#090914]">{formatAdminCurrency(currentMonth.paidRevenue)}</dd>
                  <p className="mt-1 text-[10px] text-[#71807a]">Current month</p>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-[#858a93]">Completion</dt>
                  <dd className="mt-1 text-[22px] font-semibold tracking-[-0.045em] tabular-nums text-[#090914]">{completionRate}%</dd>
                  <p className="mt-1 text-[10px] text-[#71807a]">12 month cohort</p>
                </div>
              </dl>
            </CardHeader>
            <CardContent className="px-5 pb-3 pt-2">
              <AdminActivityChart series={series} />
            </CardContent>
          </Card>

          <Card data-admin-reveal className="gap-0 rounded-[0.85rem] border-[#090914] bg-[#090914] py-0 text-[#f3f5f2] shadow-[0_16px_36px_rgba(9,9,20,0.12)] xl:col-span-4">
            <CardHeader className="flex-row items-start justify-between gap-4 px-5 pb-0 pt-5">
              <div>
                <CardDescription className="text-[11px] font-medium text-[#aab5b0]">Needs attention</CardDescription>
                <CardTitle className="mt-1 text-lg font-medium tracking-[-0.025em]">Operational exceptions</CardTitle>
              </div>
              <CardAction className="static"><ShieldAlert className="size-5 text-[#efb067]" strokeWidth={1.6} /></CardAction>
            </CardHeader>

            <CardContent className="px-5 pb-5 pt-6">
              <div className="divide-y divide-white/10 border-y border-white/10">
                <Link href="/admin/payments" className="group flex items-center gap-3 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[#efb067]"><CircleDollarSign className="h-4 w-4" strokeWidth={1.7} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-[#d9dfdc]">Failed or expired payments</span>
                  <span className="mt-0.5 block text-[10px] text-[#8f9c96]">Review payment ledger</span>
                </span>
                <strong className="text-xl font-medium tabular-nums">{paymentFailures}</strong>
              </Link>
              <Link href="/admin/providers" className="group flex items-center gap-3 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[#9fd3c2]"><Users className="h-4 w-4" strokeWidth={1.7} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-[#d9dfdc]">Provider verification</span>
                  <span className="mt-0.5 block text-[10px] text-[#8f9c96]">Oldest request first</span>
                </span>
                <strong className="text-xl font-medium tabular-nums">{pendingProviders}</strong>
              </Link>
              <Link href="/admin/printers" className="group flex items-center gap-3 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[#d0d9d5]"><Printer className="h-4 w-4" strokeWidth={1.7} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-[#d9dfdc]">Disconnected printers</span>
                  <span className="mt-0.5 block text-[10px] text-[#8f9c96]">Offline, error, or maintenance</span>
                </span>
                <strong className="text-xl font-medium tabular-nums">{disconnectedPrinters}</strong>
              </Link>
              </div>

              <Button asChild variant="link" className="mt-4 h-auto justify-start p-0 text-xs font-semibold text-[#cfe7df] hover:text-white">
                <Link href="/admin/orders">
                  Review active workflow
                  <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card data-admin-reveal className="gap-0 overflow-hidden rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] xl:col-span-6">
            <CardHeader className="min-h-14 grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--admin-line-soft)] px-5 py-3.5">
              <div>
                <CardTitle className="text-sm font-medium tracking-[-0.015em] text-[#26312d]">Recent order signals</CardTitle>
                <CardDescription className="mt-0.5 text-[10px] text-[#8a9590]">Sorted by latest operational update</CardDescription>
              </div>
              <CardAction className="static col-start-2 row-start-1">
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-[11px] font-semibold text-[#08746b] hover:text-[#064d48]">
                  <Link href="/admin/orders">View all</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="divide-y divide-[#e7ebe8] px-5">
              {recentOrders.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#7d8883]">Belum ada order.</p>
              ) : recentOrders.map((order) => (
                <Link key={order.id} href={`/admin/orders?query=${encodeURIComponent(order.orderNumber)}`} className="group grid gap-2 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-[#17201d] transition-colors group-hover:text-[#075e57]">{order.orderNumber}</p>
                      <StatusPill className={getStatusTone(order.status)}>{humanizeEnum(order.status)}</StatusPill>
                      <StatusPill className={getStatusTone(order.payment?.status ?? "PENDING")}>{humanizeEnum(order.payment?.status ?? "PENDING")}</StatusPill>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[#7d8883]">{order.user.name || order.user.email} · {order.provider?.businessName ?? "Belum assigned"}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-semibold tabular-nums text-[#26312d]">{formatAdminCurrency(order.totalPrice)}</p>
                    <p className="mt-1 text-[10px] text-[#8a9590]">{getOrderRiskLabel(order.status, order.updatedAt)} · {formatAdminDateTime(order.updatedAt)}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card data-admin-reveal className="gap-0 overflow-hidden rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] xl:col-span-6">
            <CardHeader className="min-h-14 grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--admin-line-soft)] px-5 py-3.5">
              <div>
                <CardTitle className="text-sm font-medium tracking-[-0.015em] text-[#26312d]">Provider verification queue</CardTitle>
                <CardDescription className="mt-0.5 text-[10px] text-[#8a9590]">Applications that still require admin review</CardDescription>
              </div>
              <CardAction className="static col-start-2 row-start-1">
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-[11px] font-semibold text-[#08746b] hover:text-[#064d48]">
                  <Link href="/admin/providers">Review</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="divide-y divide-[#e7ebe8] px-5">
              {providerQueue.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-7 w-7 text-[#64a993]" strokeWidth={1.5} />
                  <p className="mt-3 text-xs font-medium text-[#45524d]">Verification queue is clear</p>
                  <p className="mt-1 text-[10px] text-[#89938f]">Tidak ada provider yang menunggu review.</p>
                </div>
              ) : providerQueue.map((provider) => (
                <div key={provider.id} className="flex items-center gap-3 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e7ece8] text-xs font-semibold text-[#53615b]">
                    {provider.businessName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[#17201d]">{provider.businessName}</p>
                      <StatusPill className="border-[#ead4a8] bg-[#fbf3df] text-[#8b5a0a]">Pending</StatusPill>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[#7d8883]">{provider.user.name || provider.user.email} · {provider.city}, {provider.province}</p>
                  </div>
                  <span className="text-right text-[10px] text-[#89938f]">{provider.printers.length}<br />printers</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card data-admin-reveal className="gap-0 overflow-hidden rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] xl:col-span-12">
            <CardHeader className="min-h-14 grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--admin-line-soft)] px-5 py-3.5">
              <div>
                <CardTitle className="text-sm font-medium tracking-[-0.015em] text-[#26312d]">Printer fleet snapshot</CardTitle>
                <CardDescription className="mt-0.5 text-[10px] text-[#8a9590]">Current connectivity and loaded material</CardDescription>
              </div>
              <CardAction className="static col-start-2 row-start-1">
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-[11px] font-semibold text-[#08746b] hover:text-[#064d48]">
                  <Link href="/admin/printers">Open fleet monitor</Link>
                </Button>
              </CardAction>
            </CardHeader>
            {printerFleet.length === 0 ? (
              <CardContent className="px-5 py-10 text-center text-xs text-[#7d8883]">Belum ada printer terdaftar.</CardContent>
            ) : (
              <CardContent className="grid divide-y divide-[#e7ebe8] px-0 md:grid-cols-2 md:divide-y-0 xl:grid-cols-3">
                {printerFleet.map((printer, index) => {
                  const health = getPrinterHealthLabel(printer.status, printer.lastSeenAt);
                  const healthy = health === "Online" || health === "Printing";
                  const unhealthy = health === "Error" || health === "Offline";
                  return (
                    <div
                      key={printer.id}
                      className={`flex items-center gap-3 px-5 py-4 ${index % 3 !== 2 ? "xl:border-r xl:border-[var(--admin-line-soft)]" : ""} ${index % 2 === 0 ? "md:border-r md:border-[var(--admin-line-soft)] xl:border-r" : ""}`}
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#edf0ed] text-[#596660]">
                        <Printer className="h-[18px] w-[18px]" strokeWidth={1.6} />
                        <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#fafbf9] ${healthy ? "bg-[#3e9d7f]" : unhealthy ? "bg-[#c75b4f]" : "bg-[#d1963d]"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-xs font-semibold text-[#17201d]">{printer.name}</p>
                          <StatusPill className={healthy ? "border-[#b9dacd] bg-[#e8f3ee] text-[#27765f]" : unhealthy ? "border-[#efc6c0] bg-[#f9e9e6] text-[#9c3f36]" : "border-[#ead4a8] bg-[#fbf3df] text-[#8b5a0a]"}>{health}</StatusPill>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-[#7d8883]">{printer.provider.businessName} · {printer.currentMaterial?.name ?? "No material loaded"}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        </section>
      </AdminWorkspace>
    </AdminDashboardMotion>
  );
}
