import type { ModelConfig } from "@/types/config";
import type { ModelConfigProvider } from "@/types/common";

export type TextPromptPart = {
  type: "text";
  text: string;
};

export type ImagePromptPart = {
  type: "image";
  imageUrl: string;
};

export type VisionPromptPart = TextPromptPart | ImagePromptPart;

export type VisionModelRequestInput = {
  config: ModelConfig;
  prompt: VisionPromptPart[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
};

export type TtsModelRequestInput = {
  config: ModelConfig;
  text: string;
  voice?: string | null;
  speed?: number | null;
  responseFormat?: string;
};

export type HttpModelRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
};

export type VisionModelResponse = {
  content: string;
};

export type TtsModelResponse = {
  audioBase64: string;
};

export type ModelProvider = {
  id: ModelConfigProvider;
  label: string;
  buildVisionRequest?: (input: VisionModelRequestInput) => HttpModelRequest;
  parseVisionResponse?: (response: unknown) => VisionModelResponse;
  buildTtsRequest?: (input: TtsModelRequestInput) => HttpModelRequest;
  parseTtsResponse?: (response: unknown) => TtsModelResponse;
};
