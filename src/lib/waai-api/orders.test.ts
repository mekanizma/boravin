import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  normalizeWaaiOrderPayload,
} from "@/lib/waai-api/orders";

describe("normalizeWaaiOrderPayload", () => {
  it("requires address and contact even for WhatsApp pickup", () => {
    const incomplete = normalizeWaaiOrderPayload({
      name: "Gurcem semercioglu",
      phone: "05338507761",
      city: "Kktc girne",
      productName: "iPhone 16 Pro",
      quantity: 1,
      customerNote: "Mağazadan teslim",
    });

    expect(() => createOrderSchema.parse(incomplete)).toThrow(/adres/i);

    const complete = normalizeWaaiOrderPayload({
      name: "Gurcem semercioglu",
      phone: "05338507761",
      address: "Karaoğlanoğlu Cad. No: 10",
      city: "Girne",
      productName: "iPhone 16 Pro",
      quantity: 1,
      customerNote: "Mağazadan teslim",
    });

    const parsed = createOrderSchema.parse(complete);
    expect(parsed.fulfillment).toBe("pickup");
    expect(parsed.customer.fullName).toBe("Gurcem semercioglu");
    expect(parsed.customer.phone).toBe("05338507761");
    expect(parsed.customer.line1).toBe("Karaoğlanoğlu Cad. No: 10");
    expect(parsed.customer.city).toBe("Girne");
    expect(parsed.items).toEqual([{ sku: "iPhone 16 Pro", quantity: 1 }]);
  });

  it("keeps delivery when street address is present", () => {
    const normalized = normalizeWaaiOrderPayload({
      customer: {
        fullName: "Ali Veli",
        phone: "05321112233",
        line1: "Atatürk Cad. No: 12",
        city: "Lefkoşa",
      },
      items: [{ sku: "BV-MOCK-1000", quantity: 1 }],
    });

    const parsed = createOrderSchema.parse(normalized);
    expect(parsed.fulfillment).toBe("delivery");
    expect(parsed.customer.line1).toBe("Atatürk Cad. No: 12");
  });

  it("rejects missing phone or city", () => {
    expect(() =>
      createOrderSchema.parse(
        normalizeWaaiOrderPayload({
          customer: {
            fullName: "Ali Veli",
            line1: "Atatürk Cad. No: 12",
            city: "Lefkoşa",
          },
          items: [{ sku: "BV-MOCK-1000", quantity: 1 }],
        }),
      ),
    ).toThrow(/telefon/i);

    expect(() =>
      createOrderSchema.parse(
        normalizeWaaiOrderPayload({
          customer: {
            fullName: "Ali Veli",
            phone: "05321112233",
            line1: "Atatürk Cad. No: 12",
          },
          items: [{ sku: "BV-MOCK-1000", quantity: 1 }],
        }),
      ),
    ).toThrow(/şehir/i);
  });

  it("accepts optional email when provided", () => {
    const withEmail = createOrderSchema.parse(
      normalizeWaaiOrderPayload({
        customer: {
          fullName: "Ali Veli",
          phone: "05321112233",
          email: "ali@example.com",
          line1: "Atatürk Cad. No: 12",
          city: "Lefkoşa",
        },
        items: [{ sku: "BV-MOCK-1000", quantity: 1 }],
      }),
    );
    expect(withEmail.customer.email).toBe("ali@example.com");

    const withoutEmail = createOrderSchema.parse(
      normalizeWaaiOrderPayload({
        customer: {
          fullName: "Ali Veli",
          phone: "05321112233",
          email: "",
          line1: "Atatürk Cad. No: 12",
          city: "Lefkoşa",
        },
        items: [{ sku: "BV-MOCK-1000", quantity: 1 }],
      }),
    );
    expect(withoutEmail.customer.email).toBeUndefined();
  });
});
