import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminDateTime, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";

type PageProps = { searchParams: Promise<{ query?: string; action?: string }> };

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query?.trim();
  const action = params.action ?? "ALL";

  const where: Prisma.AuditLogWhereInput = {
    ...(action !== "ALL" ? { action: action as Prisma.EnumAdminActionTypeFilter["equals"] } : {}),
    ...(query
      ? {
          OR: [
            { entityType: { contains: query } },
            { entityId: { contains: query } },
            { reason: { contains: query } },
            { actor: { email: { contains: query } } },
            { actor: { name: { contains: query } } },
          ],
        }
      : {}),
  };

  const [logs, totalLogs, providerLogs, orderLogs, settingsLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { entityType: "Provider" } }),
    prisma.auditLog.count({ where: { entityType: "Order" } }),
    prisma.auditLog.count({ where: { entityType: { in: ["SystemSettings", "Material", "PrintQuality"] } } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Audit Logs" description="Riwayat aksi admin yang mengubah data sensitif. Ini penting untuk traceability saat approve provider, override order, dan mengubah pricing/catalog." />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Audit Logs" value={totalLogs.toLocaleString("id-ID")} />
        <StatCard label="Provider Actions" value={providerLogs.toLocaleString("id-ID")} />
        <StatCard label="Order Overrides" value={orderLogs.toLocaleString("id-ID")} />
        <StatCard label="Settings/Catalog" value={settingsLogs.toLocaleString("id-ID")} />
      </section>

      <DataCard title="Audit Trail">
        <form className="mb-5 grid gap-3 md:grid-cols-[1fr_280px_auto]">
          <input name="query" defaultValue={query} placeholder="Cari actor, entity, reason..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" />
          <select name="action" defaultValue={action} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600">
            <option value="ALL">All actions</option>
            <option value="PROVIDER_VERIFIED">Provider Verified</option>
            <option value="PROVIDER_UNVERIFIED">Provider Unverified</option>
            <option value="USER_ROLE_CHANGED">User Role Changed</option>
            <option value="ORDER_STATUS_CHANGED">Order Status Changed</option>
            <option value="ORDER_ASSIGNMENT_CHANGED">Order Assignment Changed</option>
            <option value="PAYMENT_STATUS_CHANGED">Payment Status Changed</option>
            <option value="PRINTER_UPDATED">Printer Updated</option>
            <option value="MATERIAL_UPDATED">Material Updated</option>
            <option value="PRINT_QUALITY_UPDATED">Print Quality Updated</option>
            <option value="SYSTEM_SETTINGS_UPDATED">System Settings Updated</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Filter</button>
        </form>

        <div className="space-y-3">
          {logs.map((log) => (
            <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill className={getStatusTone(log.action)}>{humanizeEnum(log.action)}</StatusPill>
                    <p className="text-sm font-black text-slate-950">{log.entityType}</p>
                    <p className="text-xs font-semibold text-slate-500">{log.entityId}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{log.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">By {log.actor?.name ?? "Deleted admin"} • {log.actor?.email ?? "-"}</p>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{formatAdminDateTime(log.createdAt)}</p>
              </div>
              {log.metadata ? (
                <pre className="mt-3 max-h-40 overflow-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(log.metadata, null, 2)}</pre>
              ) : null}
            </article>
          ))}
          {logs.length === 0 && <p className="text-sm font-semibold text-slate-500">Belum ada audit log sesuai filter.</p>}
        </div>
      </DataCard>
    </div>
  );
}
