import { openDB, IDBPDatabase } from "idb";
import type { Product, Customer, StoreSettings } from "@/types/pos";

const DB_NAME = "pos-offline";
const DB_VERSION = 2;

export const MAX_SYNC_ATTEMPTS = 5;

export type SaleStatus = "pending" | "synced" | "failed";

export interface PaymentEntry {
  method: string; // cash | card | mada | stcpay | applepay | bank | other
  amount: number;
  reference?: string;
  gateway?: string;
  gateway_ref?: string;
  status?: "pending" | "approved" | "failed" | "refunded" | "voided";
  raw?: Record<string, unknown> | null;
}

export interface PendingSale {
  id?: number;
  client_uid: string; // idempotency key — sent to server and unique in `sales.client_uid`
  branch_id: string;
  cashier_id: string;
  customer_id: string | null;
  items: { product_id: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  payment_status?: string;
  payment_reference?: string | null;
  payment_gateway?: string;
  payments?: PaymentEntry[];
  local_invoice_number: string;
  final_invoice_number?: string | null;
  status: SaleStatus;
  last_error?: string | null;
  synced_at?: string | null;
  created_at: string;
  attempts: number;
  stock_adjusted?: boolean; // true once branch_stock was decremented for this sale
  next_retry_at?: string | null; // ISO — backoff gate for auto retry
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

export async function enqueueSale(
  sale: Omit<PendingSale, "id" | "attempts" | "status" | "client_uid"> & { client_uid?: string },
) {
  const d = await db();
  const client_uid = sale.client_uid || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  await d.add("pending_sales", {
    ...sale,
    client_uid,
    status: "pending",
    attempts: 0,
    stock_adjusted: false,
    next_retry_at: null,
  } as any);
}

export async function allSales(): Promise<PendingSale[]> {
  const d = await db();
  return (await d.getAll("pending_sales")) as PendingSale[];
}

export async function pendingSales(): Promise<PendingSale[]> {
  const all = await allSales();
  const now = Date.now();
  return all.filter((s) => {
    if (s.status === "synced") return false;
    // Respect backoff gate for auto-retries; manual retry clears next_retry_at.
    if (s.next_retry_at && new Date(s.next_retry_at).getTime() > now) return false;
    return true;
  });
}

export async function markSynced(id: number, final_invoice_number: string, stockAdjusted = true) {
  const d = await db();
  const row = await d.get("pending_sales", id);
  if (row) {
    row.status = "synced";
    row.final_invoice_number = final_invoice_number;
    row.synced_at = new Date().toISOString();
    row.last_error = null;
    row.next_retry_at = null;
    if (stockAdjusted) row.stock_adjusted = true;
    await d.put("pending_sales", row);
  }
}

export async function markStockAdjusted(id: number) {
  const d = await db();
  const row = await d.get("pending_sales", id);
  if (row) { row.stock_adjusted = true; await d.put("pending_sales", row); }
}

function backoffMs(attempts: number) {
  // 15s, 30s, 1m, 2m, 5m (capped)
  const ladder = [15_000, 30_000, 60_000, 120_000, 300_000];
  return ladder[Math.min(attempts, ladder.length - 1)];
}

export async function markFailed(id: number, error: string) {
  const d = await db();
  const row = await d.get("pending_sales", id);
  if (row) {
    row.attempts = (row.attempts || 0) + 1;
    row.last_error = error;
    if (row.attempts >= MAX_SYNC_ATTEMPTS) {
      row.status = "failed";
      row.next_retry_at = null; // stop auto-retry; user must trigger it
    } else {
      row.status = "pending";
      row.next_retry_at = new Date(Date.now() + backoffMs(row.attempts - 1)).toISOString();
    }
    await d.put("pending_sales", row);
  }
}

export async function retrySale(id: number) {
  const d = await db();
  const row = await d.get("pending_sales", id);
  if (row && row.status !== "synced") {
    row.status = "pending";
    row.last_error = null;
    row.next_retry_at = null;
    row.attempts = 0; // manual retry resets the counter
    await d.put("pending_sales", row);
  }
}


export async function removePending(id: number) {
  const d = await db();
  await d.delete("pending_sales", id);
}

export async function pendingCount() {
  const all = await allSales();
  return all.filter((s) => s.status !== "synced").length;
}
