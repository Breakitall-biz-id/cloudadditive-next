import { matchingConfigFromSettings } from "./config";
import { prismaMatchingRepository } from "./repository";

export async function loadMatchingConfig() {
  const settings = await prismaMatchingRepository.getMatchingSettings();
  return matchingConfigFromSettings(settings);
}
