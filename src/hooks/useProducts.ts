import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/pos";
import { toast } from "sonner";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      toast.error("خطأ في تحميل المنتجات");
      console.error(error);
    } else {
      setProducts(
        (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode || "",
          price: Number(p.price),
          stock: p.stock,
          category: p.category,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (product: Omit<Product, "id">) => {
    const { error } = await (supabase as any).from("products").insert({
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });
    if (error) {
      toast.error("خطأ في إضافة المنتج");
      console.error(error);
      return false;
    }
    toast.success("تم إضافة المنتج بنجاح");
    await fetchProducts();
    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await (supabase as any)
      .from("products")
      .update({
        name: updates.name,
        barcode: updates.barcode,
        price: updates.price,
        stock: updates.stock,
        category: updates.category,
      })
      .eq("id", id);
    if (error) {
      toast.error("خطأ في تحديث المنتج");
      console.error(error);
      return false;
    }
    toast.success("تم تحديث المنتج بنجاح");
    await fetchProducts();
    return true;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await (supabase as any).from("products").delete().eq("id", id);
    if (error) {
      toast.error("خطأ في حذف المنتج");
      console.error(error);
      return false;
    }
    toast.success("تم حذف المنتج");
    await fetchProducts();
    return true;
  };

  return { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct };
}

export function useCategories(products: Product[]) {
  const categories = ["الكل", ...new Set(products.map((p) => p.category).filter(Boolean))];
  return categories;
}
