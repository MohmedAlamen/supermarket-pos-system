import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const dailySales = [
  { day: "السبت", sales: 2400 },
  { day: "الأحد", sales: 1800 },
  { day: "الاثنين", sales: 3200 },
  { day: "الثلاثاء", sales: 2800 },
  { day: "الأربعاء", sales: 3500 },
  { day: "الخميس", sales: 4200 },
  { day: "الجمعة", sales: 3800 },
];

const categoryData = [
  { name: "ألبان", value: 3200 },
  { name: "مشروبات", value: 2800 },
  { name: "لحوم", value: 2200 },
  { name: "خضروات", value: 1800 },
  { name: "أرز وحبوب", value: 1500 },
  { name: "أخرى", value: 2500 },
];

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(210, 100%, 56%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 50%)",
  "hsl(180, 60%, 45%)",
];

const stats = [
  { title: "مبيعات اليوم", value: "4,200 ر.س", icon: DollarSign, change: "+12%" },
  { title: "عدد الفواتير", value: "67", icon: ShoppingBag, change: "+8%" },
  { title: "متوسط الفاتورة", value: "62.7 ر.س", icon: TrendingUp, change: "+5%" },
  { title: "منتجات منخفضة", value: "8", icon: Package, change: "-2" },
];

const ReportsPage = () => {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        التقارير والإحصائيات
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-xs text-success font-semibold">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-4">المبيعات اليومية (هذا الأسبوع)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 22%)" />
              <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 14%)",
                  border: "1px solid hsl(220, 14%, 22%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 95%)",
                }}
              />
              <Bar dataKey="sales" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-4">المبيعات حسب التصنيف</h3>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 14%)",
                  border: "1px solid hsl(220, 14%, 22%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 95%)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
