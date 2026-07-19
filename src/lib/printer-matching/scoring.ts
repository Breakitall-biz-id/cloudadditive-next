import { DEFAULT_MATCHING_CONFIG, type MatchingConfig } from "./config";
import { haversineDistance } from "./distance";
import { projectQueue, type QueueProjection } from "./projection";
import {
  DEFAULT_WEIGHTS,
  type MatchingWeights,
  type OrderForMatching,
  type PrinterCandidate,
  type PrinterScore,
} from "./types";

export type ScoreEligiblePrinterInput = {
  printer: Pick<PrinterCandidate, "id" | "providerId" | "name" | "currentMaterialId">;
  order: Pick<OrderForMatching, "materialId">;
  config: Readonly<MatchingConfig>;
  projection: QueueProjection;
  distanceKm: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function normalizedInverseScore(value: number, maximum: number): number {
  if (!Number.isFinite(maximum) || maximum <= 0) {
    return 0;
  }

  return clampScore((1 - value / maximum) * 100);
}

export function scoreEligiblePrinter({
  printer,
  order,
  config,
  projection,
  distanceKm,
}: ScoreEligiblePrinterInput): PrinterScore {
  const distanceScore = normalizedInverseScore(distanceKm, config.maxDistanceKm);
  const queueDurationScore = normalizedInverseScore(
    projection.waitMinutes,
    config.maxQueueMinutes
  );
  const queueCountScore = normalizedInverseScore(
    projection.jobsAhead,
    config.maxQueueJobs
  );
  const materialMatch = printer.currentMaterialId === order.materialId;
  const loadedMaterialScore = materialMatch ? 100 : 0;
  const score = clampScore(
    distanceScore * config.distanceWeight +
      queueDurationScore * config.queueDurationWeight +
      queueCountScore * config.queueCountWeight +
      loadedMaterialScore * config.loadedMaterialWeight
  );

  return {
    printerId: printer.id,
    providerId: printer.providerId,
    printerName: printer.name,
    score,
    canPrintImmediately: materialMatch && projection.jobsAhead === 0,
    breakdown: {
      distanceKm,
      waitMinutes: projection.waitMinutes,
      jobsAhead: projection.jobsAhead,
      projectedMinutesAfter: projection.projectedMinutesAfter,
      projectedJobsAfter: projection.projectedJobsAfter,
      distanceScore,
      queueDurationScore,
      queueCountScore,
      loadedMaterialScore,
      materialMatch,
      // Temporary aliases consumed by the current pre-check and order UI.
      queueTimeScore: queueDurationScore,
      queueTimeMinutes: projection.waitMinutes,
      materialMatchScore: loadedMaterialScore,
    },
  };
}

function legacyConfig(weights: MatchingWeights): MatchingConfig {
  return {
    ...DEFAULT_MATCHING_CONFIG,
    distanceWeight: weights.distance,
    queueDurationWeight: weights.queueTime,
    queueCountWeight: 0,
    loadedMaterialWeight: weights.materialMatch,
  };
}

/**
 * Compatibility wrapper for callers that have not migrated to eligibility and projection yet.
 */
export function calculatePrinterScore(
  printer: PrinterCandidate,
  order: OrderForMatching,
  weights: MatchingWeights = DEFAULT_WEIGHTS
): PrinterScore {
  const providerLatitude = printer.provider.latitude;
  const providerLongitude = printer.provider.longitude;
  const distanceKm =
    providerLatitude !== null &&
    providerLongitude !== null &&
    Number.isFinite(providerLatitude) &&
    Number.isFinite(providerLongitude) &&
    Number.isFinite(order.shippingLat) &&
    Number.isFinite(order.shippingLng)
      ? haversineDistance(
          order.shippingLat,
          order.shippingLng,
          providerLatitude,
          providerLongitude
        )
      : 0;
  const projection = projectQueue({
    orders: printer.orders,
    preprocessingTime: printer.preprocessingTime ?? 10,
    fallbackMinutes: 60,
  });

  const result = scoreEligiblePrinter({
    printer,
    order,
    config: legacyConfig(weights),
    projection,
    distanceKm,
  });

  return {
    ...result,
    canPrintImmediately:
      result.canPrintImmediately &&
      printer.isAcceptingOrders &&
      printer.status === "ONLINE",
  };
}

/**
 * Sort scores by score, then deterministic operational tie-breakers.
 */
export function sortByScore(scores: ReadonlyArray<PrinterScore>): PrinterScore[] {
  return [...scores].sort((a, b) => {
    const numericDifference =
      b.score - a.score ||
      a.breakdown.waitMinutes - b.breakdown.waitMinutes ||
      a.breakdown.jobsAhead - b.breakdown.jobsAhead ||
      a.breakdown.distanceKm - b.breakdown.distanceKm;

    if (numericDifference !== 0) {
      return numericDifference;
    }

    if (a.printerId === b.printerId) {
      return 0;
    }

    return a.printerId < b.printerId ? -1 : 1;
  });
}
