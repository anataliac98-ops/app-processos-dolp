import React, { useState, useMemo } from 'react';
import { VagaRecord, GlobalFilters, UploadedFilesState } from '../types';
import { filterVagas } from '../services/riskEngine';
import { parseVagasSheet } from '../services/excelParser';
import { TabAttachmentDropzone } from './TabAttachmentDropzone';
import { SolicitanteFilterDropdown } from './SolicitanteFilterDropdown';
import { useTheme } from '../context/ThemeContext';
import {
  Briefcase,
  CheckCircle2,
  Hourglass,
  Clock,
  AlertTriangle,
  Building,
  Layers,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from 'recharts';

interface Module1Props {
  vagas: VagaRecord[];
  filters: GlobalFilters;
  uploadedFiles: UploadedFilesState;
  onDataLoaded: (data: { vagas: VagaRecord[]; uploadedState: Partial<UploadedFilesState> }) => void;
  onClearVagasData?: () => void;
}

const MONTHS_OPTIONS = [
  { value: '01', name: 'Janeiro', short: 'Jan' },
  { value: '02', name: 'Fevereiro', short: 'Fev' },
  { value: '03', name: 'Março', short: 'Mar' },
  { value: '04', name: 'Abril', short: 'Abr' },
  { value: '05', name: 'Maio', short: 'Mai' },
  { value: '06', name: 'Junho', short: 'Jun' },
  { value: '07', name: 'Julho', short: 'Jul' },
  { value: '08', name: 'Agosto', short: 'Ago' },
  { value: '09', name: 'Setembro', short: 'Set' },
  { value: '10', name: 'Outubro', short: 'Out' },
  { value: '11', name: 'Novembro', short: 'Nov' },
  { value: '12', name: 'Dezembro', short: 'Dez' },
];

const parseDateParts = (dateStr?: string): { year: string; month: string; yearMonth: string } | null => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;

  const yyyyMmMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (yyyyMmMatch) {
    const y = yyyyMmMatch[1];
    const m = yyyyMmMatch[2].padStart(2, '0');
    return { year: y, month: m, yearMonth: `${y}-${m}` };
  }
  const ddMmYyyyMatch = str.match(/^\d{1,2}[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddMmYyyyMatch) {
    const m = ddMmYyyyMatch[1].padStart(2, '0');
    const y = ddMmYyyyMatch[2];
    return { year: y, month: m, yearMonth: `${y}-${m}` };
  }
  return null;
};

export const Module1VagasSLA: React.FC<Module1Props> = ({
  vagas,
  filters,
  uploadedFiles,
  onDataLoaded,
  onClearVagasData,
}) => {
  const { isDark } = useTheme();
  const [solicitanteFilter, setSolicitanteFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [motivoFilter, setMotivoFilter] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // ----------------------------------------------------
  // FILTRO GERAL TEMPORAL (ANO E MÊS) PARA SLA VAGAS
  // ----------------------------------------------------
  const [selectedAno, setSelectedAno] = useState<string>('Todos');
  const [selectedMes, setSelectedMes] = useState<string>('Todos');

  // Extrair lista de anos disponíveis
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    vagas.forEach(v => {
      if (v.dataSolicitacao) {
        const parts = parseDateParts(v.dataSolicitacao);
        if (parts?.year && parts.year.length === 4) yearsSet.add(parts.year);
      }
      if (v.dataFechamento) {
        const parts = parseDateParts(v.dataFechamento);
        if (parts?.year && parts.year.length === 4) yearsSet.add(parts.year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [vagas]);

  // Contagem de vagas por mês para o ano ativo
  const monthlyStatsForYear = useMemo(() => {
    const map = new Map<string, { total: number; fechadas: number; abertas: number }>();
    MONTHS_OPTIONS.forEach(m => {
      map.set(m.value, { total: 0, fechadas: 0, abertas: 0 });
    });

    vagas.forEach(v => {
      const dateTarget = v.dataSolicitacao || v.dataFechamento;
      if (dateTarget) {
        const parts = parseDateParts(dateTarget);
        if (parts && (selectedAno === 'Todos' || parts.year === selectedAno)) {
          const cur = map.get(parts.month) || { total: 0, fechadas: 0, abertas: 0 };
          cur.total += 1;
          if (v.status === 'Fechada') cur.fechadas += 1;
          else cur.abertas += 1;
          map.set(parts.month, cur);
        }
      }
    });

    return map;
  }, [vagas, selectedAno]);

  // Extrair lista de solicitantes únicos
  const solicitantesList = useMemo(() => {
    const set = new Set<string>();
    vagas.forEach(v => {
      if (v.solicitante && v.solicitante.trim()) {
        set.add(v.solicitante.trim());
      }
    });
    return Array.from(set).sort();
  }, [vagas]);

  // Aplicar filtros globais + temporal (Ano/Mês) + filtros locais (Status, Motivo, Solicitante)
  const filtered = useMemo(() => {
    let list = filterVagas(vagas, filters);

    // Filtro Temporal de Ano e Mês
    if (selectedAno !== 'Todos' || selectedMes !== 'Todos') {
      list = list.filter(v => {
        const dateTarget = v.dataSolicitacao || v.dataFechamento;
        if (!dateTarget) return false;
        const parts = parseDateParts(dateTarget);
        if (!parts) return false;

        if (selectedAno !== 'Todos' && parts.year !== selectedAno) return false;
        if (selectedMes !== 'Todos' && parts.month !== selectedMes) return false;

        return true;
      });
    }

    if (solicitanteFilter !== 'Todos') {
      list = list.filter(v => v.solicitante === solicitanteFilter);
    }
    if (statusFilter !== 'Todos') {
      list = list.filter(v => v.status === statusFilter);
    }
    if (motivoFilter !== 'Todos') {
      list = list.filter(v => v.motivo === motivoFilter);
    }
    return list;
  }, [vagas, filters, selectedAno, selectedMes, solicitanteFilter, statusFilter, motivoFilter]);

  // Helper label para período ativo
  const activePeriodLabel = useMemo(() => {
    if (selectedAno === 'Todos' && selectedMes === 'Todos') {
      return 'Histórico Completo (Todos os Anos e Meses)';
    }
    if (selectedAno !== 'Todos' && selectedMes === 'Todos') {
      return `Ano Todo de ${selectedAno} (Todos os 12 Meses)`;
    }
    const monthName = MONTHS_OPTIONS.find(m => m.value === selectedMes)?.name || selectedMes;
    if (selectedAno === 'Todos') {
      return `Mês de ${monthName} (${selectedMes}) - Todos os Anos`;
    }
    return `Mês de ${monthName} / ${selectedAno} (${selectedMes}/${selectedAno})`;
  }, [selectedAno, selectedMes]);

  const isTemporalFiltered = selectedAno !== 'Todos' || selectedMes !== 'Todos';

  // KPIs
  const totalVagas = filtered.length;
  const vagasFechadas = filtered.filter(v => v.status === 'Fechada').length;
  const vagasEmAndamento = filtered.filter(v => v.status === 'Aberta' || v.status === 'Em Andamento').length;
  const slaMedio = totalVagas > 0
    ? Math.round(filtered.reduce((acc, v) => acc + (v.slaDias || 0), 0) / totalVagas)
    : 0;

  // ----------------------------------------------------
  // PAINEL 1: SLA MÉDIO POR CARGO (DIAS) - META 25D (LARANJA)
  // ----------------------------------------------------
  const slaPorCargoData = useMemo(() => {
    const map = new Map<string, { totalSla: number; count: number; abertas: number }>();
    filtered.forEach(v => {
      const cargo = v.cargo || 'Cargo Operacional';
      const prev = map.get(cargo) || { totalSla: 0, count: 0, abertas: 0 };
      const isAberta = v.status === 'Aberta' || v.status === 'Em Andamento';
      map.set(cargo, {
        totalSla: prev.totalSla + (v.slaDias || 1),
        count: prev.count + 1,
        abertas: prev.abertas + (isAberta ? 1 : 0),
      });
    });

    const list = Array.from(map.entries()).map(([cargo, data]) => ({
      cargo: cargo.toUpperCase(),
      abertas: data.abertas || data.count,
      slaMedio: Math.round(data.totalSla / (data.count || 1)),
    }));

    return list.sort((a, b) => b.slaMedio - a.slaMedio).slice(0, 10);
  }, [filtered]);

  // ----------------------------------------------------
  // PAINEL 2: SLA MÉDIO POR FILIAL / BASE MT (AZUL)
  // ----------------------------------------------------
  const slaPorFilialData = useMemo(() => {
    const map = new Map<string, { totalSla: number; count: number; abertas: number }>();
    filtered.forEach(v => {
      const filial = v.filial || 'CUIABÁ - MT';
      const prev = map.get(filial) || { totalSla: 0, count: 0, abertas: 0 };
      const isAberta = v.status === 'Aberta' || v.status === 'Em Andamento';
      map.set(filial, {
        totalSla: prev.totalSla + (v.slaDias || 1),
        count: prev.count + 1,
        abertas: prev.abertas + (isAberta ? 1 : 0),
      });
    });

    const list = Array.from(map.entries()).map(([filial, data]) => ({
      filial: filial.toUpperCase(),
      abertas: data.abertas || data.count,
      slaMedio: Math.round(data.totalSla / (data.count || 1)),
    }));

    return list.sort((a, b) => b.slaMedio - a.slaMedio).slice(0, 8);
  }, [filtered]);

  // Max SLAs for progress bar calculations
  const maxCargoSla = useMemo(() => {
    const max = Math.max(...slaPorCargoData.map(d => d.slaMedio), 25);
    return max > 0 ? max : 25;
  }, [slaPorCargoData]);

  const maxFilialSla = useMemo(() => {
    const max = Math.max(...slaPorFilialData.map(d => d.slaMedio), 25);
    return max > 0 ? max : 25;
  }, [slaPorFilialData]);

  // Gráficos complementares: Etapa Atual & Distribuição por Tipo
  const etapaData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(v => {
      const etapa = v.etapa || (v.status === 'Fechada' ? 'Concluída' : 'Divulgação (divulgada)');
      map.set(etapa, (map.get(etapa) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const tipoData = useMemo(() => {
    let subst = 0;
    let aumento = 0;
    let reserva = 0;

    filtered.forEach(v => {
      if (v.motivo === 'Aumento de Quadro') aumento++;
      else if (v.motivo === 'Cadastro reserva') reserva++;
      else subst++;
    });

    const total = filtered.length || 1;
    return [
      { name: 'Substituição', value: subst, percent: Math.round((subst / total) * 100), color: '#38BDF8' },
      { name: 'Aumento de quadro', value: aumento, percent: Math.round((aumento / total) * 100), color: '#10B981' },
      { name: 'Cadastro reserva', value: reserva, percent: Math.round((reserva / total) * 100), color: '#F59E0B' },
    ].filter(item => item.value > 0);
  }, [filtered]);

  // ----------------------------------------------------
  // PAINEL DETALHADO DE SOLICITAÇÕES DE VAGAS (TABELA)
  // ----------------------------------------------------
  const sortedVagasTable = useMemo(() => {
    return [...filtered].sort((a, b) => (b.slaDias || 0) - (a.slaDias || 0));
  }, [filtered]);

  const totalPages = Math.ceil(sortedVagasTable.length / itemsPerPage) || 1;
  const paginatedVagas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedVagasTable.slice(start, start + itemsPerPage);
  }, [sortedVagasTable, currentPage]);

  const handleFileUpload = (buffer: ArrayBuffer, file: File) => {
    const records = parseVagasSheet(buffer);
    if (records.length === 0) {
      throw new Error('Nenhum registro válido de vaga foi encontrado na planilha.');
    }
    onDataLoaded({
      vagas: records,
      uploadedState: {
        vagasFileName: file.name,
        vagasRowCount: records.length,
        vagasLoadedAt: new Date().toLocaleTimeString(),
      },
    });
  };

  return (
    <div id="modulo-vagas-sla" className="space-y-6">
      {/* Dropzone de upload da planilha */}
      <TabAttachmentDropzone
        title="Planilha Vagas (.xlsx)"
        expectedFileName="grid_tb_oper_contratacao_vaga.xlsx"
        description="Carregue aqui a planilha de contratações/vagas para calcular automaticamente o acompanhamento e indicadores de contratação."
        fileName={uploadedFiles.vagasFileName}
        rowCount={vagas.length}
        loadedAt={uploadedFiles.vagasLoadedAt}
        colorTheme="sky"
        onFileSelected={handleFileUpload}
        onClearData={onClearVagasData}
        emptyNotice="Anexe a planilha de vagas para povoar os indicadores do Dashboard SLA de Vagas."
      />

      {/* PAINEL DE FILTRO GERAL POR MÊS E ANO */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
        isDark
          ? 'bg-slate-900/80 border-slate-700/80 shadow-slate-950/40'
          : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Filtro Geral por Mês e Ano (SLA Vagas)
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Selecione o <strong>Ano todo</strong> ou analise <strong>mês a mês individualmente</strong> todas as vagas e indicadores de SLA
              </p>
            </div>
          </div>

          {isTemporalFiltered && (
            <button
              type="button"
              onClick={() => {
                setSelectedAno('Todos');
                setSelectedMes('Todos');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer self-start sm:self-auto ${
                isDark
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-2xs'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtro Temporal
            </button>
          )}
        </div>

        {/* Dropdowns de Ano e Mês */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Seletor 1: Ano */}
          <div className={`p-3.5 rounded-xl border transition ${
            isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              1. Selecionar Ano:
            </label>
            <div className="relative">
              <select
                value={selectedAno}
                onChange={(e) => {
                  setSelectedAno(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full text-xs font-bold py-2 px-3 rounded-lg border outline-hidden transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-600 shadow-2xs'
                }`}
              >
                <option value="Todos" className={isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-slate-900'}>
                  Todos os Anos ({availableYears.length > 0 ? availableYears.join(', ') : 'Geral'})
                </option>
                {availableYears.map(year => (
                  <option key={year} value={year} className={isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-slate-900'}>
                    Ano {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seletor 2: Mês */}
          <div className={`p-3.5 rounded-xl border transition ${
            isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              2. Selecionar Mês:
            </label>
            <div className="relative">
              <select
                value={selectedMes}
                onChange={(e) => {
                  setSelectedMes(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full text-xs font-bold py-2 px-3 rounded-lg border outline-hidden transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-600 shadow-2xs'
                }`}
              >
                <option value="Todos" className={isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-slate-900'}>
                  Ano Todo (Todos os 12 Meses)
                </option>
                {MONTHS_OPTIONS.map(m => {
                  const stats = monthlyStatsForYear.get(m.value) || { total: 0 };
                  return (
                    <option key={m.value} value={m.value} className={isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-slate-900'}>
                      {m.name} ({m.value}) — {stats.total} vagas
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Seletor 3: Status / Resumo do Período */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Período em Análise
            </label>
            <div className={`text-xs font-bold truncate ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>
              {activePeriodLabel}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/30' : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                {totalVagas} vagas
              </span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {vagasFechadas} fechadas
              </span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {vagasEmAndamento} em andamento
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Navegação Rápida Mês a Mês */}
        <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Navegação Rápida Mês a Mês:
            </span>
            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Clique para alternar diretamente entre os meses
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedMes('Todos');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedMes === 'Todos'
                  ? isDark
                    ? 'bg-[#38BDF8] text-slate-950 shadow-md shadow-sky-500/20'
                    : 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Ano Todo
            </button>

            {MONTHS_OPTIONS.map(m => {
              const isSelected = selectedMes === m.value;
              const stats = monthlyStatsForYear.get(m.value) || { total: 0 };
              const hasData = stats.total > 0;

              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setSelectedMes(m.value);
                    setCurrentPage(1);
                  }}
                  className={`relative px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? isDark
                        ? 'bg-[#38BDF8] text-slate-950 font-bold shadow-md shadow-sky-500/20'
                        : 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/20'
                      : isDark
                        ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                  title={`${m.name}: ${stats.total} vagas (${stats.fechadas} fechadas)`}
                >
                  <span>{m.short}</span>
                  {hasData && (
                    <span className={`text-[10px] font-mono px-1 rounded-sm ${
                      isSelected
                        ? isDark ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-white/30 text-white font-black'
                        : isDark ? 'bg-sky-500/20 text-[#38BDF8]' : 'bg-sky-100 text-sky-700'
                    }`}>
                      {stats.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL DE VAGAS */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL DE VAGAS</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalVagas}</div>
          <div className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Posições registradas no sistema
          </div>
        </div>

        {/* Card 2: VAGAS FECHADAS */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-emerald-500/30' : 'bg-white border-emerald-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>VAGAS FECHADAS</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{vagasFechadas}</div>
          <div className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Processos seletivos concluídos
          </div>
        </div>

        {/* Card 3: VAGAS EM ANDAMENTO */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-amber-500/30' : 'bg-white border-amber-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>VAGAS EM ANDAMENTO</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{vagasEmAndamento}</div>
          <div className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Posições em processo de atração e seleção
          </div>
        </div>

        {/* Card 4: SLA MÉDIO (DIAS) */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-indigo-500/30' : 'bg-white border-indigo-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SLA MÉDIO (DIAS)</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight flex items-baseline gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>{slaMedio}</span>
            <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>dias</span>
          </div>
          <div className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Média de permanência em aberto
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. OS DOIS PAINÉIS PRINCIPAIS: SLA MÉDIO POR CARGO & SLA MÉDIO POR FILIAL */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel Esquerdo: SLA Médio por Cargo (Dias) - Laranja com Meta: 25d */}
        <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <div className={`p-1 rounded-lg border ${
                  isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'
                }`}>
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <span>SLA Médio por Cargo (Dias)</span>
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isDark ? 'text-slate-300 bg-slate-900 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-200'
              }`}>
                Meta: 25d
              </span>
            </div>
            <p className={`text-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cargos com maior tempo de fechamento e reposição
            </p>

            {slaPorCargoData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Nenhum dado de vagas disponível.
              </div>
            ) : (
              <div className="space-y-4">
                {slaPorCargoData.map((item, idx) => {
                  const widthPercent = Math.min(100, Math.max(12, Math.round((item.slaMedio / maxCargoSla) * 100)));
                  return (
                    <div key={`${item.cargo}-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium truncate max-w-[280px] sm:max-w-[340px] uppercase text-[11px] ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {item.cargo} <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>({item.abertas} abertas)</span>
                        </span>
                        <span className={`font-mono font-bold text-xs shrink-0 ${
                          item.slaMedio > 25
                            ? isDark ? 'text-orange-400' : 'text-orange-600'
                            : isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {item.slaMedio} dias
                        </span>
                      </div>

                      {/* Custom Orange Progress Bar with round dot */}
                      <div className={`h-2.5 w-full rounded-full overflow-visible relative ${
                        isDark ? 'bg-slate-900/80' : 'bg-slate-100'
                      }`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 relative transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {/* Dot at the end of the bar */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full shadow-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: SLA Médio por Filial / Base MT - Azul com Foco MT */}
        <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <div className={`p-1 rounded-lg border ${
                  isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-50 text-sky-600 border-sky-200'
                }`}>
                  <Building className="w-3.5 h-3.5" />
                </div>
                <span>SLA Médio por Filial / Base MT</span>
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isDark ? 'text-[#38BDF8] bg-sky-950/60 border-sky-800/60' : 'text-sky-700 bg-sky-50 border-sky-200'
              }`}>
                Foco MT
              </span>
            </div>
            <p className={`text-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Destaque para o polo logístico e operacional de Mato Grosso
            </p>

            {slaPorFilialData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Nenhum dado de filiais disponível.
              </div>
            ) : (
              <div className="space-y-4">
                {slaPorFilialData.map((item, idx) => {
                  const widthPercent = Math.min(100, Math.max(12, Math.round((item.slaMedio / maxFilialSla) * 100)));
                  return (
                    <div key={`${item.filial}-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium truncate max-w-[280px] sm:max-w-[340px] uppercase text-[11px] ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {item.filial} <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>({item.abertas} em aberto)</span>
                        </span>
                        <span className={`font-mono font-bold text-xs shrink-0 ${
                          isDark ? 'text-[#38BDF8]' : 'text-sky-600'
                        }`}>
                          {item.slaMedio} dias
                        </span>
                      </div>

                      {/* Custom Cyan/Sky Progress Bar with round dot */}
                      <div className={`h-2.5 w-full rounded-full overflow-visible relative ${
                        isDark ? 'bg-slate-900/80' : 'bg-slate-100'
                      }`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 relative transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {/* Dot at the end of the bar */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-full shadow-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PAINEL DETALHADO DE SOLICITAÇÕES DE VAGAS (TABELA ANALÍTICA COMPLETA)   */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? 'bg-slate-800/20 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          isDark ? 'border-slate-700/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Briefcase className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
              Painel Detalhado de Solicitações de Vagas
            </h3>
            <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Exibindo {sortedVagasTable.length} de {vagas.length} vagas filtradas
            </p>
          </div>

          {/* Table Level Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`border rounded-lg px-2.5 py-1 text-xs font-medium outline-hidden transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-950 border-slate-700/80 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                <option value="Todos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Todos</option>
                <option value="Aberta" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Aberta</option>
                <option value="Em Andamento" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Em Andamento</option>
                <option value="Fechada" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Fechada</option>
                <option value="Cancelada" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Cancelada</option>
              </select>
            </div>

            {/* Motivo Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Motivo:</span>
              <select
                value={motivoFilter}
                onChange={(e) => {
                  setMotivoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`border rounded-lg px-2.5 py-1 text-xs font-medium outline-hidden transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-950 border-slate-700/80 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                <option value="Todos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Todos</option>
                <option value="Substituição" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Substituição</option>
                <option value="Aumento de Quadro" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Aumento de Quadro</option>
                <option value="Cadastro reserva" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Cadastro reserva</option>
              </select>
            </div>

            {/* Solicitante Dropdown with Search */}
            {solicitantesList.length > 0 && (
              <SolicitanteFilterDropdown
                solicitantes={solicitantesList}
                selectedSolicitante={solicitanteFilter}
                onSelect={(sol) => {
                  setSolicitanteFilter(sol);
                  setCurrentPage(1);
                }}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
              isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-4 font-mono">CÓD. VAGA</th>
                <th className="py-3.5 px-4">CARGO</th>
                <th className="py-3.5 px-4">UNIDADE</th>
                <th className="py-3.5 px-4">SOLICITAÇÃO</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">SLA ATUAL</th>
                <th className="py-3.5 px-4">MOTIVO</th>
                <th className="py-3.5 px-4">SUBSTITUÍDO</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {paginatedVagas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma vaga encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedVagas.map((v) => {
                  const diasAberta = v.slaDias || 1;
                  const isSlaEstourado = diasAberta > 25;

                  return (
                    <tr
                      key={v.id}
                      className={`transition ${
                        isSlaEstourado
                          ? isDark
                            ? 'border-l-4 border-rose-500 bg-rose-950/20 hover:bg-rose-950/30'
                            : 'border-l-4 border-rose-500 bg-rose-50/70 hover:bg-rose-100/70'
                          : isDark
                            ? 'border-l-4 border-transparent hover:bg-slate-800/40'
                            : 'border-l-4 border-transparent hover:bg-slate-50'
                      }`}
                    >
                      {/* CÓD. VAGA */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={isDark ? 'text-[#38BDF8]' : 'text-sky-700'}>
                          {v.codigoVaga}
                        </span>
                      </td>

                      {/* CARGO */}
                      <td className={`py-3.5 px-4 font-medium uppercase text-[11px] ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        {v.cargo}
                      </td>

                      {/* FILIAL / BASE */}
                      <td className={`py-3.5 px-4 uppercase text-[11px] ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {v.filial}
                      </td>

                      {/* SOLICITAÇÃO */}
                      <td className={`py-3.5 px-4 font-mono text-[11px] ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {v.dataSolicitacao}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'Fechada'
                            ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                            : v.status === 'Em Andamento'
                              ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-700'
                              : isDark ? 'bg-sky-500/20 text-[#38BDF8]' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {v.status}
                        </span>
                      </td>

                      {/* SLA ATUAL */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {isSlaEstourado ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {diasAberta} d
                          </span>
                        ) : (
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                            {diasAberta} d
                          </span>
                        )}
                      </td>

                      {/* MOTIVO */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-medium ${
                          v.motivo === 'Substituição'
                            ? isDark ? 'text-amber-400' : 'text-amber-600'
                            : v.motivo === 'Aumento de Quadro'
                              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                              : isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {v.motivo}
                        </span>
                      </td>

                      {/* SUBSTITUÍDO */}
                      <td className={`py-3.5 px-4 uppercase text-[11px] font-medium ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {v.pessoaSustituida ? v.pessoaSustituida.toUpperCase() : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação da Tabela */}
        {totalPages > 1 && (
          <div className={`p-4 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-700/60 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
          }`}>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 shadow-xs'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Página {currentPage} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 shadow-xs'
              }`}
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BLOCO DE APOIO ANALÍTICO: FUNIL DE ETAPAS & DISTRIBUIÇÃO POR MOTIVO     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico: Vagas por Etapa Atual */}
        <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-4 border-b pb-3 ${
              isDark ? 'border-slate-700/60' : 'border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Layers className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
                Vagas por Etapa Atual (Funil R&S)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isDark ? 'text-slate-400 bg-slate-900 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-200'
              }`}>
                Etapas
              </span>
            </div>

            {etapaData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Nenhum dado de etapas de vagas disponível.
              </div>
            ) : (
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={etapaData} margin={{ top: 20, right: 15, left: -20, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} opacity={0.6} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke={isDark ? '#94a3b8' : '#64748B'}
                      fontSize={11}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke={isDark ? '#94a3b8' : '#64748B'}
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className={`p-2.5 rounded-xl shadow-xl text-xs border ${
                              isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}>
                              <div className="font-bold">{label}</div>
                              <div className={`font-mono font-bold mt-1 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`}>
                                {payload[0].value} vagas
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Vagas"
                      fill="#0284C7"
                      radius={[6, 6, 0, 0]}
                      barSize={44}
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        offset={8}
                        fill={isDark ? '#38BDF8' : '#0369A1'}
                        fontSize={11}
                        fontWeight="bold"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico: Distribuição por Tipo (Donut Chart) */}
        <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-4 border-b pb-3 ${
              isDark ? 'border-slate-700/60' : 'border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <PieIcon className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                Distribuição por Motivo de Abertura
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isDark ? 'text-slate-400 bg-slate-900 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-200'
              }`}>
                Motivo
              </span>
            </div>

            {tipoData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Nenhum dado de tipo de vaga disponível.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="h-[200px] w-[200px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tipoData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {tipoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2.5 rounded-xl shadow-xl text-xs border ${
                                isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}>
                                <div className="font-bold">{data.name}</div>
                                <div className={`font-mono mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  <strong>{data.value}</strong> vagas ({data.percent}%)
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Legend */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  {tipoData.map((item, idx) => (
                    <div key={`${item.name}-${idx}`} className="flex items-center justify-between sm:justify-start gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.name}</span>
                      </div>
                      <div className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        <strong>{item.value}</strong> ({item.percent}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
