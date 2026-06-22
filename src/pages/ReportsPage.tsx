import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Download, FileSpreadsheet, FileText, Award, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { useBranch } from "@/contexts/BranchContext";

interface SaleItem {
  name: string;
  price: number;
  quantity: number;
  product_id: string;
}

interface Sale {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  discount: number;
  payment_method: string;
  items: SaleItem[];
  cashier_id: string | null;
}

interface ProductCost {
  id: string;
  cost_price: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(38, 92%, 50%)", "hsl(210, 100%, 56%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(180, 60%, 45%)"];

const ReportsPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [productCosts, setProductCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { currentBranch } = useBranch();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let salesQ = (supabase as any).from("sales").select("*")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: false });
      if (currentBranch) salesQ = salesQ.eq("branch_id", currentBranch.id);

      const [salesRes, prodRes] = await Promise.all([
        salesQ,
        (supabase as any).from("products").select("id, cost_price"),
      ]);
      if (salesRes.error) toast.error("خطأ في تحميل البيانات");
      else setSales((salesRes.data || []).map((s: any) => ({ ...s, items: s.items as SaleItem[] })));

      const map: Record<string, number> = {};
      (prodRes.data || []).forEach((p: ProductCost) => { map[p.id] = Number(p.cost_price) || 0; });
      setProductCosts(map);
      setLoading(false);
    };
    load();
  }, [dateFrom, dateTo, currentBranch?.id]);

  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
    const totalTax = sales.reduce((s, x) => s + Number(x.tax_amount || 0), 0);
    const invoiceCount = sales.length;
    const avgInvoice = invoiceCount ? totalRevenue / invoiceCount : 0;

    // Profit
    let totalCost = 0;
    const productMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((it) => {
        const cost = productCosts[it.product_id] || 0;
        totalCost += cost * it.quantity;
        const key = it.product_id;
        if (!productMap[key]) productMap[key] = { name: it.name, qty: 0, revenue: 0, profit: 0 };
        productMap[key].qty += it.quantity;
        productMap[key].revenue += it.price * it.quantity;
        productMap[key].profit += (it.price - cost) * it.quantity;
      });
    });
    const totalProfit = totalRevenue - totalTax - totalCost;
    const profitMargin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;

    const bestSellers = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const mostProfitable = Object.values(productMap).sort((a, b) => b.profit - a.profit).slice(0, 10);

    // Daily trend
    const dayMap: Record<string, { revenue: number; profit: number }> = {};
    sales.forEach((s) => {
      const d = s.created_at.slice(0, 10);
      if (!dayMap[d]) dayMap[d] = { revenue: 0, profit: 0 };
      dayMap[d].revenue += Number(s.total);
      s.items.forEach((it) => {
        const cost = productCosts[it.product_id] || 0;
        dayMap[d].profit += (it.price - cost) * it.quantity;
      });
    });
    const dailyTrend = Object.entries(dayMap)
      .map(([date, v]) => ({ date: date.slice(5), revenue: +v.revenue.toFixed(2), profit: +v.profit.toFixed(2) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Monthly
    const monthMap: Record<string, { revenue: number; profit: number }> = {};
    sales.forEach((s) => {
      const m = s.created_at.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { revenue: 0, profit: 0 };
      monthMap[m].revenue += Number(s.total);
      s.items.forEach((it) => {
        const cost = productCosts[it.product_id] || 0;
        monthMap[m].profit += (it.price - cost) * it.quantity;
      });
    });
    const monthly = Object.entries(monthMap)
      .map(([m, v]) => ({ month: m, revenue: +v.revenue.toFixed(2), profit: +v.profit.toFixed(2) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Payment methods
    const payMap: Record<string, number> = {};
    sales.forEach((s) => { payMap[s.payment_method] = (payMap[s.payment_method] || 0) + Number(s.total); });
    const paymentData = Object.entries(payMap).map(([k, v]) => ({ name: k === "cash" ? "نقدي" : "بطاقة", value: +v.toFixed(2) }));

    return { totalRevenue, totalTax, totalCost, totalProfit, profitMargin, invoiceCount, avgInvoice, bestSellers, mostProfitable, dailyTrend, monthly, paymentData };
  }, [sales, productCosts]);

  const statsCards = [
    { title: "إجمالي المبيعات", value: `${metrics.totalRevenue.toFixed(2)} ر.س`, icon: DollarSign, color: "text-primary" },
    { title: "صافي الربح", value: `${metrics.totalProfit.toFixed(2)} ر.س`, icon: Wallet, color: "text-success" },
    { title: "هامش الربح", value: `${metrics.profitMargin.toFixed(1)}%`, icon: TrendingUp, color: "text-info" },
    { title: "عدد الفواتير", value: `${metrics.invoiceCount}`, icon: ShoppingBag, color: "text-primary" },
    { title: "متوسط الفاتورة", value: `${metrics.avgInvoice.toFixed(2)} ر.س`, icon: BarChart3, color: "text-primary" },
    { title: "إجمالي الضريبة", value: `${metrics.totalTax.toFixed(2)} ر.س`, icon: DollarSign, color: "text-warning" },
  ];

  const dateRange = `${dateFrom}_${dateTo}`;

  const handleExportExcel = () => {
    if (!sales.length) return toast.error("لا توجد بيانات");
    exportToExcel(sales as any, dateRange);
    toast.success("تم تصدير Excel");
  };
  const handleExportPDF = () => {
    if (!sales.length) return toast.error("لا توجد بيانات");
    exportToPDF(sales as any, dateRange, statsCards.slice(0, 4).map((s) => ({ title: s.title, value: s.value })));
    toast.success("تم تصدير PDF");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> التقارير المتقدمة
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 ml-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 ml-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-sm text-muted-foreground">من:</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="bg-card border border-border rounded px-3 py-1.5 text-sm" />
        <label className="text-sm text-muted-foreground">إلى:</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="bg-card border border-border rounded px-3 py-1.5 text-sm" />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">جاري التحميل...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {statsCards.map((s) => (
              <div key={s.title} className="bg-card rounded-lg p-4 border border-border">
                <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.title}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="trend">
            <TabsList>
              <TabsTrigger value="trend">الاتجاه</TabsTrigger>
              <TabsTrigger value="bestsellers">الأكثر مبيعاً</TabsTrigger>
              <TabsTrigger value="profitable">الأكثر ربحاً</TabsTrigger>
              <TabsTrigger value="monthly">شهري</TabsTrigger>
            </TabsList>

            <TabsContent value="trend" className="space-y-4">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-4">المبيعات والأرباح اليومية</h3>
                {metrics.dailyTrend.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="المبيعات" />
                      <Line type="monotone" dataKey="profit" stroke="hsl(142, 71%, 45%)" name="الربح" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>}
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-4">توزيع طرق الدفع</h3>
                {metrics.paymentData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={metrics.paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {metrics.paymentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>}
              </div>
            </TabsContent>

            <TabsContent value="bestsellers">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-warning" /> أكثر 10 منتجات مبيعاً</h3>
                {metrics.bestSellers.length ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={metrics.bestSellers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                      <Tooltip />
                      <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="الكمية" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>}
              </div>
            </TabsContent>

            <TabsContent value="profitable">
              <div className="bg-card rounded-lg p-4 border border-border overflow-x-auto">
                <h3 className="font-semibold mb-4">المنتجات الأعلى ربحية</h3>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 text-right">#</th>
                      <th className="py-2 text-right">المنتج</th>
                      <th className="py-2 text-right">الكمية المباعة</th>
                      <th className="py-2 text-right">الإيرادات</th>
                      <th className="py-2 text-right">صافي الربح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.mostProfitable.map((p, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="py-2">{i + 1}</td>
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2">{p.qty}</td>
                        <td className="py-2">{p.revenue.toFixed(2)} ر.س</td>
                        <td className="py-2 text-success font-bold">{p.profit.toFixed(2)} ر.س</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="monthly">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-4">الأداء الشهري</h3>
                {metrics.monthly.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.monthly}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="المبيعات" />
                      <Bar dataKey="profit" fill="hsl(142, 71%, 45%)" name="الربح" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
