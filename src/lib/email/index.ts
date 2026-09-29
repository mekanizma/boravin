import type { EmailProvider } from "./types";
import { mockEmailProvider } from "./providers/mock";

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? "mock";
  switch (provider) {
    case "mock":
    default:
      return mockEmailProvider;
  }
}

export type { EmailProvider, EmailPayload } from "./types";
