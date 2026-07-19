import { secondsToWholeMinutes } from "./projection";

export type LegacyDurationMode = "report-only" | "interpret-seconds";

export function parseLegacyDurationArguments(args: readonly string[]) {
  const apply = args.includes("--apply");
  const interpretSeconds = args.includes("--interpret-seconds");

  if (apply && !interpretSeconds) {
    throw new Error("--apply requires --interpret-seconds");
  }

  return {
    apply,
    mode: interpretSeconds
      ? ("interpret-seconds" as const)
      : ("report-only" as const),
  };
}

export function interpretLegacyDuration(
  value: number | null,
  mode: LegacyDurationMode
): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (mode === "report-only") {
    return null;
  }

  return secondsToWholeMinutes(value);
}
