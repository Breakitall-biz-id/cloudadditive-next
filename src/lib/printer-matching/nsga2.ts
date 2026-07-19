import type { AvailabilityRejectionCode } from "./availability";
import { evaluatePrinterAvailability } from "./availability";
import type { MatchingConfig, Nsga2Config } from "./config";
import { projectQueue, type QueueProjection, type VirtualQueueWorkload } from "./projection";
import { scoreEligiblePrinter, sortByScore } from "./scoring";
import type { MatchedPrinter, PrinterCandidate, PrinterScore } from "./types";
import type { MatchingScenario, SimulationBatchResult, SimulationResult } from "./simulation";

type ObjectiveVector = number[];

type CandidateEntry = {
  printer: PrinterCandidate;
  projection: QueueProjection;
  score: PrinterScore;
};

type Individual = {
  genes: number[];
  objectives: ObjectiveVector;
  results: SimulationResult[];
  distribution: Record<string, number>;
  matched: number;
  projectedMakespanMinutes: number;
  providerDistribution: Record<string, number>;
  rank: number;
  crowdingDistance: number;
  decisionScore: number;
};

type SimulationInput = {
  scenarios: ReadonlyArray<MatchingScenario>;
  printers: ReadonlyArray<PrinterCandidate>;
  config: Readonly<MatchingConfig>;
  now: Date;
  fallbackMinutes: number;
  options: Readonly<Nsga2Config>;
};

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function enrichScore(score: PrinterScore, printer: PrinterCandidate): MatchedPrinter {
  return {
    ...score,
    providerName: printer.provider.businessName,
    providerCity: printer.provider.city,
    providerProvince: printer.provider.province,
    coordinates: {
      lat: printer.provider.latitude as number,
      lng: printer.provider.longitude as number,
    },
    isVerified: printer.provider.isVerified,
    status: printer.status,
    isAcceptingOrders: printer.isAcceptingOrders,
    queuedOrders: score.breakdown.jobsAhead,
  };
}

function dominates(a: ObjectiveVector, b: ObjectiveVector) {
  let strictlyBetter = false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] > b[index]) return false;
    if (a[index] < b[index]) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function nonDominatedSort(objectives: ReadonlyArray<ObjectiveVector>): number[][] {
  const dominationCounts = objectives.map(() => 0);
  const dominatedByIndex: number[][] = objectives.map(() => []);
  const fronts: number[][] = [[]];

  for (let i = 0; i < objectives.length; i += 1) {
    for (let j = 0; j < objectives.length; j += 1) {
      if (i === j) continue;
      if (dominates(objectives[i], objectives[j])) {
        dominatedByIndex[i].push(j);
      } else if (dominates(objectives[j], objectives[i])) {
        dominationCounts[i] += 1;
      }
    }
    if (dominationCounts[i] === 0) fronts[0].push(i);
  }

  let current = 0;
  while (fronts[current]?.length) {
    const next: number[] = [];
    for (const index of fronts[current]) {
      for (const dominated of dominatedByIndex[index]) {
        dominationCounts[dominated] -= 1;
        if (dominationCounts[dominated] === 0) next.push(dominated);
      }
    }
    current += 1;
    if (next.length) fronts[current] = next;
  }

  return fronts;
}

function crowdingDistances(front: number[], objectives: ReadonlyArray<ObjectiveVector>) {
  const distances = new Map<number, number>();
  for (const index of front) distances.set(index, 0);
  if (front.length <= 2) {
    for (const index of front) distances.set(index, Number.POSITIVE_INFINITY);
    return distances;
  }

  const dimensions = objectives[front[0]]?.length ?? 0;
  for (let dimension = 0; dimension < dimensions; dimension += 1) {
    const sorted = [...front].sort((a, b) => objectives[a][dimension] - objectives[b][dimension]);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    distances.set(first, Number.POSITIVE_INFINITY);
    distances.set(last, Number.POSITIVE_INFINITY);
    const min = objectives[first][dimension];
    const max = objectives[last][dimension];
    const range = max - min;
    if (range === 0) continue;

    for (let i = 1; i < sorted.length - 1; i += 1) {
      const previous = objectives[sorted[i - 1]][dimension];
      const next = objectives[sorted[i + 1]][dimension];
      distances.set(sorted[i], (distances.get(sorted[i]) ?? 0) + (next - previous) / range);
    }
  }

  return distances;
}

function rankPopulation(population: Individual[]) {
  const fronts = nonDominatedSort(population.map((individual) => individual.objectives));
  for (let rank = 0; rank < fronts.length; rank += 1) {
    const distances = crowdingDistances(fronts[rank], population.map((individual) => individual.objectives));
    for (const index of fronts[rank]) {
      population[index].rank = rank;
      population[index].crowdingDistance = distances.get(index) ?? 0;
    }
  }
  return fronts;
}

function providerImbalance(distribution: Record<string, number>) {
  const values = Object.values(distribution);
  if (values.length <= 1) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + Math.abs(value - average), 0) / values.length;
}

function countLateOrders(results: SimulationResult[], scenarios: ReadonlyArray<MatchingScenario>, now: Date) {
  const dueByScenario = new Map(scenarios.map((scenario) => [scenario.id, scenario.dueDate ? new Date(scenario.dueDate).getTime() : null] as const));
  let late = 0;
  for (const result of results) {
    if (!result.success) continue;
    const dueTime = dueByScenario.get(result.scenarioId);
    if (!dueTime) continue;
    const finishTime = now.getTime() + result.expectedFinishOffsetMinutes * 60_000;
    if (finishTime > dueTime) late += 1;
  }
  return late;
}

function decisionScore(objectives: ObjectiveVector, policy: Nsga2Config["decisionPolicy"]) {
  const [rejected, makespan, wait, distance, imbalance, materialMismatch, late] = objectives;
  switch (policy) {
    case "FASTEST":
      return rejected * 1_000_000 + makespan * 10 + wait + late * 10_000;
    case "FAIREST":
      return rejected * 1_000_000 + imbalance * 100 + makespan + wait * 0.25 + late * 10_000;
    case "CLOSEST":
      return rejected * 1_000_000 + distance * 10 + wait + makespan * 0.5 + late * 10_000;
    default:
      return rejected * 1_000_000 + makespan + wait + distance * 2 + imbalance * 25 + materialMismatch * 100 + late * 10_000;
  }
}

function evaluateIndividual(
  genes: number[],
  { scenarios, printers, config, now, fallbackMinutes, options }: SimulationInput
): Individual {
  const virtualQueues = new Map<string, VirtualQueueWorkload>();
  const distribution: Record<string, number> = {};
  const providerDistribution: Record<string, number> = {};
  const results: SimulationResult[] = [];
  let totalDistance = 0;
  let totalWait = 0;
  let materialMismatch = 0;
  let projectedMakespanMinutes = 0;

  for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex += 1) {
    const scenario = scenarios[scenarioIndex];
    const rejected: Partial<Record<AvailabilityRejectionCode, number>> = {};
    const eligible: CandidateEntry[] = [];

    for (const printer of printers) {
      const projection = projectQueue({
        orders: printer.orders,
        preprocessingTime: printer.preprocessingTime ?? 10,
        incomingEstimatedMinutes: scenario.estimatedPrintTime,
        incomingQuantity: scenario.quantity,
        fallbackMinutes,
        virtual: virtualQueues.get(printer.id),
      });
      const availability = evaluatePrinterAvailability({ printer, order: scenario, projection, config, now });
      if (!availability.eligible || availability.distanceKm === null) {
        for (const code of availability.rejectionCodes) rejected[code] = (rejected[code] ?? 0) + 1;
        continue;
      }
      eligible.push({
        printer,
        projection,
        score: scoreEligiblePrinter({ printer, order: scenario, config, projection, distanceKm: availability.distanceKm }),
      });
    }

    if (eligible.length === 0) {
      results.push({ success: false, scenarioId: scenario.id, label: scenario.label, rejectionSummary: rejected });
      continue;
    }

    const requestedPrinter = printers[genes[scenarioIndex]];
    let selectedEntry = requestedPrinter ? eligible.find((entry) => entry.printer.id === requestedPrinter.id) : undefined;
    if (!selectedEntry) {
      selectedEntry = sortByScore(eligible.map((entry) => entry.score))
        .map((score) => eligible.find((entry) => entry.printer.id === score.printerId)!)
        [0];
    }

    const selected = enrichScore(selectedEntry.score, selectedEntry.printer);
    const currentVirtual = virtualQueues.get(selected.printerId) ?? { minutes: 0, jobs: 0 };
    virtualQueues.set(selected.printerId, {
      minutes: currentVirtual.minutes + selectedEntry.projection.incomingMinutes,
      jobs: currentVirtual.jobs + 1,
    });
    distribution[selected.printerId] = (distribution[selected.printerId] ?? 0) + 1;
    providerDistribution[selected.providerId] = (providerDistribution[selected.providerId] ?? 0) + 1;
    projectedMakespanMinutes = Math.max(projectedMakespanMinutes, selectedEntry.projection.projectedMinutesAfter);
    totalDistance += selected.breakdown.distanceKm;
    totalWait += selectedEntry.projection.waitMinutes;
    materialMismatch += selected.breakdown.materialMatch ? 0 : 1;

    const entryByPrinter = new Map(eligible.map((entry) => [entry.printer.id, entry] as const));
    const sortedScores = sortByScore(eligible.map((entry) => entry.score));
    results.push({
      success: true,
      scenarioId: scenario.id,
      label: scenario.label,
      customerCoordinates: { lat: scenario.shippingLat, lng: scenario.shippingLng },
      selected,
      alternatives: sortedScores.filter((score) => score.printerId !== selected.printerId).slice(0, 3).map((score) => {
        const entry = entryByPrinter.get(score.printerId)!;
        return enrichScore(score, entry.printer);
      }),
      queueBeforeMinutes: selectedEntry.projection.waitMinutes,
      queueBeforeJobs: selectedEntry.projection.jobsAhead,
      queueAfterMinutes: selectedEntry.projection.projectedMinutesAfter,
      queueAfterJobs: selectedEntry.projection.projectedJobsAfter,
      expectedStartOffsetMinutes: selectedEntry.projection.waitMinutes,
      expectedFinishOffsetMinutes: selectedEntry.projection.projectedMinutesAfter,
    });
  }

  const matched = results.filter((result) => result.success).length;
  const rejectedCount = scenarios.length - matched;
  const objectives = [
    rejectedCount,
    projectedMakespanMinutes,
    totalWait,
    totalDistance,
    providerImbalance(providerDistribution),
    materialMismatch,
    countLateOrders(results, scenarios, now),
  ];

  return {
    genes,
    objectives,
    results,
    distribution,
    matched,
    projectedMakespanMinutes,
    providerDistribution,
    rank: Number.POSITIVE_INFINITY,
    crowdingDistance: 0,
    decisionScore: decisionScore(objectives, options.decisionPolicy),
  };
}

function randomGenes(length: number, printerCount: number, random: () => number) {
  return Array.from({ length }, () => Math.floor(random() * Math.max(1, printerCount)));
}

function tournament(population: Individual[], random: () => number) {
  const a = population[Math.floor(random() * population.length)];
  const b = population[Math.floor(random() * population.length)];
  if (a.rank !== b.rank) return a.rank < b.rank ? a : b;
  if (a.crowdingDistance !== b.crowdingDistance) return a.crowdingDistance > b.crowdingDistance ? a : b;
  return a.decisionScore <= b.decisionScore ? a : b;
}

function breed(parentA: Individual, parentB: Individual, printerCount: number, options: Nsga2Config, random: () => number) {
  const genes = parentA.genes.map((gene, index) => random() < options.crossoverRate ? parentB.genes[index] : gene);
  for (let index = 0; index < genes.length; index += 1) {
    if (random() < options.mutationRate) genes[index] = Math.floor(random() * Math.max(1, printerCount));
  }
  return genes;
}

function selectNextGeneration(combined: Individual[], size: number) {
  rankPopulation(combined);
  return [...combined]
    .sort((a, b) => a.rank - b.rank || b.crowdingDistance - a.crowdingDistance || a.decisionScore - b.decisionScore)
    .slice(0, size);
}

export function simulateMatchingBatchNsga2(input: SimulationInput): SimulationBatchResult {
  const populationSize = Math.max(4, input.options.populationSize);
  const random = createSeededRandom(input.options.seed);
  let population = Array.from({ length: populationSize }, (_, index) => {
    if (index === 0) {
      return evaluateIndividual(input.scenarios.map(() => 0), input);
    }
    return evaluateIndividual(randomGenes(input.scenarios.length, input.printers.length, random), input);
  });

  rankPopulation(population);

  for (let generation = 0; generation < input.options.generations; generation += 1) {
    const offspring: Individual[] = [];
    while (offspring.length < populationSize) {
      const parentA = tournament(population, random);
      const parentB = tournament(population, random);
      offspring.push(evaluateIndividual(breed(parentA, parentB, input.printers.length, input.options, random), input));
    }
    population = selectNextGeneration([...population, ...offspring], populationSize);
  }

  const fronts = rankPopulation(population);
  const paretoFront = fronts[0].map((index) => population[index]);
  const selected = [...paretoFront].sort((a, b) => a.decisionScore - b.decisionScore)[0] ?? population[0];

  return {
    results: selected.results,
    matched: selected.matched,
    rejected: input.scenarios.length - selected.matched,
    distribution: selected.distribution,
    projectedMakespanMinutes: selected.projectedMakespanMinutes,
    algorithm: "NSGA2",
    nsga2: {
      paretoFrontSize: paretoFront.length,
      populationSize,
      generations: input.options.generations,
      decisionPolicy: input.options.decisionPolicy,
      objectiveNames: ["rejected", "makespan", "wait", "distance", "providerImbalance", "materialMismatch", "lateOrders"],
      selectedObjectives: selected.objectives,
    },
  };
}
