import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Package, Loader2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";

interface SaleRow {
  id: string;
  total: number;
  discount: number;
  payment_method: string;
  items: { product_id: string; name: string; price: number; quantity: number }[];
  created_at: string;
  cashier_id: string;
}

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(210, 100%, 56%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 50%)",
  "hsl(180, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(120, 50%, 45%)",
];

const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const ReportsPage = () => {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const { products } = useProducts();

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      const { data, error } = await (supabase as any)
        .from("sales")
        .select("*")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false });

      if (!error) setSales(data || []);
      setLoading(false);
    };
    fetchSales();
  }, [dateFrom, dateTo]);

  const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + Number(sale.total), 0), [sales]);
  const totalInvoices = sales.length;
  const avgInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const lowStockCount = products.filter((p) => p.stock < 10).length;

  const dailySales = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((sale) => {
      const date = new Date(sale.created_at);
      const key = `${date.getMonth() + 1}/${date.getDate()} ${ARABIC_DAYS[date.getDay()]}`;
      map.set(key, (map.get(key) || 0) + Number(sale.total));
    });
    return Array.from(map.entries())
      .map(([day, total]) => ({ day, sales: Math.round(total * 100) / 100 }))
      .reverse();
  }, [sales]);

  const categorySales = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((sale) => {
      const items = sale.items as any[];
      items?.forEach((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const cat = product?.category || item.name || "أخرى";
        map.set(cat, (map.get(cat) || 0) + item.price * item.quantity);
      });
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [sales, products]);

  const stats = [
    { title: "إجمالي المبيعات", value: `${totalRevenue.toFixed(2)} ر.س`, icon: DollarSign },
    { title: "عدد الفواتير", value: String(totalInvoices), icon: ShoppingBag },
    { title: "متوسط الفاتورة", value: `${avgInvoice.toFixed(2)} ر.س`, icon: TrendingUp },
    { title: "منتجات منخفضة", value: String(lowStockCount), icon: Package },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          التقارير والإحصائيات
        </h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 bg-secondary border-border text-sm" />
          <span className="text-muted-foreground text-sm">إلى</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 bg-secondary border-border text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-4">المبيعات اليومية</h3>
          {dailySales.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">لا توجد مبيعات في الفترة المحددة</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
                <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={11} />
                <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 14%)",
                    border: "1px solid hsl(220, 14%, 22%)",
                    borderRadius: "8px",
                    color: "hsl(210, 20%, 95%)",
                  }}
                  formatter={(value: number) => [`${value} ر.س`, "المبيعات"]}
                />
                <Bar dataKey="sales" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-4">المبيعات حسب المنتج</h3>
          {categorySales.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categorySales}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {categorySales.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 14%)",
                    border: "1px solid hsl(220, 14%, 22%)",
                    borderRadius: "8px",
                    color: "hsl(210, 20%, 95%)",
                  }}
                  formatter={(value: number) => [`${value} ر.س`, "المبيعات"]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent sales table */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <h3 className="font-semibold mb-4">آخر المبيعات</h3>
        {sales.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد مبيعات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-right py-2 px-3">التاريخ</th>
                  <th className="text-right py-2 px-3">المنتجات</th>
                  <th className="text-right py-2 px-3">الخصم</th>
                  <th className="text-right py-2 px-3">الطريقة</th>
                  <th className="text-right py-2 px-3">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 20).map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-2 px-3">{new Date(sale.created_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {(sale.items as any[])?.map((i) => i.name).join("، ").slice(0, 40)}
                    </td>
                    <td className="py-2 px-3">{sale.discount}%</td>
                    <td className="py-2 px-3">{sale.payment_method === "cash" ? "نقدي" : "بطاقة"}</td>
                    <td className="py-2 px-3 font-bold text-primary">{Number(sale.total).toFixed(2)} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
