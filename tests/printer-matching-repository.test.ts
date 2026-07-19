import assert from "node:assert/strict";
import { supportedMaterialIdsFromPrinter } from "../src/lib/printer-matching/repository";

assert.deepEqual(
  supportedMaterialIdsFromPrinter({ currentMaterialId: "abs", materials: [] }),
  ["abs"]
);

assert.deepEqual(
  supportedMaterialIdsFromPrinter({
    currentMaterialId: "pla",
    materials: [{ materialId: "pla" }, { materialId: "petg" }],
  }),
  ["pla", "petg"]
);

assert.deepEqual(
  supportedMaterialIdsFromPrinter({ currentMaterialId: null, materials: [{ materialId: "tpu" }] }),
  ["tpu"]
);

console.log("printer-matching-repository tests passed");
