'use client';

import React, { useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import { ButtonSpinner } from '@/components/Loader';
import { X, UserPlus, Phone, MapPin, ShieldCheck, Wallet, UserCheck } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addCustomer } = useKhata();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('10000');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Customer name is required';
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.replace(/\D/g, '').length < 7) {
      newErrors.phone = 'Enter a valid phone number (min 7 digits)';
    }

    const limitNum = parseFloat(creditLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      newErrors.creditLimit = 'Enter a valid credit limit';
    }

    const balNum = initialBalance ? parseFloat(initialBalance) : 0;
    if (isNaN(balNum) || balNum < 0) {
      newErrors.initialBalance = 'Initial balance cannot be negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        creditLimit: limitNum || 10000,
        initialBalance: balNum,
        initialNote: initialNote.trim() || undefined,
      });

      // Reset state
      setName('');
      setPhone('');
      setAddress('');
      setCreditLimit('10000');
      setInitialBalance('');
      setInitialNote('');
      setErrors({});
      onClose();
      if (onSuccess) onSuccess(created.id);
    } catch (err) {
      // Errors handled via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-customer-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Right-Side Slide Drawer */}
      <div
        id="add-customer-drawer-panel"
        className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-100 truncate">Add New Khata Customer</h3>
              <p className="text-[11px] text-slate-400 truncate">Register customer to track credit ledger & sales</p>
            </div>
          </div>
          <button
            id="close-add-customer-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="add-customer-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              Customer Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="cust-name-input"
              type="text"
              required
              placeholder="e.g. Shyam Sundar Shrestha"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
            />
            {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="cust-phone-input"
                  type="tel"
                  required
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
              {errors.phone && <p className="text-xs text-rose-400 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Credit Limit (Rs.)
              </label>
              <div className="relative">
                <input
                  id="cust-limit-input"
                  type="number"
                  min="0"
                  step="500"
                  placeholder="10000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
              {errors.creditLimit && <p className="text-xs text-rose-400 mt-1">{errors.creditLimit}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Address / Landmark
            </label>
            <input
              id="cust-address-input"
              type="text"
              placeholder="e.g. Near New Road Gate, Kathmandu"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
            />
          </div>

          {/* Opening Balance (Optional) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                Previous / Opening Balance (Optional)
              </span>
              <span className="text-[11px] text-slate-400">If already owes money</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Opening Udhaar (Rs.)</label>
                <input
                  id="cust-initial-balance-input"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="Rs. 0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Opening Note</label>
                <input
                  id="cust-initial-note-input"
                  type="text"
                  placeholder="e.g. Old ledger migration"
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Fixed Footer Actions */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
          <button
            id="cancel-add-cust-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-customer-btn"
            type="submit"
            disabled={isSubmitting}
            form="add-customer-drawer-form"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-slate-950" />
                <span>Saving Customer...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Save Customer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
