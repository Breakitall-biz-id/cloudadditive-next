"use client";

import { Save } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveMatchingConfig } from "@/actions/printer-matching-admin";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/components/admin/AdminControls";
import type { MatchingAlgorithmMode, Nsga2DecisionPolicy } from "@/lib/printer-matching/config";

type ConfigValues = {
  algorithmMode: MatchingAlgorithmMode;
  distanceWeight: number;
  queueDurationWeight: number;
  queueCountWeight: number;
  loadedMaterialWeight: number;
  heartbeatTimeoutSeconds: number;
  maxDistanceKm: number;
  maxQueueMinutes: number;
  maxQueueJobs: number;
  nsga2PopulationSize: number;
  nsga2Generations: number;
  nsga2MutationRate: number;
  nsga2CrossoverRate: number;
  nsga2Seed: number;
  nsga2DecisionPolicy: Nsga2DecisionPolicy;
};

const weightFields = [
  ["distanceWeight", "Distance", "Closer provider"],
  ["queueDurationWeight", "Queue duration", "Lower wait"],
  ["queueCountWeight", "Queue count", "Fewer jobs"],
  ["loadedMaterialWeight", "Loaded material", "Material-ready"],
] as const;

const limitFields = [
  ["heartbeatTimeoutSeconds", "Heartbeat timeout", "sec"],
  ["maxDistanceKm", "Max distance", "km"],
  ["maxQueueMinutes", "Max queue", "min"],
  ["maxQueueJobs", "Max jobs", "jobs"],
] as const;

const nsga2Fields = [
  ["nsga2PopulationSize", "Population", "4-200", "1", "4", "200"],
  ["nsga2Generations", "Generations", "1-300", "1", "1", "300"],
  ["nsga2MutationRate", "Mutation", "0-1", "0.01", "0", "1"],
  ["nsga2CrossoverRate", "Crossover", "0-1", "0.01", "0", "1"],
  ["nsga2Seed", "Seed", "repeatable", "1", "0", undefined],
] as const;

const algorithmOptions = [
  { value: "WEIGHTED_SCORE", label: "Weighted score" },
  { value: "NSGA2", label: "NSGA-II" },
];

const decisionPolicyOptions = [
  { value: "BALANCED", label: "Balanced" },
  { value: "FASTEST", label: "Fastest makespan" },
  { value: "FAIREST", label: "Fairest distribution" },
  { value: "CLOSEST", label: "Closest distance" },
];

export function MatchingConfigForm({ initial }: { initial: ConfigValues }) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isWeighted = values.algorithmMode === "WEIGHTED_SCORE";
  const isNsga2 = values.algorithmMode === "NSGA2";
  const weightTotal = useMemo(
    () => weightFields.reduce((sum, [key]) => sum + Number(values[key] || 0), 0),
    [values]
  );
  const isWeightReady = Math.abs(weightTotal - 100) < 0.000001;
  const limitsValid = values.heartbeatTimeoutSeconds > 0 && values.maxDistanceKm > 0 && values.maxQueueMinutes > 0 && values.maxQueueJobs > 0;
  const nsga2Valid = values.nsga2PopulationSize >= 4 && values.nsga2PopulationSize <= 200 &&
    values.nsga2Generations > 0 && values.nsga2Generations <= 300 &&
    values.nsga2MutationRate >= 0 && values.nsga2MutationRate <= 1 &&
    values.nsga2CrossoverRate >= 0 && values.nsga2CrossoverRate <= 1 &&
    values.nsga2Seed >= 0;
  const valid = limitsValid && (isWeighted ? isWeightReady : nsga2Valid);

  function updateNumber(key: keyof ConfigValues, value: string) {
    setValues((current) => ({ ...current, [key]: Number(value) }));
    setMessage(null);
  }

  function updateValue<K extends keyof ConfigValues>(key: K, value: ConfigValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function submit() {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, String(value));
    }
    startTransition(async () => {
      const result = await saveMatchingConfig(formData);
      setMessage(result.success ? "Rules saved." : result.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-4">
      <Section eyebrow="Mode" title="Routing algorithm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,360px)_1fr] lg:items-end">
          <AdminField label="Algorithm mode">
            <AdminSelect
              value={values.algorithmMode}
              onValueChange={(value) => updateValue("algorithmMode", value as MatchingAlgorithmMode)}
              options={algorithmOptions}
            />
          </AdminField>
          <p className="pb-2 text-sm leading-5 text-[#737883]">
            {isWeighted
              ? "Sequential scoring for live production routing."
              : "Batch optimizer for scenario simulations and distribution planning."}
          </p>
        </div>
      </Section>

      {isWeighted && (
        <Section eyebrow="Weighted score" title="Scoring weights">
          <div className="grid gap-3 md:grid-cols-4">
            {weightFields.map(([key, label, hint]) => (
              <AdminField key={key} label={`${label} (%)`} className="rounded-[0.75rem] border border-[var(--admin-line-soft)] bg-[#fbfbfc] p-3">
                <AdminInput type="number" min="0" max="100" step="0.1" value={values[key]} onChange={(event) => updateNumber(key, event.target.value)} className="text-base font-semibold tabular-nums" />
                <span className="text-xs normal-case tracking-normal text-[#777d86]">{hint}</span>
              </AdminField>
            ))}
          </div>
          <div className={`mt-3 flex items-center justify-between gap-3 rounded-[0.7rem] border px-3 py-2.5 text-sm ${isWeightReady ? "border-[#bcebd6] bg-[#ecfff5] text-[#087164]" : "border-[#ffd0d0] bg-[#fff3f3] text-[#c72945]"}`}>
            <span className="font-semibold">Total {weightTotal.toFixed(1)}%</span>
            <span className="text-xs font-semibold">{isWeightReady ? "Ready" : "Must be 100%"}</span>
          </div>
        </Section>
      )}

      {isNsga2 && (
        <Section eyebrow="NSGA-II" title="Optimizer settings">
          <div className="grid gap-3 md:grid-cols-3">
            <AdminField label="Decision policy" className="md:col-span-2">
              <AdminSelect
                value={values.nsga2DecisionPolicy}
                onValueChange={(value) => updateValue("nsga2DecisionPolicy", value as Nsga2DecisionPolicy)}
                options={decisionPolicyOptions}
              />
            </AdminField>
            {nsga2Fields.map(([key, label, hint, step, min, max]) => (
              <AdminField key={key} label={label}>
                <div className="relative">
                  <AdminInput
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={values[key]}
                    onChange={(event) => updateNumber(key, event.target.value)}
                    className="pr-20 tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#9a9fa8]">{hint}</span>
                </div>
              </AdminField>
            ))}
          </div>
        </Section>
      )}

      <Section eyebrow="Shared gates" title="Operational limits">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {limitFields.map(([key, label, suffix]) => (
            <AdminField key={key} label={label}>
              <div className="relative">
                <AdminInput type="number" min="1" value={values[key]} onChange={(event) => updateNumber(key, event.target.value)} className="pr-14 tabular-nums" />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#9a9fa8]">{suffix}</span>
              </div>
            </AdminField>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-4 z-10 rounded-[0.85rem] border border-[var(--admin-line)] bg-white/90 p-3 shadow-[0_18px_50px_rgba(20,22,30,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-[#737883]">
            {message ?? `Active mode: ${isWeighted ? "Weighted score" : "NSGA-II"}`}
          </p>
          <AdminButton type="button" onClick={submit} disabled={!valid || isPending} className="bg-[#090914] text-white hover:bg-[#202032] disabled:cursor-not-allowed disabled:opacity-40">
            <Save className="size-4" strokeWidth={1.8} />
            {isPending ? "Saving..." : "Save rules"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[0.8rem] border border-[var(--admin-line-soft)] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#087164]">{eyebrow}</span>
        <h3 className="text-base font-semibold tracking-[-0.04em] text-[#090914]">{title}</h3>
      </div>
      {children}
    </section>
  );
}
