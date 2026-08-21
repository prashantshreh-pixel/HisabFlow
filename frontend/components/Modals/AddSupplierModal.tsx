'use client';

import React, { useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import { ButtonSpinner } from '@/components/Loader';
import { X, Truck, User, Phone, MapPin, Building, Coins } from 'lucide-react';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (supplierId: string) => void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addSupplier } = useKhata();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Supplier contact name is required';
    if (!phone.trim()) newErrors.phone = 'Valid phone number is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const numBal = parseFloat(initialBalance) || 0;
      const created = await addSupplier({
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        address: address.trim() || undefined,
        initialBalance: numBal,
        initialNote: initialNote.trim() || undefined,
      });

      onClose();
      if (onSuccess && created?.id) {
        onSuccess(created.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-supplier-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="add-supplier-drawer-panel"
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-100 truncate">Add New Wholesaler / Supplier</h3>
              <p className="text-[11px] text-slate-400 truncate">Track purchase payables & inventory vendors</p>
            </div>
          </div>
          <button
            id="close-supplier-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="supplier-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Contact Person Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Contact Person / Representative Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="supplier-name-input"
              type="text"
              required
              placeholder="e.g. Ramesh Shrestha"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
            />
            {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
          </div>

          {/* Company / Business Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              Wholesale Firm / Company Name
            </label>
            <input
              id="supplier-company-input"
              type="text"
              placeholder="e.g. Pashupati Food Distributors Pvt Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              Phone Number <span className="text-rose-400">*</span>
            </label>
            <input
              id="supplier-phone-input"
              type="tel"
              required
              placeholder="e.g. 9841000000"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50 font-mono"
            />
            {errors.phone && <p className="text-xs text-rose-400 mt-1">{errors.phone}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Warehouse / Office Location
            </label>
            <input
              id="supplier-address-input"
              type="text"
              placeholder="e.g. Kalimati Wholesale Market, Kathmandu"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Opening Balance (Payable) */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              Opening Outstanding Payable (Rs.)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">Rs.</span>
              <input
                id="supplier-balance-input"
                type="number"
                placeholder="0 (Amount shop currently owes)"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm font-bold focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Enter positive amount if your shop already owes this wholesaler money.</p>
          </div>

          {/* Opening Note */}
          {initialBalance && parseFloat(initialBalance) !== 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Opening Balance Note
              </label>
              <input
                type="text"
                placeholder="e.g. Bill #405 pending from last month"
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          )}
        </form>

        {/* Fixed Footer */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
          <button
            id="cancel-supplier-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-supplier-btn"
            type="submit"
            disabled={isSubmitting}
            form="supplier-drawer-form"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-slate-950" />
                <span>Saving Wholesaler...</span>
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Save Wholesaler</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
