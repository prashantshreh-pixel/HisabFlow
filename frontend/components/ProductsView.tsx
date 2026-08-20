'use client';

import React, { useState, useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import { Product } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/mockData';
import {
  Search,
  PackagePlus,
  RefreshCw,
  Edit,
  Trash2,
  AlertTriangle,
  Boxes,
  Percent,
  Coins,
  CheckCircle2,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { PageLoader } from '@/components/Loader';

interface ProductsViewProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onQuickStockAdjust: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  onOpenAddProduct,
  onEditProduct,
  onQuickStockAdjust,
}) => {
  const { products, stats, deleteProduct, isLoading } = useKhata();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'STOCK_ASC' | 'MARGIN_DESC' | 'VALUATION_DESC'>('NAME');

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.barcode && p.barcode.includes(query));

        if (!matchesQuery) return false;

        if (selectedCategory !== 'All Categories' && p.category !== selectedCategory) {
          return false;
        }

        if (stockFilter === 'LOW_STOCK') return p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;
        if (stockFilter === 'OUT_OF_STOCK') return p.stockQuantity === 0;
        if (stockFilter === 'IN_STOCK') return p.stockQuantity > p.minStockAlert;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        if (sortBy === 'STOCK_ASC') return a.stockQuantity - b.stockQuantity;
        if (sortBy === 'MARGIN_DESC') {
          const marginA = a.sellingPrice > 0 ? ((a.sellingPrice - a.costPrice) / a.sellingPrice) * 100 : 0;
          const marginB = b.sellingPrice > 0 ? ((b.sellingPrice - b.costPrice) / b.sellingPrice) * 100 : 0;
          return marginB - marginA;
        }
        if (sortBy === 'VALUATION_DESC') {
          return b.costPrice * b.stockQuantity - a.costPrice * a.stockQuantity;
        }
        return 0;
      });
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Calculate average profit margin
  const avgMargin = useMemo(() => {
    if (products.length === 0) return 0;
    const totalMargin = products.reduce((sum, p) => {
      const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;
      return sum + margin;
    }, 0);
    return Math.round((totalMargin / products.length) * 10) / 10;
  }, [products]);

  if (isLoading) {
    return <PageLoader text="Loading inventory..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Inventory Valuation Header Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Cost Value */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Stock Cost
            </span>
            <div className="text-2xl font-black text-slate-100 mt-1">
              Rs. {stats.totalInventoryCostValue.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">{products.length} registered SKUs</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Total Stock Retail Value */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Retail Worth
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              Rs. {stats.totalInventorySalesValue.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">
              Potential Profit: Rs. {(stats.totalInventorySalesValue - stats.totalInventoryCostValue).toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Average Profit Margin */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg Profit Margin
            </span>
            <div className="text-2xl font-black text-slate-100 mt-1">{avgMargin}%</div>
            <span className="text-[11px] text-slate-500">Markup across store items</span>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock count + CTA */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Reorder Alert
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {stats.lowStockCount + stats.outOfStockCount} Low/Empty
            </div>
            <span className="text-[11px] text-slate-500">{stats.outOfStockCount} zero stock items</span>
          </div>
          <button
            id="product-add-new-btn"
            type="button"
            onClick={onOpenAddProduct}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <PackagePlus className="w-4 h-4" />
            + Product
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Category Filter, Stock Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="product-search-input"
              type="text"
              placeholder="Search product by name, barcode, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-500 hidden sm:block" />
            <select
              id="product-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              id="product-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500"
            >
              <option value="NAME">Sort by Name (A-Z)</option>
              <option value="STOCK_ASC">Lowest Stock First</option>
              <option value="MARGIN_DESC">Highest Margin %</option>
              <option value="VALUATION_DESC">Highest Valuation</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium">Stock Status:</span>
          <button
            type="button"
            onClick={() => setStockFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              stockFilter === 'ALL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            All Stock ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('LOW_STOCK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              stockFilter === 'LOW_STOCK'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            Low Stock ({stats.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('OUT_OF_STOCK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              stockFilter === 'OUT_OF_STOCK'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            Out of Stock ({stats.outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('IN_STOCK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              stockFilter === 'IN_STOCK'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            In Stock Healthy ({products.filter((p) => p.stockQuantity > p.minStockAlert).length})
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Product Item</th>
                <th className="py-3.5 px-5">Category & Unit</th>
                <th className="py-3.5 px-5 text-right">Cost Price (Rs.)</th>
                <th className="py-3.5 px-5 text-right">Selling Price (Rs.)</th>
                <th className="py-3.5 px-5 text-center">Margin %</th>
                <th className="py-3.5 px-5 text-center">Stock Level</th>
                <th className="py-3.5 px-5 text-center">Quick Stock Adjust</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-300">No products match your criteria</p>
                    <p className="text-xs text-slate-500 mt-0.5">Try resetting search or category filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.stockQuantity === 0;
                  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockAlert;
                  const profit = product.sellingPrice - product.costPrice;
                  const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Product Name */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-100 text-sm">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>ID: {product.id}</span>
                          {product.barcode && <span>• Barcode: {product.barcode}</span>}
                        </div>
                      </td>

                      {/* Category & Unit */}
                      <td className="py-4 px-5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700">
                          {product.category}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-1">
                          Unit: <strong className="text-slate-300 uppercase">{product.unit}</strong>
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-4 px-5 text-right font-mono font-medium text-slate-400">
                        Rs. {product.costPrice.toLocaleString()}
                      </td>

                      {/* Selling Price */}
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-100">
                        Rs. {product.sellingPrice.toLocaleString()}
                      </td>

                      {/* Margin % */}
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            margin >= 20
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : margin >= 10
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          +Rs. {profit.toFixed(0)}/{product.unit}
                        </span>
                      </td>

                      {/* Stock Level with highlight */}
                      <td className="py-4 px-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-1 rounded-xl font-black text-xs border ${
                              isOutOfStock
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : isLowStock
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-slate-800 text-slate-200 border-slate-700'
                            }`}
                          >
                            {product.stockQuantity} {product.unit}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-400 mt-1">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-semibold text-amber-400 mt-1">
                              Low (&le; {product.minStockAlert})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 mt-1">
                              Min: {product.minStockAlert}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quick Stock Adjust Button */}
                      <td className="py-4 px-5 text-center">
                        <button
                          id={`quick-stock-${product.id}`}
                          type="button"
                          onClick={() => onQuickStockAdjust(product)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold rounded-lg border border-slate-700 hover:border-amber-500/40 transition-all inline-flex items-center gap-1.5 shadow-sm"
                          title="Quick Stock Adjust"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Stock Adjust
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`edit-prod-${product.id}`}
                            type="button"
                            onClick={() => onEditProduct(product)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-prod-${product.id}`}
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${product.name} from inventory?`)) {
                                deleteProduct(product.id);
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredProducts.length} of {products.length} total inventory items</span>
          <span>Click &apos;Stock Adjust&apos; to instantly add deliveries or write off damage</span>
        </div>
      </div>
    </div>
  );
};
