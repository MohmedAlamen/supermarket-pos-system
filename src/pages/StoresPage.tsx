import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Check } from "lucide-react";

export default function StoresPage() {
  const { stores, currentStore, setCurrentStoreId, createStore, loading } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await createStore(name.trim());
    setName("");
    setBusy(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">إنشاء متجر جديد</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="اسم المتجر (مثال: متجر الرياض)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreate()}
          />
          <Button onClick={onCreate} disabled={busy || !name.trim()}>
            <Plus className="ml-2 h-4 w-4" /> إنشاء
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">متاجري ({stores.length})</h2>
        {loading && <p className="text-muted-foreground text-sm">جارٍ التحميل…</p>}
        {!loading && stores.length === 0 && (
          <p className="text-muted-foreground text-sm">لا توجد متاجر بعد — ابدأ بإنشاء متجرك الأول.</p>
        )}
        <div className="grid gap-2">
          {stores.map((s) => {
            const active = currentStore?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStoreId(s.id)}
                className={`text-right border rounded-lg p-3 flex items-center justify-between transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <Badge variant="secondary">{s.my_role}</Badge>
                    {!s.is_active && <Badge variant="destructive">غير نشط</Badge>}
                  </div>
                  {s.slug && <span className="text-xs text-muted-foreground">/{s.slug}</span>}
                </div>
                {active && <Check className="h-5 w-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
