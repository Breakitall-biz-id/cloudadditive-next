import assert from "node:assert/strict";
import {
  DEFAULT_MATCHING_CONFIG,
  DEFAULT_NSGA2_CONFIG,
  matchingConfigFromSettings,
  matchingConfigToSettingsData,
  validateMatchingConfig,
} from "../src/lib/printer-matching/config";

const validAdminInput = {
  algorithmMode: "WEIGHTED_SCORE" as const,
  distanceWeight: 25,
  queueDurationWeight: 35,
  queueCountWeight: 25,
  loadedMaterialWeight: 15,
  heartbeatTimeoutSeconds: 120,
  maxDistanceKm: 100,
  maxQueueMinutes: 1440,
  maxQueueJobs: 20,
  nsga2: DEFAULT_NSGA2_CONFIG,
};

assert.deepEqual(DEFAULT_MATCHING_CONFIG, {
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

assert.deepEqual(validateMatchingConfig(validAdminInput), DEFAULT_MATCHING_CONFIG);
assert.equal(validateMatchingConfig({ ...validAdminInput, algorithmMode: "NSGA2" }).algorithmMode, "NSGA2");

assert.deepEqual(
  validateMatchingConfig({
    ...validAdminInput,
    distanceWeight: 33.3,
    queueDurationWeight: 33.3,
    queueCountWeight: 33.3,
    loadedMaterialWeight: 0.1,
  }),
  {
    ...DEFAULT_MATCHING_CONFIG,
    distanceWeight: 0.333,
    queueDurationWeight: 0.333,
    queueCountWeight: 0.333,
    loadedMaterialWeight: 0.001,
  }
);

for (const weight of [
  "distanceWeight",
  "queueDurationWeight",
  "queueCountWeight",
  "loadedMaterialWeight",
] as const) {
  assert.throws(
    () => validateMatchingConfig({ ...validAdminInput, [weight]: -1 }),
    /between 0 and 100/
  );
  assert.throws(
    () => validateMatchingConfig({ ...validAdminInput, [weight]: 101 }),
    /between 0 and 100/
  );
}

assert.throws(
  () => validateMatchingConfig({ ...validAdminInput, distanceWeight: 30 }),
  /sum to 100/
);

for (const limit of [
  "heartbeatTimeoutSeconds",
  "maxDistanceKm",
  "maxQueueMinutes",
  "maxQueueJobs",
] as const) {
  assert.throws(
    () => validateMatchingConfig({ ...validAdminInput, [limit]: 0 }),
    /must be positive/
  );
}

assert.throws(
  () => validateMatchingConfig({ ...validAdminInput, nsga2: { ...DEFAULT_NSGA2_CONFIG, populationSize: 3 } }),
  /populationSize/
);
assert.throws(
  () => validateMatchingConfig({ ...validAdminInput, nsga2: { ...DEFAULT_NSGA2_CONFIG, mutationRate: 1.1 } }),
  /mutationRate/
);

assert.deepEqual(matchingConfigFromSettings(null), DEFAULT_MATCHING_CONFIG);
assert.notEqual(matchingConfigFromSettings(null), DEFAULT_MATCHING_CONFIG);


const legacySettingsWithoutNsga2 = {
  matchingAlgorithmMode: "WEIGHTED_SCORE",
  matchingDistanceWeight: 0.25,
  matchingQueueDurationWeight: 0.35,
  matchingQueueCountWeight: 0.25,
  matchingLoadedMaterialWeight: 0.15,
  matchingHeartbeatTimeoutSeconds: 120,
  matchingMaxDistanceKm: 100,
  matchingMaxQueueMinutes: 1440,
  matchingMaxQueueJobs: 20,
  matchingNsga2PopulationSize: undefined,
  matchingNsga2Generations: undefined,
  matchingNsga2MutationRate: undefined,
  matchingNsga2CrossoverRate: undefined,
  matchingNsga2Seed: undefined,
  matchingNsga2DecisionPolicy: undefined,
};

assert.deepEqual(
  matchingConfigFromSettings(legacySettingsWithoutNsga2 as never).nsga2,
  DEFAULT_NSGA2_CONFIG
);


const legacySettingsWithInvalidNsga2 = {
  ...legacySettingsWithoutNsga2,
  matchingNsga2PopulationSize: 0,
  matchingNsga2Generations: 0,
  matchingNsga2MutationRate: 2,
  matchingNsga2CrossoverRate: -1,
  matchingNsga2Seed: -1,
  matchingNsga2DecisionPolicy: "UNKNOWN",
};

assert.deepEqual(
  matchingConfigFromSettings(legacySettingsWithInvalidNsga2 as never).nsga2,
  DEFAULT_NSGA2_CONFIG
);

const settingsRow = {
  matchingAlgorithmMode: "NSGA2",
  matchingDistanceWeight: 0.2,
  matchingQueueDurationWeight: 0.4,
  matchingQueueCountWeight: 0.3,
  matchingLoadedMaterialWeight: 0.1,
  matchingHeartbeatTimeoutSeconds: 90,
  matchingMaxDistanceKm: 75,
  matchingMaxQueueMinutes: 720,
  matchingMaxQueueJobs: 12,
  matchingNsga2PopulationSize: 64,
  matchingNsga2Generations: 80,
  matchingNsga2MutationRate: 0.2,
  matchingNsga2CrossoverRate: 0.85,
  matchingNsga2Seed: 123,
  matchingNsga2DecisionPolicy: "FAIREST",
};

const customConfig = {
  algorithmMode: "NSGA2" as const,
  distanceWeight: 0.2,
  queueDurationWeight: 0.4,
  queueCountWeight: 0.3,
  loadedMaterialWeight: 0.1,
  heartbeatTimeoutSeconds: 90,
  maxDistanceKm: 75,
  maxQueueMinutes: 720,
  maxQueueJobs: 12,
  nsga2: {
    populationSize: 64,
    generations: 80,
    mutationRate: 0.2,
    crossoverRate: 0.85,
    seed: 123,
    decisionPolicy: "FAIREST" as const,
  },
};

assert.deepEqual(matchingConfigFromSettings(settingsRow), customConfig);
assert.deepEqual(matchingConfigToSettingsData(customConfig), settingsRow);

console.log("printer-matching-config tests passed");
