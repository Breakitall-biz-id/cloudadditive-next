"use client";

import { Copy, FileUp, Plus, Trash2, WandSparkles } from "lucide-react";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { parseMatchingCsv, type MatchingCsvFileMode } from "@/lib/printer-matching/csv";
import { ScenarioLocationPicker } from "./ScenarioLocationPicker";
import type { MatchingLabRow, MatchingOption } from "./types";

type Props = {
  rows: MatchingLabRow[];
  materials: MatchingOption[];
  qualities: MatchingOption[];
  files: File[];
  fileMode: MatchingCsvFileMode;
  sharedFileName: string;
  analyzingId: string | null;
  errors: string[];
  mapsLoaded: boolean;
  onRowsChange(rows: MatchingLabRow[]): void;
  onFilesChange(files: File[]): void;
  onFileModeChange(mode: MatchingCsvFileMode): void;
  onSharedFileNameChange(name: string): void;
  onAnalyze(row: MatchingLabRow): void;
};

export function ScenarioEditor(props: Props) {
  const fileNames = props.files.map((file) => file.name);

  function updateRow(id: string, patch: Partial<MatchingLabRow>) {
    props.onRowsChange(props.rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addRow(source?: MatchingLabRow) {
    const base = source ?? props.rows[props.rows.length - 1];
    props.onRowsChange([...props.rows, {
      id: crypto.randomUUID(),
      label: source ? `${source.label} copy` : `Scenario ${props.rows.length + 1}`,
      materialId: base?.materialId ?? props.materials[0]?.id ?? "",
      qualityId: base?.qualityId ?? props.qualities[0]?.id ?? "",
      quantity: base?.quantity ?? 1,
      latitude: base?.latitude ?? -7.75,
      longitude: base?.longitude ?? 110.4,
      address: base?.address ?? "Sleman, DI Yogyakarta",
      width: base?.width ?? 20,
      depth: base?.depth ?? 20,
      height: base?.height ?? 20,
      estimatedMinutes: base?.estimatedMinutes ?? 60,
      fileName: base?.fileName ?? "",
      qualityMode: base?.qualityMode ?? "sliced",
    }]);
  }

  async function importCsv(file: File) {
    const parsed = parseMatchingCsv(await file.text(), {
      fileMode: props.fileMode,
      sharedFileName: props.sharedFileName,
      uploadedFileNames: fileNames,
    });
    if (parsed.globalErrors.length || parsed.rowErrors.length) {
      props.onRowsChange(props.rows);
      alert([...parsed.globalErrors, ...parsed.rowErrors.map((error) => `Row ${error.rowNumber}: ${error.message}`)].join("\n"));
      return;
    }
    props.onRowsChange(parsed.validRows.map((row) => ({
      id: crypto.randomUUID(),
      label: row.label,
      materialId: row.materialId,
      qualityId: row.qualityId,
      quantity: row.quantity,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      width: row.widthMm,
      depth: row.depthMm,
      height: row.heightMm,
      estimatedMinutes: row.estimatedMinutes,
      fileName: row.fileName,
      qualityMode: row.qualityMode,
    })));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-[0.75rem] border border-[var(--admin-line)] bg-[#f8f9fb] p-3 lg:grid-cols-[minmax(280px,1fr)_minmax(260px,0.8fr)_auto] lg:items-end">
        <AdminField label="Model files">
          <label className="flex h-9 cursor-pointer items-center overflow-hidden rounded-md border border-[var(--admin-line)] bg-white text-sm font-semibold shadow-[var(--admin-shadow-control)] transition-colors hover:border-[#d8dbe1]">
            <span className="flex h-full items-center bg-[#075e57] px-3 text-xs font-semibold text-white">Choose files</span>
            <span className="min-w-0 flex-1 truncate px-3 text-[#66736d]">{fileNames.length > 0 ? fileNames.join(", ") : "No file chosen"}</span>
            <input type="file" multiple accept=".stl,.gcode" className="hidden" onChange={(event) => props.onFilesChange(Array.from(event.target.files ?? []))} />
          </label>
        </AdminField>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#73817a]">File assignment</p>
          <div className="mt-2 inline-flex h-9 rounded-md border border-[var(--admin-line)] bg-white p-1">
            {(["shared", "per-row"] as const).map((mode) => {
              const active = props.fileMode === mode;
              return (
                <AdminButton key={mode} type="button" variant="ghost" onClick={() => props.onFileModeChange(mode)} className={`h-7 rounded-[5px] px-3 text-xs ${active ? "bg-[#e2f1ec] text-[#075e57] hover:bg-[#d8ebe5]" : "text-[#6f7b75] hover:bg-[#edf1ee] hover:text-[#25302c]"}`}>{mode === "shared" ? "One shared file" : "Different per row"}</AdminButton>
              );
            })}
          </div>
        </div>
        <AdminField label="CSV batch">
          <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--admin-line)] bg-white px-3 text-sm font-semibold text-[#25302c] shadow-[var(--admin-shadow-control)] transition-colors hover:border-[#d8dbe1] hover:bg-[#fbfbfc]">
            <FileUp className="h-4 w-4 text-[#075e57]" /> Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} />
          </label>
        </AdminField>
      </div>

      {props.fileMode === "shared" && (
        <AdminField label="Shared file">
          <AdminSelect
            value={props.sharedFileName}
            onValueChange={props.onSharedFileNameChange}
            placeholder="Select uploaded file"
            options={fileNames.map((name) => ({ value: name, label: name }))}
          />
        </AdminField>
      )}

      {props.errors.length > 0 && <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{props.errors.join(" ")}</div>}

      <div className="space-y-4">
        {props.rows.map((row, index) => {
          const effectiveFile = props.fileMode === "shared" ? props.sharedFileName : row.fileName;
          return (
            <Card key={row.id} className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]">
              <CardContent className="p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-800">Scenario {index + 1}</p><p className="mt-1 text-xs font-semibold text-slate-500">{effectiveFile || "No file assigned"}</p></div>
                  <div className="flex gap-2">
                    <AdminButton type="button" onClick={() => props.onAnalyze({ ...row, fileName: effectiveFile })} disabled={!effectiveFile || props.analyzingId === row.id} className="h-8 bg-[#075e57] text-xs text-white hover:bg-[#064f49] disabled:opacity-40"><WandSparkles className="h-4 w-4" />{props.analyzingId === row.id ? "Analyzing" : "Analyze file"}</AdminButton>
                    <AdminButton type="button" variant="outline" size="icon-sm" onClick={() => addRow(row)} aria-label="Duplicate scenario" className="border-[var(--admin-line)] text-slate-600"><Copy className="h-4 w-4" /></AdminButton>
                    <AdminButton type="button" variant="outline" size="icon-sm" onClick={() => props.onRowsChange(props.rows.filter((item) => item.id !== row.id))} disabled={props.rows.length === 1} aria-label="Remove scenario" className="border-[var(--admin-line)] text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></AdminButton>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminField label="Label"><AdminInput value={row.label} onChange={(event) => updateRow(row.id, { label: event.target.value })} /></AdminField>
                  <AdminField label="Material"><AdminSelect value={row.materialId} onValueChange={(value) => updateRow(row.id, { materialId: value })} options={props.materials.map((item) => ({ value: item.id, label: item.name }))} /></AdminField>
                  <AdminField label={row.qualityMode === "informational" ? "Quality (informational for G-code)" : "Quality"}><AdminSelect value={row.qualityId} onValueChange={(value) => updateRow(row.id, { qualityId: value })} options={props.qualities.map((item) => ({ value: item.id, label: item.name }))} /></AdminField>
                  <AdminField label="Quantity"><NumberInput value={row.quantity} onChange={(value) => updateRow(row.id, { quantity: value })} /></AdminField>
                  {props.fileMode === "per-row" && <AdminField label="Assigned file"><AdminSelect value={row.fileName} onValueChange={(value) => updateRow(row.id, { fileName: value, qualityMode: value.toLowerCase().endsWith(".gcode") ? "informational" : "sliced" })} placeholder="Select file" options={fileNames.map((name) => ({ value: name, label: name }))} /></AdminField>}
                  <AdminField label="Estimated minutes"><NumberInput value={row.estimatedMinutes} onChange={(value) => updateRow(row.id, { estimatedMinutes: value })} /></AdminField>
                  <AdminField label="Width mm"><NumberInput value={row.width} onChange={(value) => updateRow(row.id, { width: value })} /></AdminField>
                  <AdminField label="Depth mm"><NumberInput value={row.depth} onChange={(value) => updateRow(row.id, { depth: value })} /></AdminField>
                  <AdminField label="Height mm"><NumberInput value={row.height} onChange={(value) => updateRow(row.id, { height: value })} /></AdminField>
                </div>
                <div className="mt-4 border-t border-[var(--admin-line-soft)] pt-4">
                  <ScenarioLocationPicker
                    mapsLoaded={props.mapsLoaded}
                    value={{ latitude: row.latitude, longitude: row.longitude, address: row.address }}
                    onChange={(location) => updateRow(row.id, {
                      latitude: location.latitude,
                      longitude: location.longitude,
                      address: location.address,
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AdminButton type="button" variant="outline" onClick={() => addRow()} className="border-[var(--admin-line)] bg-white text-[#34413c]"><Plus className="h-4 w-4" /> Add scenario</AdminButton>
    </div>
  );
}

function NumberInput({ value, onChange, step = "1" }: { value: number; onChange(value: number): void; step?: string }) {
  return <AdminInput type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}
