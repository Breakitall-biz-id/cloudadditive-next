"use client";

import dynamic from "next/dynamic";
import { AdminTableFrame } from "@/components/admin/AdminControls";
import { StatusPill } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SimulationBatchResult } from "@/lib/printer-matching/simulation";

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
              {data.algorithm === "NSGA2" ? "NSGA-II batch optimizer" : "Weighted score sequential ranking"}
            </p>
          </div>
          {data.nsga2 ? (
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-md bg-[#e6f4f0] px-3 py-2 text-[#087164]">Pareto front: {data.nsga2.paretoFrontSize}</span>
              <span className="rounded-md bg-[#f2f4f1] px-3 py-2">Population: {data.nsga2.populationSize}</span>
              <span className="rounded-md bg-[#f2f4f1] px-3 py-2">Generations: {data.nsga2.generations}</span>
              <span className="rounded-md bg-[#f2f4f1] px-3 py-2">Policy: {data.nsga2.decisionPolicy}</span>
            </div>
          ) : (
            <span className="rounded-md bg-[#f2f4f1] px-3 py-2 text-xs font-semibold text-slate-600">Uses saved weights directly</span>
          )}
        </div>
        {data.nsga2 && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Selected objectives: {data.nsga2.objectiveNames.map((name, index) => `${name} ${data.nsga2?.selectedObjectives[index] ?? 0}`).join(" / ")}
          </p>
        )}
      </section>

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
                <TableCell className="px-4 py-4"><p className="font-mono font-semibold">{result.selected.score.toFixed(1)}</p><p className="mt-1 text-xs text-slate-500">D {result.selected.breakdown.distanceScore.toFixed(0)} / T {result.selected.breakdown.queueDurationScore.toFixed(0)} / Q {result.selected.breakdown.queueCountScore.toFixed(0)} / M {result.selected.breakdown.loadedMaterialScore.toFixed(0)}</p></TableCell>
                <TableCell className="px-4 py-4 font-mono">{result.selected.breakdown.distanceKm.toFixed(1)} km</TableCell>
                <TableCell className="px-4 py-4">{result.queueBeforeMinutes} min / {result.queueBeforeJobs} jobs</TableCell>
                <TableCell className="px-4 py-4">{result.queueAfterMinutes} min / {result.queueAfterJobs} jobs</TableCell>
                <TableCell className="px-4 py-4">Start +{result.expectedStartOffsetMinutes} min<br />Finish +{result.expectedFinishOffsetMinutes} min</TableCell>
                <TableCell className="px-4 py-4 text-xs text-slate-600">{result.alternatives.length ? result.alternatives.map((item) => `${item.printerName} (${item.score.toFixed(1)})`).join(", ") : "No alternative"}</TableCell>
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
