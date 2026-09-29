import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiApiKey, geminiModel, geminiRequestOptions } from "@/lib/ai/gemini-env";
import type { AIGenerateOptions, AIProvider } from "@/lib/ai/provider";

export function createGeminiProvider(): AIProvider {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return {
      name: "gemini",
      async generateText() {
        throw new Error("GEMINI_API_KEY is not configured");
      },
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = geminiModel();
  const requestOptions = geminiRequestOptions();

  return {
    name: "gemini",
    async generateText(prompt, options: AIGenerateOptions = {}) {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          systemInstruction: options.system,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
            responseMimeType: options.json ? "application/json" : "text/plain",
          },
        },
        requestOptions,
      );
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text?.trim()) {
        throw new Error("Gemini returned an empty response");
      }
      return text.trim();
    },
  };
}
