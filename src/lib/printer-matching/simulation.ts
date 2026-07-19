import type { AvailabilityRejectionCode } from "./availability";
import { evaluatePrinterAvailability } from "./availability";
import type { MatchingConfig } from "./config";
import { projectQueue, type QueueProjection, type VirtualQueueWorkload } from "./projection";
import { scoreEligiblePrinter, sortByScore } from "./scoring";
import type { MatchedPrinter, OrderForMatching, PrinterCandidate, PrinterScore } from "./types";

export type MatchingScenario = OrderForMatching & {
  label: string;
};

export type SimulationMatchedResult = {
  success: true;
  scenarioId: string;
  label: string;
  customerCoordinates: { lat: number; lng: number };
  selected: MatchedPrinter;
  alternatives: MatchedPrinter[];
  queueBeforeMinutes: number;
  queueBeforeJobs: number;
  queueAfterMinutes: number;
  queueAfterJobs: number;
  expectedStartOffsetMinutes: number;
  expectedFinishOffsetMinutes: number;
};

export type SimulationRejectedResult = {
  success: false;
  scenarioId: string;
  label: string;
  rejectionSummary: Partial<Record<AvailabilityRejectionCode, number>>;
};

export type SimulationResult = SimulationMatchedResult | SimulationRejectedResult;

export type SimulationBatchResult = {
  results: SimulationResult[];
  matched: number;
  rejected: number;
  distribution: Record<string, number>;
  projectedMakespanMinutes: number;
  algorithm: "WEIGHTED_SCORE" | "NSGA2";
  nsga2?: {
    paretoFrontSize: number;
    populationSize: number;
    generations: number;
    decisionPolicy: string;
    objectiveNames: string[];
    selectedObjectives: number[];
  };
};

type SimulationInput = {
  scenarios: ReadonlyArray<MatchingScenario>;
  printers: ReadonlyArray<PrinterCandidate>;
  config: Readonly<MatchingConfig>;
  now: Date;
  fallbackMinutes: number;
};

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

export function simulateMatchingBatch({
  scenarios,
  printers,
  config,
  now,
  fallbackMinutes,
}: SimulationInput): SimulationBatchResult {
  const virtualQueues = new Map<string, VirtualQueueWorkload>();
  const distribution: Record<string, number> = {};
  const results: SimulationResult[] = [];
  let projectedMakespanMinutes = 0;

  for (const scenario of scenarios) {
    const rejected: Partial<Record<AvailabilityRejectionCode, number>> = {};
    const eligible: Array<{
      printer: PrinterCandidate;
      score: PrinterScore;
      projection: QueueProjection;
    }> = [];

    for (const printer of printers) {
      const projection = projectQueue({
        orders: printer.orders,
        preprocessingTime: printer.preprocessingTime ?? 10,
        incomingEstimatedMinutes: scenario.estimatedPrintTime,
        incomingQuantity: scenario.quantity,
        fallbackMinutes,
        virtual: virtualQueues.get(printer.id),
      });
      const availability = evaluatePrinterAvailability({
        printer,
        order: scenario,
        projection,
        config,
        now,
      });

      if (!availability.eligible || availability.distanceKm === null) {
        for (const code of availability.rejectionCodes) {
          rejected[code] = (rejected[code] ?? 0) + 1;
        }
        continue;
      }

      eligible.push({
        printer,
        projection,
        score: scoreEligiblePrinter({
          printer,
          order: scenario,
          config,
          projection,
          distanceKm: availability.distanceKm,
        }),
      });
    }

    const sortedScores = sortByScore(eligible.map((entry) => entry.score));
    if (sortedScores.length === 0) {
      results.push({
        success: false,
        scenarioId: scenario.id,
        label: scenario.label,
        rejectionSummary: rejected,
      });
      continue;
    }

    const entryByPrinter = new Map(
      eligible.map((entry) => [entry.printer.id, entry] as const)
    );
    const selectedEntry = entryByPrinter.get(sortedScores[0].printerId)!;
    const selected = enrichScore(selectedEntry.score, selectedEntry.printer);
    const currentVirtual = virtualQueues.get(selected.printerId) ?? {
      minutes: 0,
      jobs: 0,
    };
    virtualQueues.set(selected.printerId, {
      minutes: currentVirtual.minutes + selectedEntry.projection.incomingMinutes,
      jobs: currentVirtual.jobs + 1,
    });
    distribution[selected.printerId] = (distribution[selected.printerId] ?? 0) + 1;
    projectedMakespanMinutes = Math.max(
      projectedMakespanMinutes,
      selectedEntry.projection.projectedMinutesAfter
    );

    results.push({
      success: true,
      scenarioId: scenario.id,
      label: scenario.label,
      customerCoordinates: {
        lat: scenario.shippingLat,
        lng: scenario.shippingLng,
      },
      selected,
      alternatives: sortedScores.slice(1, 4).map((score) => {
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
  return {
    results,
    matched,
    rejected: results.length - matched,
    distribution,
    projectedMakespanMinutes,
    algorithm: "WEIGHTED_SCORE",
  };
}
