import { useState, useMemo } from "react";
import { ShoppingBag, Plus, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePurchases, PurchaseItem } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";

const SuppliersPage = () => {
  const { purchases, loading, addPurchase } = usePurchases();
  const { suppliers } = useSuppliers();
  const { products, refresh } = useProducts() as any;

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paid, setPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const total = useMemo(() => items.reduce((s, it) => s + it.cost * it.quantity, 0), [items]);
  const filteredProducts = useMemo(
    () => (search ? products.filter((p: any) => p.name.includes(search) || (p.barcode || "").includes(search)).slice(0, 8) : []),
    [search, products]
  );

  const addItem = (p: any) => {
    if (items.some((it) => it.product_id === p.id)) return;
    setItems([...items, { product_id: p.id, name: p.name, cost: p.cost_price || 0, quantity: 1 }]);
    setSearch("");
  };

  const updateItem = (idx: number, patch: Partial<PurchaseItem>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const reset = () => {
    setItems([]); setSupplierId(""); setPaid(""); setNotes(""); setPaymentMethod("cash");
  };

  const handleSave = async () => {
    if (!items.length) return;
    const ok = await addPurchase({
      supplier_id: supplierId || null,
      items,
      paid: parseFloat(paid) || total,
      payment_method: paymentMethod,
      notes,
    });
    if (ok) {
      setOpen(false);
      reset();
      refresh?.();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          فواتير المشتريات
        </h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 ml-1" /> فاتورة شراء جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة فاتورة شراء</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المورّد</Label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full mt-1 bg-secondary border border-border rounded-md h-10 px-3">
                    <option value="">-- بدون --</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full mt-1 bg-secondary border border-border rounded-md h-10 px-3">
                    <option value="cash">نقدي</option>
                    <option value="card">بطاقة</option>
                    <option value="credit">آجل</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ابحث عن منتج لإضافته..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map((p: any) => (
                      <button key={p.id} onClick={() => addItem(p)}
                        className="w-full text-right px-3 py-2 hover:bg-muted text-sm border-b border-border/40">
                        {p.name} <span className="text-muted-foreground text-xs">({p.barcode})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="border border-border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-right">المنتج</th>
                        <th className="p-2 text-right">سعر التكلفة</th>
                        <th className="p-2 text-right">الكمية</th>
                        <th className="p-2 text-right">الإجمالي</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} className="border-t border-border/40">
                          <td className="p-2">{it.name}</td>
                          <td className="p-2"><Input type="number" value={it.cost}
                            onChange={(e) => updateItem(idx, { cost: parseFloat(e.target.value) || 0 })}
                            className="w-24" /></td>
                          <td className="p-2"><Input type="number" value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                            className="w-20" /></td>
                          <td className="p-2 font-semibold">{(it.cost * it.quantity).toFixed(2)}</td>
                          <td className="p-2"><button onClick={() => removeItem(idx)} className="text-destructive">
                            <Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المبلغ المدفوع</Label>
                  <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={total.toFixed(2)} />
                </div>
                <div>
                  <Label>ملاحظات</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-between items-center bg-muted/30 p-3 rounded">
                <span className="font-bold">الإجمالي:</span>
                <span className="text-xl font-bold text-primary">{total.toFixed(2)} ر.س</span>
              </div>

              <Button onClick={handleSave} disabled={!items.length} className="w-full bg-primary text-primary-foreground">
                حفظ الفاتورة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right">رقم الفاتورة</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المورد</th>
                <th className="p-3 text-right">عدد الأصناف</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">المدفوع</th>
                <th className="p-3 text-right">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const supplier = suppliers.find((s) => s.id === p.supplier_id);
                const remaining = Number(p.total) - Number(p.paid);
                return (
                  <tr key={p.id} className="border-t border-border/40">
                    <td className="p-3 font-mono text-xs">{p.invoice_number}</td>
                    <td className="p-3">{new Date(p.created_at).toLocaleDateString("ar-SA")}</td>
                    <td className="p-3">{supplier?.name || "-"}</td>
                    <td className="p-3">{p.items.length}</td>
                    <td className="p-3 font-semibold">{Number(p.total).toFixed(2)}</td>
                    <td className="p-3 text-success">{Number(p.paid).toFixed(2)}</td>
                    <td className="p-3">
                      {remaining > 0
                        ? <Badge variant="destructive">{remaining.toFixed(2)}</Badge>
                        : <Badge variant="secondary">مسدد</Badge>}
                    </td>
                  </tr>
                );
              })}
              {!purchases.length && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد فواتير شراء</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
