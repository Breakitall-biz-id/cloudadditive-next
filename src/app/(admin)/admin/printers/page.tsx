import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminButton, AdminFilterForm, AdminInput, AdminSearchInput, AdminSelect } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { formatAdminDateTime, getPrinterHealthLabel, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";
import { adminUpdatePrinterState } from "@/actions/admin";

type PageProps = {
  searchParams: Promise<{ query?: string; status?: string }>;
};

function healthTone(health: string) {
  if (["Online", "Printing"].includes(health)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["Error", "Offline"].includes(health)) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

const printerStatusOptions = [
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "PRINTING", label: "Printing" },
  { value: "PAUSED", label: "Paused" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ERROR", label: "Error" },
];

export default async function AdminPrintersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query?.trim();
  const status = params.status ?? "ALL";

  const where: Prisma.PrinterWhereInput = {
    ...(status !== "ALL" ? { status: status as Prisma.EnumPrinterStatusFilter["equals"] } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { model: { contains: query } },
            { provider: { businessName: { contains: query } } },
          ],
        }
      : {}),
  };

  const [printers, totalPrinters, acceptingPrinters, errorPrinters, printingPrinters] = await Promise.all([
    prisma.printer.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 80,
      include: {
        provider: { select: { businessName: true, city: true, isVerified: true } },
        currentMaterial: { select: { name: true, type: true } },
        orders: {
          where: { status: { in: ["IN_QUEUE", "SLICING", "PRINTING"] } },
          select: { id: true, orderNumber: true, status: true, estimatedPrintTime: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.printer.count(),
    prisma.printer.count({ where: { isAcceptingOrders: true } }),
    prisma.printer.count({ where: { status: { in: ["ERROR", "OFFLINE"] } } }),
    prisma.printer.count({ where: { status: "PRINTING" } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Printers" description="Monitoring fleet printer semua provider, termasuk readiness order, material loaded, queue aktif, dan health terakhir." />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Printers" value={totalPrinters.toLocaleString("id-ID")} />
        <StatCard label="Accepting Orders" value={acceptingPrinters.toLocaleString("id-ID")} />
        <StatCard label="Printing Now" value={printingPrinters.toLocaleString("id-ID")} />
        <StatCard label="Offline/Error" value={errorPrinters.toLocaleString("id-ID")} />
      </section>

      <DataCard title="Fleet Monitor">
        <AdminFilterForm>
          <AdminSearchInput name="query" defaultValue={query} placeholder="Cari printer, model, provider..." />
          <AdminSelect name="status" defaultValue={status} options={[{ value: "ALL", label: "All status" }, ...printerStatusOptions]} />
          <AdminButton>Filter</AdminButton>
        </AdminFilterForm>

        <div className="grid gap-4 xl:grid-cols-2">
          {printers.map((printer) => {
            const health = getPrinterHealthLabel(printer.status, printer.lastSeenAt);
            const queueMinutes = printer.orders.reduce((sum, order) => sum + (order.estimatedPrintTime ?? 0), 0);
            return (
              <Card key={printer.id} className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{printer.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{printer.model ?? "Unknown model"} • {humanizeEnum(printer.technology)}</p>
                    </div>
                    <StatusPill className={healthTone(health)}>{health}</StatusPill>
                  </div>

                  <div className="mt-4 rounded-md bg-[#f2f4f1] p-4">
                    <p className="text-sm font-semibold text-slate-800">{printer.provider.businessName}</p>
                    <p className="text-xs font-semibold text-slate-500">{printer.provider.city} • {printer.provider.isVerified ? "Verified provider" : "Provider pending"}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Readiness</p><p className="font-semibold text-slate-900">{printer.isAcceptingOrders ? "Accepting" : "Paused"}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Material</p><p className="font-semibold text-slate-900">{printer.currentMaterial?.name ?? "Not loaded"}</p></div>
                    <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Queue</p><p className="font-semibold text-slate-900">{printer.orders.length} jobs / {queueMinutes} min</p></div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded-md bg-[#f2f4f1] px-3 py-1">{printer.buildWidth}×{printer.buildDepth}×{printer.buildHeight} mm</span>
                    <span className="rounded-md bg-[#f2f4f1] px-3 py-1">Last seen {formatAdminDateTime(printer.lastSeenAt)}</span>
                  </div>

                  <form key={`${printer.id}-${printer.status}-${printer.isAcceptingOrders}`} action={adminUpdatePrinterState} className="mt-5 grid gap-2 rounded-[0.75rem] border border-[var(--admin-line)] bg-[#f8f9fb] p-3 sm:grid-cols-[1fr_1fr]">
                    <input type="hidden" name="printerId" value={printer.id} />
                    <AdminSelect name="status" defaultValue={printer.status} options={printerStatusOptions} triggerClassName="h-8 text-xs" />
                    <AdminSelect
                      name="isAcceptingOrders"
                      defaultValue={printer.isAcceptingOrders ? "true" : "false"}
                      options={[
                        { value: "true", label: "Accepting orders" },
                        { value: "false", label: "Not accepting" },
                      ]}
                      triggerClassName="h-8 text-xs"
                    />
                    <AdminInput name="reason" minLength={5} placeholder="Reason optional" className="h-8 text-xs sm:col-span-2" />
                    <AdminButton className="h-8 bg-[#17201d] text-xs text-white hover:bg-[#075e57] sm:col-span-2">Update Printer</AdminButton>
                  </form>
                </CardContent>
              </Card>
            );
          })}
          {printers.length === 0 && <p className="text-sm font-semibold text-slate-500">Tidak ada printer sesuai filter.</p>}
        </div>
      </DataCard>
    </div>
  );
}
