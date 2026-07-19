"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchingConfigToSettingsData } from "@/lib/printer-matching/config";
import { prismaMatchingRepository } from "@/lib/printer-matching/repository";
import {
  parseMatchingConfigFormData,
  runMatchingSimulationWithRepository,
} from "@/lib/printer-matching/admin";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Forbidden");
  return session.user;
}

export async function saveMatchingConfig(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const config = parseMatchingConfigFormData(formData);
    const settingsData = matchingConfigToSettingsData(config);
    const before = await prisma.systemSettings.findUnique({
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

    await prisma.$transaction(async (tx) => {
      await tx.systemSettings.upsert({
        where: { id: "default" },
        create: { id: "default", ...settingsData },
        update: settingsData,
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SYSTEM_SETTINGS_UPDATED",
          entityType: "SystemSettings",
          entityId: "default",
          reason: "Printer matching configuration updated by admin",
          metadata: {
            section: "printer-matching",
            before: before ?? null,
            after: settingsData,
          },
        },
      });
    });

    revalidatePath("/admin/printer-matching");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save matching config",
    };
  }
}

export async function runMatchingSimulation(input: unknown) {
  try {
    await requireAdmin();
    return await runMatchingSimulationWithRepository(input, prismaMatchingRepository);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Simulation failed",
    };
  }
}
