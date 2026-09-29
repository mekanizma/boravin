export type AIGenerateOptions = {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

export interface AIProvider {
  name: string;
  generateText(prompt: string, options?: AIGenerateOptions): Promise<string>;
}

export interface ImageGenerationProvider {
  name: string;
  generateImage(prompt: string, options?: { aspectRatio?: string }): Promise<{
    url?: string;
    prompt: string;
    base64?: string;
  }>;
}
