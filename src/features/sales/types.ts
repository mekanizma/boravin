export const PAYMENT_METHODS = {
  nakit: "Nakit",
  kredi_karti: "Kredi Kartı",
  havale: "Havale",
} as const;

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS;

export type SaleProductHit = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  taxRate: number;
  stock: number;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    price: number | null;
  }>;
};

export type SaleCustomerHit = {
  id: string;
  label: string;
  accountType: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  companyTitle: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  firstName: string | null;
  lastName: string | null;
};
