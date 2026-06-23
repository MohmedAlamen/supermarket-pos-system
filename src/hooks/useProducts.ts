import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/pos";
import { toast } from "sonner";
import { useBranch } from "@/contexts/BranchContext";
import { cacheProducts, loadCachedProducts, adjustCachedStock } from "@/lib/offlineDB";

export function useProducts() {
  const { currentBranch } = useBranch();
  const branchId = currentBranch?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, stockRes] = await Promise.all([
        (supabase as any).from("products").select("*").order("name"),
        branchId
          ? (supabase as any).from("branch_stock").select("product_id, stock").eq("branch_id", branchId)
          : Promise.resolve({ data: [] }),
      ]);

      if (prodRes.error) throw prodRes.error;

      const stockMap: Record<string, number> = {};
      (stockRes.data || []).forEach((r: any) => { stockMap[r.product_id] = Number(r.stock) || 0; });

      const mapped: Product[] = (prodRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || "",
        price: Number(p.price),
        cost_price: Number(p.cost_price || 0),
        stock: branchId ? (stockMap[p.id] ?? 0) : Number(p.stock || 0),
        category: p.category,
      }));
      setProducts(mapped);
      cacheProducts(mapped, branchId).catch(() => {});
    } catch (err) {
      console.warn("Loading products from offline cache", err);
      const cached = await loadCachedProducts(branchId);
      if (cached.length > 0) {
        setProducts(cached);
        toast.info("تم تحميل المنتجات من الذاكرة المحلية (وضع عدم الاتصال)");
      } else {
        toast.error("تعذر تحميل المنتجات");
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const upsertBranchStock = async (productId: string, stock: number) => {
    if (!branchId) return;
    await (supabase as any).from("branch_stock").upsert(
      { branch_id: branchId, product_id: productId, stock },
      { onConflict: "branch_id,product_id" }
    );
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    const { data, error } = await (supabase as any).from("products").insert({
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      cost_price: product.cost_price || 0,
      stock: 0,
      category: product.category,
    }).select("id").maybeSingle();
    if (error || !data) {
      toast.error("خطأ في إضافة المنتج");
      return false;
    }
    await upsertBranchStock(data.id, product.stock || 0);
    toast.success("تم إضافة المنتج بنجاح");
    await fetchProducts();
    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { stock, ...rest } = updates;
    const { error } = await (supabase as any).from("products").update({
      name: rest.name, barcode: rest.barcode, price: rest.price,
      cost_price: rest.cost_price, category: rest.category,
    }).eq("id", id);
    if (error) { toast.error("خطأ في تحديث المنتج"); return false; }
    if (typeof stock === "number") await upsertBranchStock(id, stock);
    toast.success("تم تحديث المنتج");
    await fetchProducts();
    return true;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await (supabase as any).from("products").delete().eq("id", id);
    if (error) { toast.error("خطأ في حذف المنتج"); return false; }
    toast.success("تم حذف المنتج");
    await fetchProducts();
    return true;
  };

  const decrementLocalStock = useCallback((productId: string, qty: number) => {
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: Math.max(0, p.stock - qty) } : p));
    if (branchId) adjustCachedStock(branchId, productId, -qty).catch(() => {});
  }, [branchId]);

  return { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct, decrementLocalStock };
}

export function useCategories(products: Product[]) {
  const categories = ["الكل", ...new Set(products.map((p) => p.category).filter(Boolean))];
  return categories;
}
