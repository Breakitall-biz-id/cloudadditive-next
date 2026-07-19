import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_SETTINGS = {
  markupPercentage: 0.15,
  platformFeePercentage: 0.1,
  machineRatePerHour: 10000,
  estimatedPrintSpeed: 15000,
  defaultInfillPercentage: 0.2,
};

export async function GET() {
  const [materials, qualities, settings] = await Promise.all([
    prisma.material.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { colors: { where: { isAvailable: true }, orderBy: { name: "asc" } } },
    }),
    prisma.printQuality.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.systemSettings.findUnique({ where: { id: "default" } }),
  ]);

  return NextResponse.json({
    materials: materials.map((material) => ({
      id: material.id,
      name: material.name,
      type: material.type,
      description: material.description,
      density: material.density,
      diameter: material.diameter,
      pricePerGram: Number(material.pricePerGram),
      nozzleTemp: material.nozzleTemp,
      bedTemp: material.bedTemp,
      colors: material.colors.map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hexCode,
      })),
    })),
    qualities: qualities.map((quality) => ({
      id: quality.id,
      name: quality.name,
      description: quality.description,
      layerHeight: quality.layerHeight,
      speedMultiplier: quality.speedMultiplier,
      priceMultiplier: quality.priceMultiplier,
      multiplier: quality.priceMultiplier,
    })),
    settings: settings
      ? {
          markupPercentage: settings.markupPercentage,
          platformFeePercentage: settings.platformFeePercentage,
          machineRatePerHour: settings.machineRatePerHour,
          estimatedPrintSpeed: settings.estimatedPrintSpeed,
          defaultInfillPercentage: settings.defaultInfillPercentage,
        }
      : FALLBACK_SETTINGS,
  });
}
