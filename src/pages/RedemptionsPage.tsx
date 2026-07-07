import { useMemo, useState } from "react";
import { RotateCcw, Loader2, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLoyaltyTransactions } from "@/hooks/useLoyalty";
import { useCouponRedemptions } from "@/hooks/useCoupons";

type FilterState = { q: string; type: string; from: string; to: string };

const TYPE_LABELS: Record<string, string> = {
  earn: "كسب", redeem: "استرداد", adjust: "تعديل", expire: "انتهاء", refund: "إلغاء",
};

export default function RedemptionsPage() {
  const { txns, loading: tLoading, reverse: revTxn, reload: reloadTxn } = useLoyaltyTransactions();
  const { items: coupons, loading: cLoading, reverse: revCoupon, reload: reloadCoupon } = useCouponRedemptions();
  const [filter, setFilter] = useState<FilterState>({ q: "", type: "all", from: "", to: "" });

  const filteredTxns = useMemo(() => txns.filter((t) => {
    if (filter.type !== "all" && t.type !== filter.type) return false;
    if (filter.q && !((t.customers?.name || "").includes(filter.q) || (t.reason || "").includes(filter.q))) return false;
    if (filter.from && new Date(t.created_at) < new Date(filter.from)) return false;
    if (filter.to && new Date(t.created_at) > new Date(filter.to)) return false;
    return true;
  }), [txns, filter]);

  const filteredCoupons = useMemo(() => coupons.filter((r) => {
    if (filter.q && !((r.coupons?.code || "").toLowerCase().includes(filter.q.toLowerCase()) || (r.customers?.name || "").includes(filter.q))) return false;
    if (filter.from && new Date(r.redeemed_at) < new Date(filter.from)) return false;
    if (filter.to && new Date(r.redeemed_at) > new Date(filter.to)) return false;
    return true;
  }), [coupons, filter]);

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">إدارة الاستردادات</h1>
        </div>
        <Button variant="outline" onClick={() => { reloadTxn(); reloadCoupon(); }}>
          <RefreshCw className="h-4 w-4 ml-2" />تحديث
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" />الفلاتر</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>بحث</Label><Input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="عميل / كوبون / سبب" /></div>
          <div><Label>نوع الحركة</Label>
            <Select value={filter.type} onValueChange={(v) => setFilter({ ...filter, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>من</Label><Input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></div>
          <div><Label>إلى</Label><Input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="points">
        <TabsList>
          <TabsTrigger value="points">حركات النقاط ({filteredTxns.length})</TabsTrigger>
          <TabsTrigger value="coupons">استخدامات الكوبونات ({filteredCoupons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => exportCSV(filteredTxns, "loyalty_transactions.csv")}>تصدير CSV</Button>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-right">
                <tr>
                  <th className="p-2">التاريخ</th><th className="p-2">النوع</th><th className="p-2">العميل</th>
                  <th className="p-2">النقاط</th><th className="p-2">السبب</th><th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {tLoading ? (
                  <tr><td colSpan={6} className="text-center p-6"><Loader2 className="animate-spin inline" /></td></tr>
                ) : filteredTxns.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-6 text-muted-foreground">لا يوجد نتائج</td></tr>
                ) : filteredTxns.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-2 text-xs">{new Date(t.created_at).toLocaleString("ar")}</td>
                    <td className="p-2"><Badge variant={t.points >= 0 ? "default" : "destructive"}>{TYPE_LABELS[t.type]}</Badge></td>
                    <td className="p-2">{t.customers?.name || "—"}</td>
                    <td className={`p-2 font-bold ${t.points >= 0 ? "text-success" : "text-destructive"}`}>{t.points > 0 ? "+" : ""}{t.points}</td>
                    <td className="p-2 text-xs text-muted-foreground">{t.reason || "—"}</td>
                    <td className="p-2">
                      {(t.type === "earn" || t.type === "redeem") && (
                        <Button size="sm" variant="ghost" onClick={() => confirm("إلغاء هذه الحركة؟") && revTxn(t)}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => exportCSV(filteredCoupons, "coupon_redemptions.csv")}>تصدير CSV</Button>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-right">
                <tr>
                  <th className="p-2">التاريخ</th><th className="p-2">الكوبون</th><th className="p-2">العميل</th>
                  <th className="p-2">الخصم</th><th className="p-2">الحالة</th><th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {cLoading ? (
                  <tr><td colSpan={6} className="text-center p-6"><Loader2 className="animate-spin inline" /></td></tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-6 text-muted-foreground">لا يوجد نتائج</td></tr>
                ) : filteredCoupons.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 text-xs">{new Date(r.redeemed_at).toLocaleString("ar")}</td>
                    <td className="p-2 font-mono">{r.coupons?.code || "—"}</td>
                    <td className="p-2">{r.customers?.name || "—"}</td>
                    <td className="p-2 font-bold text-destructive">-{Number(r.discount_applied).toFixed(2)}</td>
                    <td className="p-2">{r.is_reversed ? <Badge variant="destructive">ملغى</Badge> : <Badge>ساري</Badge>}</td>
                    <td className="p-2">
                      {!r.is_reversed && (
                        <Button size="sm" variant="ghost" onClick={() => confirm("إلغاء استرداد الكوبون؟") && revCoupon(r)}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
