import { useState } from "react";
import { Plus, Edit2, Trash2, Search, Users, Loader2, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/useCustomers";
import { Customer } from "@/types/pos";

const CustomersPage = () => {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  const filtered = customers.filter(
    (c) => c.name.includes(search) || c.phone.includes(search) || c.email.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, notes: c.notes });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    const ok = editing
      ? await updateCustomer(editing.id, form)
      : await addCustomer({ ...form, loyalty_points: 0, total_purchases: 0 } as any);
    if (ok) setOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          إدارة العملاء
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 ml-1" /> إضافة عميل
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل العميل" : "إضافة عميل جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>الاسم *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border mt-1" />
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
        <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 bg-card border-border" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-semibold">الاسم</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">الهاتف</th>
                <th className="text-right p-3 font-semibold">النقاط</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">إجمالي المشتريات</th>
                <th className="text-center p-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{c.phone}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className="gap-1"><Award className="h-3 w-3" />{c.loyalty_points}</Badge>
                  </td>
                  <td className="p-3 hidden sm:table-cell text-primary font-bold">{c.total_purchases.toFixed(2)} ر.س</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded-md text-info">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteCustomer(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا يوجد عملاء</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-muted-foreground text-sm mt-3">إجمالي العملاء: {filtered.length}</p>
    </div>
  );
};

export default CustomersPage;
