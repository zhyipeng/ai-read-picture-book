import type { ModelProvider } from "./types";
import { assertObjectRecord, buildBearerHeaders, getExtraParams, joinUrl } from "./utils";

export const openAiCompatibleModelProvider: ModelProvider = {
  id: "openai-compatible",
  label: "OpenAI 兼容",
  buildVisionRequest({ config, prompt, systemPrompt, maxTokens, temperature }) {
    const messages: Array<Record<string, unknown>> = [];

    if (systemPrompt?.trim()) {
      messages.push({
        role: "system",
        content: systemPrompt.trim(),
      });
    }

    messages.push({
      role: "user",
      content: prompt.map((part) =>
        part.type === "text"
          ? {
              type: "text",
              text: part.text,
            }
          : {
              type: "image_url",
              image_url: {
                url: part.imageUrl,
              },
            }
      ),
    });

    return {
      url: joinUrl(config.baseUrl, "/chat/completions"),
      method: "POST",
      headers: buildBearerHeaders(config.apiKeyRef),
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...getExtraParams(config.extraParams),
      }),
    };
  },
  parseVisionResponse(response) {
    const payload = assertObjectRecord(response, "Vision 响应格式无效。");
    const choices = payload.choices;

    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("Vision 响应缺少 choices。");
    }

    const firstChoice = assertObjectRecord(choices[0], "Vision 响应 choice 无效。");
    const message = assertObjectRecord(firstChoice.message, "Vision 响应 message 无效。");

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("Vision 响应缺少文本内容。");
    }

    return {
      content: message.content,
    };
  },
  buildTtsRequest({ config, text, voice, speed, responseFormat }) {
    return {
      url: joinUrl(config.baseUrl, "/audio/speech"),
      method: "POST",
      headers: buildBearerHeaders(config.apiKeyRef),
      body: JSON.stringify({
        model: config.model,
        input: text,
        voice: voice ?? config.voice ?? undefined,
        speed: speed ?? config.speed ?? undefined,
        response_format: responseFormat ?? "mp3",
        ...getExtraParams(config.extraParams),
      }),
    };
  },
  parseTtsResponse(response) {
    const payload = assertObjectRecord(response, "TTS 响应格式无效。");

    if (typeof payload.audio !== "string" || !payload.audio.trim()) {
      throw new Error("TTS 响应缺少音频内容。");
    }

    return {
      audioBase64: payload.audio,
    };
  },
};
