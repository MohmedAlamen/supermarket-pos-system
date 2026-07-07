import { useEffect, useState } from "react";
import { Gift, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoyaltyProgram } from "@/hooks/useLoyalty";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

export default function LoyaltyPage() {
  const { program, loading, save } = useLoyaltyProgram();
  const { currentStore } = useStore();
  const [form, setForm] = useState({
    is_active: true, points_per_currency: 1, currency_per_point: 0.05,
    min_redeem_points: 100, expire_after_months: "" as string | number,
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ earned: 0, redeemed: 0, topCustomers: [] as any[] });

  useEffect(() => {
    if (program) setForm({
      is_active: program.is_active,
      points_per_currency: program.points_per_currency,
      currency_per_point: program.currency_per_point,
      min_redeem_points: program.min_redeem_points,
      expire_after_months: program.expire_after_months ?? "",
    });
  }, [program]);

  useEffect(() => {
    if (!currentStore) return;
    (async () => {
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      const { data: t } = await (supabase as any).from("loyalty_transactions")
        .select("type, points")
        .eq("store_id", currentStore.id)
        .gte("created_at", start.toISOString());
      const earned = (t || []).filter((x: any) => x.type === "earn").reduce((s: number, x: any) => s + x.points, 0);
      const redeemed = (t || []).filter((x: any) => x.type === "redeem").reduce((s: number, x: any) => s + Math.abs(x.points), 0);
      const { data: top } = await (supabase as any).from("customers")
        .select("id, name, loyalty_points").eq("store_id", currentStore.id)
        .order("loyalty_points", { ascending: false }).limit(10);
      setStats({ earned, redeemed, topCustomers: top || [] });
    })();
  }, [currentStore, program]);

  const handleSave = async () => {
    setSaving(true);
    await save({
      is_active: form.is_active,
      points_per_currency: Number(form.points_per_currency),
      currency_per_point: Number(form.currency_per_point),
      min_redeem_points: Number(form.min_redeem_points),
      expire_after_months: form.expire_after_months ? Number(form.expire_after_months) : null,
    });
    setSaving(false);
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">برنامج الولاء</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">نقاط مُنحت (هذا الشهر)</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-success">+{stats.earned}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">نقاط مستردة (هذا الشهر)</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-destructive">-{stats.redeemed}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">صافي</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.earned - stats.redeemed}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الإعدادات</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل برنامج الولاء</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>نقاط لكل 1 ريال يُنفَق</Label>
              <Input type="number" step="0.01" value={form.points_per_currency} onChange={(e) => setForm({ ...form, points_per_currency: Number(e.target.value) })} /></div>
            <div><Label>قيمة النقطة (ر.س) عند الاسترداد</Label>
              <Input type="number" step="0.01" value={form.currency_per_point} onChange={(e) => setForm({ ...form, currency_per_point: Number(e.target.value) })} /></div>
            <div><Label>الحد الأدنى للنقاط للاسترداد</Label>
              <Input type="number" value={form.min_redeem_points} onChange={(e) => setForm({ ...form, min_redeem_points: Number(e.target.value) })} /></div>
            <div><Label>انتهاء النقاط بعد (أشهر) — اختياري</Label>
              <Input type="number" value={form.expire_after_months} onChange={(e) => setForm({ ...form, expire_after_months: e.target.value })} /></div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
            حفظ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>أعلى العملاء بالنقاط</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-right">
              <tr><th className="pb-2">العميل</th><th className="pb-2">النقاط</th></tr>
            </thead>
            <tbody>
              {stats.topCustomers.map((c) => (
                <tr key={c.id} className="border-t border-border"><td className="py-2">{c.name}</td><td className="py-2 font-bold">{c.loyalty_points || 0}</td></tr>
              ))}
              {stats.topCustomers.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">لا يوجد بيانات</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
