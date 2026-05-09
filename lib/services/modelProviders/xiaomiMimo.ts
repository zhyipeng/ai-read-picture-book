import type { ModelProvider } from "./types";
import { assertObjectRecord, buildBearerHeaders, getExtraParams, joinUrl } from "./utils";

export const xiaomiMimoModelProvider: ModelProvider = {
  id: "xiaomi-mimo",
  label: "Xiaomi MIMO",
  buildVisionRequest({ config, prompt, systemPrompt, maxTokens, temperature }) {
    return {
      url: joinUrl(config.baseUrl, "/chat/completions"),
      method: "POST",
      headers: buildBearerHeaders(config.apiKeyRef),
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(systemPrompt?.trim()
            ? [
                {
                  role: "system",
                  content: systemPrompt.trim(),
                },
              ]
            : []),
          {
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
          },
        ],
        max_tokens: maxTokens,
        temperature,
        ...getExtraParams(config.extraParams),
      }),
    };
  },
  parseVisionResponse(response) {
    const payload = assertObjectRecord(response, "Xiaomi MIMO 响应格式无效。");
    const choices = payload.choices;

    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("Xiaomi MIMO 响应缺少 choices。");
    }

    const firstChoice = assertObjectRecord(choices[0], "Xiaomi MIMO choice 无效。");
    const message = assertObjectRecord(firstChoice.message, "Xiaomi MIMO message 无效。");

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("Xiaomi MIMO 响应缺少文本内容。");
    }

    return {
      content: message.content,
    };
  },
  buildTtsRequest({ config, text, voice, speed, responseFormat }) {
    return {
      url: joinUrl(config.baseUrl, "/chat/completions"),
      method: "POST",
      headers: buildBearerHeaders(config.apiKeyRef),
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "assistant",
            content: text,
          }
        ],
        audio: {
          "format": responseFormat ?? "mp3",
          "voice": voice ?? config.voice ?? "mimo_default",
        },
        ...getExtraParams(config.extraParams),
      }),
    };
  },
  parseTtsResponse(response) {
    const payload = assertObjectRecord(response, "Xiaomi MIMO TTS 响应格式无效。");
    const choices = payload.choices;

    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("Xiaomi MIMO TTS 响应缺少 choices。");
    }

    const firstChoice = assertObjectRecord(choices[0], "Xiaomi MIMO TTS choice 无效。");
    const message = assertObjectRecord(firstChoice.message, "Xiaomi MIMO TTS message 无效。");
    const audio = assertObjectRecord(message.audio, "Xiaomi MIMO TTS audio 无效。");

    if (typeof audio.data !== "string" || !audio.data.trim()) {
      throw new Error("Xiaomi MIMO TTS 响应缺少音频数据。");
    }

    return {
      audioBase64: audio.data,
    };
  },
};
