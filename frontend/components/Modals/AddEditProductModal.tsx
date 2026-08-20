'use client';

import React, { useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import { Product, ProductUnit } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/mockData';
import { X, PackagePlus, Edit, BarChart3, Tag, Layers, Boxes, AlertCircle } from 'lucide-react';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const AVAILABLE_UNITS: { label: string; value: ProductUnit }[] = [
  { label: 'Packet (pkt)', value: 'pkt' },
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Piece (pcs)', value: 'pcs' },
  { label: 'Liter (ltr)', value: 'ltr' },
  { label: 'Box (box)', value: 'box' },
  { label: 'Dozen (dz)', value: 'dz' },
  { label: 'Bag (bag)', value: 'bag' },
  { label: 'Gram (gm)', value: 'gm' },
];

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct } = useKhata();

  const isEdit = !!productToEdit;

  const [name, setName] = useState(() => productToEdit?.name || '');
  const [category, setCategory] = useState(() => productToEdit?.category || PRODUCT_CATEGORIES[1] || 'Grains & Rice');
  const [unit, setUnit] = useState<ProductUnit>(() => productToEdit?.unit || 'pkt');
  const [costPrice, setCostPrice] = useState(() => productToEdit?.costPrice?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(() => productToEdit?.sellingPrice?.toString() || '');
  const [stockQuantity, setStockQuantity] = useState(() => productToEdit?.stockQuantity?.toString() || '');
  const [minStockAlert, setMinStockAlert] = useState(() => productToEdit?.minStockAlert?.toString() || '5');
  const [barcode, setBarcode] = useState(() => productToEdit?.barcode || '');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const costNum = parseFloat(costPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const profitPerUnit = sellNum - costNum;
  const marginPercent = sellNum > 0 ? ((profitPerUnit / sellNum) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (isNaN(costNum) || costNum < 0) newErrors.costPrice = 'Valid cost price required';
    if (isNaN(sellNum) || sellNum < 0) newErrors.sellingPrice = 'Valid selling price required';
    if (sellNum < costNum) newErrors.sellingPrice = 'Selling price should generally exceed cost price';

    const stockNum = parseFloat(stockQuantity);
    if (isNaN(stockNum) || stockNum < 0) newErrors.stockQuantity = 'Valid stock quantity required';

    const minStockNum = parseFloat(minStockAlert);
    if (isNaN(minStockNum) || minStockNum < 0) newErrors.minStockAlert = 'Valid alert threshold required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEdit && productToEdit) {
      updateProduct(productToEdit.id, {
        name: name.trim(),
        category,
        unit,
        costPrice: costNum,
        sellingPrice: sellNum,
        stockQuantity: stockNum,
        minStockAlert: minStockNum,
        barcode: barcode.trim() || undefined,
      });
    } else {
      addProduct({
        name: name.trim(),
        category,
        unit,
        costPrice: costNum,
        sellingPrice: sellNum,
        stockQuantity: stockNum,
        minStockAlert: minStockNum,
        barcode: barcode.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div
      id="add-edit-product-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Right-Side Slide Drawer */}
      <div
        id="add-edit-product-drawer-panel"
        className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {isEdit ? <Edit className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {isEdit ? 'Edit Product Item' : 'Add New Inventory Product'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isEdit ? 'Slide-over drawer • Update prices & stock' : 'Slide-over drawer • Register new retail item'}
                </p>
              </div>
            </div>
            <button
              id="close-product-drawer-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form id="product-drawer-form" onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="prod-name-input"
                type="text"
                required
                placeholder="e.g. Tokla Tea 500g, Basmati Rice"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
              />
              {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Category
                </label>
                <select
                  id="prod-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                >
                  {PRODUCT_CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Unit of Measure
                </label>
                <select
                  id="prod-unit-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ProductUnit)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                >
                  {AVAILABLE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing & Real-time Margin Calculation */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                  Pricing & Profit Margin
                </span>
                {sellNum > 0 && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      marginPercent >= 20
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : marginPercent >= 10
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {marginPercent.toFixed(1)}% Margin (Rs. {profitPerUnit.toFixed(1)}/{unit})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Cost Price (क्रय) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">Rs.</span>
                    <input
                      id="prod-cost-input"
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      placeholder="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  {errors.costPrice && <p className="text-[11px] text-rose-400 mt-0.5">{errors.costPrice}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Selling Price (बिक्री) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">Rs.</span>
                    <input
                      id="prod-selling-input"
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      placeholder="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  {errors.sellingPrice && <p className="text-[11px] text-rose-400 mt-0.5">{errors.sellingPrice}</p>}
                </div>
              </div>
            </div>

            {/* Stock Quantities & Alert Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  Current Stock ({unit}) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="prod-stock-input"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-amber-500/50"
                />
                {errors.stockQuantity && <p className="text-xs text-rose-400 mt-1">{errors.stockQuantity}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Low Stock Alert Min Qty
                </label>
                <input
                  id="prod-min-alert-input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="5"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                />
                {errors.minStockAlert && <p className="text-xs text-rose-400 mt-1">{errors.minStockAlert}</p>}
              </div>
            </div>

            {/* Barcode / SKU */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Barcode / SKU Number (Optional)
              </label>
              <input
                id="prod-barcode-input"
                type="text"
                placeholder="e.g. 8901030383321"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            id="cancel-product-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-product-btn"
            type="submit"
            form="product-drawer-form"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            {isEdit ? <Edit className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
            {isEdit ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
};
