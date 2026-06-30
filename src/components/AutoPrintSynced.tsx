import { useEffect, useRef, useState } from "react";
import { onSaleSynced } from "@/lib/syncService";
import type { PendingSale } from "@/lib/offlineDB";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCustomers } from "@/hooks/useCustomers";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { toast } from "sonner";

const STORAGE_KEY = "auto_print_synced_invoices";
export const isAutoPrintEnabled = () => {
  if (typeof localStorage === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "true";
};
export const setAutoPrintEnabled = (v: boolean) => {
  localStorage.setItem(STORAGE_KEY, String(v));
};

export default function AutoPrintSynced() {
  const { settings } = useStoreSettings();
  const { customers } = useCustomers();
  const [queue, setQueue] = useState<PendingSale[]>([]);
  const [current, setCurrent] = useState<PendingSale | null>(null);
  const printingRef = useRef(false);

  useEffect(() => {
    const off = onSaleSynced((sale) => {
      if (!isAutoPrintEnabled()) return;
      setQueue((q) => [...q, sale]);
    });
    return () => { off(); };
  }, []);

  useEffect(() => {
    if (current || printingRef.current || queue.length === 0) return;
    const [next, ...rest] = queue;
    printingRef.current = true;
    setCurrent(next);
    setQueue(rest);

    const onAfter = () => {
      window.removeEventListener("afterprint", onAfter);
      setTimeout(() => {
        setCurrent(null);
        printingRef.current = false;
      }, 300);
    };
    window.addEventListener("afterprint", onAfter);

    setTimeout(() => {
      try {
        toast.success(`طباعة الفاتورة ${next.final_invoice_number || next.local_invoice_number}`);
        window.print();
      } catch (e) {
        console.error(e);
        onAfter();
      }
    }, 400);
  }, [queue, current]);

  if (!current) return null;
  const items = current.items.map((it) => ({
    product: { id: it.product_id, name: it.name, barcode: "", price: it.price, stock: 0, category: "" },
    quantity: it.quantity,
  }));
  const customer = current.customer_id ? customers.find((c) => c.id === current.customer_id) || null : null;

  return (
    <ReceiptPrint
      items={items}
      subtotal={current.subtotal}
      discount={current.discount}
      discountAmount={(current.subtotal * current.discount) / 100}
      tax_amount={current.tax_amount}
      tax_rate={settings.tax_rate}
      total={current.total}
      paymentMethod={current.payment_method}
      date={new Date(current.created_at)}
      invoice_number={current.final_invoice_number || current.local_invoice_number}
      customer={customer}
      store={settings}
    />
  );
}
