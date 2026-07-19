import { isHeartbeatFresh } from "../printer-state";
import type { MatchingConfig } from "./config";
import { haversineDistance } from "./distance";
import type { QueueProjection } from "./projection";
import type { OrderForMatching, PrinterCandidate } from "./types";

export type AvailabilityRejectionCode =
  | "OFFLINE"
  | "PRINTING"
  | "PAUSED"
  | "ERROR"
  | "MAINTENANCE"
  | "NOT_ONLINE"
  | "MISSING_HEARTBEAT"
  | "STALE_HEARTBEAT"
  | "NOT_ACCEPTING"
  | "PROVIDER_UNVERIFIED"
  | "MATERIAL_UNSUPPORTED"
  | "MODEL_TOO_LARGE"
  | "LOCATION_UNAVAILABLE"
  | "TOO_FAR"
  | "QUEUE_DURATION_LIMIT"
  | "QUEUE_JOB_LIMIT";

export type PrinterAvailability = {
  eligible: boolean;
  distanceKm: number | null;
  rejectionCodes: AvailabilityRejectionCode[];
};

export type EvaluatePrinterAvailabilityInput = {
  printer: PrinterCandidate;
  order: OrderForMatching;
  projection: QueueProjection;
  config: Readonly<MatchingConfig>;
  now: Date;
};

function unavailableStatusCode(status: string): AvailabilityRejectionCode {
  switch (status) {
    case "OFFLINE":
    case "PRINTING":
    case "PAUSED":
    case "ERROR":
    case "MAINTENANCE":
      return status;
    default:
      return "NOT_ONLINE";
  }
}

function isFiniteCoordinate(coordinate: number | null): coordinate is number {
  return coordinate !== null && Number.isFinite(coordinate);
}

export function evaluatePrinterAvailability({
  printer,
  order,
  projection,
  config,
  now,
}: EvaluatePrinterAvailabilityInput): PrinterAvailability {
  const rejectionCodes: AvailabilityRejectionCode[] = [];

  if (printer.status !== "ONLINE") {
    rejectionCodes.push(unavailableStatusCode(printer.status));
  }

  if (!printer.lastSeenAt) {
    rejectionCodes.push("MISSING_HEARTBEAT");
  } else if (!isHeartbeatFresh(printer.lastSeenAt, now, config.heartbeatTimeoutSeconds)) {
    rejectionCodes.push("STALE_HEARTBEAT");
  }

  if (!printer.isAcceptingOrders) {
    rejectionCodes.push("NOT_ACCEPTING");
  }

  if (!printer.provider.isVerified) {
    rejectionCodes.push("PROVIDER_UNVERIFIED");
  }

  if (!printer.materialIds.includes(order.materialId)) {
    rejectionCodes.push("MATERIAL_UNSUPPORTED");
  }

  if (
    (order.modelWidth !== null && order.modelWidth > printer.buildWidth) ||
    (order.modelDepth !== null && order.modelDepth > printer.buildDepth) ||
    (order.modelHeight !== null && order.modelHeight > printer.buildHeight)
  ) {
    rejectionCodes.push("MODEL_TOO_LARGE");
  }

  let distanceKm: number | null = null;
  const providerLatitude = printer.provider.latitude;
  const providerLongitude = printer.provider.longitude;

  if (
    !isFiniteCoordinate(providerLatitude) ||
    !isFiniteCoordinate(providerLongitude) ||
    !Number.isFinite(order.shippingLat) ||
    !Number.isFinite(order.shippingLng)
  ) {
    rejectionCodes.push("LOCATION_UNAVAILABLE");
  } else {
    distanceKm = haversineDistance(
      order.shippingLat,
      order.shippingLng,
      providerLatitude,
      providerLongitude
    );

    if (distanceKm > config.maxDistanceKm) {
      rejectionCodes.push("TOO_FAR");
    }
  }

  if (projection.projectedMinutesAfter > config.maxQueueMinutes) {
    rejectionCodes.push("QUEUE_DURATION_LIMIT");
  }

  if (projection.projectedJobsAfter > config.maxQueueJobs) {
    rejectionCodes.push("QUEUE_JOB_LIMIT");
  }

  return {
    eligible: rejectionCodes.length === 0,
    distanceKm,
    rejectionCodes,
  };
}
