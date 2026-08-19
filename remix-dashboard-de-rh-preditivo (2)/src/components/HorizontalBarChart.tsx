import React from 'react';
import { useTheme } from '../context/ThemeContext';

export interface BarItem {
  id?: string | number;
  label: string;
  subLabel?: string;
  value: number;
  displayValue?: string; // e.g. "15 Vagas", "10 Faltas", "47 dias"
  secondaryBadge?: string; // e.g. "SLA Estourado"
  colorClass?: string; // e.g. "bg-[#38BDF8]", "bg-orange-500", "bg-rose-500", "bg-emerald-400"
  textColorClass?: string;
  highlight?: boolean;
}

interface HorizontalBarChartProps {
  title?: string;
  subtitle?: string;
  items: BarItem[];
  maxVal?: number;
  maxScale?: number;
  unit?: string;
  emptyMessage?: string;
  id?: string;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  subtitle,
  items,
  maxVal,
  maxScale,
  unit,
  emptyMessage = 'Nenhum dado encontrado para os filtros selecionados.',
  id,
}) => {
  const { isDark } = useTheme();
  const calculatedMax = maxVal || maxScale || (items.length > 0 ? Math.max(...items.map(i => i.value), 1) : 1);

  return (
    <div id={id} className={`rounded-2xl p-5 border transition-colors ${
      isDark
        ? 'bg-slate-800/30 border-slate-700/80 shadow-sm backdrop-blur-xs'
        : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {title && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>{title}</h3>
            {subtitle && (
              <p className={`text-[11px] mt-0.5 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={`py-8 text-center text-xs font-medium ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const percent = Math.min(100, Math.max(6, (item.value / calculatedMax) * 100));
            const barBg = item.colorClass || (item.highlight ? 'bg-orange-500' : (isDark ? 'bg-[#38BDF8]' : 'bg-sky-500'));
            const displayVal = item.displayValue || (unit ? `${item.value} ${unit}` : `${item.value}`);
            const itemKey = item.id !== undefined && item.id !== ''
              ? `${item.id}-${index}`
              : `hbar-${item.label.replace(/\s+/g, '-').toLowerCase()}-${index}`;

            return (
              <div key={itemKey} className="group">
                {/* Header line of the bar: Label and Explicit textual output */}
                <div className="flex items-center justify-between gap-2 text-xs font-medium mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`font-medium truncate ${
                      isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'
                    }`}>{item.label}</span>
                    {item.subLabel && (
                      <span className={`text-[11px] font-normal shrink-0 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>({item.subLabel})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.secondaryBadge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700/80'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.secondaryBadge}
                      </span>
                    )}
                    {/* Explicit visual quantity fixed in view */}
                    <span className={`text-xs font-mono font-bold ${
                      item.textColorClass ||
                      (item.highlight
                        ? isDark ? 'text-orange-400' : 'text-orange-600'
                        : isDark ? 'text-[#38BDF8]' : 'text-sky-700')
                    }`}>
                      {displayVal}
                    </span>
                  </div>
                </div>

                {/* Clean horizontal bar */}
                <div className={`h-3 w-full rounded-full overflow-hidden flex items-center ${
                  isDark ? 'bg-slate-700/40' : 'bg-slate-100'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1 shadow-xs ${barBg}`}
                    style={{ width: `${percent}%` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

