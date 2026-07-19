import {
  DEFAULT_MATCHING_CONFIG,
  matchingConfigFromSettings,
} from "./config";
import {
  evaluatePrinterAvailability,
  type AvailabilityRejectionCode,
} from "./availability";
import { projectQueue } from "./projection";
import {
  prismaMatchingRepository,
  type MatchingRepository,
} from "./repository";
import { scoreEligiblePrinter, sortByScore } from "./scoring";
import type {
  MatchedPrinter,
  OrderForMatching,
  PrinterCandidate,
  PrinterScore,
} from "./types";

export type RejectionSummary = Partial<Record<AvailabilityRejectionCode, number>>;

export type PrinterMatchingResult =
  | {
      success: true;
      bestPrinter: MatchedPrinter;
      alternatives: MatchedPrinter[];
      availablePrinters: number;
    }
  | {
      success: false;
      code: "NO_AVAILABLE_PRINTER";
      error: string;
      rejectionSummary: RejectionSummary;
    };

export type PrinterMatchingService = {
  match(order: OrderForMatching): Promise<PrinterMatchingResult>;
  findByOrderId(orderId: string): Promise<PrinterMatchingResult>;
};

type MatchingServiceOptions = {
  now?: () => Date;
  fallbackMinutes?: number;
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

function recordRejections(
  summary: RejectionSummary,
  rejectionCodes: ReadonlyArray<AvailabilityRejectionCode>
) {
  for (const code of rejectionCodes) {
    summary[code] = (summary[code] ?? 0) + 1;
  }
}

export function createPrinterMatchingService(
  repository: MatchingRepository,
  options: MatchingServiceOptions = {}
): PrinterMatchingService {
  const nowFactory = options.now ?? (() => new Date());
  const fallbackMinutes = options.fallbackMinutes ?? 60;

  return {
    async match(order) {
      const settings = await repository.getMatchingSettings();
      const config = settings
        ? matchingConfigFromSettings(settings)
        : { ...DEFAULT_MATCHING_CONFIG };
      const now = nowFactory();
      const cutoff = new Date(
        now.getTime() - config.heartbeatTimeoutSeconds * 1000
      );

      await repository.reconcileStalePrinters(cutoff);
      const printers = await repository.findPrinterCandidates();
      const rejectionSummary: RejectionSummary = {};
      const scored: Array<{ score: PrinterScore; printer: PrinterCandidate }> = [];

      for (const printer of printers) {
        const projection = projectQueue({
          orders: printer.orders,
          preprocessingTime: printer.preprocessingTime ?? 10,
          incomingEstimatedMinutes: order.estimatedPrintTime,
          incomingQuantity: order.quantity,
          fallbackMinutes,
        });
        const availability = evaluatePrinterAvailability({
          printer,
          order,
          projection,
          config,
          now,
        });

        if (!availability.eligible || availability.distanceKm === null) {
          recordRejections(rejectionSummary, availability.rejectionCodes);
          continue;
        }

        scored.push({
          printer,
          score: scoreEligiblePrinter({
            printer,
            order,
            config,
            projection,
            distanceKm: availability.distanceKm,
          }),
        });
      }

      const printerById = new Map(
        scored.map(({ printer }) => [printer.id, printer] as const)
      );
      const matches = sortByScore(scored.map(({ score }) => score)).map((score) =>
        enrichScore(score, printerById.get(score.printerId)!)
      );

      if (matches.length === 0) {
        return {
          success: false,
          code: "NO_AVAILABLE_PRINTER",
          error: "Tidak ada printer online yang tersedia",
          rejectionSummary,
        };
      }

      return {
        success: true,
        bestPrinter: matches[0],
        alternatives: matches.slice(1),
        availablePrinters: matches.length,
      };
    },

    async findByOrderId(orderId) {
      const order = await repository.findOrderForMatching(orderId);
      if (!order) {
        return {
          success: false,
          code: "NO_AVAILABLE_PRINTER",
          error: "Order tidak ditemukan",
          rejectionSummary: {},
        };
      }

      return this.match(order);
    },
  };
}

export const printerMatchingService = createPrinterMatchingService(
  prismaMatchingRepository
);

export type { MatchingRepository } from "./repository";
