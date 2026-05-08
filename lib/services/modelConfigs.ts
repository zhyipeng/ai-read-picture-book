import { getModelConfigById } from "@/lib/db/modelConfigs";
import { getAppSettings } from "@/lib/db/settings";
import { assertModelProviderSupportsType } from "@/lib/services/modelProviders";
import type { Book } from "@/types/book";
import type { ModelConfig } from "@/types/config";
import type { ModelConfigType } from "@/types/common";

function getEffectiveConfigId(book: Book, type: ModelConfigType, settings: Awaited<ReturnType<typeof getAppSettings>>) {
  if (type === "vision") {
    if (book.visionConfigId) {
      return book.visionConfigId;
    }

    return book.language === "zh"
      ? settings.defaultZhVisionConfigId
      : settings.defaultEnVisionConfigId;
  }

  if (book.ttsConfigId) {
    return book.ttsConfigId;
  }

  return book.language === "zh"
    ? settings.defaultZhTtsConfigId
    : settings.defaultEnTtsConfigId;
}

export async function resolveEffectiveModelConfig(
  book: Book,
  type: ModelConfigType
): Promise<ModelConfig | null> {
  const settings = await getAppSettings();
  const configId = getEffectiveConfigId(book, type, settings);

  if (!configId) {
    return null;
  }

  const config = await getModelConfigById(configId);

  if (!config) {
    return null;
  }

  assertModelProviderSupportsType(config, type);

  return config;
}
