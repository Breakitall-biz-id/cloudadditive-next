import { z } from "zod";

// Lab choices are deliberately separate from MatchingAlgorithmMode (production).
export const LAB_ALGORITHMS = [
  { value: "SAVED", label: "Saved production rules" },
  { value: "NEAREST_FEASIBLE", label: "Nearest Feasible" },
  { value: "EDD_FEASIBLE", label: "EDD Feasible" },
  { value: "LEAST_LOADED_FEASIBLE", label: "Least Loaded Feasible" },
  { value: "MOPSO_AHP_TOPSIS", label: "MOPSO + AHP–TOPSIS" },
  { value: "NSGA2_AHP_TOPSIS", label: "NSGA-II + AHP–TOPSIS" },
] as const;
export type LabAlgorithm = typeof LAB_ALGORITHMS[number]["value"];
export type ResearchAlgorithm = Exclude<LabAlgorithm, "SAVED">;

const probability = z.number().finite().min(0).max(1);
const row = z.tuple([z.number().positive().finite(), z.number().positive().finite(), z.number().positive().finite()]);
export const labOptionsSchema = z.object({
  algorithm: z.enum(["SAVED", "NEAREST_FEASIBLE", "EDD_FEASIBLE", "LEAST_LOADED_FEASIBLE", "MOPSO_AHP_TOPSIS", "NSGA2_AHP_TOPSIS"]),
  travelMinutesPerKm: z.number().finite().min(0).max(60),
  horizonMinutes: z.number().finite().positive().max(525600),
  seed: z.number().int().min(0).max(2147483647),
  populationSize: z.number().int().min(4).max(120),
  iterations: z.number().int().min(1).max(150),
  archiveSize: z.number().int().min(2).max(150),
  crossoverRate: probability,
  mutationRate: probability,
  geneMutationRate: probability,
  inertiaStart: probability,
  inertiaEnd: probability,
  cognitive: z.number().finite().min(0).max(4),
  social: z.number().finite().min(0).max(4),
  velocityLimit: z.number().finite().positive().max(10),
  mutationStart: probability,
  mutationEnd: probability,
  ahpMatrix: z.tuple([row, row, row]).refine((matrix) =>
    matrix.every((r, i) => Math.abs(r[i] - 1) < 1e-9 && r.every((n, j) => Math.abs(n * matrix[j][i] - 1) < 0.02)),
  "AHP matrix must have diagonal 1 and reciprocal comparisons"),
}).strict();
export type LabOptions = z.infer<typeof labOptionsSchema>;

export function defaultLabOptions(algorithm: LabAlgorithm = "SAVED"): LabOptions {
  return {
    algorithm,
    travelMinutesPerKm: algorithm === "MOPSO_AHP_TOPSIS" ? 1.5 : algorithm === "NSGA2_AHP_TOPSIS" ? 1 : 0.5,
    horizonMinutes: 1440, seed: 42,
    populationSize: algorithm === "MOPSO_AHP_TOPSIS" ? 80 : 100,
    iterations: 100, archiveSize: 100,
    crossoverRate: 0.8, mutationRate: 0.2, geneMutationRate: 0.05,
    inertiaStart: 0.9, inertiaEnd: 0.4, cognitive: 1.7, social: 1.7, velocityLimit: 4,
    mutationStart: 0.2, mutationEnd: 0.03,
    ahpMatrix: [[1, 0.1944, 0.7598], [5.1437, 1, 4.1195], [1.3161, 0.2427, 1]],
  };
}
