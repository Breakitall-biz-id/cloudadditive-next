import assert from "node:assert/strict";
import { parseMaterialCatalogForm, parsePrintQualityCatalogForm } from "../src/lib/admin-catalog-utils";
import { calculateOrderPricing } from "../src/lib/order-pricing";

const materialForm = new FormData();
materialForm.set("materialId", "pla");
materialForm.set("name", "PLA Pro");
materialForm.set("type", "Filament");
materialForm.set("description", "Reliable production PLA");
materialForm.set("pricePerGram", "275");
materialForm.set("density", "1.25");
materialForm.set("diameter", "1.75");
materialForm.set("nozzleTemp", "205");
materialForm.set("bedTemp", "60");
materialForm.set("isActive", "true");
materialForm.set("colors", "White:#ffffff\nBlack:#000000\n\n");

assert.deepEqual(parseMaterialCatalogForm(materialForm), {
  materialId: "pla",
  data: {
    name: "PLA Pro",
    type: "Filament",
    description: "Reliable production PLA",
    pricePerGram: 275,
    density: 1.25,
    diameter: 1.75,
    nozzleTemp: 205,
    bedTemp: 60,
    isActive: true,
  },
  colors: [
    { name: "White", hexCode: "#ffffff" },
    { name: "Black", hexCode: "#000000" },
  ],
});

assert.throws(() => {
  const invalid = new FormData();
  invalid.set("name", "PLA");
  invalid.set("type", "Filament");
  invalid.set("pricePerGram", "0");
  invalid.set("density", "1.24");
  invalid.set("diameter", "1.75");
  parseMaterialCatalogForm(invalid);
}, /Material price must be positive/);

const qualityForm = new FormData();
qualityForm.set("qualityId", "normal");
qualityForm.set("name", "Normal");
qualityForm.set("description", "Balanced");
qualityForm.set("layerHeight", "0.2");
qualityForm.set("speedMultiplier", "1");
qualityForm.set("priceMultiplier", "1.15");
qualityForm.set("sortOrder", "2");
qualityForm.set("isActive", "true");

assert.deepEqual(parsePrintQualityCatalogForm(qualityForm), {
  qualityId: "normal",
  data: {
    name: "Normal",
    description: "Balanced",
    layerHeight: 0.2,
    speedMultiplier: 1,
    priceMultiplier: 1.15,
    sortOrder: 2,
    isActive: true,
  },
});

assert.deepEqual(
  calculateOrderPricing({
    material: { id: "pla", pricePerGram: 275, density: 1.25 },
    quality: { id: "normal", priceMultiplier: 1.15 },
    settings: {
      markupPercentage: 0.15,
      platformFeePercentage: 0.1,
      machineRatePerHour: 10000,
      estimatedPrintSpeed: 15000,
      defaultInfillPercentage: 0.2,
    },
    quantity: 2,
    modelVolumeMm3: 10000,
    shippingCost: 15000,
  }),
  {
    materialCost: 1581,
    timeCost: 15333,
    subtotal: 16914,
    markup: 2537,
    platformFee: 1691,
    shippingCost: 15000,
    total: 36142,
  }
);

console.log("catalog master data tests passed");
