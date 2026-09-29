export interface ShippingAddress {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  country: string;
  postalCode?: string;
}

export interface ShippingRateRequest {
  address: ShippingAddress;
  weightKg?: number;
  subtotal: number;
  currency: string;
}

export interface ShippingRate {
  methodId: string;
  name: string;
  carrier: string;
  price: number;
  currency: string;
  etaDaysMin: number;
  etaDaysMax: number;
  freeShippingApplied: boolean;
}

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  address: ShippingAddress;
  methodId: string;
  weightKg?: number;
  items?: Array<{ name: string; quantity: number; sku?: string }>;
}

export interface ShipmentResult {
  provider: string;
  shipmentId: string;
  trackingNumber: string;
  carrier: string;
  labelUrl?: string;
  status: "created" | "in_transit" | "delivered" | "cancelled";
}

export interface ShippingProvider {
  readonly name: string;
  getRates(request: ShippingRateRequest): Promise<ShippingRate[]>;
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  getTracking?(trackingNumber: string): Promise<ShipmentResult>;
}
