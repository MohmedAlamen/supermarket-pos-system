import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const SettingsPage = () => {
  const { settings, loading, updateSettings } = useStoreSettings();
  const [form, setForm] = useState(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        إعدادات المتجر
      </h1>

      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div>
          <Label>اسم المتجر *</Label>
          <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="bg-secondary border-border mt-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>الرقم الضريبي</Label>
            <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} className="bg-secondary border-border mt-1" placeholder="3000000000001" />
          </div>
          <div>
            <Label>نسبة الضريبة (%)</Label>
            <Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} className="bg-secondary border-border mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>هاتف المتجر</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border mt-1" />
          </div>
        </div>

        <div>
          <Label>العنوان</Label>
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary border-border mt-1" />
        </div>

        <div>
          <Label>نقاط الولاء لكل ريال مشتريات</Label>
          <Input type="number" step="0.01" value={form.loyalty_points_per_unit} onChange={(e) => setForm({ ...form, loyalty_points_per_unit: Number(e.target.value) })} className="bg-secondary border-border mt-1" />
          <p className="text-xs text-muted-foreground mt-1">مثال: 0.01 = نقطة لكل 100 ريال</p>
        </div>

        <Button onClick={() => updateSettings(form)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4 ml-1" /> حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
