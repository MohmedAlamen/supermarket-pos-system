import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Package, Download, FileSpreadsheet, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

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
  discount: number;
  payment_method: string;
  items: SaleItem[];
  cashier_id: string | null;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(38, 92%, 50%)",
  "hsl(210, 100%, 56%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 50%)",
  "hsl(180, 60%, 45%)",
];

const ReportsPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("sales")
        .select("*")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("خطأ في تحميل البيانات");
      } else {
        setSales((data || []).map((s: any) => ({ ...s, items: s.items as SaleItem[] })));
      }
      setLoading(false);
    };
    fetchSales();
  }, [dateFrom, dateTo]);

  const { totalRevenue, invoiceCount, avgInvoice, dailySales, categoryData } = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const invoiceCount = sales.length;
    const avgInvoice = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

    // Daily sales
    const dayMap: Record<string, number> = {};
    sales.forEach((s) => {
      const day = new Date(s.created_at).toLocaleDateString("ar-SA", { weekday: "long" });
      dayMap[day] = (dayMap[day] || 0) + s.total;
    });
    const dailySales = Object.entries(dayMap).map(([day, sales]) => ({ day, sales: +sales.toFixed(2) }));

    // Category (product-based)
    const catMap: Record<string, number> = {};
    sales.forEach((s) => {
      (s.items as SaleItem[]).forEach((item) => {
        const name = item.name || "أخرى";
        catMap[name] = (catMap[name] || 0) + item.price * item.quantity;
      });
    });
    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { totalRevenue, invoiceCount, avgInvoice, dailySales, categoryData };
  }, [sales]);

  const statsCards = [
    { title: "إجمالي المبيعات", value: `${totalRevenue.toFixed(2)} ر.س`, icon: DollarSign },
    { title: "عدد الفواتير", value: `${invoiceCount}`, icon: ShoppingBag },
    { title: "متوسط الفاتورة", value: `${avgInvoice.toFixed(2)} ر.س`, icon: TrendingUp },
  ];

  const dateRange = `${dateFrom}_${dateTo}`;

  const handleExportExcel = () => {
    if (!sales.length) return toast.error("لا توجد بيانات للتصدير");
    exportToExcel(sales, dateRange);
    toast.success("تم تصدير التقرير إلى Excel");
  };

  const handleExportPDF = () => {
    if (!sales.length) return toast.error("لا توجد بيانات للتصدير");
    exportToPDF(sales, dateRange, statsCards.map(s => ({ title: s.title, value: s.value })));
    toast.success("تم تصدير التقرير إلى PDF");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          التقارير والإحصائيات
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 ml-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 ml-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-sm text-muted-foreground">من:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-card border border-border rounded px-3 py-1.5 text-sm"
        />
        <label className="text-sm text-muted-foreground">إلى:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-card border border-border rounded px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">جاري تحميل البيانات...</p>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {statsCards.map((stat) => (
              <div key={stat.title} className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-semibold mb-4">المبيعات اليومية</h3>
              {dailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="fill-muted-foreground" fontSize={12} />
                    <YAxis className="fill-muted-foreground" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>
              )}
            </div>

            <div className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-semibold mb-4">المبيعات حسب المنتج</h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={11}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>
              )}
            </div>
          </div>

          {/* Recent Sales Table */}
          {sales.length > 0 && (
            <div className="bg-card rounded-lg p-4 border border-border overflow-x-auto">
              <h3 className="font-semibold mb-4">آخر المبيعات</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-right">#</th>
                    <th className="py-2 text-right">التاريخ</th>
                    <th className="py-2 text-right">المنتجات</th>
                    <th className="py-2 text-right">الإجمالي</th>
                    <th className="py-2 text-right">الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 20).map((sale, i) => (
                    <tr key={sale.id} className="border-b border-border/50">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2">{new Date(sale.created_at).toLocaleDateString("ar-SA")}</td>
                      <td className="py-2">
                        {(sale.items as SaleItem[]).map(item => `${item.name} x${item.quantity}`).join(", ")}
                      </td>
                      <td className="py-2 font-semibold">{sale.total.toFixed(2)} ر.س</td>
                      <td className="py-2">{sale.payment_method === "cash" ? "نقدي" : "بطاقة"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
