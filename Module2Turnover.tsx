import React, { useState, useMemo } from 'react';
import { PessoaRecord, GlobalFilters, UploadedFilesState } from '../types';
import { filterPessoas } from '../services/riskEngine';
import { parsePessoasSheet } from '../services/excelParser';
import { TabAttachmentDropzone } from './TabAttachmentDropzone';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  UserMinus,
  Percent,
  Calendar,
  Building,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Eye,
  X,
  Phone,
  ShieldCheck,
  Award,
  Briefcase,
  FileText,
  MapPin,
  User,
  Hash,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface Module2Props {
  pessoas: PessoaRecord[];
  filters: GlobalFilters;
  uploadedFiles: UploadedFilesState;
  onDataLoaded: (data: { pessoas: PessoaRecord[]; uploadedState: Partial<UploadedFilesState> }) => void;
  onClearPessoasData?: () => void;
}

interface TimelineDataPoint {
  monthKey: string; // "2025-01"
  label: string; // "01/2025"
  admissoes: number;
  desligamentos: number;
  saldo: number;
}

export const Module2Turnover: React.FC<Module2Props> = ({
  pessoas,
  filters,
  uploadedFiles,
  onDataLoaded,
  onClearPessoasData,
}) => {
  const { isDark } = useTheme();
  const filtered = filterPessoas(pessoas, filters);

  const totalHeadcount = filtered.length;
  const desligados = filtered.filter(p => p.status === 'Desligado');
  const ativos = filtered.filter(p => p.status === 'Ativo');

  const taxaTurnover = totalHeadcount > 0
    ? Number(((desligados.length / totalHeadcount) * 100).toFixed(1))
    : 0;

  const precoces = desligados.filter(p => p.faixaTempoCasa === '< 90 dias (Precoce)');
  const taxaPrecoce = desligados.length > 0
    ? Math.round((precoces.length / desligados.length) * 100)
    : 0;

  const tempoMedioCasaMeses = desligados.length > 0
    ? Number((desligados.reduce((acc, p) => acc + (p.tempoDeCasaMeses || 0), 0) / desligados.length).toFixed(1))
    : 0;

  // Find Top Critical Role by number of departures
  const cargoDesligadoMap = useMemo(() => {
    const map = new Map<string, number>();
    desligados.forEach(p => {
      map.set(p.cargo, (map.get(p.cargo) || 0) + 1);
    });
    return map;
  }, [desligados]);

  const topCargosEvasivos = useMemo(() => {
    return Array.from(cargoDesligadoMap.entries())
      .map(([cargo, count]) => {
        const percent = desligados.length > 0 ? Number(((count / desligados.length) * 100).toFixed(1)) : 0;
        return {
          cargo,
          count,
          percent,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [cargoDesligadoMap, desligados.length]);

  const cargoMaisCritico = topCargosEvasivos.length > 0 ? topCargosEvasivos[0].cargo : 'Nenhum Identificado';

  // Cross Admission Date with Departure Date by Month
  const [selectedAnoEvolucao, setSelectedAnoEvolucao] = useState<string>('Todos');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const timelineData: TimelineDataPoint[] = useMemo(() => {
    const map = new Map<string, { admissoes: number; desligamentos: number }>();

    const extractYearMonth = (dateStr?: string): string | null => {
      if (!dateStr) return null;
      const str = String(dateStr).trim();
      if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
      // Match YYYY-MM or YYYY-MM-DD
      const yyyyMmMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
      if (yyyyMmMatch) {
        const y = yyyyMmMatch[1];
        const m = yyyyMmMatch[2].padStart(2, '0');
        return `${y}-${m}`;
      }
      // Match DD/MM/YYYY or D/M/YYYY
      const ddMmYyyyMatch = str.match(/^\d{1,2}[-/.](\d{1,2})[-/.](\d{4})/);
      if (ddMmYyyyMatch) {
        const m = ddMmYyyyMatch[1].padStart(2, '0');
        const y = ddMmYyyyMatch[2];
        return `${y}-${m}`;
      }
      return null;
    };

    // Iterate all filtered pessoas
    filtered.forEach(p => {
      // 1. Entradas contabilizadas via Dt. admissão
      const ymA = extractYearMonth(p.dataAdmissao);
      if (ymA) {
        const current = map.get(ymA) || { admissoes: 0, desligamentos: 0 };
        map.set(ymA, { ...current, admissoes: current.admissoes + 1 });
      }

      // 2. Saídas contabilizadas via Dt. Desligamento
      if (p.dataDemissao) {
        const ymD = extractYearMonth(p.dataDemissao);
        if (ymD) {
          const current = map.get(ymD) || { admissoes: 0, desligamentos: 0 };
          map.set(ymD, { ...current, desligamentos: current.desligamentos + 1 });
        }
      }
    });

    const populatedKeys = Array.from(map.keys()).sort();

    if (populatedKeys.length === 0) {
      return [];
    }

    // Generate continuous chronological range from min YYYY-MM to max YYYY-MM
    const minKey = populatedKeys[0];
    const maxKey = populatedKeys[populatedKeys.length - 1];

    const [minY, minM] = minKey.split('-').map(Number);
    const [maxY, maxM] = maxKey.split('-').map(Number);

    const continuousKeys: string[] = [];
    let curY = minY;
    let curM = minM;

    while (curY < maxY || (curY === maxY && curM <= maxM)) {
      const key = `${curY}-${String(curM).padStart(2, '0')}`;
      continuousKeys.push(key);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    return continuousKeys.map(key => {
      const parts = key.split('-');
      const y = parts[0];
      const m = parts[1];
      const data = map.get(key) || { admissoes: 0, desligamentos: 0 };
      return {
        monthKey: key,
        label: `${m}/${y}`,
        admissoes: data.admissoes,
        desligamentos: data.desligamentos,
        saldo: data.admissoes - data.desligamentos,
      };
    });
  }, [filtered]);

  // Extract available years for the evolution chart filter
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    timelineData.forEach(d => {
      const [y] = d.monthKey.split('-');
      if (y && y.length === 4) {
        yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [timelineData]);

  const activeAnoEvolucao = useMemo(() => {
    if (selectedAnoEvolucao === 'Todos') return 'Todos';
    if (availableYears.includes(selectedAnoEvolucao)) return selectedAnoEvolucao;
    return 'Todos';
  }, [selectedAnoEvolucao, availableYears]);

  // Filter or format timeline data according to selected year
  const filteredTimelineData: TimelineDataPoint[] = useMemo(() => {
    if (activeAnoEvolucao === 'Todos') {
      return timelineData;
    }

    const yearDataMap = new Map<string, { admissoes: number; desligamentos: number; saldo: number }>();
    timelineData.forEach(d => {
      if (d.monthKey.startsWith(`${activeAnoEvolucao}-`)) {
        yearDataMap.set(d.monthKey, {
          admissoes: d.admissoes,
          desligamentos: d.desligamentos,
          saldo: d.saldo,
        });
      }
    });

    // 12 months for the selected year in strict chronological order
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return months.map(m => {
      const key = `${activeAnoEvolucao}-${m}`;
      const entry = yearDataMap.get(key) || { admissoes: 0, desligamentos: 0, saldo: 0 };
      return {
        monthKey: key,
        label: `${m}/${activeAnoEvolucao}`,
        admissoes: entry.admissoes,
        desligamentos: entry.desligamentos,
        saldo: entry.saldo,
      };
    });
  }, [timelineData, activeAnoEvolucao]);

  // Aggregate Departures by Base / Sector (Filial + Departamento)
  const baseSectorData = useMemo(() => {
    const map = new Map<string, number>();
    desligados.forEach(p => {
      const key = `${p.filial}`;
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: desligados.length > 0 ? Math.round((value / desligados.length) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [desligados]);

  // Department Departures
  const deptoData = useMemo(() => {
    const map = new Map<string, number>();
    desligados.forEach(p => {
      const key = p.departamento || 'Operacional';
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: desligados.length > 0 ? Math.round((value / desligados.length) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [desligados]);

  const [tipoFilter, setTipoFilter] = useState<string>('Todos');
  const [faixaFilter, setFaixaFilter] = useState<string>('Todas');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [selectedColaborador, setSelectedColaborador] = useState<PessoaRecord | null>(null);

  const tableDesligados = filtered.filter(p => {
    if (p.status !== 'Desligado') return false;
    if (tipoFilter !== 'Todos' && p.tipoDesligamento !== tipoFilter) return false;
    if (faixaFilter !== 'Todas' && p.faixaTempoCasa !== faixaFilter) return false;
    return true;
  });

  const handleFileUpload = (buffer: ArrayBuffer, file: File) => {
    const records = parsePessoasSheet(buffer);
    if (records.length === 0) {
      throw new Error('Nenhum registro válido de pessoas/desligamentos foi encontrado na planilha.');
    }
    onDataLoaded({
      pessoas: records,
      uploadedState: {
        pessoasFileName: file.name,
        pessoasRowCount: records.length,
        pessoasLoadedAt: new Date().toLocaleTimeString(),
      },
    });
  };

  return (
    <div id="modulo-turnover" className="space-y-6">
      {/* Top Header & Dropzone */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl border ${
        isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              isDark ? 'bg-sky-500/10 border-sky-500/20 text-[#38BDF8]' : 'bg-sky-50 border-sky-200 text-sky-700'
            }`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Análise de Turnover
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Indicadores de retenção, cruzamento temporal e testes estratégicos
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <TabAttachmentDropzone
            title="Planilha Relatório Pessoa (.xlsx)"
            expectedFileName="grid_tb_oper_pessoa_relatorio.xlsx"
            description="Importe o arquivo de colaboradores para atualizar admissões, desligamentos e tempo de casa."
            fileName={uploadedFiles.pessoasFileName}
            rowCount={pessoas.length}
            loadedAt={uploadedFiles.pessoasLoadedAt}
            colorTheme="orange"
            onFileSelected={handleFileUpload}
            onClearData={onClearPessoasData}
            compact
          />
        </div>
      </div>

      {/* Top 3 KPI Metric Cards (Identical to PDF Page 1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: TOTAL ANALISADO */}
        <div className={`p-6 rounded-2xl border shadow-xs relative overflow-hidden flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              TOTAL ANALISADO
            </span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-4xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalHeadcount}
          </div>
          <div className={`w-full h-1 rounded-full mt-4 overflow-hidden ${isDark ? 'bg-sky-500/30' : 'bg-sky-100'}`}>
            <div className={`h-full rounded-full ${isDark ? 'bg-[#38BDF8]' : 'bg-sky-600'}`} style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Card 2: TOTAL DESLIGAMENTOS */}
        <div className={`p-6 rounded-2xl border shadow-xs relative overflow-hidden flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              TOTAL DESLIGAMENTOS
            </span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              <UserMinus className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-4xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {desligados.length}
          </div>
          <div className={`w-full h-1 rounded-full mt-4 overflow-hidden ${isDark ? 'bg-rose-500/30' : 'bg-rose-100'}`}>
            <div
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${totalHeadcount > 0 ? (desligados.length / totalHeadcount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: TAXA DE TURNOVER */}
        <div className={`p-6 rounded-2xl border shadow-xs relative overflow-hidden flex flex-col justify-between ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              TAXA DE TURNOVER
            </span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-4xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {taxaTurnover}%
          </div>
          <div className={`w-full h-1 rounded-full mt-4 overflow-hidden ${isDark ? 'bg-orange-500/30' : 'bg-orange-100'}`}>
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${Math.min(100, taxaTurnover)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* GRANDE QUADRO FULL-WIDTH: Evolução Temporal de Admissões vs. Desligamentos */}
      <div className={`w-full p-6 sm:p-7 rounded-2xl border shadow-xs space-y-4 ${
        isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
          isDark ? 'border-slate-700/60' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                isDark ? 'bg-sky-500/10 border-sky-500/20 text-[#38BDF8]' : 'bg-sky-50 border-sky-200 text-sky-700'
              }`}>
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-base font-bold tracking-tight flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Evolução de Desligamentos e Admissões
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Cruzamento cronológico mês a mês: <strong>Entradas</strong> (Dt. admissão) vs. <strong>Saídas</strong> (Dt. Desligamento)
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Year Filter + Chart Type Toggle + Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Chart Type Toggle (Line vs Bar) */}
            <div className={`flex items-center p-0.5 rounded-xl border ${
              isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  chartType === 'line'
                    ? isDark ? 'bg-sky-500/20 text-[#38BDF8] font-bold shadow-xs' : 'bg-white text-sky-700 font-bold shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar como Linhas de Tendência"
              >
                Linhas
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  chartType === 'bar'
                    ? isDark ? 'bg-sky-500/20 text-[#38BDF8] font-bold shadow-xs' : 'bg-white text-sky-700 font-bold shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar como Barras Agrupadas"
              >
                Barras
              </button>
            </div>

            {/* Year Filter Selector */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/90 border-slate-700/90 text-slate-200 shadow-inner'
                : 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
            }`}>
              <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
              <label htmlFor="filtro-ano-evolucao" className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Ano:
              </label>
              <select
                id="filtro-ano-evolucao"
                value={activeAnoEvolucao}
                onChange={(e) => setSelectedAnoEvolucao(e.target.value)}
                className={`font-bold text-xs bg-transparent border-0 outline-hidden cursor-pointer ${
                  isDark ? 'text-white' : 'text-slate-900'
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

            {/* Quick Metrics Badges */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
              isDark ? 'bg-sky-500/10 border-sky-500/20 text-[#38BDF8]' : 'bg-sky-50 border-sky-200 text-sky-800'
            }`} title="Entradas contabilizadas a partir da coluna Dt. admissão">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span className="font-medium">Admissões:</span>
              <strong className="font-mono font-bold">
                {filteredTimelineData.reduce((acc, curr) => acc + curr.admissoes, 0)}
              </strong>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
              isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`} title="Saídas contabilizadas a partir da coluna Dt. Desligamento">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="font-medium">Desligamentos:</span>
              <strong className="font-mono font-bold">
                {filteredTimelineData.reduce((acc, curr) => acc + curr.desligamentos, 0)}
              </strong>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <span className="font-medium">Saldo:</span>
              <strong className={`font-mono font-bold ${
                filteredTimelineData.reduce((acc, curr) => acc + curr.saldo, 0) >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-rose-400' : 'text-rose-700')
              }`}>
                {filteredTimelineData.reduce((acc, curr) => acc + curr.saldo, 0) >= 0 ? '+' : ''}
                {filteredTimelineData.reduce((acc, curr) => acc + curr.saldo, 0)}
              </strong>
            </div>
          </div>
        </div>

        {filteredTimelineData.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Nenhum dado temporal de datas de admissão ou desligamento disponível para o filtro selecionado.
          </div>
        ) : (
          <div className="h-[360px] sm:h-[400px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={filteredTimelineData} margin={{ top: 25, right: 25, left: -10, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} opacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke={isDark ? '#94a3b8' : '#64748B'}
                    fontSize={11}
                    tickLine={false}
                    dy={12}
                    angle={-30}
                    textAnchor="end"
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
                        const data = payload[0].payload as TimelineDataPoint;
                        const isPositive = data.saldo >= 0;

                        return (
                          <div className={`p-4 rounded-xl shadow-xl text-xs space-y-2 min-w-[210px] border ${
                            isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}>
                            <div className={`font-bold border-b pb-1.5 flex justify-between gap-4 ${
                              isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'
                            }`}>
                              <span>Mês / Ano: {label}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                isPositive
                                  ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                Saldo: {isPositive ? `+${data.saldo}` : data.saldo}
                              </span>
                            </div>
                            <div className={`flex items-center justify-between gap-6 font-medium ${
                              isDark ? 'text-[#38BDF8]' : 'text-sky-700'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Entradas (Dt. Admissão):
                              </span>
                              <span className="font-mono font-bold text-sm">{data.admissoes}</span>
                            </div>
                            <div className={`flex items-center justify-between gap-6 font-medium ${
                              isDark ? 'text-rose-400' : 'text-rose-700'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Saídas (Dt. Desligamento):
                              </span>
                              <span className="font-mono font-bold text-sm">{data.desligamentos}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Line for Admissões (Blue) */}
                  <Line
                    type="monotone"
                    dataKey="admissoes"
                    name="Admissões (Dt. Admissão)"
                    stroke="#0284C7"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#0284C7', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#0284C7' }}
                  >
                    <LabelList
                      dataKey="admissoes"
                      position="top"
                      offset={10}
                      fill={isDark ? '#38BDF8' : '#0369A1'}
                      fontSize={11}
                      fontWeight="bold"
                      formatter={(val: number) => (val > 0 ? val : '')}
                    />
                  </Line>

                  {/* Line for Desligamentos (Red) */}
                  <Line
                    type="monotone"
                    dataKey="desligamentos"
                    name="Desligamentos (Dt. Desligamento)"
                    stroke="#E11D48"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#E11D48', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#E11D48' }}
                  >
                    <LabelList
                      dataKey="desligamentos"
                      position="bottom"
                      offset={10}
                      fill={isDark ? '#F43F5E' : '#BE123C'}
                      fontSize={11}
                      fontWeight="bold"
                      formatter={(val: number) => (val > 0 ? val : '')}
                    />
                  </Line>
                </LineChart>
              ) : (
                <BarChart data={filteredTimelineData} margin={{ top: 25, right: 25, left: -10, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} opacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke={isDark ? '#94a3b8' : '#64748B'}
                    fontSize={11}
                    tickLine={false}
                    dy={12}
                    angle={-30}
                    textAnchor="end"
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
                        const data = payload[0].payload as TimelineDataPoint;
                        const isPositive = data.saldo >= 0;

                        return (
                          <div className={`p-4 rounded-xl shadow-xl text-xs space-y-2 min-w-[210px] border ${
                            isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}>
                            <div className={`font-bold border-b pb-1.5 flex justify-between gap-4 ${
                              isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'
                            }`}>
                              <span>Mês / Ano: {label}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                isPositive
                                  ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                Saldo: {isPositive ? `+${data.saldo}` : data.saldo}
                              </span>
                            </div>
                            <div className={`flex items-center justify-between gap-6 font-medium ${
                              isDark ? 'text-[#38BDF8]' : 'text-sky-700'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Entradas (Dt. Admissão):
                              </span>
                              <span className="font-mono font-bold text-sm">{data.admissoes}</span>
                            </div>
                            <div className={`flex items-center justify-between gap-6 font-medium ${
                              isDark ? 'text-rose-400' : 'text-rose-700'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Saídas (Dt. Desligamento):
                              </span>
                              <span className="font-mono font-bold text-sm">{data.desligamentos}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Bar for Admissões (Blue) */}
                  <Bar
                    dataKey="admissoes"
                    name="Admissões (Dt. Admissão)"
                    fill="#0284C7"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="admissoes"
                      position="top"
                      fill={isDark ? '#38BDF8' : '#0369A1'}
                      fontSize={11}
                      fontWeight="bold"
                      formatter={(val: number) => (val > 0 ? val : '')}
                    />
                  </Bar>

                  {/* Bar for Desligamentos (Red) */}
                  <Bar
                    dataKey="desligamentos"
                    name="Desligamentos (Dt. Desligamento)"
                    fill="#E11D48"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="desligamentos"
                      position="top"
                      fill={isDark ? '#F43F5E' : '#BE123C'}
                      fontSize={11}
                      fontWeight="bold"
                      formatter={(val: number) => (val > 0 ? val : '')}
                    />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        <div className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <span className="flex items-center gap-1.5">
            <Sparkles className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
            Regra do Gráfico: Contabilização cronológica mês a mês utilizando <strong>Dt. admissão</strong> para entradas e <strong>Dt. Desligamento</strong> para saídas.
          </span>
          <span className="font-mono">
            {activeAnoEvolucao === 'Todos'
              ? `Total de ${filteredTimelineData.length} períodos mensais analisados`
              : `Filtrado por Ano: ${activeAnoEvolucao} (12 competências mensais)`}
          </span>
        </div>
      </div>

      {/* PAINEL INFERIOR: Desligamentos por Base/Setor & Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Desligamentos por Filial (Base MT) */}
        <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-slate-700/60' : 'border-slate-200'
          }`}>
            <div>
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Building className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                Desligamentos por Unidade / Filial
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Concentração de saídas por unidade operacional (CUIABÁ - MT, VÁRZEA GRANDE - MT)
              </p>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${
              isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              Polo MT
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {baseSectorData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum registro de desligamento por filial.
              </div>
            ) : (
              baseSectorData.map((item, idx) => {
                const maxVal = Math.max(...baseSectorData.map(d => d.value), 1);
                const pctWidth = Math.min(100, Math.max(8, (item.value / maxVal) * 100));

                return (
                  <div key={`${item.name}-${idx}`} className="group">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({item.percent}%)</span>
                        <span className={`font-bold ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>{item.value} saídas</span>
                      </div>
                    </div>
                    <div className={`h-3.5 w-full rounded-full overflow-hidden flex items-center p-0.5 ${
                      isDark ? 'bg-slate-700/40' : 'bg-slate-100'
                    }`}>
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${pctWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 2: Desligamentos por Setor / Departamento */}
        <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-slate-700/60' : 'border-slate-200'
          }`}>
            <div>
              <h3 className={`text-sm font-bold tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                <Layers className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                Desligamentos por Departamento / Setor
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Áreas operacionais com maior rotatividade
              </p>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${
              isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200'
            }`}>
              {deptoData.length} áreas
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {deptoData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum registro de desligamento por departamento.
              </div>
            ) : (
              deptoData.slice(0, 5).map((item, idx) => {
                const maxVal = Math.max(...deptoData.map(d => d.value), 1);
                const pctWidth = Math.min(100, Math.max(8, (item.value / maxVal) * 100));

                return (
                  <div key={`${item.name}-${idx}`} className="group">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({item.percent}%)</span>
                        <span className={`font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{item.value} saídas</span>
                      </div>
                    </div>
                    <div className={`h-3.5 w-full rounded-full overflow-hidden flex items-center p-0.5 ${
                      isDark ? 'bg-slate-700/40' : 'bg-slate-100'
                    }`}>
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${pctWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section: Testes Estratégicos & Riscos (Identical to PDF Page 2) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Layers className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Testes Estratégicos & Riscos
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Turnover Precoce (< 90 dias) */}
          <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 ${
            isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Turnover Precoce (&lt; 90 dias)</span>
              <div className={`text-4xl font-black tracking-tight mt-2 font-mono ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {precoces.length}
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Saídas no período de experiência. Altos índices indicam necessidade de revisão no Onboarding ou perfil de contratação.
            </p>
          </div>

          {/* Card 2: Cargo Mais Crítico */}
          <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 ${
            isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Cargo Mais Crítico</span>
              <div className={`text-xl sm:text-2xl font-black tracking-tight mt-2 uppercase truncate ${
                isDark ? 'text-rose-400' : 'text-rose-600'
              }`} title={cargoMaisCritico}>
                {cargoMaisCritico}
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Função com a maior concentração absoluta de evasão no período analisado.
            </p>
          </div>

          {/* Card 3: Tempo Médio de Casa */}
          <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 ${
            isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tempo Médio de Casa</span>
              <div className={`text-4xl font-black tracking-tight mt-2 font-mono flex items-baseline gap-1.5 ${
                isDark ? 'text-orange-400' : 'text-orange-600'
              }`}>
                <span>{tempoMedioCasaMeses}</span>
                <span className={`text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>meses</span>
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Média de permanência antes do desligamento. Ciclos curtos elevam o custo de reposição.
            </p>
          </div>
        </div>
      </div>

      {/* Section: Mapeamento de Risco: Top Cargos Evasivos (Identical to PDF Page 2 & 3) */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? 'bg-slate-800/20 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-700/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Mapeamento de Risco: Top Cargos Evasivos
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Concentração de evasão e impacto percentual no volume total de desligamentos
            </p>
          </div>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border ${
            isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-200'
          }`}>
            {topCargosEvasivos.length} funções
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
              isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-6">Cargo / Função</th>
                <th className="py-3.5 px-6 text-center">Total Desligados</th>
                <th className="py-3.5 px-6 text-right">Impacto no Total de Saídas</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {topCargosEvasivos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum cargo com desligamento registrado.
                  </td>
                </tr>
              ) : (
                topCargosEvasivos.map((item, idx) => {
                  return (
                    <tr key={`${item.cargo}-${idx}`} className={`transition ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className={`py-3.5 px-6 font-bold uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.cargo}
                      </td>
                      <td className={`py-3.5 px-6 text-center font-mono font-bold text-sm ${
                        isDark ? 'text-rose-400' : 'text-rose-600'
                      }`}>
                        {item.count}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <div className={`w-24 h-2 rounded-full overflow-hidden hidden sm:block ${
                            isDark ? 'bg-slate-700/50' : 'bg-slate-200'
                          }`}>
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.min(100, item.percent)}%` }}
                            ></div>
                          </div>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accordion: Guia Analítico: Como ler estes dados na prática? (Identical to PDF Page 3) */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className={`w-full p-4.5 flex items-center justify-between text-left transition cursor-pointer ${
            isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
          }`}
        >
          <div className={`flex items-center gap-2.5 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <BookOpen className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span>Guia Analítico: Como ler estes dados na prática?</span>
          </div>
          <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isGuideOpen && (
          <div className={`p-5 border-t text-xs space-y-4 ${
            isDark ? 'border-slate-700/80 text-slate-300 bg-slate-900/40' : 'border-slate-200 text-slate-700 bg-slate-50'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`space-y-1.5 p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>
                  <ArrowUpRight className="w-3.5 h-3.5" /> 1. Curva de Admissões vs. Desligamentos
                </span>
                <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Quando a linha vermelha (desligamentos) cruza e fica acima da linha azul (admissões), o quadro operacional entra em déficit líquido, gerando sobrecarga nas equipes ativas e acelerando o SLA de abertura de vagas.
                </p>
              </div>

              <div className={`space-y-1.5 p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                  <ArrowDownRight className="w-3.5 h-3.5" /> 2. Risco de Evasão Precoce (&lt; 90 dias)
                </span>
                <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Desligamentos no período de experiência apontam falha de alinhamento no perfil contratado (Recrutamento) ou deficiência no processo de integração/treinamento (Onboarding).
                </p>
              </div>

              <div className={`space-y-1.5 p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  <Calendar className="w-3.5 h-3.5" /> 3. Tempo Médio de Permanência
                </span>
                <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Ciclos médios inferiores a 12 meses indicam alta rotatividade em funções operacionais essenciais, resultando em perda de conhecimento técnico acumulado e custo contínuo de rescisão/recontratação.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Desligados Table with In-Line Filters */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-800/20 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'border-slate-700/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <UserMinus className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
              Lista de Colaboradores Desligados
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Exibindo {tableDesligados.length} desligamentos filtrados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className={`border rounded-lg px-3 py-1.5 font-medium outline-hidden ${
                isDark
                  ? 'bg-slate-950 border-slate-700/80 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}
            >
              <option value="Todos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Tipo: Todos</option>
              <option value="Voluntário (Pedido)" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Voluntário (Pedido)</option>
              <option value="Involuntário (Empresa)" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Involuntário (Empresa)</option>
              <option value="Término de Experiência" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Término de Experiência</option>
              <option value="Acordo Mútuo" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Acordo Mútuo</option>
            </select>

            <select
              value={faixaFilter}
              onChange={(e) => setFaixaFilter(e.target.value)}
              className={`border rounded-lg px-3 py-1.5 font-medium outline-hidden ${
                isDark
                  ? 'bg-slate-950 border-slate-700/80 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}
            >
              <option value="Todas" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>Faixa: Todas</option>
              <option value="< 90 dias (Precoce)" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>&lt; 90 dias (Precoce)</option>
              <option value="90 - 180 dias" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>90 - 180 dias</option>
              <option value="180 dias - 1 ano" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>180 dias - 1 ano</option>
              <option value="1 - 2 anos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>1 - 2 anos</option>
              <option value="> 2 anos" className={isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}>&gt; 2 anos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
              isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-5">Colaborador</th>
                <th className="py-3.5 px-5">Cargo</th>
                <th className="py-3.5 px-5">Unidade</th>
                <th className="py-3.5 px-5 text-center">Tempo de Casa</th>
                <th className="py-3.5 px-5 text-center">Tipo</th>
                <th className="py-3.5 px-5">Motivo de Saída</th>
                <th className="py-3.5 px-5">Data Saída</th>
                <th className="py-3.5 px-4 text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {tableDesligados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    Nenhum colaborador desligado encontrado para os filtros selecionados ou planilha ainda não importada.
                  </td>
                </tr>
              ) : (
                tableDesligados.map((p) => {
                  const isPrecoce = p.faixaTempoCasa === '< 90 dias (Precoce)';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedColaborador(p)}
                      className={`transition cursor-pointer ${
                        isPrecoce
                          ? isDark
                            ? 'bg-rose-950/20 border-l-4 border-rose-500 hover:bg-rose-950/30'
                            : 'bg-rose-50/50 border-l-4 border-rose-500 hover:bg-rose-100/60'
                          : isDark
                            ? 'hover:bg-slate-800/40'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`py-3.5 px-5 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-2">
                          <span>{p.nome}</span>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            #{p.matriculaDolp || p.matricula}
                          </span>
                        </div>
                      </td>
                      <td className={`py-3.5 px-5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {p.cargo}
                      </td>
                      <td className={`py-3.5 px-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {p.filial}
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          isPrecoce
                            ? isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {p.tempoDeCasaDias}d ({p.faixaTempoCasa})
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.tipoDesligamento === 'Voluntário (Pedido)'
                            ? isDark
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : isDark
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.tipoDesligamento}
                        </span>
                      </td>
                      <td className={`py-3.5 px-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {p.motivoSaida || 'Desalinhamento de função'}
                      </td>
                      <td className={`py-3.5 px-5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {p.dataDemissao || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColaborador(p);
                          }}
                          className={`p-1.5 rounded-lg border transition ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                          }`}
                          title="Ver Ficha Completa do Colaborador"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ficha Completa do Colaborador DOLP */}
      {selectedColaborador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    {selectedColaborador.nome}
                    <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium ${
                      selectedColaborador.status === 'Ativo'
                        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                        : isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedColaborador.situacao || selectedColaborador.status}
                    </span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedColaborador.empresa || 'DOLP ENGENHARIA LTDA'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedColaborador(null)}
                className={`p-2 rounded-xl border transition ${
                  isDark
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* IDs & Matrículas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Matrícula DOLP</span>
                  <span className="text-sm font-mono font-bold">{selectedColaborador.matriculaDolp || selectedColaborador.matricula || '-'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Matrícula Contratante</span>
                  <span className="text-xs font-mono font-bold truncate block">{selectedColaborador.matriculaContratante || '-'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tipo de Função</span>
                  <span className="text-xs font-bold">{selectedColaborador.tipoFuncao || 'OPERACIONAL'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Unidade / Filial</span>
                  <span className="text-xs font-bold">{selectedColaborador.filial}</span>
                </div>
              </div>

              {/* Informações Profissionais */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/30 border-slate-700/70' : 'bg-slate-50/70 border-slate-200'}`}>
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-indigo-500">
                  <Briefcase className="w-3.5 h-3.5" /> Informações Contratuais & Operacionais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Cargo / Função:</span>
                    <p className="font-semibold">{selectedColaborador.cargo}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Departamento:</span>
                    <p className="font-semibold">{selectedColaborador.departamento}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Superior Imediato:</span>
                    <p className="font-semibold">{selectedColaborador.gestor || 'DIEFFERSON VITORINO DE MACEDO'}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Data de Admissão:</span>
                    <p className="font-mono font-semibold">{selectedColaborador.dataAdmissao}</p>
                  </div>
                  {selectedColaborador.dataDemissao && (
                    <>
                      <div>
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Data de Desligamento:</span>
                        <p className="font-mono font-semibold text-rose-500">{selectedColaborador.dataDemissao}</p>
                      </div>
                      <div>
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Tempo de Permanência:</span>
                        <p className="font-semibold">{selectedColaborador.tempoDeCasaDias} dias ({selectedColaborador.faixaTempoCasa})</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Tipo / Motivo da Saída:</span>
                        <p className="font-semibold text-rose-400">
                          {selectedColaborador.tipoDesligamento} — {selectedColaborador.motivoSaida || 'Desalinhamento operacional'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dados Pessoais & Documentação */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/30 border-slate-700/70' : 'bg-slate-50/70 border-slate-200'}`}>
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-sky-500">
                  <FileText className="w-3.5 h-3.5" /> Dados Demográficos & Documentação
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>CPF:</span>
                    <p className="font-mono font-semibold">{selectedColaborador.cpf || '-'}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>RG / Órgão:</span>
                    <p className="font-mono font-semibold">
                      {selectedColaborador.rg || '-'} {selectedColaborador.orgaoExpeditor ? `(${selectedColaborador.orgaoExpeditor})` : ''}
                    </p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Data Nasc. / Idade:</span>
                    <p className="font-semibold">
                      {selectedColaborador.dataNascimento || '-'} {selectedColaborador.idade ? `(${selectedColaborador.idade} anos)` : ''}
                    </p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Naturalidade:</span>
                    <p className="font-semibold">{selectedColaborador.naturalidade || '-'}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Estado Civil:</span>
                    <p className="font-semibold">{selectedColaborador.estadoCivil || '-'}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Celular:</span>
                    <p className="font-mono font-semibold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-500" />
                      {selectedColaborador.celular || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Indicadores Especiais */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  selectedColaborador.membroCipa === 'SIM'
                    ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                    : isDark ? 'bg-slate-800/30 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold block">Membro CIPA</span>
                    <span className="font-bold">{selectedColaborador.membroCipa || 'NÃO'}</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  selectedColaborador.ancora === 'SIM'
                    ? isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : isDark ? 'bg-slate-800/30 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Award className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold block">Colaborador Âncora</span>
                    <span className="font-bold">{selectedColaborador.ancora || 'NÃO'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedColaborador(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-xs'
                }`}
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

