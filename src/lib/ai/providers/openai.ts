import type { AIProvider } from "@/lib/ai/provider";

export function createOpenAIProvider(): AIProvider {
  return {
    name: "openai",
    async generateText() {
      throw new Error("OpenAI provider is not implemented yet");
    },
  };
}
