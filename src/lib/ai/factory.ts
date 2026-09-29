import type { AIProvider } from "./provider";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAIProvider } from "./providers/openai";

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  switch (provider) {
    case "openai":
      return createOpenAIProvider();
    case "gemini":
    default:
      return createGeminiProvider();
  }
}
