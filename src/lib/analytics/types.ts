export type AnalyticsEventInput = {
  event: string;
  path?: string;
  productId?: string;
  sessionId?: string;
  customerId?: string;
  meta?: Record<string, unknown>;
};

export interface AnalyticsProvider {
  name: string;
  track(input: AnalyticsEventInput): Promise<void>;
}
