import {
  generateBookAudioFake,
  generateBookTextFake,
  generatePageAudioFake,
  generatePageTextFake,
} from "@/lib/services/fakeGeneration";

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
};

const activeGenerationProviderName: GenerationProviderName = "fake";

function getActiveGenerationProvider(): GenerationProvider {
  return generationProviders[activeGenerationProviderName];
}

export function getGenerationProviderName(): GenerationProviderName {
  return getActiveGenerationProvider().name;
}

export async function generatePageText(
  params: GeneratePageTextParams
) {
  return getActiveGenerationProvider().generatePageText(params);
}

export async function generatePageAudio(
  params: GeneratePageAudioParams
) {
  return getActiveGenerationProvider().generatePageAudio(params);
}

export async function generateBookText(
  params: GenerateBookTextParams
): Promise<GenerateBookTextResult> {
  return getActiveGenerationProvider().generateBookText(params);
}

export async function generateBookAudio(
  params: GenerateBookAudioParams
): Promise<GenerateBookAudioResult> {
  return getActiveGenerationProvider().generateBookAudio(params);
}
