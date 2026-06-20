export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  cost_price?: number;
  stock: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  loyalty_points: number;
  total_purchases: number;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  contact_person: string;
  balance: number;
  notes: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  tax_number: string;
  tax_rate: number;
  address: string;
  phone: string;
  email: string;
  invoice_counter: number;
  loyalty_points_per_unit: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  discount: number;
  finalTotal: number;
  paymentMethod: "cash" | "card";
  cashReceived?: number;
  change?: number;
  date: Date;
  invoice_number?: string;
  customer_id?: string;
  tax_amount?: number;
}
