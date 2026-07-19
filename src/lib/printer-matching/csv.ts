import Papa from "papaparse";

export type MatchingCsvFileMode = "shared" | "per-row";

export type MatchingCsvRow = {
  rowNumber: number;
  label: string;
  materialId: string;
  latitude: number;
  longitude: number;
  quantity: number;
  estimatedMinutes: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  address: string;
  fileName: string;
  qualityId: string;
  qualityMode: "sliced" | "informational";
};

export type MatchingCsvParseResult = {
  validRows: MatchingCsvRow[];
  rowErrors: Array<{ rowNumber: number; message: string }>;
  globalErrors: string[];
};

type CsvOptions = {
  fileMode: MatchingCsvFileMode;
  sharedFileName?: string;
  uploadedFileNames: readonly string[];
};

type RawRow = Record<string, string | undefined>;

const REQUIRED_COLUMNS = [
  "label",
  "material_id",
  "latitude",
  "longitude",
  "quantity",
  "estimated_minutes",
  "width_mm",
  "depth_mm",
  "height_mm",
  "address",
  "file_name",
  "quality_id",
] as const;

const SUPPORTED_EXTENSIONS = [".stl", ".obj", ".gcode"];

function extension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

function parseFiniteNumber(
  value: string | undefined,
  label: string,
  constraints: { min?: number; max?: number; integer?: boolean } = {}
) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a number`);
  }
  if (constraints.integer && !Number.isInteger(number)) {
    throw new Error(`${label} must be a whole number`);
  }
  if (constraints.min !== undefined && number < constraints.min) {
    throw new Error(`${label} must be at least ${constraints.min}`);
  }
  if (constraints.max !== undefined && number > constraints.max) {
    throw new Error(`${label} must be at most ${constraints.max}`);
  }
  return number;
}

export function parseMatchingCsv(
  csv: string,
  options: CsvOptions
): MatchingCsvParseResult {
  const validRows: MatchingCsvRow[] = [];
  const rowErrors: MatchingCsvParseResult["rowErrors"] = [];
  const globalErrors: string[] = [];
  const parsed = Papa.parse<RawRow>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
    dynamicTyping: false,
  });

  const fields = new Set(parsed.meta.fields ?? []);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !fields.has(column));
  if (missingColumns.length > 0) {
    globalErrors.push(`Missing required columns: ${missingColumns.join(", ")}`);
  }
  if (parsed.data.length > 100) {
    globalErrors.push("CSV is limited to 100 scenarios per simulation");
  }
  for (const error of parsed.errors) {
    rowErrors.push({
      rowNumber: (error.row ?? 0) + 2,
      message: error.message,
    });
  }

  const normalizedUploads = options.uploadedFileNames.map((name) => name.trim().toLowerCase());
  const duplicateNames = normalizedUploads.filter(
    (name, index) => normalizedUploads.indexOf(name) !== index
  );
  if (duplicateNames.length > 0) {
    globalErrors.push(`Duplicate uploaded file names: ${[...new Set(duplicateNames)].join(", ")}`);
  }
  const uploadedNames = new Set(normalizedUploads);

  if (missingColumns.length > 0 || duplicateNames.length > 0) {
    return { validRows, rowErrors, globalErrors };
  }

  parsed.data.slice(0, 100).forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const fileName = (
        options.fileMode === "shared" ? options.sharedFileName : row.file_name
      )?.trim() ?? "";
      if (!fileName) {
        throw new Error("File name is required");
      }
      if (!uploadedNames.has(fileName.toLowerCase())) {
        throw new Error(`Uploaded file '${fileName}' was not found`);
      }
      const fileExtension = extension(fileName);
      if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
        throw new Error(`Unsupported file extension '${fileExtension || "none"}'`);
      }

      const label = row.label?.trim() ?? "";
      const materialId = row.material_id?.trim() ?? "";
      const address = row.address?.trim() ?? "";
      const qualityId = row.quality_id?.trim() ?? "";
      if (!label || !materialId || !address) {
        throw new Error("Label, material, and address are required");
      }
      if (fileExtension !== ".gcode" && !qualityId) {
        throw new Error("Quality is required for STL/OBJ scenarios");
      }

      validRows.push({
        rowNumber,
        label,
        materialId,
        latitude: parseFiniteNumber(row.latitude, "Latitude", { min: -90, max: 90 }),
        longitude: parseFiniteNumber(row.longitude, "Longitude", { min: -180, max: 180 }),
        quantity: parseFiniteNumber(row.quantity, "Quantity", { min: 1, integer: true }),
        estimatedMinutes: parseFiniteNumber(row.estimated_minutes, "Estimated minutes", { min: 1 }),
        widthMm: parseFiniteNumber(row.width_mm, "Width", { min: 0.01 }),
        depthMm: parseFiniteNumber(row.depth_mm, "Depth", { min: 0.01 }),
        heightMm: parseFiniteNumber(row.height_mm, "Height", { min: 0.01 }),
        address,
        fileName,
        qualityId,
        qualityMode: fileExtension === ".gcode" ? "informational" : "sliced",
      });
    } catch (error) {
      rowErrors.push({
        rowNumber,
        message: error instanceof Error ? error.message : "Invalid row",
      });
    }
  });

  return { validRows, rowErrors, globalErrors };
}
