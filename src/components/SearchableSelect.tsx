import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, ArrowLeft, X } from 'lucide-react';

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
  compact?: boolean;
  theme?: 'light' | 'dark';
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
  compact = false,
  theme = "light",
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
        className={`w-full flex items-center justify-between border focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-left cursor-pointer ${
          theme === 'dark'
            ? 'bg-slate-950 border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-800'
        } ${
          compact ? 'rounded-xl px-2.5 py-1 text-[11px]' : 'rounded-2xl px-3.5 py-2.5 text-sm'
        }`}
      >
        <span className="truncate w-full block">
          {selectedItem ? (
            displayValue(selectedItem)
          ) : (
            <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>{placeholder}</span>
          )}
        </span>
        <ChevronDown size={compact ? 12 : 16} className="text-slate-400 transition-transform shrink-0 ml-1.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Dropdown Menu (Overlay Takeover starting from top on mobile, normal absolute relative on desktop) */}
      {isOpen && (
        <div className={`fixed inset-0 z-[9999] h-full w-full rounded-none flex flex-col md:absolute md:inset-auto md:z-50 md:left-0 md:right-0 md:mt-1.5 md:border md:rounded-2xl md:shadow-2xl md:overflow-hidden md:max-h-72 ${
          theme === 'dark'
            ? 'bg-slate-950 text-white md:bg-slate-900 md:border-white/10'
            : 'bg-white text-slate-800 md:border-slate-200'
        }`}>
          
          {/* Search Header - Covers top of screen on mobile */}
          <div className={`p-4 border-b flex items-center gap-3 sticky top-0 shrink-0 ${
            theme === 'dark'
              ? 'border-white/10 bg-slate-950 md:border-white/5 md:bg-slate-950/60'
              : 'border-slate-100 bg-white md:border-slate-100 md:bg-slate-50'
          } md:p-2 md:gap-2`}>
            
            {/* Back Arrow button for mobile to exit */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft size={20} className={theme === 'dark' ? 'text-white' : 'text-slate-800'} />
            </button>

            {/* Custom high-contrast orange-ish styled search box on mobile to match screenshot */}
            <div className={`flex items-center flex-1 gap-2 rounded-xl px-3.5 py-2.5 border-2 ${
              theme === 'dark'
                ? 'bg-slate-900 border-amber-500/80 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400'
                : 'bg-white border-amber-500/80 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500'
            } md:rounded-none md:border-none md:bg-transparent md:p-0 md:focus-within:ring-0 md:border-0`}>
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent border-none text-base md:text-xs focus:outline-none focus:ring-0 py-0.5 outline-none ${
                  theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-teal-400 p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="hidden md:block text-[10px] text-slate-400 hover:text-teal-400 px-1.5 py-0.5 whitespace-nowrap"
              >
                Сброс
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 py-1 max-h-none md:max-h-56">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500 text-center">
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
                    className={`w-full flex items-center justify-between px-4 py-4 md:px-3.5 md:py-2 text-sm md:text-xs transition-colors text-left cursor-pointer border-b ${
                      theme === 'dark'
                        ? 'hover:bg-white/5 border-white/[0.04]'
                        : 'hover:bg-slate-50 border-slate-100'
                    } ${
                      isSelected
                        ? theme === 'dark'
                          ? 'bg-teal-400/10 text-teal-300'
                          : 'bg-teal-50 text-teal-600 font-bold'
                        : theme === 'dark'
                          ? 'text-slate-200'
                          : 'text-slate-700'
                    }`}
                  >
                    <div className="flex-1 truncate">
                      {renderItem(item)}
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-teal-500 shrink-0 ml-2" />
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
