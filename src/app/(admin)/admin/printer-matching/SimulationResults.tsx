"use client";

import dynamic from "next/dynamic";
import { AdminTableFrame } from "@/components/admin/AdminControls";
import { StatusPill } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SimulationBatchResult } from "@/lib/printer-matching/simulation";
import { LAB_ALGORITHMS } from "@/lib/printer-matching/lab-config";
import { Button } from "@/components/ui/button";

const MatchingDistributionMap = dynamic(
  () => import("./MatchingDistributionMap").then((module) => module.MatchingDistributionMap),
  { ssr: false }
);

export function SimulationResults({ data }: { data: SimulationBatchResult }) {
  const printersUsed = Object.keys(data.distribution).length;
  const providersUsed = new Set(data.results.filter((result) => result.success).map((result) => result.success ? result.selected.providerId : "")).size;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Matched" value={data.matched} tone="text-emerald-700" />
        <Metric label="Rejected" value={data.rejected} tone="text-rose-700" />
        <Metric label="Fleet used" value={`${printersUsed} printers / ${providersUsed} providers`} tone="text-slate-950" />
        <Metric label="Projected makespan" value={`${data.projectedMakespanMinutes} min`} tone="text-teal-800" />
      </section>

      <section className="rounded-[0.75rem] border border-[var(--admin-line)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Algorithm</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {LAB_ALGORITHMS.find((item) => item.value === data.algorithm)?.label ?? (data.algorithm === "NSGA2" ? "NSGA-II (legacy)" : "Weighted score sequential ranking")}
            </p>
          </div>
          {data.nsga2 ? (
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-md bg-[#e6f4f0] px-3 py-2 text-[#087164]">Pareto front: {data.nsga2.paretoFrontSize}</span>
              <span className="rounded-md bg-[#f2f4f1] px-3 py-2">Population: {data.nsga2.populationSize}</span>
              <span className="rounded-md bg-[#f2f4f1] px-3 py-2">Generations: {data.nsga2.generations}</span>
              <span className="rounded-md bg-[#f2f4f1] px-3 py-2">Policy: {data.nsga2.decisionPolicy}</span>
            </div>
          ) : !data.research ? (
            <span className="rounded-md bg-[#f2f4f1] px-3 py-2 text-xs font-semibold text-slate-600">Uses saved weights directly</span>
          ) : <span className="rounded-md bg-teal-50 px-3 py-2 text-xs text-teal-800">Simulation only</span>}
        </div>
        {data.nsga2 && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Selected objectives: {data.nsga2.objectiveNames.map((name, index) => `${name} ${data.nsga2?.selectedObjectives[index] ?? 0}`).join(" / ")}
          </p>
        )}
      </section>

      {data.research && <section className="space-y-4 rounded-xl border border-[var(--admin-line)] p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-slate-500">Total distance</p><p className="font-semibold">{data.research.objectives.distanceKm.toFixed(2)} km</p></div>
          <div><p className="text-xs text-slate-500">Load standard deviation</p><p className="font-semibold">{data.research.objectives.loadStdMinutes.toFixed(2)} min</p></div>
          <div><p className="text-xs text-slate-500">Weighted lateness</p><p className="font-semibold">{data.research.objectives.weightedLatenessMinutes.toFixed(2)} min</p></div>
        </div>
        {data.research.ahp && <p className="text-xs leading-5 text-slate-600">
          Pareto solutions: {data.research.paretoFront?.length} · TOPSIS pool: {data.research.ahp.selectionPoolSize} · Score: {data.research.ahp.topsisScore.toFixed(4)} · AHP CR: {data.research.ahp.consistencyRatio.toFixed(4)}<br />
          AHP weights (distance / load / lateness): {data.research.ahp.weights.map((w) => `${(w * 100).toFixed(2)}%`).join(" / ")}
        </p>}
        <Button type="button" variant="outline" size="sm" onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url; link.download = `matching-lab-${data.algorithm}.json`; link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Export run JSON</Button>
        {!!data.research.paretoFront?.length && <details>
          <summary className="cursor-pointer text-sm font-medium">Pareto front and convergence</summary>
          <div className="mt-3 max-h-80 overflow-auto">
            <Table><TableHeader><TableRow><TableHead>Violations</TableHead><TableHead>Distance (km)</TableHead><TableHead>Load SD (min)</TableHead><TableHead>Weighted lateness</TableHead></TableRow></TableHeader>
              <TableBody>{data.research.paretoFront.map((s, i) => <TableRow key={i}><TableCell>{s.violations}</TableCell><TableCell>{s.distanceKm.toFixed(2)}</TableCell><TableCell>{s.loadStdMinutes.toFixed(2)}</TableCell><TableCell>{s.weightedLatenessMinutes.toFixed(2)}</TableCell></TableRow>)}</TableBody>
            </Table>
            <p className="mt-3 text-xs text-slate-500">Convergence history ({data.research.convergence?.length ?? 0} iterations) is included in the JSON export.</p>
          </div>
        </details>}
      </section>}

      <AdminTableFrame>
        <Table className="min-w-[1180px]">
          <TableHeader className="bg-slate-950 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
            <TableRow><TableHead className="px-4 py-3 text-slate-300">Scenario</TableHead><TableHead className="px-4 py-3 text-slate-300">Result</TableHead><TableHead className="px-4 py-3 text-slate-300">Provider / printer</TableHead><TableHead className="px-4 py-3 text-slate-300">Score</TableHead><TableHead className="px-4 py-3 text-slate-300">Distance</TableHead><TableHead className="px-4 py-3 text-slate-300">Queue before</TableHead><TableHead className="px-4 py-3 text-slate-300">Queue after</TableHead><TableHead className="px-4 py-3 text-slate-300">Timing offsets</TableHead><TableHead className="px-4 py-3 text-slate-300">Alternatives / reasons</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.results.map((result) => result.success ? (
              <TableRow key={result.scenarioId} className="align-top">
                <TableCell className="px-4 py-4 font-semibold text-slate-950">{result.label}</TableCell>
                <TableCell className="px-4 py-4"><StatusPill className="border-emerald-200 bg-emerald-50 text-emerald-700">Matched</StatusPill></TableCell>
                <TableCell className="px-4 py-4"><p className="font-semibold">{result.selected.providerName}</p><p className="text-xs text-slate-500">{result.selected.printerName}</p></TableCell>
                <TableCell className="px-4 py-4">{data.research ? <span className="text-xs text-slate-500">Not score-based</span> : <><p className="font-mono font-semibold">{result.selected.score.toFixed(1)}</p><p className="mt-1 text-xs text-slate-500">D {result.selected.breakdown.distanceScore.toFixed(0)} / T {result.selected.breakdown.queueDurationScore.toFixed(0)} / Q {result.selected.breakdown.queueCountScore.toFixed(0)} / M {result.selected.breakdown.loadedMaterialScore.toFixed(0)}</p></>}</TableCell>
                <TableCell className="px-4 py-4 font-mono">{result.selected.breakdown.distanceKm.toFixed(1)} km</TableCell>
                <TableCell className="px-4 py-4">{result.queueBeforeMinutes} min / {result.queueBeforeJobs} jobs</TableCell>
                <TableCell className="px-4 py-4">{result.queueAfterMinutes} min / {result.queueAfterJobs} jobs</TableCell>
                <TableCell className="px-4 py-4">Start +{result.expectedStartOffsetMinutes} min<br />Finish +{result.expectedFinishOffsetMinutes} min{result.expectedDeliveryOffsetMinutes !== undefined && <><br />Delivery +{result.expectedDeliveryOffsetMinutes.toFixed(1)} min<br />Late {result.tardinessMinutes?.toFixed(1)} min</>}</TableCell>
                <TableCell className="px-4 py-4 text-xs text-slate-600">{result.alternatives.length ? result.alternatives.map((item) => data.research ? item.printerName : `${item.printerName} (${item.score.toFixed(1)})`).join(", ") : "No alternative"}</TableCell>
              </TableRow>
            ) : (
              <TableRow key={result.scenarioId} className="align-top bg-rose-50/40">
                <TableCell className="px-4 py-4 font-semibold text-slate-950">{result.label}</TableCell>
                <TableCell className="px-4 py-4"><StatusPill className="border-rose-200 bg-rose-50 text-rose-700">Rejected</StatusPill></TableCell>
                <TableCell className="px-4 py-4 text-slate-400" colSpan={6}>No eligible printer</TableCell>
                <TableCell className="px-4 py-4 text-xs font-semibold text-rose-700">{Object.entries(result.rejectionSummary).map(([code, count]) => `${code} (${count})`).join(", ") || "No candidates"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableFrame>

      {data.matched > 0 && <MatchingDistributionMap data={data} />}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return <Card className="gap-0 rounded-[0.85rem] border-[var(--admin-line)] bg-white py-0 shadow-[var(--admin-shadow-card)]"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p><p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p></CardContent></Card>;
}
