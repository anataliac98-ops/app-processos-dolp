import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer ${
          isDark
            ? 'bg-slate-800/80 border-slate-700 text-amber-300 hover:bg-slate-700 hover:text-amber-200'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
        } ${className}`}
        title={isDark ? 'Mudar para Modo Claro (Branco)' : 'Mudar para Modo Escuro (Preto)'}
        aria-label="Alternar tema"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`px-3 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-2 text-xs font-semibold cursor-pointer select-none ${
        isDark
          ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
      } ${className}`}
      title={isDark ? 'Alternar para tema branco e claro' : 'Alternar para tema escuro e preto'}
    >
      <div className={`p-1 rounded-lg ${isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-indigo-50 text-indigo-600'}`}>
        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </div>
      <span>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
    </button>
  );
};
