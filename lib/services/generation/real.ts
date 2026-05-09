import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { updatePage } from "@/lib/db/pages";
import { resolveEffectiveModelConfig } from "@/lib/services/modelConfigs";
import {
  getModelProviderByConfig,
} from "@/lib/services/modelProviders";
import { getPersistedImageUri, writeAudioToPage } from "@/lib/storage/files";
import type { Page } from "@/types/page";

import { executeHttpModelRequest } from "./httpClient";
import type {
  GenerateBookAudioParams,
  GenerateBookAudioResult,
  GenerateBookTextParams,
  GenerateBookTextResult,
  GeneratePageAudioParams,
  GeneratePageTextParams,
  GenerationProvider,
} from "./types";

function estimateAudioDurationSeconds(text: string): number {
  return Math.max(2, Math.ceil(text.trim().length / 10));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader 读取失败"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader 错误"));
    reader.readAsDataURL(blob);
  });
}

async function readImageAsDataUrl(imagePath: string): Promise<string> {
  if (Platform.OS === "web") {
    const { uri, revoke } = await getPersistedImageUri(imagePath);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blobToDataUrl(blob);
    } finally {
      revoke?.();
    }
  }

  const base64 = await FileSystem.readAsStringAsync(imagePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const ext = imagePath.split(".").pop() ?? "jpg";
  return `data:image/${ext};base64,${base64}`;
}

const ZH_VISION_SYSTEM_PROMPT = `你是一位儿童绘本编辑，精通图文分析与亲子共读文字创作。`;

const ZH_VISION_USER_PROMPT = `请仔细观察这幅绘本页面图片，完成以下任务：

1. **originalText**: 识别并提取页面中出现的所有文字内容。如果页面没有文字，请用一句话描述画面的核心内容。
2. **sceneDescription**: 简洁描述画面场景（1-2句），包含主要人物/角色、动作、环境氛围。
3. **readAloudText**: 撰写一段适合朗读给3-6岁小朋友听的文字，尽可能还原页面内容，语言亲切温暖，富有画面感和韵律感，适合亲子共读。

请只返回 JSON，不要加任何其他内容：
{
  "originalText": "...",
  "sceneDescription": "...",
  "readAloudText": "..."
}`;

const EN_VISION_SYSTEM_PROMPT = `You are a children's book editor, skilled in image-text analysis and creating narration for parent-child reading.`;

const EN_VISION_USER_PROMPT = `Look at this picture book page image and complete the following tasks:

1. **originalText**: Extract all visible text from the page. If there's no text, describe the core content in one sentence.
2. **sceneDescription**: Briefly describe the scene (1-2 sentences), including main characters, actions, and atmosphere.
3. **readAloudText**: Write a narration suitable for reading aloud to children ages 3-6. Restore page content as much as possible. Use warm, engaging language with vivid imagery and rhythm.

Return ONLY a JSON object, nothing else:
{
  "originalText": "...",
  "sceneDescription": "...",
  "readAloudText": "..."
}`;

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```[a-z]*\s*$/gm, "")
    .trim();
}

function parseVisionJsonResponse(content: string): {
  originalText: string;
  sceneDescription: string;
  readAloudText: string;
} {
  const body = stripMarkdownFences(content);
  const match = body.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  throw new Error("无法从模型返回中解析 JSON。");
}

async function generatePageTextReal(
  params: GeneratePageTextParams
): Promise<Page> {
  const { book, page } = params;

  const modelConfig = await resolveEffectiveModelConfig(book, "vision");
  if (!modelConfig) {
    throw new Error("未配置 Vision 模型，无法生成文本。");
  }

  await updatePage(page.id, { textStatus: "generating", lastError: null });

  try {
    const provider = getModelProviderByConfig(modelConfig);
    const imageDataUrl = await readImageAsDataUrl(page.imagePath);
    const isZh = book.language === "zh";

    const request = provider.buildVisionRequest!({
      config: modelConfig,
      prompt: [
        { type: "image", imageUrl: imageDataUrl },
        { type: "text", text: isZh ? ZH_VISION_USER_PROMPT : EN_VISION_USER_PROMPT },
      ],
      systemPrompt: isZh ? ZH_VISION_SYSTEM_PROMPT : EN_VISION_SYSTEM_PROMPT,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const response = await executeHttpModelRequest(request);
    const parsed = provider.parseVisionResponse!(response);
    const result = parseVisionJsonResponse(parsed.content);

    return updatePage(page.id, {
      originalText: result.originalText,
      sceneDescription: result.sceneDescription,
      readAloudText: result.readAloudText,
      textStatus: "done",
      audioStatus: "idle",
      audioPath: null,
      audioDuration: null,
      lastError: null,
      hasManualEdit: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文本生成失败";
    await updatePage(page.id, { textStatus: "error", lastError: message });
    throw error;
  }
}

async function generatePageAudioReal(
  params: GeneratePageAudioParams
): Promise<Page> {
  const { book, page } = params;
  const readAloudText = page.readAloudText.trim();

  if (!readAloudText) {
    await updatePage(page.id, {
      audioStatus: "error",
      lastError: "缺少朗读文本，无法生成语音。",
    });
    throw new Error("缺少朗读文本，无法生成语音。");
  }

  const modelConfig = await resolveEffectiveModelConfig(book, "tts");
  if (!modelConfig) {
    throw new Error("未配置 TTS 模型，无法生成语音。");
  }

  await updatePage(page.id, { audioStatus: "generating", lastError: null });

  try {
    const provider = getModelProviderByConfig(modelConfig);

    const request = provider.buildTtsRequest!({
      config: modelConfig,
      text: readAloudText,
    });

    const response = await executeHttpModelRequest(request);
    const parsed = provider.parseTtsResponse!(response);

    const audioPath = await writeAudioToPage({
      bookId: book.id,
      pageId: page.id,
      base64Audio: parsed.audioBase64,
    });

    return updatePage(page.id, {
      audioStatus: "done",
      audioPath,
      audioDuration: estimateAudioDurationSeconds(readAloudText),
      lastError: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "语音生成失败";
    await updatePage(page.id, { audioStatus: "error", lastError: message });
    throw error;
  }
}

async function generateBookTextReal(
  params: GenerateBookTextParams
): Promise<GenerateBookTextResult> {
  const { book, pages } = params;

  for (const page of pages) {
    await generatePageTextReal({ book, page });
  }

  return { generatedCount: pages.length };
}

async function generateBookAudioReal(
  params: GenerateBookAudioParams
): Promise<GenerateBookAudioResult> {
  const { book, pages } = params;
  const eligiblePages = pages.filter(
    (page) => page.readAloudText.trim().length > 0
  );

  for (const page of eligiblePages) {
    await generatePageAudioReal({ book, page });
  }

  return {
    generatedCount: eligiblePages.length,
    skippedCount: pages.length - eligiblePages.length,
  };
}

export const generationProviderReal: GenerationProvider = {
  name: "real",
  generatePageText: generatePageTextReal,
  generatePageAudio: generatePageAudioReal,
  generateBookText: generateBookTextReal,
  generateBookAudio: generateBookAudioReal,
};
