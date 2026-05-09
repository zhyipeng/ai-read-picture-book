import {
  generateBookAudioFake,
  generateBookTextFake,
  generatePageAudioFake,
  generatePageTextFake,
} from "@/lib/services/fakeGeneration";
import { resolveEffectiveModelConfig } from "@/lib/services/modelConfigs";

import { generationProviderReal } from "./real";
import type {
  GenerateBookAudioParams,
  GenerateBookAudioResult,
  GenerateBookTextParams,
  GenerateBookTextResult,
  GeneratePageAudioParams,
  GeneratePageTextParams,
  GenerationProvider,
  GenerationProviderName,
} from "./types";

const generationProviders: Record<GenerationProviderName, GenerationProvider> = {
  fake: {
    name: "fake",
    generatePageText: generatePageTextFake,
    generatePageAudio: generatePageAudioFake,
    generateBookText: generateBookTextFake,
    generateBookAudio: generateBookAudioFake,
  },
  real: generationProviderReal,
};

const activeGenerationProviderName: GenerationProviderName = "real";

function getActiveGenerationProvider(): GenerationProvider {
  return generationProviders[activeGenerationProviderName];
}

export function getGenerationProviderName(): GenerationProviderName {
  return getActiveGenerationProvider().name;
}

export async function generatePageText(
  params: GeneratePageTextParams
) {
  await resolveEffectiveModelConfig(params.book, "vision");

  return getActiveGenerationProvider().generatePageText(params);
}

export async function generatePageAudio(
  params: GeneratePageAudioParams
) {
  await resolveEffectiveModelConfig(params.book, "tts");

  return getActiveGenerationProvider().generatePageAudio(params);
}

export async function generateBookText(
  params: GenerateBookTextParams
): Promise<GenerateBookTextResult> {
  await resolveEffectiveModelConfig(params.book, "vision");

  return getActiveGenerationProvider().generateBookText(params);
}

export async function generateBookAudio(
  params: GenerateBookAudioParams
): Promise<GenerateBookAudioResult> {
  await resolveEffectiveModelConfig(params.book, "tts");

  return getActiveGenerationProvider().generateBookAudio(params);
}
