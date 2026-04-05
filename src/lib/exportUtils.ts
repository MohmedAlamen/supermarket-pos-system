import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SaleItem {
  name: string;
  price: number;
  quantity: number;
}

interface SaleRecord {
  id: string;
  created_at: string;
  total: number;
  discount: number;
  payment_method: string;
  items: SaleItem[];
}

export function exportToExcel(sales: SaleRecord[], dateRange: string) {
  const rows = sales.map((sale, i) => ({
    "#": i + 1,
    "التاريخ": new Date(sale.created_at).toLocaleDateString("ar-SA"),
    "الوقت": new Date(sale.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    "المنتجات": (sale.items as SaleItem[]).map(item => `${item.name} x${item.quantity}`).join(", "),
    "الخصم %": sale.discount,
    "الإجمالي": sale.total,
    "طريقة الدفع": sale.payment_method === "cash" ? "نقدي" : "بطاقة",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المبيعات");

  // Auto column widths
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String((r as any)[key]).length)) + 2
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `تقرير_المبيعات_${dateRange}.xlsx`);
}

export function exportToPDF(
  sales: SaleRecord[],
  dateRange: string,
  stats: { title: string; value: string }[]
) {
  const doc = new jsPDF({ orientation: "landscape" });

  // Use built-in helvetica (no Arabic shaping but functional)
  doc.setFont("helvetica");
  doc.setFontSize(18);
  doc.text("Sales Report", 14, 20);

  doc.setFontSize(10);
  doc.text(`Date: ${dateRange}`, 14, 28);

  // Stats summary
  let yPos = 36;
  doc.setFontSize(12);
  doc.text("Summary", 14, yPos);
  yPos += 8;
  doc.setFontSize(10);
  stats.forEach((stat) => {
    doc.text(`${stat.title}: ${stat.value}`, 14, yPos);
    yPos += 6;
  });

  // Sales table
  const tableData = sales.map((sale, i) => [
    i + 1,
    new Date(sale.created_at).toLocaleDateString("en-US"),
    new Date(sale.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    (sale.items as SaleItem[]).map(item => `${item.name} x${item.quantity}`).join(", "),
    `${sale.discount}%`,
    sale.total.toFixed(2),
    sale.payment_method === "cash" ? "Cash" : "Card",
  ]);

  autoTable(doc, {
    startY: yPos + 4,
    head: [["#", "Date", "Time", "Products", "Discount", "Total", "Payment"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 163, 74] },
  });

  doc.save(`Sales_Report_${dateRange}.pdf`);
}
