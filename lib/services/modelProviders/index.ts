import type { ModelConfig } from "@/types/config";
import type { ModelConfigProvider, ModelConfigType } from "@/types/common";

import { openAiCompatibleModelProvider } from "./openaiCompatible";
import type { ModelProvider } from "./types";
import { xiaomiMimoModelProvider } from "./xiaomiMimo";

const modelProviders: Record<ModelConfigProvider, ModelProvider> = {
  "openai-compatible": openAiCompatibleModelProvider,
  "xiaomi-mimo": xiaomiMimoModelProvider,
};

export function getModelProvider(provider: ModelConfigProvider): ModelProvider {
  return modelProviders[provider];
}

export function getModelProviderByConfig(config: ModelConfig): ModelProvider {
  return getModelProvider(config.provider);
}

export function assertModelProviderSupportsType(
  config: ModelConfig,
  type: ModelConfigType
): ModelProvider {
  const provider = getModelProviderByConfig(config);

  if (config.type !== type) {
    throw new Error(`配置 ${config.name} 不是 ${type.toUpperCase()} 类型。`);
  }

  if (type === "tts" && !provider.buildTtsRequest) {
    throw new Error(`${provider.label} 暂不支持 TTS 调用。`);
  }

  if (type === "vision" && !provider.buildVisionRequest) {
    throw new Error(`${provider.label} 暂不支持多模态文本调用。`);
  }

  return provider;
}
