import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  displayValue: (item: T) => React.ReactNode;
  filterValue: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  idKey: keyof T;
  className?: string;
}

export function SearchableSelect<T>({
  items,
  value,
  onChange,
  placeholder = "Выбрать...",
  searchPlaceholder = "Поиск...",
  displayValue,
  filterValue,
  renderItem,
  idKey,
  className = "",
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const selectedItem = items.find(item => String(item[idKey]) === value);

  const filteredItems = items.filter(item => {
    const text = filterValue(item).toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-left cursor-pointer"
      >
        <span className="truncate">
          {selectedItem ? displayValue(selectedItem) : <span className="text-slate-500">{placeholder}</span>}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-72">
          {/* Search Header */}
          <div className="p-2 border-b border-white/5 bg-slate-950/60 sticky top-0 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1.5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0 py-1"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 whitespace-nowrap"
              >
                Сброс
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 py-1 max-h-56">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 text-center">
                Ничего не найдено
              </div>
            ) : (
              filteredItems.map((item) => {
                const itemId = String(item[idKey]);
                const isSelected = itemId === value;

                return (
                  <button
                    key={itemId}
                    type="button"
                    onClick={() => {
                      onChange(itemId);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors hover:bg-white/5 text-left cursor-pointer ${
                      isSelected ? 'bg-teal-400/10 text-teal-300' : 'text-slate-250'
                    }`}
                  >
                    <div className="flex-1 truncate">
                      {renderItem(item)}
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-teal-400 shrink-0 ml-2 animate-pulse" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
