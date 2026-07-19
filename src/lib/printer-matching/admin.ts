import { z } from "zod";
import {
  matchingConfigFromSettings,
  validateMatchingConfig,
  type MatchingConfig,
  type MatchingSettingsData,
} from "./config";
import type { PrinterCandidate } from "./types";
import { simulateMatchingBatch } from "./simulation";
import { simulateMatchingBatchNsga2 } from "./nsga2";

type ConfigFormSource = FormData | Record<string, FormDataEntryValue | string>;

export type SimulationReadRepository = {
  getMatchingSettings(): Promise<MatchingSettingsData | null>;
  findPrinterCandidates(): Promise<PrinterCandidate[]>;
};

const simulationScenarioSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  materialId: z.string().min(1),
  modelWidth: z.number().positive().nullable(),
  modelHeight: z.number().positive().nullable(),
  modelDepth: z.number().positive().nullable(),
  shippingLat: z.number().min(-90).max(90),
  shippingLng: z.number().min(-180).max(180),
  estimatedPrintTime: z.number().positive().nullable(),
  quantity: z.number().int().positive(),
  dueDate: z.union([z.string(), z.date()]).nullable().optional(),
});

function readField(source: ConfigFormSource, name: string): string {
  const value = source instanceof FormData ? source.get(name) : source[name];
  return typeof value === "string" ? value : "";
}

function numberField(source: ConfigFormSource, name: string): number {
  const value = Number(readField(source, name));
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}

export function parseMatchingConfigFormData(source: ConfigFormSource): MatchingConfig {
  return validateMatchingConfig({
    algorithmMode: readField(source, "algorithmMode"),
    distanceWeight: numberField(source, "distanceWeight"),
    queueDurationWeight: numberField(source, "queueDurationWeight"),
    queueCountWeight: numberField(source, "queueCountWeight"),
    loadedMaterialWeight: numberField(source, "loadedMaterialWeight"),
    heartbeatTimeoutSeconds: numberField(source, "heartbeatTimeoutSeconds"),
    maxDistanceKm: numberField(source, "maxDistanceKm"),
    maxQueueMinutes: numberField(source, "maxQueueMinutes"),
    maxQueueJobs: numberField(source, "maxQueueJobs"),
    nsga2: {
      populationSize: numberField(source, "nsga2PopulationSize"),
      generations: numberField(source, "nsga2Generations"),
      mutationRate: numberField(source, "nsga2MutationRate"),
      crossoverRate: numberField(source, "nsga2CrossoverRate"),
      seed: numberField(source, "nsga2Seed"),
      decisionPolicy: readField(source, "nsga2DecisionPolicy"),
    },
  });
}

export async function runMatchingSimulationWithRepository(
  input: unknown,
  repository: SimulationReadRepository,
  now = new Date()
) {
  const scenarios = z.array(simulationScenarioSchema).min(1).max(100).parse(input);
  const [settings, printers] = await Promise.all([
    repository.getMatchingSettings(),
    repository.findPrinterCandidates(),
  ]);

  const config = matchingConfigFromSettings(settings);
  const data = config.algorithmMode === "NSGA2"
    ? simulateMatchingBatchNsga2({
      scenarios,
      printers,
      config,
      now,
      fallbackMinutes: 60,
      options: config.nsga2,
    })
    : simulateMatchingBatch({
      scenarios,
      printers,
      config,
      now,
      fallbackMinutes: 60,
    });

  return {
    success: true as const,
    data,
  };
}
