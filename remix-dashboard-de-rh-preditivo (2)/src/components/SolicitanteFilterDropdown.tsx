import React, { useState, useRef, useEffect } from 'react';
import { UserCheck, Search, ChevronDown, X, Check } from 'lucide-react';

interface SolicitanteFilterDropdownProps {
  solicitantes: string[];
  selectedSolicitante: string;
  onSelect: (solicitante: string) => void;
  isDark: boolean;
  className?: string;
}

export const SolicitanteFilterDropdown: React.FC<SolicitanteFilterDropdownProps> = ({
  solicitantes,
  selectedSolicitante,
  onSelect,
  isDark,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredList = solicitantes.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
          isDark
            ? 'bg-slate-950 border-slate-700/80 text-slate-200 hover:border-sky-500/50'
            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-sky-500/50'
        } ${selectedSolicitante !== 'Todos' ? (isDark ? 'border-sky-500 text-[#38BDF8]' : 'border-sky-500 text-sky-700') : ''}`}
      >
        <UserCheck className={`w-3.5 h-3.5 ${
          selectedSolicitante !== 'Todos'
            ? isDark ? 'text-[#38BDF8]' : 'text-sky-600'
            : isDark ? 'text-slate-400' : 'text-slate-500'
        }`} />
        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Solicitante:</span>
        <span className="max-w-[150px] truncate">
          {selectedSolicitante === 'Todos' ? `Todos (${solicitantes.length})` : selectedSolicitante}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 w-72 rounded-xl shadow-2xl border z-50 overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Search Input Box */}
          <div className={`p-2.5 border-b ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'}`}>
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar solicitante..."
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-hidden transition ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-[#38BDF8]'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Options */}
          <div className="max-h-56 overflow-y-auto p-1 text-xs divide-y divide-transparent">
            {/* "Todos" Option */}
            <button
              type="button"
              onClick={() => {
                onSelect('Todos');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                selectedSolicitante === 'Todos'
                  ? isDark ? 'bg-sky-500/20 text-[#38BDF8] font-bold' : 'bg-sky-50 text-sky-700 font-bold'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>Todos os Solicitantes</span>
              {selectedSolicitante === 'Todos' && <Check className="w-3.5 h-3.5" />}
            </button>

            {solicitantes.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-400 text-[11px]">
                Nenhum solicitante cadastrado na planilha
              </div>
            ) : filteredList.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-400 text-[11px]">
                Nenhum solicitante encontrado para "{searchQuery}"
              </div>
            ) : (
              filteredList.map((sol) => (
                <button
                  key={sol}
                  type="button"
                  onClick={() => {
                    onSelect(sol);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer text-xs ${
                    selectedSolicitante === sol
                      ? isDark ? 'bg-sky-500/20 text-[#38BDF8] font-bold' : 'bg-sky-50 text-sky-700 font-bold'
                      : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="truncate pr-2">{sol}</span>
                  {selectedSolicitante === sol && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
