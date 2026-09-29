import { randomUUID } from "node:crypto";
import type {
  CreateShipmentInput,
  ShippingProvider,
  ShippingRate,
  ShippingRateRequest,
  ShipmentResult,
} from "@/lib/shipping/types";

const shipments = new Map<string, ShipmentResult>();

const MOCK_METHODS = [
  {
    methodId: "mock-standard",
    name: "Standart Kargo",
    carrier: "BORAVIN Express",
    price: 79.9,
    freeAbove: 1500,
    etaDaysMin: 1,
    etaDaysMax: 3,
  },
  {
    methodId: "mock-express",
    name: "Hızlı Teslimat",
    carrier: "BORAVIN SameDay",
    price: 149.9,
    freeAbove: 3000,
    etaDaysMin: 0,
    etaDaysMax: 1,
  },
] as const;

export class MockShippingProvider implements ShippingProvider {
  readonly name = "mock";

  async getRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    return MOCK_METHODS.map((method) => {
      const free = request.subtotal >= method.freeAbove;
      return {
        methodId: method.methodId,
        name: method.name,
        carrier: method.carrier,
        price: free ? 0 : method.price,
        currency: request.currency,
        etaDaysMin: method.etaDaysMin,
        etaDaysMax: method.etaDaysMax,
        freeShippingApplied: free,
      };
    });
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const method =
      MOCK_METHODS.find((m) => m.methodId === input.methodId) ??
      MOCK_METHODS[0];
    const trackingNumber = `BRV${Date.now().toString(36).toUpperCase()}`;
    const result: ShipmentResult = {
      provider: this.name,
      shipmentId: `mock_ship_${randomUUID()}`,
      trackingNumber,
      carrier: method.carrier,
      status: "created",
      labelUrl: `https://example.local/labels/${trackingNumber}.pdf`,
    };
    shipments.set(trackingNumber, result);
    return result;
  }

  async getTracking(trackingNumber: string): Promise<ShipmentResult> {
    const existing = shipments.get(trackingNumber);
    if (!existing) {
      throw new Error(`Mock shipment not found: ${trackingNumber}`);
    }
    return existing;
  }
}

export const mockShippingProvider = new MockShippingProvider();
