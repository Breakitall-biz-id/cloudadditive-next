import type { PrinterMatchingResult } from "./service";

export type PreCheckResult =
  | {
      success: true;
      availablePrinters: number;
      bestPrinter: Extract<PrinterMatchingResult, { success: true }>[
        "bestPrinter"
      ];
      alternatives: Array<{
        printerId: string;
        printerName: string;
        providerName: string;
        providerCity: string;
        score: number;
        distanceKm: number;
      }>;
    }
  | {
      success: false;
      availablePrinters: 0;
      error: string;
    };

export function formatPreCheckResult(
  result: PrinterMatchingResult
): PreCheckResult {
  if (!result.success) {
    return {
      success: false,
      availablePrinters: 0,
      error: result.error,
    };
  }

  return {
    success: true,
    availablePrinters: result.availablePrinters,
    bestPrinter: result.bestPrinter,
    alternatives: result.alternatives.slice(0, 3).map((printer) => ({
      printerId: printer.printerId,
      printerName: printer.printerName,
      providerName: printer.providerName,
      providerCity: printer.providerCity,
      score: printer.score,
      distanceKm: printer.breakdown.distanceKm,
    })),
  };
}
