export type MaterialCatalogData = {
  name: string;
  type: string;
  description: string | null;
  pricePerGram: number;
  density: number;
  diameter: number;
  nozzleTemp: number | null;
  bedTemp: number | null;
  isActive: boolean;
};

export type PrintQualityCatalogData = {
  name: string;
  description: string | null;
  layerHeight: number;
  speedMultiplier: number;
  priceMultiplier: number;
  sortOrder: number;
  isActive: boolean;
};

function readText(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} is required`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readPositiveNumber(formData: FormData, key: string, label: string) {
  const value = Number(String(formData.get(key) ?? "").trim());
  if (!Number.isFinite(value)) throw new Error(`${label} must be a valid number`);
  if (value <= 0) throw new Error(`${label} must be positive`);
  return value;
}

function readOptionalInteger(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${label} must be a whole number`);
  if (value < 0) throw new Error(`${label} must be positive`);
  return value;
}

function readInteger(formData: FormData, key: string, label: string) {
  const value = Number(String(formData.get(key) ?? "").trim());
  if (!Number.isInteger(value)) throw new Error(`${label} must be a whole number`);
  if (value < 0) throw new Error(`${label} must be positive`);
  return value;
}

export function parseMaterialColors(value: FormDataEntryValue | string | null | undefined) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [namePart, hexPart] = line.split(":");
    const name = String(namePart ?? "").trim();
    const hexCode = String(hexPart ?? "").trim();
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(hexCode)) {
      throw new Error("Colors must use Name:#RRGGBB format");
    }
    return { name, hexCode };
  });
}

export function parseMaterialCatalogForm(formData: FormData) {
  const materialId = String(formData.get("materialId") ?? "").trim() || null;
  return {
    materialId,
    data: {
      name: readText(formData, "name", "Material name"),
      type: readText(formData, "type", "Material type"),
      description: readOptionalText(formData, "description"),
      pricePerGram: readPositiveNumber(formData, "pricePerGram", "Material price"),
      density: readPositiveNumber(formData, "density", "Material density"),
      diameter: readPositiveNumber(formData, "diameter", "Material diameter"),
      nozzleTemp: readOptionalInteger(formData, "nozzleTemp", "Nozzle temperature"),
      bedTemp: readOptionalInteger(formData, "bedTemp", "Bed temperature"),
      isActive: formData.get("isActive") === "true",
    } satisfies MaterialCatalogData,
    colors: parseMaterialColors(formData.get("colors")),
  };
}

export function parsePrintQualityCatalogForm(formData: FormData) {
  const qualityId = String(formData.get("qualityId") ?? "").trim() || null;
  return {
    qualityId,
    data: {
      name: readText(formData, "name", "Quality name"),
      description: readOptionalText(formData, "description"),
      layerHeight: readPositiveNumber(formData, "layerHeight", "Layer height"),
      speedMultiplier: readPositiveNumber(formData, "speedMultiplier", "Speed multiplier"),
      priceMultiplier: readPositiveNumber(formData, "priceMultiplier", "Price multiplier"),
      sortOrder: readInteger(formData, "sortOrder", "Sort order"),
      isActive: formData.get("isActive") === "true",
    } satisfies PrintQualityCatalogData,
  };
}
