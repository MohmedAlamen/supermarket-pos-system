import { useState } from "react";
import { Plus, Edit2, Trash2, Search, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { Product } from "@/types/pos";

const ProductsPage = () => {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const categories = useCategories(products);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", barcode: "", price: "", stock: "", category: "" });

  const filtered = products.filter(
    (p) => p.name.includes(search) || p.barcode.includes(search)
  );

  const catOptions = categories.filter((c) => c !== "الكل");

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: "", barcode: "", price: "", stock: "", category: catOptions[0] || "" });
    setIsDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      barcode: product.barcode,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    if (editProduct) {
      await updateProduct(editProduct.id, {
        name: form.name,
        barcode: form.barcode,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        category: form.category,
      });
    } else {
      await addProduct({
        name: form.name,
        barcode: form.barcode,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        category: form.category,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          إدارة المنتجات
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 ml-1" />
              إضافة منتج
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>اسم المنتج *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label>الباركود</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="bg-secondary border-border mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>السعر *</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-secondary border-border mt-1" />
                </div>
                <div>
                  <Label>المخزون</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-secondary border-border mt-1" />
                </div>
              </div>
              <div>
                <Label>التصنيف</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full mt-1 bg-secondary border border-border rounded-md h-10 px-3 text-foreground"
                >
                  {catOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {editProduct ? "حفظ التعديلات" : "إضافة المنتج"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الباركود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 bg-card border-border"
        />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-semibold">المنتج</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">الباركود</th>
                <th className="text-right p-3 font-semibold">السعر</th>
                <th className="text-right p-3 font-semibold">المخزون</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">التصنيف</th>
                <th className="text-center p-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">{product.barcode}</td>
                  <td className="p-3 text-primary font-bold">{product.price} ر.س</td>
                  <td className="p-3">
                    <Badge variant={product.stock < 10 ? "destructive" : "secondary"}>{product.stock}</Badge>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <Badge variant="outline">{product.category}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-muted rounded-md text-info">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mt-3">إجمالي المنتجات: {filtered.length}</p>
    </div>
  );
};

export default ProductsPage;
