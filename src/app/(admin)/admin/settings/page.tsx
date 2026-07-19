import { prisma } from "@/lib/prisma";
import { AdminPageHeader, DataCard, StatCard, StatusPill } from "@/components/admin/AdminShell";
import { AdminButton, AdminField, AdminInput } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { formatAdminCurrency } from "@/lib/admin-metrics";
import {
  setMaterialActive,
  setPrintQualityActive,
  updateSystemSettings,
  upsertMaterialCatalogItem,
  upsertPrintQualityCatalogItem,
} from "@/actions/admin";

type MaterialRecord = Awaited<ReturnType<typeof getSettingsData>>["materials"][number];
type QualityRecord = Awaited<ReturnType<typeof getSettingsData>>["qualities"][number];

async function getSettingsData() {
  const [settings, materials, qualities, activeMaterials, activeQualities] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: "default" } }),
    prisma.material.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        colors: { orderBy: { name: "asc" } },
        printers: { select: { printerId: true } },
        orders: { select: { id: true } },
      },
    }),
    prisma.printQuality.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { orders: { select: { id: true } } },
    }),
    prisma.material.count({ where: { isActive: true } }),
    prisma.printQuality.count({ where: { isActive: true } }),
  ]);

  return { settings, materials, qualities, activeMaterials, activeQualities };
}

function NativeSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: "true" | "false";
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-9 rounded-md border border-[var(--admin-line)] bg-white px-3 text-sm font-medium text-[#17201d] shadow-[var(--admin-shadow-control)] outline-none transition-colors focus:border-[#d8dbe1] focus:ring-2 focus:ring-[#11111a]/5"
    >
      <option value="true">Active</option>
      <option value="false">Inactive</option>
    </select>
  );
}

function AdminTextarea({
  name,
  defaultValue,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`min-h-24 rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 text-sm font-medium text-[#17201d] shadow-[var(--admin-shadow-control)] outline-none placeholder:text-[#9aa39f] transition-colors focus:border-[#d8dbe1] focus:ring-2 focus:ring-[#11111a]/5 ${className ?? ""}`}
    />
  );
}

function MaterialFields({ material }: { material?: MaterialRecord }) {
  const colors = material?.colors.map((color) => `${color.name}:${color.hexCode}`).join("\n") ?? "";

  return (
    <div className="grid gap-3 md:grid-cols-12">
      {material && <input type="hidden" name="materialId" value={material.id} />}
      <AdminField label="Name" className="md:col-span-3">
        <AdminInput name="name" defaultValue={material?.name ?? ""} placeholder="PLA" required />
      </AdminField>
      <AdminField label="Type" className="md:col-span-3">
        <AdminInput name="type" defaultValue={material?.type ?? "Filament"} placeholder="Filament" required />
      </AdminField>
      <AdminField label="Price / gram" className="md:col-span-3">
        <AdminInput name="pricePerGram" type="number" step="0.01" defaultValue={material ? Number(material.pricePerGram) : ""} placeholder="250" required />
      </AdminField>
      <AdminField label="Status" className="md:col-span-3">
        <NativeSelect name="isActive" defaultValue={material?.isActive === false ? "false" : "true"} />
      </AdminField>
      <AdminField label="Density" className="md:col-span-3">
        <AdminInput name="density" type="number" step="0.01" defaultValue={material?.density ?? ""} placeholder="1.24" required />
      </AdminField>
      <AdminField label="Diameter" className="md:col-span-3">
        <AdminInput name="diameter" type="number" step="0.01" defaultValue={material?.diameter ?? 1.75} placeholder="1.75" required />
      </AdminField>
      <AdminField label="Nozzle temp" className="md:col-span-3">
        <AdminInput name="nozzleTemp" type="number" defaultValue={material?.nozzleTemp ?? ""} placeholder="200" />
      </AdminField>
      <AdminField label="Bed temp" className="md:col-span-3">
        <AdminInput name="bedTemp" type="number" defaultValue={material?.bedTemp ?? ""} placeholder="60" />
      </AdminField>
      <AdminField label="Description" className="md:col-span-6">
        <AdminInput name="description" defaultValue={material?.description ?? ""} placeholder="Short material note" />
      </AdminField>
      <AdminField label="Colors" className="md:col-span-6">
        <AdminTextarea name="colors" defaultValue={colors} placeholder={"White:#ffffff\nBlack:#000000"} />
      </AdminField>
      <AdminField label="Reason optional" className="md:col-span-12">
        <AdminInput name="reason" minLength={5} placeholder="Why this catalog change is being made" />
      </AdminField>
    </div>
  );
}

function QualityFields({ quality }: { quality?: QualityRecord }) {
  return (
    <div className="grid gap-3 md:grid-cols-12">
      {quality && <input type="hidden" name="qualityId" value={quality.id} />}
      <AdminField label="Name" className="md:col-span-4">
        <AdminInput name="name" defaultValue={quality?.name ?? ""} placeholder="Normal" required />
      </AdminField>
      <AdminField label="Layer height" className="md:col-span-2">
        <AdminInput name="layerHeight" type="number" step="0.01" defaultValue={quality?.layerHeight ?? ""} placeholder="0.2" required />
      </AdminField>
      <AdminField label="Speed x" className="md:col-span-2">
        <AdminInput name="speedMultiplier" type="number" step="0.01" defaultValue={quality?.speedMultiplier ?? ""} placeholder="1" required />
      </AdminField>
      <AdminField label="Price x" className="md:col-span-2">
        <AdminInput name="priceMultiplier" type="number" step="0.01" defaultValue={quality?.priceMultiplier ?? ""} placeholder="1" required />
      </AdminField>
      <AdminField label="Sort" className="md:col-span-2">
        <AdminInput name="sortOrder" type="number" defaultValue={quality?.sortOrder ?? ""} placeholder="2" required />
      </AdminField>
      <AdminField label="Description" className="md:col-span-6">
        <AdminInput name="description" defaultValue={quality?.description ?? ""} placeholder="Balanced speed and surface quality" />
      </AdminField>
      <AdminField label="Status" className="md:col-span-3">
        <NativeSelect name="isActive" defaultValue={quality?.isActive === false ? "false" : "true"} />
      </AdminField>
      <AdminField label="Reason optional" className="md:col-span-3">
        <AdminInput name="reason" minLength={5} placeholder="Audit note" />
      </AdminField>
    </div>
  );
}

function MaterialRow({ material }: { material: MaterialRecord }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] transition-colors hover:border-[#d8dbe1]">
      <CardContent className="p-0">
        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-[#17201d]">{material.name}</p>
              <StatusPill className={material.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>
                {material.isActive ? "Active" : "Inactive"}
              </StatusPill>
            </div>
            <p className="mt-1 text-sm font-medium text-[#6f7c76]">
              {material.type} · {formatAdminCurrency(material.pricePerGram)}/gram
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-[#6f7c76]">
            <span>Density {material.density}</span>
            <span>Diameter {material.diameter}</span>
            <span>{material.orders.length} orders</span>
          </div>
          <form action={setMaterialActive} className="grid gap-2 sm:grid-cols-[minmax(140px,1fr)_auto]">
            <input type="hidden" name="materialId" value={material.id} />
            <input type="hidden" name="isActive" value={material.isActive ? "false" : "true"} />
            <AdminInput name="reason" minLength={5} placeholder="Reason optional" className="h-8 text-xs" />
            <AdminButton className="h-8 bg-[#17201d] text-xs text-white hover:bg-[#075e57]">
              {material.isActive ? "Deactivate" : "Activate"}
            </AdminButton>
          </form>
        </div>
        <details className="group border-t border-[var(--admin-line-soft)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#53615b] transition-colors hover:bg-[#f4f7f4]">
            Edit material details
            <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
          </summary>
          <form action={upsertMaterialCatalogItem} className="border-t border-[var(--admin-line-soft)] bg-[#f8f9fb] p-3">
            <MaterialFields material={material} />
            <div className="mt-4 flex justify-end">
              <AdminButton className="bg-[#17201d] text-white hover:bg-[#075e57]">Save Material</AdminButton>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}

function QualityRow({ quality }: { quality: QualityRecord }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)] transition-colors hover:border-[#d8dbe1]">
      <CardContent className="p-0">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-[#17201d]">{quality.name}</p>
              <StatusPill className={quality.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>
                {quality.isActive ? "Active" : "Inactive"}
              </StatusPill>
            </div>
            <p className="mt-1 text-sm font-medium text-[#6f7c76]">{quality.description ?? "No description"}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-[#6f7c76]">
            <span>Layer {quality.layerHeight}</span>
            <span>Speed x{quality.speedMultiplier}</span>
            <span>Price x{quality.priceMultiplier}</span>
            <span>{quality.orders.length} orders</span>
          </div>
          <form action={setPrintQualityActive} className="grid gap-2 sm:grid-cols-[minmax(140px,1fr)_auto]">
            <input type="hidden" name="qualityId" value={quality.id} />
            <input type="hidden" name="isActive" value={quality.isActive ? "false" : "true"} />
            <AdminInput name="reason" minLength={5} placeholder="Reason optional" className="h-8 text-xs" />
            <AdminButton className="h-8 bg-[#17201d] text-xs text-white hover:bg-[#075e57]">
              {quality.isActive ? "Deactivate" : "Activate"}
            </AdminButton>
          </form>
        </div>
        <details className="group border-t border-[var(--admin-line-soft)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#53615b] transition-colors hover:bg-[#f4f7f4]">
            Edit quality details
            <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
          </summary>
          <form action={upsertPrintQualityCatalogItem} className="border-t border-[var(--admin-line-soft)] bg-[#f8f9fb] p-3">
            <QualityFields quality={quality} />
            <div className="mt-4 flex justify-end">
              <AdminButton className="bg-[#17201d] text-white hover:bg-[#075e57]">Save Quality</AdminButton>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}

export default async function AdminSettingsPage() {
  const { settings, materials, qualities, activeMaterials, activeQualities } = await getSettingsData();

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Catalog & Settings"
        description="Master data untuk material, warna, kualitas print, dan pricing global. Data aktif di sini dipakai oleh customer order flow dan provider capability."
      />

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Active Materials" value={activeMaterials.toLocaleString("id-ID")} />
        <StatCard label="Active Qualities" value={activeQualities.toLocaleString("id-ID")} />
        <StatCard label="Platform Fee" value={`${Math.round((settings?.platformFeePercentage ?? 0) * 100)}%`} />
        <StatCard label="Machine Rate" value={formatAdminCurrency(settings?.machineRatePerHour ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <DataCard title="System Pricing">
          {settings ? (
            <form action={updateSystemSettings} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <AdminField label="Markup Provider (%)">
                  <AdminInput name="markupPercentage" defaultValue={Math.round(settings.markupPercentage * 100)} className="text-base font-semibold" />
                </AdminField>
                <AdminField label="Platform Fee (%)">
                  <AdminInput name="platformFeePercentage" defaultValue={Math.round(settings.platformFeePercentage * 100)} className="text-base font-semibold" />
                </AdminField>
                <AdminField label="Machine Rate / Hour">
                  <AdminInput name="machineRatePerHour" defaultValue={settings.machineRatePerHour} className="text-base font-semibold" />
                </AdminField>
                <AdminField label="Default Infill (%)">
                  <AdminInput name="defaultInfillPercentage" defaultValue={Math.round(settings.defaultInfillPercentage * 100)} className="text-base font-semibold" />
                </AdminField>
                <AdminField label="Estimated Print Speed mm3/hour">
                  <AdminInput name="estimatedPrintSpeed" defaultValue={settings.estimatedPrintSpeed} className="text-base font-semibold" />
                </AdminField>
                <AdminField label="Reason optional">
                  <AdminInput name="reason" minLength={5} placeholder="Audit note" />
                </AdminField>
              </div>
              <AdminButton className="w-full bg-[#17201d] text-white hover:bg-[#075e57]">Save Pricing Settings</AdminButton>
            </form>
          ) : (
            <p className="text-sm font-semibold text-rose-600">SystemSettings default belum ada di database. Jalankan seed atau buat row id=default.</p>
          )}
        </DataCard>

        <DataCard title="Create Catalog Item">
          <div className="grid gap-4 2xl:grid-cols-2">
            <details className="group rounded-[0.75rem] border border-[var(--admin-line)] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#17201d]">
                New Material
                <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <form action={upsertMaterialCatalogItem} className="border-t border-[var(--admin-line-soft)] p-4">
                <MaterialFields />
                <div className="mt-4 flex justify-end">
                  <AdminButton className="bg-[#17201d] text-white hover:bg-[#075e57]">Create Material</AdminButton>
                </div>
              </form>
            </details>

            <details className="group rounded-[0.75rem] border border-[var(--admin-line)] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#17201d]">
                New Print Quality
                <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <form action={upsertPrintQualityCatalogItem} className="border-t border-[var(--admin-line-soft)] p-4">
                <QualityFields />
                <div className="mt-4 flex justify-end">
                  <AdminButton className="bg-[#17201d] text-white hover:bg-[#075e57]">Create Quality</AdminButton>
                </div>
              </form>
            </details>
          </div>
        </DataCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DataCard title="Materials Catalog">
          <div className="space-y-3">
            {materials.map((material) => <MaterialRow key={material.id} material={material} />)}
            {materials.length === 0 && (
              <p className="rounded-[0.75rem] border border-dashed border-[#cbd6cf] bg-white p-4 text-sm font-semibold text-[#6f7c76]">Belum ada material.</p>
            )}
          </div>
        </DataCard>

        <DataCard title="Print Qualities">
          <div className="space-y-3">
            {qualities.map((quality) => <QualityRow key={quality.id} quality={quality} />)}
            {qualities.length === 0 && (
              <p className="rounded-[0.75rem] border border-dashed border-[#cbd6cf] bg-white p-4 text-sm font-semibold text-[#6f7c76]">Belum ada print quality.</p>
            )}
          </div>
        </DataCard>
      </section>
    </div>
  );
}
