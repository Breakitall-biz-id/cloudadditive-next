import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { formatAdminCurrency } from "@/lib/admin-metrics";
import { setMaterialActive, setPrintQualityActive, updateSystemSettings } from "@/actions/admin";

export default async function AdminSettingsPage() {
  const [settings, materials, qualities, activeMaterials, activeQualities] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: "default" } }),
    prisma.material.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { colors: true, printers: { select: { printerId: true } }, orders: { select: { id: true } } } }),
    prisma.printQuality.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }], include: { orders: { select: { id: true } } } }),
    prisma.material.count({ where: { isActive: true } }),
    prisma.printQuality.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Catalog & Settings" description="Master data material, warna, kualitas print, dan konfigurasi pricing global. Semua perubahan wajib memakai audit reason." />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Materials" value={activeMaterials.toLocaleString("id-ID")} />
        <StatCard label="Active Qualities" value={activeQualities.toLocaleString("id-ID")} />
        <StatCard label="Platform Fee" value={`${Math.round((settings?.platformFeePercentage ?? 0) * 100)}%`} />
        <StatCard label="Machine Rate" value={formatAdminCurrency(settings?.machineRatePerHour ?? 0)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DataCard title="System Pricing Settings">
          {settings ? (
            <form action={updateSystemSettings} className="grid gap-4 sm:grid-cols-2">
              <label className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Markup Provider (%)</span><input name="markupPercentage" defaultValue={Math.round(settings.markupPercentage * 100)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-black" /></label>
              <label className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Platform Fee (%)</span><input name="platformFeePercentage" defaultValue={Math.round(settings.platformFeePercentage * 100)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-black" /></label>
              <label className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Machine Rate/Hour</span><input name="machineRatePerHour" defaultValue={settings.machineRatePerHour} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-black" /></label>
              <label className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Default Infill (%)</span><input name="defaultInfillPercentage" defaultValue={Math.round(settings.defaultInfillPercentage * 100)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-black" /></label>
              <label className="rounded-2xl bg-slate-50 p-4 sm:col-span-2"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Estimated Print Speed mm³/hour</span><input name="estimatedPrintSpeed" defaultValue={settings.estimatedPrintSpeed} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-black" /></label>
              <label className="sm:col-span-2"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Audit Reason</span><input name="reason" required minLength={5} placeholder="Alasan update setting pricing" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal-600" /></label>
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white sm:col-span-2">Save Settings</button>
            </form>
          ) : (
            <p className="text-sm font-semibold text-rose-600">SystemSettings default belum ada di database. Jalankan seed atau buat row id=default.</p>
          )}
        </DataCard>

        <DataCard title="Print Qualities">
          <div className="space-y-3">
            {qualities.map((quality) => (
              <div key={quality.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black text-slate-950">{quality.name}</p><p className="text-sm text-slate-500">{quality.description ?? "No description"}</p></div>
                  <StatusPill className={quality.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>{quality.isActive ? "Active" : "Inactive"}</StatusPill>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">Layer {quality.layerHeight}mm • Speed ×{quality.speedMultiplier} • Price ×{quality.priceMultiplier} • {quality.orders.length} orders</p>
                <form action={setPrintQualityActive} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="qualityId" value={quality.id} />
                  <input type="hidden" name="isActive" value={quality.isActive ? "false" : "true"} />
                  <input name="reason" required minLength={5} placeholder="Audit reason" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600" />
                  <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">{quality.isActive ? "Deactivate" : "Activate"}</button>
                </form>
              </div>
            ))}
            {qualities.length === 0 && <p className="text-sm font-semibold text-slate-500">Belum ada print quality.</p>}
          </div>
        </DataCard>
      </section>

      <DataCard title="Materials Catalog">
        <div className="grid gap-4 xl:grid-cols-2">
          {materials.map((material) => (
            <article key={material.id} className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-lg font-black text-slate-950">{material.name}</p><p className="text-sm text-slate-500">{material.type} • {formatAdminCurrency(material.pricePerGram)}/gram</p></div>
                <StatusPill className={material.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>{material.isActive ? "Active" : "Inactive"}</StatusPill>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {material.colors.map((color) => <span key={color.id} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{color.name}</span>)}
                {material.colors.length === 0 && <span className="text-xs font-semibold text-slate-400">No colors</span>}
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-500">Density {material.density} • Diameter {material.diameter} • {material.printers.length} printers • {material.orders.length} orders</p>
              <form action={setMaterialActive} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="materialId" value={material.id} />
                <input type="hidden" name="isActive" value={material.isActive ? "false" : "true"} />
                <input name="reason" required minLength={5} placeholder="Audit reason" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-600" />
                <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">{material.isActive ? "Deactivate" : "Activate"}</button>
              </form>
            </article>
          ))}
          {materials.length === 0 && <p className="text-sm font-semibold text-slate-500">Belum ada material.</p>}
        </div>
      </DataCard>
    </div>
  );
}
