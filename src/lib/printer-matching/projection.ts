export const ACTIVE_QUEUE_STATUSES = ["IN_QUEUE", "SLICING", "PRINTING"] as const;

export type QueueProjectionOrder = {
  status: string;
  estimatedPrintTime: number | null;
  quantity: number;
};

export type VirtualQueueWorkload = {
  minutes: number;
  jobs: number;
};

export type QueueProjection = {
  waitMinutes: number;
  jobsAhead: number;
  incomingMinutes: number;
  projectedMinutesAfter: number;
  projectedJobsAfter: number;
};

export type ProjectQueueInput = {
  orders: ReadonlyArray<QueueProjectionOrder>;
  preprocessingTime: number;
  incomingEstimatedMinutes?: number | null;
  incomingQuantity?: number;
  fallbackMinutes: number;
  virtual?: VirtualQueueWorkload;
};

export function secondsToWholeMinutes(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("Duration in seconds must be a non-negative finite number");
  }

  return Math.ceil(seconds / 60);
}

function positiveWholeMinutes(value: number | null, fallbackMinutes: number): number {
  if (!Number.isFinite(fallbackMinutes) || fallbackMinutes <= 0) {
    throw new Error("Fallback duration must be positive");
  }

  if (value === null || !Number.isFinite(value) || value <= 0) {
    return Math.ceil(fallbackMinutes);
  }

  return Math.ceil(value);
}

function wholePreprocessingMinutes(preprocessingTime: number): number {
  if (!Number.isFinite(preprocessingTime) || preprocessingTime < 0) {
    throw new Error("Preprocessing time must be non-negative");
  }

  return Math.ceil(preprocessingTime);
}

function wholeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.ceil(quantity);
}

function nonNegativeWhole(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative`);
  }

  return Math.ceil(value);
}

export function isActiveQueueStatus(status: string): boolean {
  return (ACTIVE_QUEUE_STATUSES as readonly string[]).includes(status);
}

export function calculateOrderWorkMinutes(
  order: Pick<QueueProjectionOrder, "estimatedPrintTime" | "quantity">,
  preprocessingTime: number,
  fallbackMinutes: number
): number {
  const durationMinutes = positiveWholeMinutes(order.estimatedPrintTime, fallbackMinutes);
  const quantity = wholeQuantity(order.quantity);

  return durationMinutes * quantity + wholePreprocessingMinutes(preprocessingTime);
}

export function projectQueue({
  orders,
  preprocessingTime,
  incomingEstimatedMinutes,
  incomingQuantity = 0,
  fallbackMinutes,
  virtual,
}: ProjectQueueInput): QueueProjection {
  const activeOrders = orders.filter((order) => isActiveQueueStatus(order.status));
  const realWaitMinutes = activeOrders.reduce(
    (total, order) =>
      total + calculateOrderWorkMinutes(order, preprocessingTime, fallbackMinutes),
    0
  );
  const virtualMinutes = virtual
    ? nonNegativeWhole(virtual.minutes, "Virtual queue minutes")
    : 0;
  const virtualJobs = virtual ? nonNegativeWhole(virtual.jobs, "Virtual queue jobs") : 0;
  const waitMinutes = realWaitMinutes + virtualMinutes;
  const jobsAhead = activeOrders.length + virtualJobs;
  const hasIncomingOrder = Number.isFinite(incomingQuantity) && incomingQuantity > 0;
  const incomingMinutes = hasIncomingOrder
    ? calculateOrderWorkMinutes(
        {
          estimatedPrintTime: incomingEstimatedMinutes ?? null,
          quantity: incomingQuantity,
        },
        preprocessingTime,
        fallbackMinutes
      )
    : 0;

  return {
    waitMinutes,
    jobsAhead,
    incomingMinutes,
    projectedMinutesAfter: waitMinutes + incomingMinutes,
    projectedJobsAfter: jobsAhead + (hasIncomingOrder ? 1 : 0),
  };
}
