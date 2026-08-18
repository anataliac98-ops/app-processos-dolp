import React, { useState, useRef, useEffect } from 'react';
import {
  TabType,
  GlobalFilters,
  DatasetStats,
  UploadedFilesState,
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { SolicitanteFilterDropdown } from './SolicitanteFilterDropdown';
import {
  Briefcase,
  Users,
  Layers,
  AlertTriangle,
  FileText,
  Download,
  Filter,
  Search,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Trash2,
  UserCheck,
  ChevronDown,
  X,
} from 'lucide-react';

interface HeaderProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  filters: GlobalFilters;
  onFilterChange: (filters: GlobalFilters) => void;
  stats: DatasetStats;
  onResetDemoData: () => void;
  onClearAllData: () => void;
  onOpenExecutiveSummary: () => void;
  onExportWord?: () => void;
  uploadedFiles: UploadedFilesState;
  isCustomDataLoaded: boolean;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  filters,
  onFilterChange,
  stats,
  onResetDemoData,
  onClearAllData,
  onOpenExecutiveSummary,
  onExportWord,
  uploadedFiles,
  isCustomDataLoaded,
  hasData,
}) => {
  const { isDark } = useTheme();

  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    integrada: {
      title: 'Painel de Risco Macro',
      subtitle: 'Triangulação Integrada de Vagas (Gargalo), Turnover (Fato) e Absenteísmo (Termômetro)',
    },
    vagas: {
      title: 'SLA de Vagas & Recrutamento',
      subtitle: 'Controle de tempo de fechamento, postos críticos e motivos de solicitação',
    },
    turnover: {
      title: 'Diagnóstico de Evasão (Turnover)',
      subtitle: 'Análise de retenção: quando saem (<90d), quem sai e motivos de desligamento',
    },
    individual: {
      title: 'Matriz de Risco Individual (Micro)',
      subtitle: 'Cruzamento de colaboradores com alto absenteísmo e vaga de substituição em aberto',
    },
  };

  const activeMeta = tabTitles[currentTab] || tabTitles.integrada;

  return (
    <div className="w-full space-y-4">
      {/* Top Header Row with Title & High-level KPI Badges */}
      <div className={`flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-2 border-b ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 ${
              isDark ? 'text-[#38BDF8]' : 'text-sky-600'
            }`}>
              <Sparkles className="w-3 h-3" />
              Inteligência de Pessoal & SLA
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isDark
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              LGPD Safe • 100% Client-Side
            </span>
          </div>
          <h2 className={`text-2xl lg:text-3xl font-light tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900 font-normal'
          }`}>
            {activeMeta.title}
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {activeMeta.subtitle}
          </p>
        </div>

        {/* Dynamic Metric Blocks matching the Immersive UI design */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Card: Vagas SLA */}
          <div
            onClick={() => onTabChange('vagas')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
              currentTab === 'vagas'
                ? isDark
                  ? 'bg-slate-800/80 border-sky-500/40 text-white shadow-sm'
                  : 'bg-sky-50/90 border-sky-300 text-sky-950 shadow-xs'
                : isDark
                  ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-xs'
            }`}
            title="Clique para ir à aba de SLA de Vagas"
          >
            <div className={`p-2 rounded-lg border ${
              isDark
                ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20'
                : 'bg-sky-100 text-sky-700 border-sky-200'
            }`}>
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-semibold ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>Vagas Abertas</div>
              <div className={`text-lg font-bold font-mono leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {stats.vagasAbertas}
                <span className={`text-xs font-normal ml-1 font-sans ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  ({stats.vagasEstouradasSLA} estouradas)
                </span>
              </div>
            </div>
          </div>

          {/* Card: Turnover */}
          <div
            onClick={() => onTabChange('turnover')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
              currentTab === 'turnover'
                ? isDark
                  ? 'bg-slate-800/80 border-orange-500/40 text-white shadow-sm'
                  : 'bg-orange-50/90 border-orange-300 text-orange-950 shadow-xs'
                : isDark
                  ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-xs'
            }`}
            title="Clique para ir à aba de Turnover"
          >
            <div className={`p-2 rounded-lg border ${
              isDark
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'bg-orange-100 text-orange-700 border-orange-200'
            }`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-semibold ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>Taxa de Turnover</div>
              <div className={`text-lg font-bold font-mono leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {stats.taxaTurnoverGeral}%
                <span className={`text-xs font-normal ml-1 font-sans ${
                  isDark ? 'text-rose-400' : 'text-rose-600 font-medium'
                }`}>
                  ({stats.desligamentosPrecoces} &lt;90d)
                </span>
              </div>
            </div>
          </div>

          {/* Card: Risco Crítico */}
          <div
            onClick={() => onTabChange('individual')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
              currentTab === 'individual'
                ? isDark
                  ? 'bg-slate-800/80 border-rose-500/40 text-white shadow-sm'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs'
                : isDark
                  ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-xs'
            }`}
            title="Clique para ir à aba de Risco Individual"
          >
            <div className={`p-2 rounded-lg border ${
              isDark
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-semibold ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>Risco Crítico Micro</div>
              <div className={`text-lg font-bold font-mono leading-tight ${
                isDark ? 'text-rose-400' : 'text-rose-600'
              }`}>
                {stats.colaboradoresRiscoCritico}
                <span className={`text-xs font-normal ml-1 font-sans ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  ({stats.vagasSubstituicaoAbertas} c/ vaga)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar with Executive Summary & Fast Controls */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border ${
        isDark
          ? 'bg-slate-900/50 border-slate-800'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Extrair Relatório de Análise Button */}
          <button
            type="button"
            onClick={onOpenExecutiveSummary}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer ${
              isDark
                ? 'bg-[#38BDF8] text-slate-950 hover:bg-sky-400'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
            title="Abrir e extrair relatório completo da análise com gráficos, PDF e texto"
          >
            <Download className="w-4 h-4" />
            <span>Extrair Relatório de Análise</span>
          </button>

          {/* Direct Word Download Button */}
          {onExportWord && (
            <button
              type="button"
              id="btn-direct-export-word"
              onClick={onExportWord}
              className={`px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isDark
                  ? 'bg-blue-500 hover:bg-blue-400 text-slate-950'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title="Baixar relatório completo formatado em Word (.doc) de todas as abas"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar Word (.doc)</span>
            </button>
          )}

          {/* Clear Data Button */}
          {hasData && (
            <button
              type="button"
              onClick={onClearAllData}
              className={`px-3 py-2 rounded-lg font-semibold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-500/40'
                  : 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200 hover:border-rose-200'
              }`}
              title="Limpar todos os dados e começar nova análise vazia"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
              <span>Limpar Painel</span>
            </button>
          )}

          {/* Demo Data Button */}
          <button
            type="button"
            onClick={onResetDemoData}
            className={`px-3 py-2 rounded-lg font-semibold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Carregar conjunto modelo de demonstração (Polo MT - Cuiabá e Várzea Grande)"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
            <span>Carregar Dados Modelo MT</span>
          </button>

          {/* Theme Quick Toggle in Action Bar */}
          <ThemeToggle />
        </div>

        {/* Status of Loaded Sheets */}
        <div className={`text-[11px] font-mono flex items-center gap-2 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Planilhas nas Abas:</span>
          <span
            onClick={() => onTabChange('vagas')}
            className={`cursor-pointer underline-offset-2 hover:underline ${
              uploadedFiles.vagasRowCount > 0
                ? isDark ? 'text-[#38BDF8] font-bold' : 'text-sky-600 font-bold'
                : isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Vagas ({uploadedFiles.vagasRowCount})
          </span>
          <span>•</span>
          <span
            onClick={() => onTabChange('turnover')}
            className={`cursor-pointer underline-offset-2 hover:underline ${
              uploadedFiles.pessoasRowCount > 0
                ? isDark ? 'text-orange-400 font-bold' : 'text-orange-600 font-bold'
                : isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Turnover ({uploadedFiles.pessoasRowCount})
          </span>
          <span>•</span>
          <span
            onClick={() => onTabChange('individual')}
            className={`cursor-pointer underline-offset-2 hover:underline ${
              uploadedFiles.pontoRowCount > 0
                ? isDark ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold'
                : isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Ponto ({uploadedFiles.pontoRowCount})
          </span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className={`border rounded-xl px-4 py-3 ${
        isDark
          ? 'bg-slate-900/40 border-slate-800/90'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className={`flex items-center gap-1.5 shrink-0 font-bold uppercase tracking-wider text-[10px] ${
              isDark ? 'text-[#38BDF8]' : 'text-sky-700'
            }`}>
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros Globais:</span>
            </div>

            {/* Unidade / Filial Filter */}
            <div className={`flex items-center border rounded-lg px-2.5 py-1.5 ${
              isDark
                ? 'bg-slate-950 border-slate-700/80'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] mr-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Unidade:</span>
              <select
                id="select-filter-unidade"
                value={filters.filial}
                onChange={(e) => onFilterChange({ ...filters, filial: e.target.value })}
                className={`bg-transparent font-medium outline-hidden text-xs cursor-pointer ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                <option value="Todas" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>
                  Todas as Unidades ({stats.filiaisCadastradas.length})
                </option>
                {stats.filiaisCadastradas.map((fil) => (
                  <option key={fil} value={fil} className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>
                    {fil}
                  </option>
                ))}
              </select>
            </div>

            {/* Cargo Filter */}
            <div className={`flex items-center border rounded-lg px-2.5 py-1.5 ${
              isDark
                ? 'bg-slate-950 border-slate-700/80'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] mr-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cargo:</span>
              <select
                value={filters.cargo}
                onChange={(e) => onFilterChange({ ...filters, cargo: e.target.value })}
                className={`bg-transparent font-medium outline-hidden text-xs cursor-pointer max-w-[180px] truncate ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                <option value="Todos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>
                  Todos os Cargos ({stats.cargosCadastrados.length})
                </option>
                {stats.cargosCadastrados.map((c) => (
                  <option key={c} value={c} className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Solicitante Filter with Searchable Dropdown */}
            <SolicitanteFilterDropdown
              solicitantes={
                stats.solicitantesCadastrados && stats.solicitantesCadastrados.length > 0
                  ? stats.solicitantesCadastrados
                  : ['Gerson Lima (Coord. Logística)', 'Eduardo Guimarães (Gerente Frotas)', 'Lucas Fagundes', 'Camila Santos']
              }
              selectedSolicitante={filters.solicitante || 'Todos'}
              onSelect={(sol) => onFilterChange({ ...filters, solicitante: sol })}
              isDark={isDark}
            />

            {(filters.filial !== 'Todas' || filters.cargo !== 'Todos' || (filters.solicitante && filters.solicitante !== 'Todos') || filters.buscaTexto) && (
              <button
                type="button"
                onClick={() => onFilterChange({ filial: 'Todas', cargo: 'Todos', solicitante: 'Todos', buscaTexto: '' })}
                className={`text-[11px] underline underline-offset-2 ml-1 cursor-pointer font-medium ${
                  isDark ? 'text-[#38BDF8] hover:text-sky-300' : 'text-sky-600 hover:text-sky-800'
                }`}
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Quick search input */}
          <div className="relative min-w-[260px]">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <input
              type="text"
              placeholder="Buscar colaborador, cargo, filial..."
              value={filters.buscaTexto}
              onChange={(e) => onFilterChange({ ...filters, buscaTexto: e.target.value })}
              className={`w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-hidden transition ${
                isDark
                  ? 'bg-slate-950 text-slate-200 placeholder-slate-500 border-slate-700/80 focus:border-[#38BDF8]'
                  : 'bg-slate-50 text-slate-800 placeholder-slate-400 border-slate-200 focus:border-sky-500 focus:bg-white'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

