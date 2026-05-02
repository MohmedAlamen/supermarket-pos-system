import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import cairoFontBase64 from "./cairoFont";
import storeLogoBase64 from "./storeLogo";

const STORE_NAME = "متجر السوبر ماركت";
const STORE_TAGLINE = "نظام إدارة المبيعات";

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

function setupArabicFont(doc: jsPDF) {
  doc.addFileToVFS("Cairo-Regular.ttf", cairoFontBase64);
  doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
  doc.setFont("Cairo");
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

  setupArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header: Logo + Store name
  try {
    doc.addImage(storeLogoBase64, "PNG", 14, 10, 22, 22);
  } catch (e) {
    console.error("Logo load error", e);
  }

  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74);
  doc.text(STORE_NAME, pageWidth - 14, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(STORE_TAGLINE, pageWidth - 14, 27, { align: "right" });

  // Divider line
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageWidth - 14, 34);

  // Report title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("تقرير المبيعات", pageWidth - 14, 42, { align: "right" });

  doc.setFontSize(10);
  doc.text(`التاريخ: ${dateRange}`, pageWidth - 14, 49, { align: "right" });

  // Stats summary
  let yPos = 57;
  doc.setFontSize(12);
  doc.text("ملخص", pageWidth - 14, yPos, { align: "right" });
  yPos += 7;
  doc.setFontSize(10);
  stats.forEach((stat) => {
    doc.text(`${stat.title}: ${stat.value}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 6;
  });

  // Sales table
  const tableData = sales.map((sale, i) => [
    sale.payment_method === "cash" ? "نقدي" : "بطاقة",
    sale.total.toFixed(2),
    `${sale.discount}%`,
    (sale.items as SaleItem[]).map(item => `${item.name} x${item.quantity}`).join(", "),
    new Date(sale.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
    new Date(sale.created_at).toLocaleDateString("ar-SA"),
    i + 1,
  ]);

  autoTable(doc, {
    startY: yPos + 4,
    head: [["طريقة الدفع", "الإجمالي", "الخصم", "المنتجات", "الوقت", "التاريخ", "#"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 8, font: "Cairo", halign: "right" },
    headStyles: { fillColor: [22, 163, 74], font: "Cairo", halign: "right" },
  });

  doc.save(`تقرير_المبيعات_${dateRange}.pdf`);
}
