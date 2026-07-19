import { NextResponse } from "next/server";
import { z } from "zod";
import { formatPreCheckResult } from "@/lib/printer-matching/pre-check";
import { printerMatchingService } from "@/lib/printer-matching/service";

const preCheckSchema = z.object({
  materialId: z.string().trim().min(1),
  modelWidth: z.number().finite().positive().nullish(),
  modelHeight: z.number().finite().positive().nullish(),
  modelDepth: z.number().finite().positive().nullish(),
  customerLat: z.number().finite().min(-90).max(90),
  customerLng: z.number().finite().min(-180).max(180),
  estimatedPrintTime: z.number().finite().nonnegative().nullish(),
  quantity: z.number().int().positive().default(1),
  dueDate: z.string().trim().optional(),
});

/**
 * Dry availability check before order creation. It deliberately uses the same
 * matching service as paid orders so preview and dispatch cannot disagree.
 */
export async function POST(request: Request) {
  try {
    const parsed = preCheckSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Data pengecekan printer tidak valid",
          details: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const result = await printerMatchingService.match({
      id: "pre-check",
      materialId: input.materialId,
      modelWidth: input.modelWidth ?? null,
      modelHeight: input.modelHeight ?? null,
      modelDepth: input.modelDepth ?? null,
      shippingLat: input.customerLat,
      shippingLng: input.customerLng,
      estimatedPrintTime: input.estimatedPrintTime ?? null,
      quantity: input.quantity,
      dueDate: input.dueDate || null,
    });

    return NextResponse.json(formatPreCheckResult(result));
  } catch (error) {
    console.error("[Pre-check] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memeriksa ketersediaan printer" },
      { status: 500 }
    );
  }
}
