export type MatchingAlgorithmMode = "WEIGHTED_SCORE" | "NSGA2";
export type Nsga2DecisionPolicy = "BALANCED" | "FASTEST" | "FAIREST" | "CLOSEST";

export type Nsga2Config = {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  seed: number;
  decisionPolicy: Nsga2DecisionPolicy;
};

export type MatchingConfig = {
  algorithmMode: MatchingAlgorithmMode;
  distanceWeight: number;
  queueDurationWeight: number;
  queueCountWeight: number;
  loadedMaterialWeight: number;
  heartbeatTimeoutSeconds: number;
  maxDistanceKm: number;
  maxQueueMinutes: number;
  maxQueueJobs: number;
  nsga2: Nsga2Config;
};

export type MatchingConfigInput = Omit<MatchingConfig, "algorithmMode" | "nsga2"> & {
  algorithmMode?: unknown;
  nsga2?: Partial<Omit<Nsga2Config, "decisionPolicy">> & {
    decisionPolicy?: unknown;
  };
};

export type MatchingSettingsData = {
  matchingAlgorithmMode: string;
  matchingDistanceWeight: number;
  matchingQueueDurationWeight: number;
  matchingQueueCountWeight: number;
  matchingLoadedMaterialWeight: number;
  matchingHeartbeatTimeoutSeconds: number;
  matchingMaxDistanceKm: number;
  matchingMaxQueueMinutes: number;
  matchingMaxQueueJobs: number;
  matchingNsga2PopulationSize: number;
  matchingNsga2Generations: number;
  matchingNsga2MutationRate: number;
  matchingNsga2CrossoverRate: number;
  matchingNsga2Seed: number;
  matchingNsga2DecisionPolicy: string;
};

export const DEFAULT_NSGA2_CONFIG: Readonly<Nsga2Config> = Object.freeze({
  populationSize: 48,
  generations: 60,
  mutationRate: 0.12,
  crossoverRate: 0.9,
  seed: 42,
  decisionPolicy: "BALANCED",
});

export const DEFAULT_MATCHING_CONFIG: Readonly<MatchingConfig> = Object.freeze({
  algorithmMode: "WEIGHTED_SCORE",
  distanceWeight: 0.25,
  queueDurationWeight: 0.35,
  queueCountWeight: 0.25,
  loadedMaterialWeight: 0.15,
  heartbeatTimeoutSeconds: 120,
  maxDistanceKm: 100,
  maxQueueMinutes: 1440,
  maxQueueJobs: 20,
  nsga2: DEFAULT_NSGA2_CONFIG,
});

const WEIGHT_FIELDS = [
  "distanceWeight",
  "queueDurationWeight",
  "queueCountWeight",
  "loadedMaterialWeight",
] as const;

const LIMIT_FIELDS = [
  "heartbeatTimeoutSeconds",
  "maxDistanceKm",
  "maxQueueMinutes",
  "maxQueueJobs",
] as const;

const WEIGHT_TOTAL_EPSILON = 1e-9;

function normalizeWeight(weightPercent: number) {
  return Math.round((weightPercent / 100) * 1e12) / 1e12;
}

function parseAlgorithmMode(value: unknown): MatchingAlgorithmMode {
  return value === "NSGA2" ? "NSGA2" : "WEIGHTED_SCORE";
}

function parseDecisionPolicy(value: unknown): Nsga2DecisionPolicy {
  if (value === "FASTEST" || value === "FAIREST" || value === "CLOSEST") return value;
  return "BALANCED";
}

function validateNsga2Config(input?: MatchingConfigInput["nsga2"]): Nsga2Config {
  const merged = {
    populationSize: input?.populationSize ?? DEFAULT_NSGA2_CONFIG.populationSize,
    generations: input?.generations ?? DEFAULT_NSGA2_CONFIG.generations,
    mutationRate: input?.mutationRate ?? DEFAULT_NSGA2_CONFIG.mutationRate,
    crossoverRate: input?.crossoverRate ?? DEFAULT_NSGA2_CONFIG.crossoverRate,
    seed: input?.seed ?? DEFAULT_NSGA2_CONFIG.seed,
    decisionPolicy: parseDecisionPolicy(input?.decisionPolicy ?? DEFAULT_NSGA2_CONFIG.decisionPolicy),
  };

  if (!Number.isFinite(merged.populationSize) || merged.populationSize < 4 || merged.populationSize > 200) {
    throw new Error("nsga2.populationSize must be between 4 and 200");
  }
  if (!Number.isFinite(merged.generations) || merged.generations < 1 || merged.generations > 300) {
    throw new Error("nsga2.generations must be between 1 and 300");
  }
  if (!Number.isFinite(merged.mutationRate) || merged.mutationRate < 0 || merged.mutationRate > 1) {
    throw new Error("nsga2.mutationRate must be between 0 and 1");
  }
  if (!Number.isFinite(merged.crossoverRate) || merged.crossoverRate < 0 || merged.crossoverRate > 1) {
    throw new Error("nsga2.crossoverRate must be between 0 and 1");
  }
  if (!Number.isFinite(merged.seed) || merged.seed < 0 || merged.seed > 2_147_483_647) {
    throw new Error("nsga2.seed must be between 0 and 2147483647");
  }

  return {
    populationSize: Math.round(merged.populationSize),
    generations: Math.round(merged.generations),
    mutationRate: merged.mutationRate,
    crossoverRate: merged.crossoverRate,
    seed: Math.round(merged.seed),
    decisionPolicy: merged.decisionPolicy,
  };
}

function nsga2ConfigFromSettings(settings: MatchingSettingsData): Nsga2Config {
  const populationSize = settings.matchingNsga2PopulationSize;
  const generations = settings.matchingNsga2Generations;
  const mutationRate = settings.matchingNsga2MutationRate;
  const crossoverRate = settings.matchingNsga2CrossoverRate;
  const seed = settings.matchingNsga2Seed;

  return {
    populationSize: Number.isFinite(populationSize) && populationSize >= 4 && populationSize <= 200
      ? Math.round(populationSize)
      : DEFAULT_NSGA2_CONFIG.populationSize,
    generations: Number.isFinite(generations) && generations >= 1 && generations <= 300
      ? Math.round(generations)
      : DEFAULT_NSGA2_CONFIG.generations,
    mutationRate: Number.isFinite(mutationRate) && mutationRate >= 0 && mutationRate <= 1
      ? mutationRate
      : DEFAULT_NSGA2_CONFIG.mutationRate,
    crossoverRate: Number.isFinite(crossoverRate) && crossoverRate >= 0 && crossoverRate <= 1
      ? crossoverRate
      : DEFAULT_NSGA2_CONFIG.crossoverRate,
    seed: Number.isFinite(seed) && seed >= 0 && seed <= 2_147_483_647
      ? Math.round(seed)
      : DEFAULT_NSGA2_CONFIG.seed,
    decisionPolicy: parseDecisionPolicy(settings.matchingNsga2DecisionPolicy),
  };
}

export function validateMatchingConfig(input: MatchingConfigInput): MatchingConfig {
  const algorithmMode = parseAlgorithmMode(input.algorithmMode);
  const weightsAreNumeric = WEIGHT_FIELDS.every((field) => Number.isFinite(input[field]) && input[field] >= 0 && input[field] <= 100);
  const weightTotal = weightsAreNumeric ? WEIGHT_FIELDS.reduce((total, field) => total + input[field], 0) : Number.NaN;
  const weightsAreReady = weightsAreNumeric && Math.abs(weightTotal - 100) <= WEIGHT_TOTAL_EPSILON;

  if (algorithmMode === "WEIGHTED_SCORE") {
    for (const field of WEIGHT_FIELDS) {
      if (!Number.isFinite(input[field]) || input[field] < 0 || input[field] > 100) {
        throw new Error(`${field} must be between 0 and 100`);
      }
    }

    if (!weightsAreReady) {
      throw new Error("Matching weights must sum to 100");
    }
  }

  for (const field of LIMIT_FIELDS) {
    if (!Number.isFinite(input[field]) || input[field] <= 0) {
      throw new Error(`${field} must be positive`);
    }
  }

  const weights = weightsAreReady ? {
    distanceWeight: normalizeWeight(input.distanceWeight),
    queueDurationWeight: normalizeWeight(input.queueDurationWeight),
    queueCountWeight: normalizeWeight(input.queueCountWeight),
    loadedMaterialWeight: normalizeWeight(input.loadedMaterialWeight),
  } : {
    distanceWeight: DEFAULT_MATCHING_CONFIG.distanceWeight,
    queueDurationWeight: DEFAULT_MATCHING_CONFIG.queueDurationWeight,
    queueCountWeight: DEFAULT_MATCHING_CONFIG.queueCountWeight,
    loadedMaterialWeight: DEFAULT_MATCHING_CONFIG.loadedMaterialWeight,
  };

  return {
    algorithmMode,
    ...weights,
    heartbeatTimeoutSeconds: Math.round(input.heartbeatTimeoutSeconds),
    maxDistanceKm: input.maxDistanceKm,
    maxQueueMinutes: Math.round(input.maxQueueMinutes),
    maxQueueJobs: Math.round(input.maxQueueJobs),
    nsga2: validateNsga2Config(input.nsga2),
  };
}

export function matchingConfigFromSettings(
  settings: MatchingSettingsData | null | undefined
): MatchingConfig {
  if (!settings) {
    return { ...DEFAULT_MATCHING_CONFIG, nsga2: { ...DEFAULT_NSGA2_CONFIG } };
  }

  return {
    algorithmMode: parseAlgorithmMode(settings.matchingAlgorithmMode),
    distanceWeight: settings.matchingDistanceWeight,
    queueDurationWeight: settings.matchingQueueDurationWeight,
    queueCountWeight: settings.matchingQueueCountWeight,
    loadedMaterialWeight: settings.matchingLoadedMaterialWeight,
    heartbeatTimeoutSeconds: settings.matchingHeartbeatTimeoutSeconds,
    maxDistanceKm: settings.matchingMaxDistanceKm,
    maxQueueMinutes: settings.matchingMaxQueueMinutes,
    maxQueueJobs: settings.matchingMaxQueueJobs,
    nsga2: nsga2ConfigFromSettings(settings),
  };
}

export function matchingConfigToSettingsData(config: MatchingConfig): MatchingSettingsData {
  return {
    matchingAlgorithmMode: config.algorithmMode,
    matchingDistanceWeight: config.distanceWeight,
    matchingQueueDurationWeight: config.queueDurationWeight,
    matchingQueueCountWeight: config.queueCountWeight,
    matchingLoadedMaterialWeight: config.loadedMaterialWeight,
    matchingHeartbeatTimeoutSeconds: config.heartbeatTimeoutSeconds,
    matchingMaxDistanceKm: config.maxDistanceKm,
    matchingMaxQueueMinutes: config.maxQueueMinutes,
    matchingMaxQueueJobs: config.maxQueueJobs,
    matchingNsga2PopulationSize: config.nsga2.populationSize,
    matchingNsga2Generations: config.nsga2.generations,
    matchingNsga2MutationRate: config.nsga2.mutationRate,
    matchingNsga2CrossoverRate: config.nsga2.crossoverRate,
    matchingNsga2Seed: config.nsga2.seed,
    matchingNsga2DecisionPolicy: config.nsga2.decisionPolicy,
  };
}
