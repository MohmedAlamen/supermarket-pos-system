import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, Printer, RefreshCw, Trash2, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { allSales, removePending, retrySale, type PendingSale } from "@/lib/offlineDB";
import { syncPendingSales, onSaleSynced, notifyPendingChanged } from "@/lib/syncService";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCustomers } from "@/hooks/useCustomers";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { isAutoPrintEnabled, setAutoPrintEnabled } from "@/components/AutoPrintSynced";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PendingInvoicesPage() {
  const online = useOnlineStatus();
  const { settings } = useStoreSettings();
  const { customers } = useCustomers();
  const [rows, setRows] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [printSale, setPrintSale] = useState<PendingSale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [autoPrint, setAutoPrint] = useState(isAutoPrintEnabled());

  const load = async () => {
    setLoading(true);
    const data = await allSales();
    data.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const off = onSaleSynced(() => load());
    return () => { off(); };
  }, []);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    failed: rows.filter((r) => r.status === "failed").length,
    synced: rows.filter((r) => r.status === "synced").length,
  }), [rows]);

  const handleSyncAll = async () => {
    if (!online) { toast.error("لا يوجد اتصال بالإنترنت"); return; }
    setSyncingNow(true);
    await syncPendingSales();
    await load();
    setSyncingNow(false);
  };

  const handleRetry = async (id: number) => {
    await retrySale(id);
    await notifyPendingChanged();
    await load();
    if (online) syncPendingSales();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف الفاتورة المحلية نهائياً؟")) return;
    await removePending(id);
    await notifyPendingChanged();
    await load();
  };

  const handlePrint = (sale: PendingSale) => {
    setPrintSale(sale);
    setTimeout(() => window.print(), 250);
  };

  const customerOf = (id: string | null) => id ? customers.find((c) => c.id === id) || null : null;

  const statusBadge = (s: PendingSale) => {
    if (s.status === "synced") return <Badge className="bg-success/15 text-success border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" />متزامنة</Badge>;
    if (s.status === "failed") return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />فشل</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />في الانتظار</Badge>;
  };

  const renderTable = (data: PendingSale[]) => (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">رقم الفاتورة</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">العناصر</TableHead>
            <TableHead className="text-right">الإجمالي</TableHead>
            <TableHead className="text-right">الدفع</TableHead>
            <TableHead className="text-right">المحاولات</TableHead>
            <TableHead className="text-right">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell></TableRow>
          ) : data.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{statusBadge(s)}</TableCell>
              <TableCell className="font-mono text-xs">
                {s.final_invoice_number ? (
                  <div>
                    <div className="font-semibold text-primary">{s.final_invoice_number}</div>
                    <div className="text-muted-foreground line-through text-[10px]">{s.local_invoice_number}</div>
                  </div>
                ) : s.local_invoice_number}
              </TableCell>
              <TableCell className="text-xs">{new Date(s.created_at).toLocaleString("ar-SA")}</TableCell>
              <TableCell>{s.items.length}</TableCell>
              <TableCell className="font-semibold">{s.total.toFixed(2)} ر.س</TableCell>
              <TableCell>{s.payment_method === "cash" ? "نقدي" : "بطاقة"}</TableCell>
              <TableCell>{s.attempts || 0}{s.last_error && <div className="text-[10px] text-destructive max-w-[160px] truncate" title={s.last_error}>{s.last_error}</div>}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {s.status === "synced" && (
                    <Button size="sm" variant="outline" onClick={() => handlePrint(s)} title="طباعة بالرقم الرسمي">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {s.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => handleRetry(s.id!)} title="إعادة المحاولة">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id!)} title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const printItems = printSale ? printSale.items.map((it) => ({
    product: { id: it.product_id, name: it.name, barcode: "", price: it.price, stock: 0, category: "" },
    quantity: it.quantity,
  })) : [];

  return (
    <>
      <div className="p-4 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">فواتير عدم الاتصال</h1>
            <p className="text-sm text-muted-foreground">إدارة الفواتير المحفوظة محلياً ومزامنتها مع الخادم</p>
          </div>
          <Button onClick={handleSyncAll} disabled={!online || syncingNow || counts.pending + counts.failed === 0}>
            {syncingNow ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CloudUpload className="h-4 w-4 ml-2" />}
            مزامنة الكل
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">في الانتظار ({counts.pending})</TabsTrigger>
              <TabsTrigger value="failed">فشل ({counts.failed})</TabsTrigger>
              <TabsTrigger value="synced">متزامنة ({counts.synced})</TabsTrigger>
              <TabsTrigger value="all">الكل ({rows.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">{renderTable(rows.filter((r) => r.status === "pending"))}</TabsContent>
            <TabsContent value="failed">{renderTable(rows.filter((r) => r.status === "failed"))}</TabsContent>
            <TabsContent value="synced">{renderTable(rows.filter((r) => r.status === "synced"))}</TabsContent>
            <TabsContent value="all">{renderTable(rows)}</TabsContent>
          </Tabs>
        )}
      </div>

      {printSale && (
        <ReceiptPrint
          ref={receiptRef}
          items={printItems}
          subtotal={printSale.subtotal}
          discount={printSale.discount}
          discountAmount={(printSale.subtotal * printSale.discount) / 100}
          tax_amount={printSale.tax_amount}
          tax_rate={settings.tax_rate}
          total={printSale.total}
          paymentMethod={printSale.payment_method}
          date={new Date(printSale.created_at)}
          invoice_number={printSale.final_invoice_number || printSale.local_invoice_number}
          customer={customerOf(printSale.customer_id)}
          store={settings}
        />
      )}
    </>
  );
}
