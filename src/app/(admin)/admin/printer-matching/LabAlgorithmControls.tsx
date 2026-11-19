"use client";

import { AdminField, AdminInput, AdminSelect } from "@/components/admin/AdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { defaultLabOptions, LAB_ALGORITHMS, type LabAlgorithm, type LabOptions } from "@/lib/printer-matching/lab-config";

type NumericKey = { [K in keyof LabOptions]: LabOptions[K] extends number ? K : never }[keyof LabOptions];
export function LabAlgorithmControls({ value, onChange, disabled }: {
  value: LabOptions; onChange(value: LabOptions): void; disabled?: boolean;
}) {
  const isMopso = value.algorithm === "MOPSO_AHP_TOPSIS";
  const optimizer = isMopso || value.algorithm === "NSGA2_AHP_TOPSIS";
  const field = (key: NumericKey, label: string, min: number, max: number, step = 1) => (
    <AdminField key={key} label={label}>
      <AdminInput type="number" min={min} max={max} step={step} value={value[key]} disabled={disabled}
        onChange={(event) => onChange({ ...value, [key]: event.target.valueAsNumber })} />
    </AdminField>
  );
  return (
    <Card className="gap-0 rounded-xl border-[var(--admin-line)] bg-white py-0">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <AdminField label="Simulation algorithm">
            <AdminSelect value={value.algorithm} disabled={disabled} options={LAB_ALGORITHMS.map((option) => ({ ...option }))}
              onValueChange={(algorithm) => onChange(defaultLabOptions(algorithm as LabAlgorithm))} />
          </AdminField>
          <p className="text-xs leading-5 text-slate-500">Lab only. This choice does not change customer order routing.</p>
        </div>
        {value.algorithm !== "SAVED" && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {field("travelMinutesPerKm", "Travel time (min/km)", 0, 60, 0.1)}
            {field("horizonMinutes", "Print horizon (minutes)", 1, 525600)}
            {optimizer && field("seed", "Random seed", 0, 2147483647)}
          </div>
          <p className="text-xs leading-5 text-slate-500">Arrival and deadline are offsets from simulation start. Notebook travel defaults: baseline 0.5, NSGA-II 1, MOPSO 1.5 min/km. Use the same value for a controlled comparison.</p>
        </>}
        {optimizer && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {field("populationSize", isMopso ? "Particles" : "Population", 4, 120)}
            {field("iterations", isMopso ? "Iterations" : "Generations", 1, 150)}
            {isMopso ? field("archiveSize", "Archive limit", 2, 150) : <>
              {field("crossoverRate", "Crossover probability", 0, 1, 0.01)}
              {field("mutationRate", "Individual mutation probability", 0, 1, 0.01)}
              {field("geneMutationRate", "Gene mutation probability", 0, 1, 0.01)}
            </>}
          </div>
          {isMopso && <details className="text-sm">
            <summary className="cursor-pointer font-medium">MOPSO dynamics</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {field("inertiaStart", "Initial inertia", 0, 1, 0.01)}
              {field("inertiaEnd", "Final inertia", 0, 1, 0.01)}
              {field("cognitive", "Cognitive coefficient", 0, 4, 0.1)}
              {field("social", "Social coefficient", 0, 4, 0.1)}
              {field("velocityLimit", "Velocity limit", 0.1, 10, 0.1)}
              {field("mutationStart", "Initial mutation", 0, 1, 0.01)}
              {field("mutationEnd", "Final mutation", 0, 1, 0.01)}
            </div>
          </details>}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">AHP pairwise matrix</summary>
            <p className="my-3 text-xs text-slate-500">Rows and columns: distance, weighted lateness, load standard deviation. All are minimized; consistency ratio must be at most 0.10.</p>
            <div className="grid max-w-xl grid-cols-3 gap-2">
              {value.ahpMatrix.flatMap((row, i) => row.map((n, j) => <AdminInput key={`${i}-${j}`} type="number" min="0.0001" step="0.0001" value={n} disabled={disabled || i === j}
                aria-label={`AHP ${["distance", "lateness", "load"][i]} versus ${["distance", "lateness", "load"][j]}`}
                onChange={(event) => {
                  const matrix = value.ahpMatrix.map((r) => [...r]) as LabOptions["ahpMatrix"];
                  matrix[i][j] = event.target.valueAsNumber;
                  if (Number.isFinite(matrix[i][j]) && matrix[i][j] > 0) matrix[j][i] = 1 / matrix[i][j];
                  onChange({ ...value, ahpMatrix: matrix });
                }} />))}
            </div>
          </details>
        </>}
      </CardContent>
    </Card>
  );
}
