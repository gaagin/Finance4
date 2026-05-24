import React, { useState, useEffect } from 'react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { X, ArrowUpDown, Coins, CreditCard, Tag, Landmark, FileText, Check } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddTransfer: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  date,
  accounts,
  categories,
  onAddTransaction,
  onAddTransfer,
}: AddTransactionModalProps) {
  const [tab, setTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // Transfer specific states
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');

  // Set default accounts and categories when dialog opens or tab changes
  useEffect(() => {
    if (isOpen) {
      // Clear values
      setAmount('');
      setDescription('');
      
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        setTransferFromId(accounts[0].id);
        const secondAcc = accounts[1] ? accounts[1].id : accounts[0].id;
        setTransferToId(secondAcc);
      }

      const defaultType = tab === 'transfer' ? 'expense' : tab;
      const filteredCats = categories.filter(c => c.type === defaultType);
      if (filteredCats.length > 0) {
        setCategoryId(filteredCats[0].id);
      } else {
        setCategoryId('');
      }
    }
  }, [isOpen, tab]);

  // Handle transaction save
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const floatAmount = parseFloat(amount);
    if (!amount || isNaN(floatAmount) || floatAmount <= 0) {
      alert('Пожалуйста, введите корректную сумму больше нуля.');
      return;
    }

    if (tab === 'transfer') {
      if (!transferFromId || !transferToId) {
        alert('Пожалуйста, выберите оба счета для перевода.');
        return;
      }
      if (transferFromId === transferToId) {
        alert('Счета списания и зачисления должны отличаться.');
        return;
      }
      onAddTransfer({
        fromAccountId: transferFromId,
        toAccountId: transferToId,
        amount: floatAmount,
        description: description.trim(),
        date,
      });
    } else {
      if (!accountId) {
        alert('Пожалуйста, выберите счет.');
        return;
      }
      if (!categoryId) {
        alert('Пожалуйста, выберите категорию.');
        return;
      }
      onAddTransaction({
        accountId,
        categoryId,
        amount: floatAmount,
        type: tab as TransactionType,
        date,
        description: description.trim(),
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  // Format Russian date nicely
  const formatDateFriendly = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  const filteredCategories = categories.filter(c => c.type === (tab === 'transfer' ? 'expense' : tab));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      {/* Container Card */}
      <div 
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform scale-100"
        id="add-tx-modal"
      >
        {/* Header Column */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
          <div>
            <h3 className="text-lg font-display font-extrabold text-white">Новая операция</h3>
            <p className="text-xs text-teal-300 font-mono mt-0.5">{formatDateFriendly(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            id="close-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex p-1.5 bg-slate-950 border-b border-white/5 gap-1">
          <button
            type="button"
            onClick={() => setTab('expense')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'expense'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Coins size={14} className="text-rose-400" />
            Расход
          </button>
          <button
            type="button"
            onClick={() => setTab('income')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Coins size={14} className="text-emerald-400" />
            Доход
          </button>
          <button
            type="button"
            onClick={() => setTab('transfer')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'transfer'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/20 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <ArrowUpDown size={14} className="text-teal-400" />
            Перевод
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Amount field */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none">
              Сумма операции
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-lg font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-400 transition-colors"
                id="modal-amount-input"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-lg">
                ₼
              </span>
            </div>
          </div>

          {/* Conditional Form fields based on selected TAB */}
          {tab !== 'transfer' ? (
            <>
              {/* Account Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none flex items-center gap-1.5">
                  <CreditCard size={12} className="text-teal-400" />
                  Счет {tab === 'expense' ? 'списания' : 'зачисления'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 transition-colors"
                  id="modal-account-select"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({Math.round(acc.balance)} ₼)
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none flex items-center gap-1.5">
                  <Tag size={12} className="text-teal-400" />
                  Категория
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 transition-colors"
                  id="modal-category-select"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Transfer Source Account */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none flex items-center gap-1.5">
                  <Landmark size={12} className="text-rose-400" />
                  Откуда перевести (Счет-источник)
                </label>
                <select
                  value={transferFromId}
                  onChange={(e) => {
                    const selectedSource = e.target.value;
                    setTransferFromId(selectedSource);
                    // If source matches destination, automatically swap or change destination
                    if (selectedSource === transferToId) {
                      const another = accounts.find((a) => a.id !== selectedSource);
                      if (another) setTransferToId(another.id);
                    }
                  }}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 transition-colors"
                  id="modal-transfer-source"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({Math.round(acc.balance)} ₼)
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Target Account */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none flex items-center gap-1.5">
                  <Landmark size={12} className="text-emerald-400" />
                  Куда перевести (Счет-приемник)
                </label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 transition-colors"
                  id="modal-transfer-dest"
                >
                  {accounts
                    .filter((acc) => acc.id !== transferFromId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({Math.round(acc.balance)} ₼)
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none flex items-center gap-1.5">
              <FileText size={12} className="text-teal-400" />
              Описание / Примечание
            </label>
            <input
              type="text"
              placeholder={
                tab === 'transfer'
                  ? 'Внутренний перевод средств'
                  : tab === 'expense'
                  ? 'Название покупки или расходы'
                  : 'Сведения об источнике дохода'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-400 transition-colors"
              id="modal-desc-input"
            />
          </div>

          {/* Form Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl border border-white/5 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-sm font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-2xl transition-all shadow-lg shadow-teal-400/10 hover:shadow-teal-400/20 active:scale-95 flex items-center justify-center gap-1.5 font-display"
              id="modal-submit-btn"
            >
              <Check size={16} />
              Сохранить
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
