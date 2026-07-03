import { useState } from "react";
import { Plus, Edit2, Trash2, Store, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useBranches } from "@/hooks/useBranches";
import { Branch } from "@/contexts/BranchContext";
import BranchCsidDialog from "@/components/BranchCsidDialog";

export default function BranchesPage() {
  const { branches, loading, addBranch, updateBranch, deleteBranch } = useBranches();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: "", code: "", invoice_prefix: "", address: "", phone: "", tax_number: "" });

  const openAdd = () => {
    setEdit(null);
    setForm({ name: "", code: "", invoice_prefix: "", address: "", phone: "", tax_number: "" });
    setOpen(true);
  };
  const openEdit = (b: Branch) => {
    setEdit(b);
    setForm({
      name: b.name, code: b.code, invoice_prefix: b.invoice_prefix,
      address: b.address || "", phone: b.phone || "", tax_number: b.tax_number || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.code) return;
    const payload = {
      name: form.name,
      code: form.code,
      invoice_prefix: form.invoice_prefix || form.code,
      address: form.address,
      phone: form.phone,
      tax_number: form.tax_number,
    };
    if (edit) await updateBranch(edit.id, payload);
    else await addBranch(payload);
    setOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" /> إدارة الفروع
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 ml-1" /> إضافة فرع</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{edit ? "تعديل فرع" : "فرع جديد"}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <div><Label>اسم الفرع *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الكود * (مثل RYD)</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="bg-secondary mt-1" /></div>
                <div><Label>بادئة الفاتورة</Label><Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })} placeholder="نفس الكود" className="bg-secondary mt-1" /></div>
              </div>
              <div><Label>العنوان</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary mt-1" /></div>
                <div><Label>الرقم الضريبي</Label><Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} className="bg-secondary mt-1" /></div>
              </div>
              <Button onClick={save} className="w-full bg-primary text-primary-foreground">{edit ? "حفظ" : "إضافة"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">الكود</th>
              <th className="text-right p-3">بادئة</th>
              <th className="text-right p-3 hidden sm:table-cell">عدّاد الفواتير</th>
              <th className="text-right p-3 hidden sm:table-cell">الهاتف</th>
              <th className="text-center p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-t border-border/50">
                <td className="p-3 font-medium">{b.name}</td>
                <td className="p-3"><Badge variant="outline">{b.code}</Badge></td>
                <td className="p-3 font-mono text-primary">{b.invoice_prefix}-______</td>
                <td className="p-3 hidden sm:table-cell">{b.invoice_counter}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{b.phone || "—"}</td>
                <td className="p-3 text-center">
                  <BranchCsidDialog
                    branchId={b.id}
                    branchName={b.name}
                    configured={!!(b as any).csid_certificate_pem}
                    onSaved={() => { /* branches reload not strictly needed for this attr */ }}
                  />
                  <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-muted rounded-md text-info"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => deleteBranch(b.id)} className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-sm mt-3">إجمالي الفروع النشطة: {branches.length}</p>
    </div>
  );
}
