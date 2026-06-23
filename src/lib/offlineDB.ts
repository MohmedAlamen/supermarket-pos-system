import { openDB, IDBPDatabase } from "idb";
import type { Product, CartItem, Customer, StoreSettings } from "@/types/pos";

const DB_NAME = "pos-offline";
const DB_VERSION = 1;

export interface PendingSale {
  id?: number;
  branch_id: string;
  cashier_id: string;
  customer_id: string | null;
  items: { product_id: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_method: "cash" | "card";
  local_invoice_number: string;
  created_at: string;
  attempts: number;
}

let _db: Promise<IDBPDatabase> | null = null;
export function db() {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("products")) d.createObjectStore("products", { keyPath: "id" });
        if (!d.objectStoreNames.contains("customers")) d.createObjectStore("customers", { keyPath: "id" });
        if (!d.objectStoreNames.contains("branch_stock")) d.createObjectStore("branch_stock", { keyPath: ["branch_id", "product_id"] });
        if (!d.objectStoreNames.contains("settings")) d.createObjectStore("settings");
        if (!d.objectStoreNames.contains("pending_sales")) d.createObjectStore("pending_sales", { keyPath: "id", autoIncrement: true });
      },
    });
  }
  return _db;
}

export async function cacheProducts(products: Product[], branchId?: string) {
  const d = await db();
  const tx = d.transaction(["products", "branch_stock"], "readwrite");
  await tx.objectStore("products").clear();
  for (const p of products) {
    await tx.objectStore("products").put({
      id: p.id, name: p.name, barcode: p.barcode, price: p.price,
      cost_price: p.cost_price ?? 0, category: p.category,
    });
    if (branchId) {
      await tx.objectStore("branch_stock").put({ branch_id: branchId, product_id: p.id, stock: p.stock });
    }
  }
  await tx.done;
}

export async function loadCachedProducts(branchId?: string): Promise<Product[]> {
  const d = await db();
  const prods = await d.getAll("products");
  const stockMap: Record<string, number> = {};
  if (branchId) {
    const all = await d.getAll("branch_stock");
    all.forEach((r: any) => { if (r.branch_id === branchId) stockMap[r.product_id] = r.stock; });
  }
  return prods.map((p: any) => ({ ...p, stock: stockMap[p.id] ?? 0 }));
}

export async function adjustCachedStock(branchId: string, productId: string, delta: number) {
  const d = await db();
  const key: [string, string] = [branchId, productId];
  const row = await d.get("branch_stock", key);
  const next = Math.max(0, (row?.stock || 0) + delta);
  await d.put("branch_stock", { branch_id: branchId, product_id: productId, stock: next });
}

export async function cacheCustomers(customers: Customer[]) {
  const d = await db();
  const tx = d.transaction("customers", "readwrite");
  await tx.objectStore("customers").clear();
  for (const c of customers) await tx.objectStore("customers").put(c);
  await tx.done;
}
export async function loadCachedCustomers(): Promise<Customer[]> {
  const d = await db();
  return (await d.getAll("customers")) as Customer[];
}

export async function cacheSettings(settings: StoreSettings) {
  const d = await db();
  await d.put("settings", settings, "store");
}
export async function loadCachedSettings(): Promise<StoreSettings | null> {
  const d = await db();
  return (await d.get("settings", "store")) || null;
}

export async function enqueueSale(sale: Omit<PendingSale, "id" | "attempts">) {
  const d = await db();
  await d.add("pending_sales", { ...sale, attempts: 0 } as any);
}

export async function pendingSales(): Promise<PendingSale[]> {
  const d = await db();
  return (await d.getAll("pending_sales")) as PendingSale[];
}

export async function removePending(id: number) {
  const d = await db();
  await d.delete("pending_sales", id);
}

export async function bumpAttempts(id: number) {
  const d = await db();
  const row = await d.get("pending_sales", id);
  if (row) { row.attempts = (row.attempts || 0) + 1; await d.put("pending_sales", row); }
}

export async function pendingCount() {
  const d = await db();
  return await d.count("pending_sales");
}
