import { useState } from "react";
import { Plus, Edit2, Trash2, Search, Truck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier } from "@/types/pos";

const SuppliersPage = () => {
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", contact_person: "", notes: "" });

  const filtered = suppliers.filter((s) => s.name.includes(search) || s.phone.includes(search));

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", contact_person: "", notes: "" });
    setOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, contact_person: s.contact_person, notes: s.notes });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    const ok = editing
      ? await updateSupplier(editing.id, form)
      : await addSupplier({ ...form, balance: 0 } as any);
    if (ok) setOpen(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          إدارة الموردين
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 ml-1" /> إضافة مورد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل المورد" : "إضافة مورد جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>اسم الشركة *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label>الشخص المسؤول</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="bg-secondary border-border mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الهاتف</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary border-border mt-1" />
                </div>
                <div>
                  <Label>البريد</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border mt-1" />
                </div>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border mt-1" />
              </div>
              <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {editing ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 bg-card border-border" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-semibold">المورد</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">المسؤول</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">الهاتف</th>
                <th className="text-right p-3 font-semibold">الرصيد</th>
                <th className="text-center p-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{s.contact_person}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground font-mono text-xs">{s.phone}</td>
                  <td className="p-3 font-bold text-primary">{s.balance.toFixed(2)} ر.س</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-muted rounded-md text-info">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteSupplier(s.id)} className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا يوجد موردين</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-muted-foreground text-sm mt-3">إجمالي الموردين: {filtered.length}</p>
    </div>
  );
};

export default SuppliersPage;
