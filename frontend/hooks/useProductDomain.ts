import { useState, useCallback } from 'react';
import { Product } from '@/types';
import { productsApi } from '@/lib/api';
import { mapApiProductToUI } from '@/lib/mappers';
import { ToastNotification } from '@/context/ToastContext';

interface UseProductDomainOptions {
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  onMutationSuccess?: () => void;
}

export function useProductDomain({ showToast, onMutationSuccess }: UseProductDomainOptions) {
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = useCallback(async () => {
    setIsProductsLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data.map(mapApiProductToUI));
    } catch (err: unknown) {
      console.warn('Failed to fetch products from API:', err);
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  const addProduct = useCallback(
    async (data: Omit<Product, 'id' | 'updatedAt'>) => {
      const created = await productsApi.create({
        name: data.name,
        category: data.category,
        unit: data.unit,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        minStockAlert: data.minStockAlert,
        barcode: data.barcode || undefined,
        imageUrl: data.imageUrl || undefined,
      });

      const newProduct = mapApiProductToUI(created);
      setProducts((prev) => [newProduct, ...prev]);

      showToast({ type: 'success', title: 'Product Added', message: `${newProduct.name} saved to inventory.` });
      onMutationSuccess?.();
      return newProduct;
    },
    [showToast, onMutationSuccess]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const existing = products.find((p) => p.id === id);
      if (!existing) return;

      await productsApi.update(id, {
        name: updates.name ?? existing.name,
        category: updates.category ?? existing.category,
        unit: updates.unit ?? existing.unit,
        costPrice: updates.costPrice ?? existing.costPrice,
        sellingPrice: updates.sellingPrice ?? existing.sellingPrice,
        stockQuantity: updates.stockQuantity ?? existing.stockQuantity,
        minStockAlert: updates.minStockAlert ?? existing.minStockAlert,
        barcode: updates.barcode ?? existing.barcode,
        imageUrl: updates.imageUrl ?? existing.imageUrl,
      });

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)));
      showToast({ type: 'info', title: 'Product Updated', message: 'Inventory item saved.' });
      onMutationSuccess?.();
    },
    [products, showToast, onMutationSuccess]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await productsApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast({ type: 'warning', title: 'Product Deleted', message: 'Product removed.' });
      onMutationSuccess?.();
    },
    [showToast, onMutationSuccess]
  );

  const adjustStock = useCallback(
    async (productId: string, delta: number) => {
      await productsApi.adjustStock(productId, delta);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + delta) } : p))
      );
      showToast({ type: 'info', title: 'Stock Adjusted', message: `Stock updated by ${delta > 0 ? '+' : ''}${delta}.` });
      onMutationSuccess?.();
    },
    [showToast, onMutationSuccess]
  );

  return {
    isProductsLoading,
    products,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
  };
}
