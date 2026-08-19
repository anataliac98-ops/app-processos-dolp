import React, { useState, useMemo, useEffect } from 'react';
import { PessoaRecord, PontoRecord, VagaRecord, GlobalFilters, RiskLevel, IndividualRiskRow, UploadedFilesState } from '../types';
import { computeIndividualRisk, filterVagas, filterPessoas } from '../services/riskEngine';
import { parsePontoSheet } from '../services/excelParser';
import { TabAttachmentDropzone } from './TabAttachmentDropzone';
import { useTheme } from '../context/ThemeContext';
import {
  AlertTriangle,
  UserX,
  UserCheck,
  ShieldAlert,
  Search,
  CheckCircle,
  PhoneCall,
  Sparkles,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Layers,
  ArrowRightLeft,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
  LayoutList,
  Table as TableIcon,
  SlidersHorizontal,
  Info,
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
  Legend,
  LabelList,
  Line,
  ComposedChart,
} from 'recharts';

interface Module4Props {
  pessoas: PessoaRecord[];
  ponto: PontoRecord[];
  vagas: VagaRecord[];
  filters: GlobalFilters;
  uploadedFiles: UploadedFilesState;
  onDataLoaded: (data: { ponto: PontoRecord[]; uploadedState: Partial<UploadedFilesState> }) => void;
  onClearPontoData?: () => void;
}

interface SlaJobComparison {
  cargo: string;
  desligamentosCount: number;
  tempoMedioSaidaDias: number; // Média de permanência até o desligamento
  slaMedioReporDias: number; // Média de dias de SLA da vaga de substituição
  slaMetaDias: number; // Meta de SLA da vaga
  diferencaSlaDias: number; // SLA Real - Meta (excesso)
  vagasSubstituicaoCount: number;
  emRiscoCount: number;
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

export const Module4RiscoIndividual: React.FC<Module4Props> = ({
  pessoas,
  ponto,
  vagas,
  filters,
  uploadedFiles,
  onDataLoaded,
  onClearPontoData,
}) => {
  const { isDark } = useTheme();

  // ----------------------------------------------------
  // FILTRO GERAL TEMPORAL (ANO E MÊS) PARA RISCO INDIVIDUAL
  // ----------------------------------------------------
  const [selectedAno, setSelectedAno] = useState<string>('Todos');
  const [selectedMes, setSelectedMes] = useState<string>('Todos');

  // Anos disponíveis extraídos de Ponto, Pessoas e Vagas
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    ponto.forEach(pt => {
      if (pt.periodo) {
        const parts = parseDateParts(pt.periodo);
        if (parts?.year && parts.year.length === 4) yearsSet.add(parts.year);
      }
    });
    pessoas.forEach(p => {
      if (p.dataDemissao) {
        const parts = parseDateParts(p.dataDemissao);
        if (parts?.year && parts.year.length === 4) yearsSet.add(parts.year);
      }
      if (p.dataAdmissao) {
        const parts = parseDateParts(p.dataAdmissao);
        if (parts?.year && parts.year.length === 4) yearsSet.add(parts.year);
      }
    });
    vagas.forEach(v => {
      if (v.dataSolicitacao) {
        const parts = parseDateParts(v.dataSolicitacao);
        if (parts?.year && parts.year.length === 4) yearsSet.add(parts.year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [ponto, pessoas, vagas]);

  // Contagem mensal de registros de absenteísmo para o ano selecionado
  const monthlyStatsForYear = useMemo(() => {
    const map = new Map<string, { total: number; faltas: number }>();
    MONTHS_OPTIONS.forEach(m => {
      map.set(m.value, { total: 0, faltas: 0 });
    });

    ponto.forEach(pt => {
      if (pt.periodo) {
        const parts = parseDateParts(pt.periodo);
        if (parts && (selectedAno === 'Todos' || parts.year === selectedAno)) {
          const cur = map.get(parts.month) || { total: 0, faltas: 0 };
          cur.total += 1;
          cur.faltas += (pt.faltasInjustificadas || 0);
          map.set(parts.month, cur);
        }
      }
    });

    return map;
  }, [ponto, selectedAno]);

  // Filtragem temporal dos conjuntos de dados
  const periodPonto = useMemo(() => {
    if (selectedAno === 'Todos' && selectedMes === 'Todos') return ponto;
    return ponto.filter(pt => {
      if (!pt.periodo) return true; // se não tiver período especificado, mantém
      const parts = parseDateParts(pt.periodo);
      if (!parts) return true;
      if (selectedAno !== 'Todos' && parts.year !== selectedAno) return false;
      if (selectedMes !== 'Todos' && parts.month !== selectedMes) return false;
      return true;
    });
  }, [ponto, selectedAno, selectedMes]);

  const periodVagas = useMemo(() => {
    if (selectedAno === 'Todos' && selectedMes === 'Todos') return vagas;
    return vagas.filter(v => {
      const dateTarget = v.dataSolicitacao || v.dataFechamento;
      if (!dateTarget) return true;
      const parts = parseDateParts(dateTarget);
      if (!parts) return true;
      if (selectedAno !== 'Todos' && parts.year !== selectedAno) return false;
      if (selectedMes !== 'Todos' && parts.month !== selectedMes) return false;
      return true;
    });
  }, [vagas, selectedAno, selectedMes]);

  const periodPessoas = useMemo(() => {
    return pessoas;
  }, [pessoas]);

  // Cálculo individual de risco com base nos dados do período selecionado
  const allRows = useMemo(() => computeIndividualRisk(periodPessoas, periodPonto, periodVagas), [periodPessoas, periodPonto, periodVagas]);

  const [riskFilter, setRiskFilter] = useState<string>('Todos');
  const [onlySubstitutions, setOnlySubstitutions] = useState<boolean>(false);
  const [actionDoneMap, setActionDoneMap] = useState<Record<string, boolean>>({});

  // Pagination for large employee datasets
  const [tablePage, setTablePage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const filteredVagas = useMemo(() => filterVagas(periodVagas, filters), [periodVagas, filters]);
  const filteredPessoas = useMemo(() => filterPessoas(periodPessoas, filters), [periodPessoas, filters]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (filters.filial !== 'Todas' && row.filial !== filters.filial) return false;
      if (filters.cargo !== 'Todos' && row.cargo !== filters.cargo) return false;
      if (filters.buscaTexto) {
        const q = filters.buscaTexto.toLowerCase();
        const match =
          row.nome.toLowerCase().includes(q) ||
          row.matricula.toLowerCase().includes(q) ||
          row.cargo.toLowerCase().includes(q) ||
          row.filial.toLowerCase().includes(q) ||
          (row.codigoVagaSubstituicao && row.codigoVagaSubstituicao.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (riskFilter !== 'Todos' && row.nivelRisco !== riskFilter) return false;
      if (onlySubstitutions && !row.temVagaAbertaSubstituicao) return false;
      return true;
    });
  }, [allRows, filters, riskFilter, onlySubstitutions]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setTablePage(1);
  }, [filters, riskFilter, onlySubstitutions, pageSize, selectedAno, selectedMes]);

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

  const totalTablePages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(tablePage, totalTablePages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, startIndex, pageSize]);

  const countCritico = allRows.filter(r => r.nivelRisco === 'Crítico').length;
  const countAlto = allRows.filter(r => r.nivelRisco === 'Alto').length;
  const countMedio = allRows.filter(r => r.nivelRisco === 'Médio').length;
  const countComVagaSubstituicao = allRows.filter(r => r.temVagaAbertaSubstituicao).length;

  // ----------------------------------------------------
  // CÁLCULO: SLA de Diferença de Desligamento / Saída entre os Empregos (Cargos)
  // ----------------------------------------------------
  const slaComparisons: SlaJobComparison[] = useMemo(() => {
    const jobNames = new Set<string>();

    filteredPessoas.forEach(p => jobNames.add(p.cargo));
    filteredVagas.forEach(v => jobNames.add(v.cargo));
    filteredRows.forEach(r => jobNames.add(r.cargo));

    const results: SlaJobComparison[] = [];

    jobNames.forEach(cargo => {
      // 1. Desligamentos deste cargo
      const desligadosCargo = filteredPessoas.filter(p => p.cargo === cargo && p.status === 'Desligado');
      const tempoMedioSaidaDias = desligadosCargo.length > 0
        ? Math.round(desligadosCargo.reduce((sum, p) => sum + (p.tempoDeCasaDias || 30), 0) / desligadosCargo.length)
        : 120; // fallback padrão se não houver desligamento explícito

      // 2. Vagas de substituição ou vagas gerais do cargo
      const vagasCargo = filteredVagas.filter(v => v.cargo === cargo);
      const vagasSubst = vagasCargo.filter(v => (v.motivo && v.motivo.toLowerCase().includes('substitui')) || !!v.pessoaSustituida);
      const targetVagas = vagasSubst.length > 0 ? vagasSubst : vagasCargo;

      const slaMedioReporDias = targetVagas.length > 0
        ? Math.round(targetVagas.reduce((sum, v) => sum + (v.slaDias || 1), 0) / targetVagas.length)
        : (desligadosCargo.length > 0 ? 32 : 20);

      const slaMetaDias = targetVagas.length > 0
        ? Math.round(targetVagas.reduce((sum, v) => sum + (v.slaMeta || 25), 0) / targetVagas.length)
        : 25;

      const diferencaSlaDias = slaMedioReporDias - slaMetaDias;

      // 3. Colaboradores em risco
      const emRiscoCount = filteredRows.filter(r => r.cargo === cargo && (r.nivelRisco === 'Crítico' || r.nivelRisco === 'Alto')).length;

      results.push({
        cargo,
        desligamentosCount: desligadosCargo.length,
        tempoMedioSaidaDias,
        slaMedioReporDias,
        slaMetaDias,
        diferencaSlaDias,
        vagasSubstituicaoCount: targetVagas.length,
        emRiscoCount,
      });
    });

    // Ordenar pelo maior SLA de reposição / maior gap de diferença
    return results.sort((a, b) => b.slaMedioReporDias - a.slaMedioReporDias);
  }, [filteredPessoas, filteredVagas, filteredRows]);

  // KPIs de SLA de Desligamento e Diferença
  const cargoMaiorGap = useMemo(() => {
    if (slaComparisons.length === 0) return null;
    const sorted = [...slaComparisons].sort((a, b) => b.diferencaSlaDias - a.diferencaSlaDias);
    return sorted[0];
  }, [slaComparisons]);

  const slaMedioGeralRepor = useMemo(() => {
    if (slaComparisons.length === 0) return 0;
    return Math.round(slaComparisons.reduce((s, c) => s + c.slaMedioReporDias, 0) / slaComparisons.length);
  }, [slaComparisons]);

  // Controles Interativos do Gráfico de SLA por Função
  const [jobViewMode, setJobViewMode] = useState<'cards' | 'bars' | 'table'>('cards');
  const [jobScopeFilter, setJobScopeFilter] = useState<'top10' | 'top20' | 'delayed_only' | 'all'>('top10');
  const [jobSearchQuery, setJobSearchQuery] = useState<string>('');
  const [jobSortBy, setJobSortBy] = useState<'gap_desc' | 'sla_desc' | 'deslig_desc' | 'name_asc'>('gap_desc');
  const [jobCardsPage, setJobCardsPage] = useState<number>(1);
  const [jobTablePage, setJobTablePage] = useState<number>(1);

  const CARDS_PER_PAGE = 8;
  const ROWS_PER_PAGE = 10;

  // Lista processada e ordenada de Cargos
  const processedSlaList = useMemo(() => {
    let list = [...slaComparisons];

    // 1. Filtro de busca textual
    if (jobSearchQuery.trim()) {
      const q = jobSearchQuery.toLowerCase().trim();
      list = list.filter(item => item.cargo.toLowerCase().includes(q));
    }

    // 2. Ordenação
    list.sort((a, b) => {
      if (jobSortBy === 'gap_desc') return b.diferencaSlaDias - a.diferencaSlaDias;
      if (jobSortBy === 'sla_desc') return b.slaMedioReporDias - a.slaMedioReporDias;
      if (jobSortBy === 'deslig_desc') return b.desligamentosCount - a.desligamentosCount;
      if (jobSortBy === 'name_asc') return a.cargo.localeCompare(b.cargo);
      return 0;
    });

    // 3. Filtro de escopo
    if (jobScopeFilter === 'delayed_only') {
      list = list.filter(item => item.diferencaSlaDias > 0);
    } else if (jobScopeFilter === 'top10') {
      list = list.slice(0, 10);
    } else if (jobScopeFilter === 'top20') {
      list = list.slice(0, 20);
    }

    return list;
  }, [slaComparisons, jobSearchQuery, jobSortBy, jobScopeFilter]);

  // Paginação para Modo Cards
  const totalCardsPages = Math.ceil(processedSlaList.length / CARDS_PER_PAGE) || 1;
  const paginatedCards = useMemo(() => {
    const start = (jobCardsPage - 1) * CARDS_PER_PAGE;
    return processedSlaList.slice(start, start + CARDS_PER_PAGE);
  }, [processedSlaList, jobCardsPage]);

  // Paginação para Modo Tabela
  const totalJobTablePages = Math.ceil(processedSlaList.length / ROWS_PER_PAGE) || 1;
  const paginatedTable = useMemo(() => {
    const start = (jobTablePage - 1) * ROWS_PER_PAGE;
    return processedSlaList.slice(start, start + ROWS_PER_PAGE);
  }, [processedSlaList, jobTablePage]);

  const toggleAction = (matricula: string) => {
    setActionDoneMap(prev => ({
      ...prev,
      [matricula]: !prev[matricula],
    }));
  };

  const handleFileUpload = (buffer: ArrayBuffer, file: File) => {
    const records = parsePontoSheet(buffer);
    if (records.length === 0) {
      throw new Error('Nenhum registro válido de faltas/ponto foi encontrado na planilha.');
    }
    onDataLoaded({
      ponto: records,
      uploadedState: {
        pontoFileName: file.name,
        pontoRowCount: records.length,
        pontoLoadedAt: new Date().toLocaleTimeString(),
      },
    });
  };

  return (
    <div id="modulo-risco-individual" className="space-y-6">
      {/* Direct In-Tab Spreadsheet Attachment */}
      <TabAttachmentDropzone
        title="Anexo de Planilha de Ponto & Faltas (Absenteísmo)"
        expectedFileName="relatorio_ponto_faltas_r09.xls"
        description="Carregue aqui a planilha de faltas, atestados e controle de ponto para calcular o absenteísmo individual, alertas de risco de evasão e cruzamento com substituições."
        fileName={uploadedFiles.pontoFileName}
        rowCount={ponto.length}
        loadedAt={uploadedFiles.pontoLoadedAt}
        colorTheme="rose"
        onFileSelected={handleFileUpload}
        onClearData={onClearPontoData}
        emptyNotice="Anexe a planilha de ponto/faltas para alimentar a triagem individual de retenção e alertas de absenteísmo."
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
              isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Filtro Geral por Mês e Ano (Risco Individual)
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Selecione o <strong>Ano todo</strong> ou analise <strong>mês a mês individualmente</strong> todas as faltas, absenteísmo e colaboradores em risco
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
                onChange={(e) => setSelectedAno(e.target.value)}
                className={`w-full text-xs font-bold py-2 px-3 rounded-lg border outline-hidden transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-rose-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-rose-600 shadow-2xs'
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
                onChange={(e) => setSelectedMes(e.target.value)}
                className={`w-full text-xs font-bold py-2 px-3 rounded-lg border outline-hidden transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-rose-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-rose-600 shadow-2xs'
                }`}
              >
                <option value="Todos" className={isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-slate-900'}>
                  Ano Todo (Todos os 12 Meses)
                </option>
                {MONTHS_OPTIONS.map(m => {
                  const stats = monthlyStatsForYear.get(m.value) || { total: 0, faltas: 0 };
                  return (
                    <option key={m.value} value={m.value} className={isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-slate-900'}>
                      {m.name} ({m.value}) — {stats.total} registros ({stats.faltas} faltas)
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
            <div className={`text-xs font-bold truncate ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              {activePeriodLabel}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {countCritico} risco crítico
              </span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-orange-500/10 text-orange-300 border-orange-500/30' : 'bg-orange-50 text-orange-800 border-orange-200'
              }`}>
                {countAlto} risco alto
              </span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/30' : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                {countComVagaSubstituicao} com vaga
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
              onClick={() => setSelectedMes('Todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedMes === 'Todos'
                  ? isDark
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Ano Todo
            </button>

            {MONTHS_OPTIONS.map(m => {
              const isSelected = selectedMes === m.value;
              const stats = monthlyStatsForYear.get(m.value) || { total: 0, faltas: 0 };
              const hasData = stats.total > 0;

              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMes(m.value)}
                  className={`relative px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? isDark
                        ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                        : 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                      : isDark
                        ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                  title={`${m.name}: ${stats.total} registros de ponto (${stats.faltas} faltas)`}
                >
                  <span>{m.short}</span>
                  {hasData && (
                    <span className={`text-[10px] font-mono px-1 rounded-sm ${
                      isSelected
                        ? isDark ? 'bg-slate-950/30 text-white font-black' : 'bg-white/30 text-white font-black'
                        : isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'
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

      {/* Top 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Risco Crítico */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark
            ? 'bg-slate-800/30 border-rose-500/40 shadow-rose-950/20'
            : 'bg-white border-rose-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risco Crítico</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{countCritico}</div>
          <div className={`text-xs mt-2 flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Faltas severas / saída iminente</span>
            <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Intervenção 24h</span>
          </div>
        </div>

        {/* Card 2: Risco Alto */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-orange-500/30' : 'bg-white border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risco Alto</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{countAlto}</div>
          <div className={`text-xs mt-2 flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Monitoramento de absenteísmo</span>
            <span className={`font-medium ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Atenção RH</span>
          </div>
        </div>

        {/* Card 3: Com Vaga de Substituição Já Aberta */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-sky-500/30' : 'bg-white border-sky-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vaga Substituição Aberta</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{countComVagaSubstituicao}</div>
          <div className={`text-xs mt-2 flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>R&S já acionado preventivamente</span>
            <span className={`font-mono font-bold ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>Triangulado</span>
          </div>
        </div>

        {/* Card 4: Total de Colaboradores Mapeados */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Colaboradores no Ponto</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{allRows.length}</div>
          <div className={`text-xs mt-2 flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Estáveis: <strong className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{allRows.filter(r => r.nivelRisco === 'Baixo').length}</strong></span>
            <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>100% monitorados</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* NOVO GRÁFICO: SLA DE DIFERENÇA DE DESLIGAMENTO / SAÍDA ENTRE EMPREGOS */}
      {/* ---------------------------------------------------- */}
      <div className={`p-6 rounded-2xl border shadow-xs space-y-6 ${
        isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        {/* Header do Módulo */}
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
          isDark ? 'border-slate-700/60' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-base font-bold tracking-tight flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  SLA de Diferença de Desligamento / Saída entre Empregos
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Cruzamento do SLA Real de Reposição (vagas abertas) vs. Meta de SLA (25d) vs. Gap de Atraso por Cargo
                </p>
              </div>
            </div>
          </div>

          {/* Legenda Customizada */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className={`flex items-center gap-1.5 ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>
              <span className="w-3 h-3 rounded-xs bg-[#0284C7]"></span>
              <span>SLA Real (Dias)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              <span className={`w-3 h-3 rounded-xs border ${
                isDark ? 'bg-amber-500/40 border-amber-400' : 'bg-amber-100 border-amber-500'
              }`}></span>
              <span>Meta SLA (25d)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
              <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
              <span>Gap Excedente (+dias)</span>
            </div>
          </div>
        </div>

        {/* 3 Micro Summary Cards for Job SLA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-bold">Maior Atraso de Reposição</span>
              <ArrowUpRight className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            </div>
            <div className={`text-base font-bold mt-1 truncate ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              {cargoMaiorGap ? cargoMaiorGap.cargo : '-'}
            </div>
            <div className={`text-[11px] mt-1 flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>SLA: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{cargoMaiorGap?.slaMedioReporDias}d</strong></span>
              <span className={`font-mono font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                +{cargoMaiorGap ? Math.max(0, cargoMaiorGap.diferencaSlaDias) : 0}d de gap
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-bold">SLA Médio de Reposição</span>
              <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {slaMedioGeralRepor} <span className={`text-sm font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>dias</span>
            </div>
            <div className={`text-[11px] mt-1 flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Meta padrão: 25 dias</span>
              <span className={`font-mono font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Delta: +{Math.max(0, slaMedioGeralRepor - 25)}d</span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-bold">Empregos Monitorados</span>
              <Briefcase className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 font-mono ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
              {slaComparisons.length} <span className={`text-sm font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>cargos</span>
            </div>
            <div className={`text-[11px] mt-1 flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Cargos em atraso de SLA:</span>
              <span className={`font-mono font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                {slaComparisons.filter(c => c.diferencaSlaDias > 0).length} funções
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE CONTROLE INTERATIVA & ORGANIZADORA */}
        <div className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900/70 border-slate-700/70' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Modos de Visualização */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setJobViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                jobViewMode === 'cards'
                  ? isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white text-indigo-700 border border-indigo-200 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização Analítica em Linhas/Cards"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Cards Analíticos</span>
            </button>

            <button
              type="button"
              onClick={() => setJobViewMode('bars')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                jobViewMode === 'bars'
                  ? isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white text-indigo-700 border border-indigo-200 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização em Gráfico de Colunas com Rolagem"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Gráfico com Rolagem</span>
            </button>

            <button
              type="button"
              onClick={() => setJobViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                jobViewMode === 'table'
                  ? isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white text-indigo-700 border border-indigo-200 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização em Tabela Detalhada"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela Detalhada</span>
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Campo de Busca */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cargo..."
                value={jobSearchQuery}
                onChange={(e) => {
                  setJobSearchQuery(e.target.value);
                  setJobCardsPage(1);
                  setJobTablePage(1);
                }}
                className="bg-transparent border-none outline-hidden text-xs w-28 sm:w-36 placeholder:text-slate-400"
              />
              {jobSearchQuery && (
                <button
                  type="button"
                  onClick={() => setJobSearchQuery('')}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Escopo de Visualização */}
            <select
              value={jobScopeFilter}
              onChange={(e) => {
                setJobScopeFilter(e.target.value as any);
                setJobCardsPage(1);
                setJobTablePage(1);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium outline-hidden cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="top10">Top 10 Maiores Gaps</option>
              <option value="top20">Top 20 Funções</option>
              <option value="delayed_only">Apenas em Atraso (+gap)</option>
              <option value="all">Todos os Cargos ({slaComparisons.length})</option>
            </select>

            {/* Ordenação */}
            <select
              value={jobSortBy}
              onChange={(e) => setJobSortBy(e.target.value as any)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium outline-hidden cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="gap_desc">Ordenar: Maior Gap</option>
              <option value="sla_desc">Ordenar: Maior SLA Real</option>
              <option value="deslig_desc">Ordenar: Mais Desligamentos</option>
              <option value="name_asc">Ordenar: Nome (A-Z)</option>
            </select>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODO 1: CARDS ANALÍTICOS (VISÃO EM BARRAS HORIZONTAIS)   */}
        {/* ======================================================== */}
        {jobViewMode === 'cards' && (
          <div className="space-y-3">
            {processedSlaList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum cargo encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paginatedCards.map((item, idx) => {
                  const isLate = item.diferencaSlaDias > 0;
                  const maxDisplaySla = Math.max(45, item.slaMedioReporDias + 5);
                  const realPercentage = Math.min(100, Math.round((item.slaMedioReporDias / maxDisplaySla) * 100));
                  const targetPercentage = Math.min(100, Math.round((item.slaMetaDias / maxDisplaySla) * 100));

                  return (
                    <div
                      key={`${item.cargo}-${idx}`}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isDark
                          ? isLate
                            ? 'bg-slate-900/60 border-slate-700/80 hover:border-rose-500/40'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                          : isLate
                            ? 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Top Header do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-bold uppercase tracking-tight truncate ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`} title={item.cargo}>
                            {item.cargo}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>{item.desligamentosCount} saídas</span>
                            <span>•</span>
                            <span>{item.vagasSubstituicaoCount} vagas R&S</span>
                            {item.emRiscoCount > 0 && (
                              <>
                                <span>•</span>
                                <span className={isDark ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold'}>
                                  {item.emRiscoCount} em risco
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isLate
                            ? isDark
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isLate ? `+${item.diferencaSlaDias}d Atraso` : 'No Prazo'}
                        </span>
                      </div>

                      {/* Barra Comparativa Visual */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className={isDark ? 'text-[#38BDF8]' : 'text-sky-700'}>
                            SLA Real: <strong>{item.slaMedioReporDias} dias</strong>
                          </span>
                          <span className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                            Meta: <strong>{item.slaMetaDias} dias</strong>
                          </span>
                        </div>

                        <div className={`relative h-2.5 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-800' : 'bg-slate-100'
                        }`}>
                          {/* Barra de Progresso Real */}
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLate ? 'bg-rose-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${realPercentage}%` }}
                          />
                          {/* Marcador da Meta (25d) */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                            style={{ left: `${targetPercentage}%` }}
                            title={`Meta de SLA: ${item.slaMetaDias} dias`}
                          />
                        </div>
                      </div>

                      {/* Rodapé de Métricas */}
                      <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                        isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
                      }`}>
                        <span>Permanência média: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.tempoMedioSaidaDias}d</strong></span>
                        <span className={`font-mono font-bold ${isLate ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
                          {isLate ? `Gargalo: +${item.diferencaSlaDias}d` : `Folga: ${item.diferencaSlaDias}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Paginação do Modo Cards */}
            {totalCardsPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/40 text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Exibindo {Math.min((jobCardsPage - 1) * CARDS_PER_PAGE + 1, processedSlaList.length)} a{' '}
                  {Math.min(jobCardsPage * CARDS_PER_PAGE, processedSlaList.length)} de {processedSlaList.length} cargos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={jobCardsPage === 1}
                    onClick={() => setJobCardsPage(prev => Math.max(1, prev - 1))}
                    className={`p-1.5 rounded-lg border transition disabled:opacity-40 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`px-2 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {jobCardsPage} / {totalCardsPages}
                  </span>
                  <button
                    type="button"
                    disabled={jobCardsPage === totalCardsPages}
                    onClick={() => setJobCardsPage(prev => Math.min(totalCardsPages, prev + 1))}
                    className={`p-1.5 rounded-lg border transition disabled:opacity-40 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODO 2: GRÁFICO DE COLUNAS COM ROLAGEM HORIZONTAL SUAVE  */}
        {/* ======================================================== */}
        {jobViewMode === 'bars' && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
              isDark ? 'bg-slate-900/60 text-slate-400 border border-slate-800' : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              <Info className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                Role horizontalmente a área do gráfico abaixo para visualizar todos os cargos com espaçamento ideal e sem sobreposição de textos.
              </span>
            </div>

            {processedSlaList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum cargo encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto pb-3 border rounded-xl p-2 bg-slate-950/20 border-slate-700/50">
                <div style={{ minWidth: `${Math.max(700, processedSlaList.length * 75)}px`, height: '360px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processedSlaList}
                      margin={{ top: 25, right: 30, left: 0, bottom: 65 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} opacity={0.6} vertical={false} />
                      <XAxis
                        dataKey="cargo"
                        stroke={isDark ? '#94a3b8' : '#64748B'}
                        fontSize={10}
                        tickLine={false}
                        dy={14}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis
                        stroke={isDark ? '#94a3b8' : '#64748B'}
                        fontSize={10}
                        tickLine={false}
                        unit="d"
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as SlaJobComparison;
                            const hasDelay = data.diferencaSlaDias > 0;

                            return (
                              <div className={`p-3.5 rounded-xl shadow-xl text-xs space-y-2 border ${
                                isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}>
                                <div className={`font-bold border-b pb-1 flex justify-between gap-4 ${
                                  isDark ? 'border-slate-800' : 'border-slate-100'
                                }`}>
                                  <span>{label}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                    hasDelay
                                      ? isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {hasDelay ? `+${data.diferencaSlaDias}d Atraso` : 'No Prazo'}
                                  </span>
                                </div>

                                <div className={`space-y-1 font-mono text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  <div className={`flex justify-between gap-6 ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>
                                    <span>SLA Real Reposição:</span>
                                    <strong>{data.slaMedioReporDias} dias</strong>
                                  </div>
                                  <div className={`flex justify-between gap-6 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                    <span>Meta de SLA:</span>
                                    <strong>{data.slaMetaDias} dias</strong>
                                  </div>
                                  <div className={`flex justify-between gap-6 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                                    <span>Diferença / Gap:</span>
                                    <strong>{data.diferencaSlaDias > 0 ? `+${data.diferencaSlaDias}` : data.diferencaSlaDias} dias</strong>
                                  </div>
                                  <div className={`flex justify-between gap-6 border-t pt-1 ${
                                    isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                                  }`}>
                                    <span>Permanência até Saída:</span>
                                    <span>{data.tempoMedioSaidaDias} dias</span>
                                  </div>
                                  <div className={`flex justify-between gap-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <span>Desligamentos Registrados:</span>
                                    <span>{data.desligamentosCount} saídas</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Barra SLA Real */}
                      <Bar
                        dataKey="slaMedioReporDias"
                        name="SLA Real (Dias)"
                        fill="#0284C7"
                        radius={[4, 4, 0, 0]}
                        barSize={22}
                      >
                        <LabelList
                          dataKey="slaMedioReporDias"
                          position="top"
                          offset={6}
                          fill={isDark ? '#38BDF8' : '#0369A1'}
                          fontSize={10}
                          fontWeight="bold"
                          formatter={(v: number) => `${v}d`}
                        />
                      </Bar>

                      {/* Barra Meta SLA */}
                      <Bar
                        dataKey="slaMetaDias"
                        name="Meta SLA (Dias)"
                        fill="#F59E0B"
                        opacity={0.4}
                        radius={[4, 4, 0, 0]}
                        barSize={14}
                      />

                      {/* Barra Diferença / Gap */}
                      <Bar
                        dataKey="diferencaSlaDias"
                        name="Diferença SLA (Dias)"
                        fill="#F43F5E"
                        radius={[4, 4, 0, 0]}
                        barSize={14}
                      >
                        <LabelList
                          dataKey="diferencaSlaDias"
                          position="top"
                          offset={4}
                          fill={isDark ? '#f43f5e' : '#e11d48'}
                          fontSize={9}
                          fontWeight="bold"
                          formatter={(v: number) => (v > 0 ? `+${v}d` : '')}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODO 3: TABELA DETALHADA E PAGINADA                      */}
        {/* ======================================================== */}
        {jobViewMode === 'table' && (
          <div className="space-y-3">
            <div className={`overflow-x-auto rounded-xl border ${
              isDark ? 'border-slate-700/60' : 'border-slate-200'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
                  isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Emprego / Cargo</th>
                    <th className="py-3 px-4 text-center">Desligamentos</th>
                    <th className="py-3 px-4 text-center">Permanência até Saída</th>
                    <th className="py-3 px-4 text-center">SLA Real Reposição</th>
                    <th className="py-3 px-4 text-center">Meta SLA</th>
                    <th className="py-3 px-4 text-center">Diferença / Gap</th>
                    <th className="py-3 px-4 text-right">Status do Emprego</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-700/40 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                  {paginatedTable.map((c, idx) => {
                    const isLate = c.diferencaSlaDias > 0;

                    return (
                      <tr key={`${c.cargo}-${idx}`} className={`transition ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className={`py-3 px-4 font-sans font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {c.cargo}
                        </td>
                        <td className={`py-3 px-4 text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {c.desligamentosCount}
                        </td>
                        <td className={`py-3 px-4 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {c.tempoMedioSaidaDias} dias
                        </td>
                        <td className={`py-3 px-4 text-center font-bold ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>
                          {c.slaMedioReporDias} dias
                        </td>
                        <td className={`py-3 px-4 text-center ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                          {c.slaMetaDias} dias
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isLate
                              ? isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {c.diferencaSlaDias > 0 ? `+${c.diferencaSlaDias}d` : `${c.diferencaSlaDias}d`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          {isLate ? (
                            <span className={`font-bold text-[11px] ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Gargalo de Reposição</span>
                          ) : (
                            <span className={`text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>SLA Controlado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação do Modo Tabela */}
            {totalJobTablePages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/40 text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Exibindo {Math.min((jobTablePage - 1) * ROWS_PER_PAGE + 1, processedSlaList.length)} a{' '}
                  {Math.min(jobTablePage * ROWS_PER_PAGE, processedSlaList.length)} de {processedSlaList.length} cargos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={jobTablePage === 1}
                    onClick={() => setJobTablePage(prev => Math.max(1, prev - 1))}
                    className={`p-1.5 rounded-lg border transition disabled:opacity-40 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`px-2 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {jobTablePage} / {totalJobTablePages}
                  </span>
                  <button
                    type="button"
                    disabled={jobTablePage === totalJobTablePages}
                    onClick={() => setJobTablePage(prev => Math.min(totalJobTablePages, prev + 1))}
                    className={`p-1.5 rounded-lg border transition disabled:opacity-40 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Micro Table: Triagem de Colaboradores */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? 'bg-slate-800/20 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'border-slate-700/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
              Triagem de Colaboradores em Risco de Desligamento / Substituição
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Exibindo {filteredRows.length} colaboradores com registro de ponto
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setOnlySubstitutions(!onlySubstitutions)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                onlySubstitutions
                  ? isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-300'
                  : isDark ? 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white' : 'bg-white text-slate-700 border-slate-200 hover:text-slate-900 shadow-2xs'
              }`}
            >
              Com Vaga Aberta ({countComVagaSubstituicao})
            </button>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className={`border rounded-lg px-3 py-1.5 font-medium outline-hidden transition ${
                isDark
                  ? 'bg-slate-950 border-slate-700/80 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              <option value="Todos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Nível de Risco: Todos</option>
              <option value="Crítico" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Crítico</option>
              <option value="Alto" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Alto</option>
              <option value="Médio" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Médio</option>
              <option value="Baixo" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Baixo (Estável)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-[10px] uppercase font-bold tracking-wider border-b ${
              isDark ? 'bg-slate-900/40 text-slate-400 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="px-6 py-3.5">Colaborador</th>
                <th className="px-6 py-3.5 text-center">Faltas (Mês)</th>
                <th className="px-6 py-3.5 text-center">Atestados</th>
                <th className="px-6 py-3.5">Base / Unidade</th>
                <th className="px-6 py-3.5">Cargo</th>
                <th className="px-6 py-3.5 text-center">Vaga R&S</th>
                <th className="px-6 py-3.5 text-right">Status Retenção</th>
                <th className="px-6 py-3.5 text-center">Stay Interview</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Nenhum colaborador encontrado para os filtros selecionados ou nenhuma planilha de ponto importada ainda.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isCritico = row.nivelRisco === 'Crítico';
                  const isDone = actionDoneMap[row.matricula];

                  return (
                    <tr
                      key={row.id}
                      className={`transition ${
                        isCritico
                          ? isDark ? 'bg-rose-950/10 border-l-4 border-rose-500 hover:bg-rose-950/20' : 'bg-rose-50/60 border-l-4 border-rose-500 hover:bg-rose-50'
                          : row.nivelRisco === 'Alto'
                          ? isDark ? 'bg-amber-950/10 border-l-4 border-orange-500 hover:bg-amber-950/20' : 'bg-amber-50/60 border-l-4 border-orange-500 hover:bg-amber-50'
                          : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-2">
                          <span>{row.nome}</span>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>#{row.matricula}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-center font-mono font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                        {String(row.faltasInjustificadas).padStart(2, '0')}
                      </td>
                      <td className={`px-6 py-4 text-center font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {row.atestadosDias > 0 ? `${row.atestadosDias}d` : '-'}
                      </td>
                      <td className={`px-6 py-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {row.filial}
                      </td>
                      <td className={`px-6 py-4 font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        {row.cargo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.temVagaAbertaSubstituicao ? (
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                            isDark ? 'text-[#38BDF8] bg-sky-950/80 border-sky-800/80' : 'text-sky-700 bg-sky-50 border-sky-200'
                          }`}>
                            {row.codigoVagaSubstituicao}
                          </span>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.temVagaAbertaSubstituicao ? (
                          <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[10px] font-bold shadow-xs shadow-rose-500/20 whitespace-nowrap">
                            SUBSTITUIÇÃO ABERTA
                          </span>
                        ) : row.nivelRisco === 'Alto' ? (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                            isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            MONITORAMENTO
                          </span>
                        ) : row.nivelRisco === 'Médio' ? (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                            isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            ATENÇÃO
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            ESTÁVEL
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAction(row.matricula)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            isDone
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                          }`}
                          title="Registrar alinhamento com liderança / RH"
                        >
                          {isDone ? (
                            <>
                              <CheckCircle className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                              <span>Realizado</span>
                            </>
                          ) : (
                            <>
                              <PhoneCall className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                              <span>Agendar</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredRows.length > 0 && (
          <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <div className={`flex items-center gap-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>
                Mostrando <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{startIndex + 1}</strong> a <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{Math.min(startIndex + pageSize, filteredRows.length)}</strong> de <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{filteredRows.length.toLocaleString('pt-BR')}</strong> colaboradores
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="hidden sm:inline">Exibir:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={`px-2 py-1 rounded-md border text-xs font-medium ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value={15}>15 / pág</option>
                  <option value={25}>25 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                  <option value={250}>250 / pág</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Página <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{safePage}</strong> de <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{totalTablePages}</strong>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
                  }`}
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                  disabled={safePage >= totalTablePages}
                  className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
                  }`}
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

