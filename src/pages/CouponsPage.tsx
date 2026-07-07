import { useState } from "react";
import { Tag, Plus, Trash2, Copy, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCoupons, Coupon, CouponType } from "@/hooks/useCoupons";
import { toast } from "sonner";

const emptyForm = {
  id: "", code: "", description: "", type: "percent" as CouponType, value: 10,
  min_subtotal: 0, max_discount: "" as string | number, starts_at: "", ends_at: "",
  total_uses_limit: "" as string | number, per_customer_limit: "" as string | number, is_active: true,
};

export default function CouponsPage() {
  const { coupons, loading, upsert, remove, toggleActive } = useCoupons();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Coupon) => {
    setForm({
      id: c.id, code: c.code, description: c.description || "", type: c.type, value: c.value,
      min_subtotal: c.min_subtotal, max_discount: c.max_discount ?? "",
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
      total_uses_limit: c.total_uses_limit ?? "", per_customer_limit: c.per_customer_limit ?? "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.code.trim()) { toast.error("أدخل كود الكوبون"); return; }
    const payload: any = {
      code: form.code, description: form.description || null, type: form.type,
      value: Number(form.value), min_subtotal: Number(form.min_subtotal || 0),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      total_uses_limit: form.total_uses_limit ? Number(form.total_uses_limit) : null,
      per_customer_limit: form.per_customer_limit ? Number(form.per_customer_limit) : null,
      is_active: form.is_active,
    };
    if (form.id) payload.id = form.id;
    const ok = await upsert(payload);
    if (ok) setOpen(false);
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("نُسخ الكود"); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">الكوبونات</h1>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-2" />كوبون جديد</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono">{c.code}</CardTitle>
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                </div>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? `${c.value} ر.س` : "شحن مجاني"}</Badge>
                  <span className="text-muted-foreground text-xs">حد أدنى: {c.min_subtotal} ر.س</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  الاستخدامات: <b>{c.uses_count}</b>{c.total_uses_limit ? ` / ${c.total_uses_limit}` : ""}
                </p>
                {c.ends_at && <p className="text-xs text-muted-foreground">ينتهي: {new Date(c.ends_at).toLocaleDateString("ar")}</p>}
                <div className="flex gap-1 pt-2">
                  <Button size="sm" variant="outline" onClick={() => copyCode(c.code)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit className="h-3 w-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => confirm("حذف الكوبون؟") && remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {coupons.length === 0 && (
            <p className="col-span-full text-center py-12 text-muted-foreground">لا توجد كوبونات — أنشئ كوبونك الأول</p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل كوبون" : "كوبون جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الكود</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono" placeholder="SUMMER20" /></div>
              <div><Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CouponType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">نسبة %</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                    <SelectItem value="free_shipping">شحن مجاني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>الوصف</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>القيمة</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
              <div><Label>حد أدنى للفاتورة</Label>
                <Input type="number" value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: Number(e.target.value) })} /></div>
              <div><Label>حد أقصى للخصم</Label>
                <Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>يبدأ</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>ينتهي</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>حد الاستخدامات الكلي</Label>
                <Input type="number" value={form.total_uses_limit} onChange={(e) => setForm({ ...form, total_uses_limit: e.target.value })} /></div>
              <div><Label>حد الاستخدام لكل عميل</Label>
                <Input type="number" value={form.per_customer_limit} onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label>مفعّل</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            <Button onClick={submit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
