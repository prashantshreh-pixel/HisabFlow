'use client';

import React, { useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import { Product, ProductUnit } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/mockData';
import { productsApi, getImageUrl } from '@/lib/api';
import { compressImageFile } from '@/lib/utils';
import { ImageViewerModal } from '@/components/Modals/ImageViewerModal';
import { ButtonSpinner } from '@/components/Loader';
import { X, PackagePlus, Edit, BarChart3, Tag, Layers, Boxes, AlertCircle, Image as ImageIcon, Upload, CheckCircle2, Link as LinkIcon, Maximize2 } from 'lucide-react';

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
  const [imageUrl, setImageUrl] = useState(() => productToEdit?.imageUrl || '');
  const [imageSourceMode, setImageSourceMode] = useState<'FILE' | 'URL'>(() => {
    const url = productToEdit?.imageUrl || '';
    return url.startsWith('http://') || url.startsWith('https://') ? 'URL' : 'FILE';
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imageUrl: 'Image file size must be less than 10MB' }));
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrors((prev) => ({ ...prev, imageUrl: '' }));
      // Compress image client-side before upload
      const compressedFile = await compressImageFile(file, 1000, 1000, 0.8);
      const result = await productsApi.uploadImage(compressedFile);
      setImageUrl(result.imageUrl);
    } catch (err: any) {
      console.error('Image upload error:', err);
      setErrors((prev) => ({ ...prev, imageUrl: err.message || 'Image upload failed.' }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!isOpen) return null;

  const costNum = parseFloat(costPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const profitPerUnit = sellNum - costNum;
  const marginPercent = sellNum > 0 ? ((profitPerUnit / sellNum) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsSubmitting(true);
      if (isEdit && productToEdit) {
        await updateProduct(productToEdit.id, {
          name: name.trim(),
          category,
          unit,
          costPrice: costNum,
          sellingPrice: sellNum,
          stockQuantity: stockNum,
          minStockAlert: minStockNum,
          barcode: barcode.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        });
      } else {
        await addProduct({
          name: name.trim(),
          category,
          unit,
          costPrice: costNum,
          sellingPrice: sellNum,
          stockQuantity: stockNum,
          minStockAlert: minStockNum,
          barcode: barcode.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-edit-product-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Right-Side Slide Drawer */}
      <div
        id="add-edit-product-drawer-panel"
        className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              {isEdit ? <Edit className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-100 truncate">
                {isEdit ? 'Edit Product Item' : 'Add New Inventory Product'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isEdit ? 'Update prices & stock quantities' : 'Register new retail item into inventory'}
              </p>
            </div>
          </div>
          <button
            id="close-product-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="product-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

            {/* Product Image Selection (Local Upload vs Web Link) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  Product Image (Optional)
                </label>
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setImageSourceMode('FILE')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                      imageSourceMode === 'FILE'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSourceMode('URL')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                      imageSourceMode === 'URL'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Web Link</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                {imageSourceMode === 'FILE' ? (
                  <div>
                    {imageUrl && imageUrl.startsWith('/uploads/') ? (
                      /* Display Server Uploaded Badge */
                      <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30">
                        <button
                          type="button"
                          onClick={() => setIsPreviewModalOpen(true)}
                          className="relative group w-14 h-14 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                          title="Click to view expanded image"
                        >
                          <img src={getImageUrl(imageUrl)} alt="Uploaded product" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-4 h-4 text-amber-400" />
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saved on Backend Server</span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                            {imageUrl}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors text-center">
                            <span>Change</span>
                            <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                          </label>
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Upload Button */
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <div className="relative group w-14 h-14 rounded-xl border border-amber-500/40 bg-slate-950 overflow-hidden shrink-0">
                            <img
                              src={getImageUrl(imageUrl)}
                              alt="Preview"
                              onClick={() => setIsPreviewModalOpen(true)}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              title="Click to view expanded image"
                            />
                            <button
                              type="button"
                              onClick={() => setImageUrl('')}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-slate-950/80 text-rose-400 rounded-full hover:bg-slate-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-dashed border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <ImageIcon className="w-5 h-5 mb-0.5" />
                            <span className="text-[9px]">No file</span>
                          </div>
                        )}

                        <div className="flex-1">
                          <label className={`w-full px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-2 ${isUploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Upload className="w-4 h-4 text-amber-400" />
                            <span>{isUploadingImage ? 'Compressing & uploading image...' : 'Choose Image File from Computer'}</span>
                            <input type="file" accept="image/*" onChange={handleImageFileChange} disabled={isUploadingImage} className="hidden" />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Supported: PNG, JPG, WEBP (Auto-compressed on upload)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Web Image Link Input */
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium text-slate-400">
                      Paste direct web image link (URL):
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/images/product.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-amber-500/50"
                    />
                    {imageUrl && (
                      <div className="flex items-center gap-2.5 pt-1">
                        <img
                          src={getImageUrl(imageUrl)}
                          alt="Web Preview"
                          onClick={() => setIsPreviewModalOpen(true)}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-900 shrink-0 cursor-pointer hover:border-amber-500 transition-colors"
                          title="Click to expand"
                        />
                        <span className="text-[11px] text-slate-400 truncate">Web Image Link Active (Click thumbnail to expand)</span>
                      </div>
                    )}
                  </div>
                )}
                {errors.imageUrl && <p className="text-xs text-rose-400">{errors.imageUrl}</p>}
              </div>
            </div>
          </form>

        {/* Fixed Footer Actions */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
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
            disabled={isSubmitting}
            form="product-drawer-form"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-slate-950" />
                <span>{isEdit ? 'Updating Product...' : 'Saving Product...'}</span>
              </>
            ) : (
              <>
                {isEdit ? <Edit className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
                <span>{isEdit ? 'Update Product' : 'Save Product'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Image Lightbox Popup View */}
      <ImageViewerModal
        isOpen={isPreviewModalOpen}
        imageUrl={imageUrl}
        title={name ? `${name} Image` : 'Product Image Preview'}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
};
