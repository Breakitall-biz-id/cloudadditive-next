export function normalizeAuditReason(value: FormDataEntryValue | string | null | undefined) {
  const reason = String(value ?? "").trim();
  if (!reason) {
    throw new Error("Audit reason is required");
  }
  if (reason.length < 5) {
    throw new Error("Audit reason must be at least 5 characters");
  }
  return reason;
}

export function normalizeOptionalAuditReason(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string
) {
  const reason = String(value ?? "").trim();
  if (reason) {
    return normalizeAuditReason(reason);
  }

  const fallbackReason = String(fallback ?? "").trim();
  if (!fallbackReason) {
    throw new Error("Fallback audit reason is required");
  }
  return fallbackReason;
}

export function parsePercentageInput(value: FormDataEntryValue | string | null | undefined) {
  const raw = String(value ?? "").trim();
  const numeric = Number(raw);

  if (!Number.isFinite(numeric)) {
    throw new Error("Percentage must be a valid number");
  }

  const decimal = numeric > 1 ? numeric / 100 : numeric;
  if (decimal < 0 || decimal > 1) {
    throw new Error("Percentage must be between 0 and 100");
  }

  return decimal;
}

export function parsePositiveNumberInput(value: FormDataEntryValue | string | null | undefined, label: string) {
  const numeric = Number(String(value ?? "").trim());
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} must be a valid number`);
  }
  if (numeric < 0) {
    throw new Error(`${label} must be positive`);
  }
  return numeric;
}

export function buildAuditMetadata<T extends Record<string, unknown>>(metadata: T) {
  return metadata;
}
