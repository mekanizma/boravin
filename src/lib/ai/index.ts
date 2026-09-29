export type { AIProvider, AIGenerateOptions } from "@/lib/ai/provider";
export { getAIProvider } from "@/lib/ai/factory";
export { generateValidated } from "@/lib/ai/validate";
export {
  getBrandGuidelines,
  getBrandContext,
  brandSystemPrompt,
} from "@/lib/ai/brand-context";
export type { BrandAIGuidelines } from "@/lib/ai/brand-context";

import { getAIProvider } from "@/lib/ai/factory";

export const ai = {
  getProvider: getAIProvider,
};
