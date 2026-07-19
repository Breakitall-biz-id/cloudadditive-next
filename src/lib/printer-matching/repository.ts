import { prisma } from "@/lib/prisma";
import type { MatchingSettingsData } from "./config";
import type { OrderForMatching, PrinterCandidate } from "./types";

export function supportedMaterialIdsFromPrinter(input: {
  currentMaterialId: string | null;
  materials: Array<{ materialId: string }>;
}): string[] {
  return [
    ...new Set([
      ...input.materials.map((material) => material.materialId),
      ...(input.currentMaterialId ? [input.currentMaterialId] : []),
    ]),
  ];
}

export interface MatchingRepository {
  getMatchingSettings(): Promise<MatchingSettingsData | null>;
  reconcileStalePrinters(cutoff: Date): Promise<number>;
  findPrinterCandidates(): Promise<PrinterCandidate[]>;
  findOrderForMatching(orderId: string): Promise<OrderForMatching | null>;
}

export const prismaMatchingRepository: MatchingRepository = {
  async getMatchingSettings() {
    return prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        matchingAlgorithmMode: true,
        matchingDistanceWeight: true,
        matchingQueueDurationWeight: true,
        matchingQueueCountWeight: true,
        matchingLoadedMaterialWeight: true,
        matchingHeartbeatTimeoutSeconds: true,
        matchingMaxDistanceKm: true,
        matchingMaxQueueMinutes: true,
        matchingMaxQueueJobs: true,
        matchingNsga2PopulationSize: true,
        matchingNsga2Generations: true,
        matchingNsga2MutationRate: true,
        matchingNsga2CrossoverRate: true,
        matchingNsga2Seed: true,
        matchingNsga2DecisionPolicy: true,
      },
    });
  },

  async reconcileStalePrinters(cutoff) {
    const result = await prisma.printer.updateMany({
      where: {
        status: { in: ["ONLINE", "PRINTING", "PAUSED"] },
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
      },
      data: {
        status: "OFFLINE",
        isAcceptingOrders: false,
      },
    });

    return result.count;
  },

  async findPrinterCandidates() {
    const printers = await prisma.printer.findMany({
      select: {
        id: true,
        providerId: true,
        name: true,
        buildWidth: true,
        buildDepth: true,
        buildHeight: true,
        currentMaterialId: true,
        isAcceptingOrders: true,
        preprocessingTime: true,
        status: true,
        lastSeenAt: true,
        materials: {
          select: { materialId: true },
        },
        provider: {
          select: {
            businessName: true,
            latitude: true,
            longitude: true,
            city: true,
            province: true,
            isVerified: true,
          },
        },
        orders: {
          where: {
            status: { in: ["IN_QUEUE", "SLICING", "PRINTING"] },
          },
          select: {
            id: true,
            status: true,
            estimatedPrintTime: true,
            quantity: true,
          },
        },
      },
    });

    return printers.map((printer) => ({
      ...printer,
      status: printer.status,
      materialIds: supportedMaterialIdsFromPrinter(printer),
      orders: printer.orders.map((order) => ({
        ...order,
        status: order.status,
      })),
    }));
  },

  async findOrderForMatching(orderId) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        materialId: true,
        modelWidth: true,
        modelHeight: true,
        modelDepth: true,
        shippingLat: true,
        shippingLng: true,
        estimatedPrintTime: true,
        quantity: true,
        dueDate: true,
      },
    });
  },
};
