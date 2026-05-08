import type { ModelConfig } from "@/types/config";
import type { ModelConfigType } from "@/types/common";

export const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export function isModelConfigType(value: string | string[] | undefined): value is ModelConfigType {
  return value === "vision" || value === "tts";
}

export function getConfigTypeTitle(type: ModelConfigType): string {
  return type === "vision" ? "多模态模型配置" : "TTS 配置";
}

export function getConfigTypeShortTitle(type: ModelConfigType): string {
  return type === "vision" ? "Vision 配置" : "TTS 配置";
}

export function formatPlaybackSpeed(speed: number): string {
  return `${speed.toFixed(2).replace(/\.00$/, ".0").replace(/(\.\d)0$/, "$1")}x`;
}

export function formatConfigSummary(config: ModelConfig): string {
  if (config.type === "vision") {
    return config.model;
  }

  const parts = [config.model];

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

export function getVisionOpenAiCompatible(extraParams: string | null): boolean {
  const parsed = parseExtraParamsObject(extraParams);

  if (!parsed || typeof parsed.openaiCompatible !== "boolean") {
    return true;
  }

  return parsed.openaiCompatible;
}

export function getVisionAdvancedParamsText(extraParams: string | null): string {
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
