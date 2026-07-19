"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";
import { FlaskConical, Play } from "lucide-react";
import { runMatchingSimulation } from "@/actions/printer-matching-admin";
import { AdminButton } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { parseGcodeFile } from "@/lib/gcode-parser";
import { analyzeStlBuffer, hashBuffer } from "@/lib/stl-analysis";
import type { SimulationBatchResult } from "@/lib/printer-matching/simulation";
import { ScenarioEditor } from "./ScenarioEditor";
import { SimulationResults } from "./SimulationResults";
import type { MatchingLabRow, MatchingOption } from "./types";

type Props = {
  materials: MatchingOption[];
  qualities: MatchingOption[];
};

function initialRow(materials: MatchingOption[], qualities: MatchingOption[]): MatchingLabRow {
  return {
    id: "scenario-1",
    label: "Yogyakarta sample order",
    materialId: materials[0]?.id ?? "",
    qualityId: qualities[0]?.id ?? "",
    quantity: 1,
    latitude: -7.7956,
    longitude: 110.3695,
    address: "Yogyakarta",
    width: 20,
    depth: 20,
    height: 20,
    estimatedMinutes: 60,
    fileName: "",
    qualityMode: "sliced",
  };
}

function canInitializeGoogleMaps() {
  if (typeof window === "undefined") return false;
  return Boolean(window.google?.maps?.importLibrary) || typeof window.google?.maps?.Map === "function";
}

export function MatchingLabClient({ materials, qualities }: Props) {
  const [rows, setRows] = useState<MatchingLabRow[]>(() => [initialRow(materials, qualities)]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileMode, setFileMode] = useState<"shared" | "per-row">("shared");
  const [sharedFileName, setSharedFileName] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<SimulationBatchResult | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(canInitializeGoogleMaps);
  const [isPending, startTransition] = useTransition();
  const analysisCache = useRef(new Map<string, { dimensions?: { width: number; height: number; depth: number }; estimatedMinutes: number; qualityMode: "sliced" | "informational"; detectedMaterialId?: string }>());

  useEffect(() => {
    if (mapsLoaded) return;
    const timer = window.setInterval(() => {
      if (canInitializeGoogleMaps()) {
        setMapsLoaded(true);
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [mapsLoaded]);

  function assignedFile(row: MatchingLabRow) {
    const name = fileMode === "shared" ? sharedFileName : row.fileName;
    return files.find((file) => file.name === name);
  }

  async function analyze(row: MatchingLabRow): Promise<MatchingLabRow> {
    const file = assignedFile(row);
    if (!file) throw new Error(`${row.label}: assigned file is missing`);
    const buffer = await file.arrayBuffer();
    const hash = await hashBuffer(buffer);
    const isGcode = file.name.toLowerCase().endsWith(".gcode");
    const cacheKey = `${hash}:${isGcode ? "gcode" : `${row.materialId}:${row.qualityId}`}`;
    const cached = analysisCache.current.get(cacheKey);
    if (cached) {
      return {
        ...row,
        ...cached.dimensions,
        estimatedMinutes: cached.estimatedMinutes,
        qualityMode: cached.qualityMode,
        materialId: cached.detectedMaterialId ?? row.materialId,
        fileName: file.name,
      };
    }

    if (isGcode) {
      const stats = await parseGcodeFile(file, row.materialId);
      if (stats.printTimeMinutes <= 0) {
        throw new Error(`${row.label}: G-code has no readable print duration`);
      }
      const detectedMaterialId = stats.material && materials.some((item) => item.id === stats.material)
        ? stats.material
        : undefined;
      const analysis = { estimatedMinutes: stats.printTimeMinutes, qualityMode: "informational" as const, detectedMaterialId };
      analysisCache.current.set(cacheKey, analysis);
      return { ...row, ...analysis, materialId: detectedMaterialId ?? row.materialId, fileName: file.name };
    }

    if (!file.name.toLowerCase().endsWith(".stl")) {
      throw new Error(`${row.label}: only STL and G-code files are supported`);
    }
    const dimensions = analyzeStlBuffer(buffer);
    const formData = new FormData();
    formData.append("stl", file);
    formData.append("material", row.materialId);
    formData.append("quality", row.qualityId);
    formData.append("infill", "0.20");
    const response = await fetch("/api/admin/printer-matching/slice", { method: "POST", body: formData });
    const payload = await response.json();
    const estimatedMinutes = Number(payload?.result?.printTimeMinutes ?? payload?.printTimeMinutes);
    if (!response.ok || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
      throw new Error(payload?.error || `${row.label}: slicer did not return print duration`);
    }
    const analysis = { dimensions, estimatedMinutes: Math.ceil(estimatedMinutes), qualityMode: "sliced" as const };
    analysisCache.current.set(cacheKey, analysis);
    return { ...row, ...dimensions, estimatedMinutes: analysis.estimatedMinutes, qualityMode: analysis.qualityMode, fileName: file.name };
  }

  async function analyzeSingle(row: MatchingLabRow) {
    setAnalyzingId(row.id);
    setErrors([]);
    try {
      const analyzed = await analyze(row);
      setRows((current) => current.map((item) => item.id === row.id ? analyzed : item));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "File analysis failed"]);
    } finally {
      setAnalyzingId(null);
    }
  }

  function run() {
    setErrors([]);
    setResults(null);
    startTransition(async () => {
      try {
        const analyzedRows: MatchingLabRow[] = [];
        for (const row of rows) {
          setAnalyzingId(row.id);
          analyzedRows.push(await analyze(row));
        }
        setAnalyzingId(null);
        setRows(analyzedRows);
        const response = await runMatchingSimulation(analyzedRows.map((row) => ({
          id: row.id,
          label: row.label,
          materialId: row.materialId,
          modelWidth: row.width,
          modelHeight: row.height,
          modelDepth: row.depth,
          shippingLat: row.latitude,
          shippingLng: row.longitude,
          estimatedPrintTime: row.estimatedMinutes,
          quantity: row.quantity,
        })));
        if (!response.success) throw new Error(response.error);
        setResults(response.data);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : "Simulation failed"]);
        setAnalyzingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <Script
          id="matching-lab-google-maps"
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          onReady={() => {
            if (canInitializeGoogleMaps()) setMapsLoaded(true);
          }}
          strategy="lazyOnload"
        />
      ) : null}

      <ScenarioEditor rows={rows} materials={materials} qualities={qualities} files={files} fileMode={fileMode} sharedFileName={sharedFileName} analyzingId={analyzingId} errors={errors} mapsLoaded={mapsLoaded} onRowsChange={setRows} onFilesChange={(nextFiles) => { setFiles(nextFiles); setSharedFileName(nextFiles[0]?.name ?? ""); setResults(null); }} onFileModeChange={setFileMode} onSharedFileNameChange={setSharedFileName} onAnalyze={(row) => void analyzeSingle(row)} />

      <Card className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#cfe1db] bg-[#e2f1ec] text-[#075e57]"><FlaskConical className="h-4 w-4" /></span>
            <div><p className="font-semibold text-[#25302c]">Dry run only</p><p className="mt-1 text-xs leading-5 text-[#6f7b75]">Uses the live fleet snapshot and saved rules. It creates no orders, payments, assignments, or audit rows.</p></div>
          </div>
          <AdminButton type="button" onClick={run} disabled={isPending || rows.length === 0 || files.length === 0} className="shrink-0 bg-[#111c18] text-white hover:bg-[#25302c] disabled:bg-[#c7cfca] disabled:text-[#6f7b75] disabled:opacity-100"><Play className="h-4 w-4 fill-current" />{isPending ? `Running ${analyzingId ? "analysis" : "simulation"}` : `Run ${rows.length} scenarios`}</AdminButton>
        </CardContent>
      </Card>

      {results && <SimulationResults data={results} />}
    </div>
  );
}
