import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminButton, AdminFilterForm, AdminSearchInput, AdminSelect } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { formatAdminDateTime, getStatusTone, humanizeEnum } from "@/lib/admin-metrics";
import type { Prisma } from "@prisma/client";

type PageProps = { searchParams: Promise<{ query?: string; action?: string }> };
const actionOptions = [
  { value: "ALL", label: "All actions" },
  { value: "PROVIDER_VERIFIED", label: "Provider Verified" },
  { value: "PROVIDER_UNVERIFIED", label: "Provider Unverified" },
  { value: "USER_ROLE_CHANGED", label: "User Role Changed" },
  { value: "ORDER_STATUS_CHANGED", label: "Order Status Changed" },
  { value: "ORDER_ASSIGNMENT_CHANGED", label: "Order Assignment Changed" },
  { value: "PAYMENT_STATUS_CHANGED", label: "Payment Status Changed" },
  { value: "PRINTER_UPDATED", label: "Printer Updated" },
  { value: "MATERIAL_UPDATED", label: "Material Updated" },
  { value: "PRINT_QUALITY_UPDATED", label: "Print Quality Updated" },
  { value: "SYSTEM_SETTINGS_UPDATED", label: "System Settings Updated" },
];

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
        <AdminFilterForm className="md:grid-cols-[1fr_280px_auto]">
          <AdminSearchInput name="query" defaultValue={query} placeholder="Cari actor, entity, reason..." />
          <AdminSelect name="action" defaultValue={action} options={actionOptions} />
          <AdminButton>Filter</AdminButton>
        </AdminFilterForm>

        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill className={getStatusTone(log.action)}>{humanizeEnum(log.action)}</StatusPill>
                      <p className="text-sm font-semibold text-slate-950">{log.entityType}</p>
                      <p className="text-xs font-semibold text-slate-500">{log.entityId}</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{log.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">By {log.actor?.name ?? "Deleted admin"} • {log.actor?.email ?? "-"}</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{formatAdminDateTime(log.createdAt)}</p>
                </div>
                {log.metadata ? (
                  <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(log.metadata, null, 2)}</pre>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {logs.length === 0 && <p className="text-sm font-semibold text-slate-500">Belum ada audit log sesuai filter.</p>}
        </div>
      </DataCard>
    </div>
  );
}
