import type { ModelConfig } from "@/types/config";
import type { ModelConfigProvider, ModelConfigType } from "@/types/common";

export const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export const MODEL_PROVIDER_OPTIONS: Record<
  ModelConfigType,
  { value: ModelConfigProvider; label: string; description: string }[]
> = {
  vision: [
    {
      value: "openai-compatible",
      label: "OpenAI 兼容",
      description: "标准 OpenAI 风格的多模态聊天补全接口。",
    },
    {
      value: "xiaomi-mimo",
      label: "Xiaomi MIMO",
      description: "当前按 Xiaomi MiMo 的 OpenAI 兼容接口调用，便于后续独立扩展。",
    },
  ],
  tts: [
    {
      value: "openai-compatible",
      label: "OpenAI 兼容",
      description: "标准 OpenAI 风格的语音合成接口。",
    },
    {
      value: "xiaomi-mimo",
      label: "Xiaomi MIMO",
      description: "当前按 Xiaomi MiMo 的 OpenAI 兼容 TTS 接口调用。",
    },
  ],
};

export function isModelConfigType(value: string | string[] | undefined): value is ModelConfigType {
  return value === "vision" || value === "tts";
}

export function getConfigTypeTitle(type: ModelConfigType): string {
  return type === "vision" ? "多模态模型配置" : "TTS 配置";
}

export function getConfigTypeShortTitle(type: ModelConfigType): string {
  return type === "vision" ? "Vision 配置" : "TTS 配置";
}

export function getModelProviderLabel(provider: ModelConfigProvider): string {
  return provider === "xiaomi-mimo" ? "Xiaomi MIMO" : "OpenAI 兼容";
}

export function getModelProviderDescription(
  type: ModelConfigType,
  provider: ModelConfigProvider
): string {
  const option = MODEL_PROVIDER_OPTIONS[type].find((item) => item.value === provider);

  return option?.description ?? "";
}

export function formatPlaybackSpeed(speed: number): string {
  return `${speed.toFixed(2).replace(/\.00$/, ".0").replace(/(\.\d)0$/, "$1")}x`;
}

export function formatConfigSummary(config: ModelConfig): string {
  if (config.type === "vision") {
    return `${getModelProviderLabel(config.provider)} · ${config.model}`;
  }

  const parts = [getModelProviderLabel(config.provider), config.model];

  if (config.voice) {
    parts.push(config.voice);
  }

  if (config.speed !== null) {
    parts.push(formatPlaybackSpeed(config.speed));
  }

  return parts.join(" · ");
}

export function parseExtraParamsObject(
  extraParams: string | null
): Record<string, unknown> | null {
  if (!extraParams?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(extraParams) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAdvancedParamsText(extraParams: string | null): string {
  const parsed = parseExtraParamsObject(extraParams);

  if (!parsed) {
    return "";
  }

  const { openaiCompatible: _openaiCompatible, ...rest } = parsed;

  if (Object.keys(rest).length === 0) {
    return "";
  }

  return JSON.stringify(rest, null, 2);
}
