import { Product, CartItem, Sale } from "@/types/pos";

// Sample products data
export const sampleProducts: Product[] = [
  { id: "1", name: "حليب طازج 1 لتر", barcode: "6281000000001", price: 7.5, stock: 120, category: "ألبان" },
  { id: "2", name: "خبز أبيض", barcode: "6281000000002", price: 3.0, stock: 200, category: "مخبوزات" },
  { id: "3", name: "أرز بسمتي 5 كجم", barcode: "6281000000003", price: 45.0, stock: 80, category: "أرز وحبوب" },
  { id: "4", name: "زيت زيتون 1 لتر", barcode: "6281000000004", price: 35.0, stock: 50, category: "زيوت" },
  { id: "5", name: "سكر أبيض 1 كجم", barcode: "6281000000005", price: 8.0, stock: 150, category: "أساسيات" },
  { id: "6", name: "شاي أحمر 100 كيس", barcode: "6281000000006", price: 15.0, stock: 90, category: "مشروبات" },
  { id: "7", name: "قهوة عربية 250 جم", barcode: "6281000000007", price: 28.0, stock: 60, category: "مشروبات" },
  { id: "8", name: "معجون أسنان", barcode: "6281000000008", price: 12.0, stock: 100, category: "عناية شخصية" },
  { id: "9", name: "صابون غسيل 3 لتر", barcode: "6281000000009", price: 22.0, stock: 70, category: "تنظيف" },
  { id: "10", name: "بسكويت شوكولاتة", barcode: "6281000000010", price: 5.5, stock: 180, category: "حلويات" },
  { id: "11", name: "عصير برتقال 1 لتر", barcode: "6281000000011", price: 9.0, stock: 110, category: "مشروبات" },
  { id: "12", name: "جبنة بيضاء 400 جم", barcode: "6281000000012", price: 18.0, stock: 65, category: "ألبان" },
  { id: "13", name: "دجاج مجمد 1 كجم", barcode: "6281000000013", price: 25.0, stock: 40, category: "لحوم" },
  { id: "14", name: "طماطم طازجة 1 كجم", barcode: "6281000000014", price: 6.0, stock: 95, category: "خضروات" },
  { id: "15", name: "بيض 30 حبة", barcode: "6281000000015", price: 22.0, stock: 55, category: "ألبان" },
  { id: "16", name: "مكرونة 500 جم", barcode: "6281000000016", price: 4.5, stock: 200, category: "أرز وحبوب" },
];

export const categories = [
  "الكل", "ألبان", "مخبوزات", "أرز وحبوب", "زيوت", "أساسيات",
  "مشروبات", "عناية شخصية", "تنظيف", "حلويات", "لحوم", "خضروات"
];
