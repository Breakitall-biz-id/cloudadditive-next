export type PrinterOperationalStatus =
  | "ONLINE"
  | "OFFLINE"
  | "PRINTING"
  | "PAUSED"
  | "MAINTENANCE"
  | "ERROR";

export type PrinterStateUpdate = {
  status: PrinterOperationalStatus;
  isAcceptingOrders: boolean;
};

type HeartbeatState = {
  status: PrinterOperationalStatus | string;
  lastSeenAt: Date | string | null | undefined;
};

type PrinterStartState = HeartbeatState & {
  isAcceptingOrders: boolean;
};

const NON_ACCEPTING_STATUSES = new Set<PrinterOperationalStatus>([
  "OFFLINE",
  "ERROR",
  "MAINTENANCE",
]);

export function isHeartbeatFresh(
  lastSeenAt: Date | string | null | undefined,
  now: Date,
  timeoutSeconds: number
): boolean {
  if (!lastSeenAt || !Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    return false;
  }

  const lastSeenTime = new Date(lastSeenAt).getTime();
  const nowTime = now.getTime();
  if (!Number.isFinite(lastSeenTime) || !Number.isFinite(nowTime)) {
    return false;
  }

  return nowTime - lastSeenTime <= timeoutSeconds * 1000;
}

export function resolvePrinterStateUpdate(
  status: PrinterOperationalStatus,
  currentIsAcceptingOrders: boolean
): PrinterStateUpdate {
  return {
    status,
    isAcceptingOrders: NON_ACCEPTING_STATUSES.has(status)
      ? false
      : currentIsAcceptingOrders,
  };
}

export function buildPrinterHeartbeatUpdate(
  status: PrinterOperationalStatus,
  currentIsAcceptingOrders: boolean,
  now = new Date()
): PrinterStateUpdate & { lastSeenAt: Date } {
  return {
    ...resolvePrinterStateUpdate(status, currentIsAcceptingOrders),
    lastSeenAt: now,
  };
}

export function validateAcceptingOrders(
  nextIsAcceptingOrders: boolean,
  printer: HeartbeatState,
  now = new Date(),
  timeoutSeconds = 120
): boolean {
  if (!nextIsAcceptingOrders) {
    return false;
  }

  if (printer.status !== "ONLINE") {
    throw new Error("Printer must be ONLINE before accepting orders");
  }

  if (!isHeartbeatFresh(printer.lastSeenAt, now, timeoutSeconds)) {
    throw new Error("Printer must have a fresh heartbeat before accepting orders");
  }

  return true;
}

export function resolveRequestedReadiness(
  requested: boolean | undefined,
  printer: HeartbeatState,
  now = new Date(),
  timeoutSeconds = 120
): boolean | undefined {
  if (requested === undefined) {
    return undefined;
  }

  return validateAcceptingOrders(requested, printer, now, timeoutSeconds);
}

export function getPrinterStartBlockReason(
  printer: PrinterStartState,
  now = new Date(),
  timeoutSeconds = 120
): string | null {
  if (printer.status !== "ONLINE") {
    return `Printer is ${printer.status.toLowerCase()}`;
  }

  if (!printer.isAcceptingOrders) {
    return "Printer is not accepting orders";
  }

  if (!printer.lastSeenAt) {
    return "Printer has no heartbeat";
  }

  if (!isHeartbeatFresh(printer.lastSeenAt, now, timeoutSeconds)) {
    return "Printer heartbeat is stale";
  }

  return null;
}
