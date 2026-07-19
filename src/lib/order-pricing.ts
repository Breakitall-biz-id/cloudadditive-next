type PricingMaterial = {
  id: string;
  pricePerGram: number;
  density: number;
};

type PricingQuality = {
  id: string;
  priceMultiplier: number;
};

type PricingSettings = {
  markupPercentage: number;
  platformFeePercentage: number;
  machineRatePerHour: number;
  estimatedPrintSpeed: number;
  defaultInfillPercentage: number;
};

export type OrderPricingInput = {
  material: PricingMaterial | null;
  quality: PricingQuality | null;
  settings: PricingSettings;
  quantity: number;
  shippingCost?: number;
  modelVolumeMm3?: number | null;
  slicedResult?: {
    printTimeMinutes: number;
    filamentGrams: number;
  } | null;
  isGcode?: boolean;
};

export function calculateOrderPricing(input: OrderPricingInput) {
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const shippingCost = input.shippingCost ?? 0;
  const qualityMultiplier = input.isGcode ? 1 : input.quality?.priceMultiplier ?? 1;

  let materialCost = 0;
  let timeCost = 0;

  if (input.material && input.slicedResult && input.slicedResult.filamentGrams > 0) {
    const printTimeHours = input.slicedResult.printTimeMinutes / 60;
    materialCost = Math.round(input.slicedResult.filamentGrams * input.material.pricePerGram * quantity);
    timeCost = Math.round(printTimeHours * input.settings.machineRatePerHour * quantity);
  } else if (input.material && input.modelVolumeMm3 && input.modelVolumeMm3 > 0) {
    const volumeCm3 = input.modelVolumeMm3 / 1000;
    const estimatedWeight = volumeCm3 * input.settings.defaultInfillPercentage * input.material.density;
    materialCost = Math.round(estimatedWeight * input.material.pricePerGram * qualityMultiplier * quantity);
    timeCost = Math.round(
      (input.modelVolumeMm3 / input.settings.estimatedPrintSpeed) *
        input.settings.machineRatePerHour *
        qualityMultiplier *
        quantity
    );
  }

  const subtotal = materialCost + timeCost;
  const markup = Math.round(subtotal * input.settings.markupPercentage);
  const platformFee = Math.round(subtotal * input.settings.platformFeePercentage);

  return {
    materialCost,
    timeCost,
    subtotal,
    markup,
    platformFee,
    shippingCost,
    total: subtotal + markup + platformFee + shippingCost,
  };
}
