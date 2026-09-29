import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import type { AnalyticsEventInput, AnalyticsProvider } from "./types";

const internalProvider: AnalyticsProvider = {
  name: "internal",
  async track(input) {
    try {
      await db.insert(analyticsEvents).values({
        event: input.event,
        path: input.path,
        productId: input.productId,
        sessionId: input.sessionId,
        customerId: input.customerId,
        meta: input.meta ?? {},
      });
    } catch (error) {
      console.error("[analytics]", error);
    }
  },
};

export function getAnalyticsProvider(): AnalyticsProvider {
  return internalProvider;
}

export async function trackEvent(input: AnalyticsEventInput) {
  return getAnalyticsProvider().track(input);
}

export type { AnalyticsEventInput, AnalyticsProvider } from "./types";
