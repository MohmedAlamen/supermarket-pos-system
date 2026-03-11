export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
}
