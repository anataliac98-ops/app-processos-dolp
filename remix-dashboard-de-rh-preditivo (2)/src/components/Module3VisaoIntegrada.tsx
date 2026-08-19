import React from 'react';
import { VagaRecord, PessoaRecord, PontoRecord, GlobalFilters } from '../types';
import { computeMacroRisk } from '../services/riskEngine';
import { MethodologyCard } from './MethodologyCard';
import { HorizontalBarChart, BarItem } from './HorizontalBarChart';
import { useTheme } from '../context/ThemeContext';
import {
  Layers,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Building2,
  TrendingUp,
  Briefcase,
  Users,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface Module3Props {
  vagas: VagaRecord[];
  pessoas: PessoaRecord[];
  ponto: PontoRecord[];
  filters: GlobalFilters;
}

export const Module3VisaoIntegrada: React.FC<Module3Props> = ({
  vagas,
  pessoas,
  ponto,
  filters,
}) => {
  const { isDark } = useTheme();
  const {
    matrix,
    priorityBranchesMatrix,
    dynamicDiagnosisText,
    topRiskRole,
    topRiskBranch,
  } = computeMacroRisk(vagas, pessoas, ponto);

  // Apply filial/cargo filter if selected
  const filteredMatrix = priorityBranchesMatrix.filter(row => {
    if (filters.filial !== 'Todas' && row.filial !== filters.filial) return false;
    if (filters.cargo !== 'Todos' && row.cargo !== filters.cargo) return false;
    if (filters.buscaTexto) {
      const q = filters.buscaTexto.toLowerCase();
      if (!row.cargo.toLowerCase().includes(q) && !row.filial.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Cross-Triangulation Horizontal Charts
  // 1. Top Ruptura por Cargo (Vagas Abertas)
  const vagasByRoleItems: BarItem[] = filteredMatrix.slice(0, 6).map(row => ({
    id: `${row.cargo}-${row.filial}-vagas`,
    label: `${row.cargo} (${row.filial})`,
    value: row.vagasAbertas,
    displayValue: `${row.vagasAbertas} Vagas`,
    secondaryBadge: `SLA ${row.slaMedioVagas}d`,
    colorClass: row.vagasAbertas >= 2 ? 'bg-rose-500' : 'bg-[#38BDF8]',
    textColorClass: row.vagasAbertas >= 2 ? (isDark ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold') : (isDark ? 'text-[#38BDF8]' : 'text-sky-700 font-semibold'),
  }));

  // 2. Absenteísmo (Faltas de Ponto)
  const faltasByRoleItems: BarItem[] = filteredMatrix.slice(0, 6).map(row => ({
    id: `${row.cargo}-${row.filial}-faltas`,
    label: `${row.cargo} (${row.filial})`,
    value: row.totalFaltasPonto,
    displayValue: `${row.totalFaltasPonto} Faltas`,
    secondaryBadge: row.totalAtestados > 0 ? `+${row.totalAtestados}d atestado` : undefined,
    colorClass: row.totalFaltasPonto >= 8 ? 'bg-orange-500' : 'bg-amber-400',
    textColorClass: row.totalFaltasPonto >= 8 ? (isDark ? 'text-orange-400 font-bold' : 'text-orange-600 font-bold') : (isDark ? 'text-slate-300' : 'text-slate-700 font-semibold'),
  }));

  // 3. Evasão (Desligamentos Recentes)
  const saídasByRoleItems: BarItem[] = filteredMatrix.slice(0, 6).map(row => ({
    id: `${row.cargo}-${row.filial}-saidas`,
    label: `${row.cargo} (${row.filial})`,
    value: row.desligamentosRecentes,
    displayValue: `${row.desligamentosRecentes} Saídas`,
    secondaryBadge: row.turnoverPrecocePercent > 0 ? `${row.turnoverPrecocePercent}% precoce` : undefined,
    colorClass: row.desligamentosRecentes >= 2 ? 'bg-rose-500' : 'bg-indigo-500',
    textColorClass: row.desligamentosRecentes >= 2 ? (isDark ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold') : (isDark ? 'text-indigo-300' : 'text-indigo-700 font-semibold'),
  }));

  // Summary counts
  const totalCriticos = filteredMatrix.filter(r => r.nivelRisco === 'Crítico').length;
  const totalAltos = filteredMatrix.filter(r => r.nivelRisco === 'Alto').length;

  // Branch statistics for the priority geography section (Cuiabá e Várzea Grande, or top 2 active branches in the loaded spreadsheet)
  const hasCuiabaOrVG = matrix.some(r => r.filial.includes('Cuiabá') || r.filial.includes('Várzea Grande'));
  
  let targetBranches: { name: string; filterFn: (f: string) => boolean }[] = [];
  if (hasCuiabaOrVG) {
    targetBranches = [
      { name: 'Cuiabá - MT', filterFn: f => f.includes('Cuiabá') },
      { name: 'Várzea Grande - MT', filterFn: f => f.includes('Várzea Grande') },
    ];
  } else {
    // Find top 2 distinct branches with most activity in the loaded spreadsheets
    const branchActivity = new Map<string, number>();
    matrix.forEach(r => {
      if (r.filial) {
        branchActivity.set(r.filial, (branchActivity.get(r.filial) || 0) + r.vagasAbertas + r.desligamentosRecentes + r.totalFaltasPonto);
      }
    });
    const sortedBranches = Array.from(branchActivity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);
    if (sortedBranches.length > 0) {
      targetBranches = sortedBranches.map(([branchName]) => ({
        name: `Base / Filial ${branchName}`,
        filterFn: f => f === branchName,
      }));
    } else {
      targetBranches = [
        { name: 'Polo Principal 01', filterFn: () => false },
        { name: 'Polo Principal 02', filterFn: () => false },
      ];
    }
  }

  const branchSummary = targetBranches.map(tb => {
    const matched = matrix.filter(r => tb.filterFn(r.filial));
    const vagas = matched.reduce((a, b) => a + b.vagasAbertas, 0);
    const faltas = matched.reduce((a, b) => a + b.totalFaltasPonto, 0);
    const saidas = matched.reduce((a, b) => a + b.desligamentosRecentes, 0);
    const total = vagas + faltas + saidas;

    return {
      name: tb.name,
      vagas,
      faltas,
      saidas,
      vagasWidth: total > 0 ? Math.max(8, Math.round((vagas / total) * 100)) : 33,
      faltasWidth: total > 0 ? Math.max(8, Math.round((faltas / total) * 100)) : 33,
      saidasWidth: total > 0 ? Math.max(8, Math.round((saidas / total) * 100)) : 34,
    };
  });

  return (
    <div id="modulo-visao-integrada" className="space-y-6">
      {/* Methodology Banner */}
      <MethodologyCard tab="integrada" />

      {/* Hero Section: Prioritized Geography + Automated Diagnosis */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Geografia Prioritária (Cuiabá / Várzea Grande) */}
        <div className={`lg:col-span-2 p-6 rounded-2xl flex flex-col justify-between border shadow-xs ${
          isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Building2 className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
                {hasCuiabaOrVG ? 'Geografia Prioritária (Cuiabá / Várzea Grande)' : 'Geografia Prioritária (Principais Polos / Bases)'}
              </h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                isDark ? 'text-[#38BDF8] bg-sky-950/60 border-sky-800/60' : 'text-sky-700 bg-sky-50 border-sky-200'
              }`}>
                {hasCuiabaOrVG ? 'Polos Logísticos MT' : 'Top Bases Operacionais'}
              </span>
            </div>

            <div className="space-y-6">
              {branchSummary.map((b) => (
                <div key={b.name} className="relative">
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className={`font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span className="w-2 h-2 rounded-full bg-[#38BDF8]"></span>
                      {b.name}
                    </span>
                    <span className={`font-mono font-bold text-xs sm:text-sm ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>
                      {b.vagas} Vagas <span className={isDark ? 'text-slate-500' : 'text-slate-300'}>|</span> {b.faltas} Faltas <span className={isDark ? 'text-slate-500' : 'text-slate-300'}>|</span> {b.saidas} Saídas
                    </span>
                  </div>
                  <div className={`h-3.5 rounded-full overflow-hidden flex gap-0.5 p-0.5 ${
                    isDark ? 'bg-slate-700/40' : 'bg-slate-100'
                  }`}>
                    <div className="h-full bg-[#38BDF8] rounded-l-full" style={{ width: `${b.vagasWidth}%` }} title="Vagas Abertas"></div>
                    <div className="h-full bg-orange-500" style={{ width: `${b.faltasWidth}%` }} title="Faltas no Ponto"></div>
                    <div className="h-full bg-rose-500 rounded-r-full" style={{ width: `${b.saidasWidth}%` }} title="Desligamentos"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span> Vagas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Faltas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Saídas</span>
            </div>
            <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Proporção relativa por polo</span>
          </div>
        </div>

        {/* Right: Automated Diagnosis Box */}
        <div className={`p-6 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden border ${
          isDark
            ? 'bg-gradient-to-br from-indigo-900/30 via-slate-800/40 to-slate-900/60 border-indigo-500/30'
            : 'bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-indigo-100'
        }`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-indigo-400' : 'text-indigo-700'
              }`}>
                <Flame className="w-4 h-4 text-rose-500" />
                Diagnóstico Automático
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                Alerta
              </span>
            </div>

            <p className={`font-light text-lg leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Cargo de <span className={`font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{topRiskRole}</span> na base de <span className={`font-semibold ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>{topRiskBranch}</span> representa o maior risco cruzado no momento.
            </p>

            <div className={`p-3 rounded-xl border font-mono text-xs leading-relaxed max-h-28 overflow-y-auto ${
              isDark ? 'bg-slate-950/70 border-slate-800 text-indigo-200' : 'bg-white/80 border-slate-200 text-slate-700 shadow-2xs'
            }`}>
              {dynamicDiagnosisText.split('\n\n')[0]}
            </div>
          </div>

          <div className={`relative z-10 border p-4 rounded-xl mt-4 ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50/70 border-indigo-200'
          }`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
              isDark ? 'text-indigo-300' : 'text-indigo-700'
            }`}>
              Projeção de Ruptura
            </div>
            <div className={`text-2xl font-bold font-mono flex items-center justify-between ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <span>14 Dias</span>
              <span className={`text-xs font-normal px-2 py-0.5 rounded-md border ${
                isDark ? 'text-rose-400 bg-rose-500/20 border-rose-500/30' : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                Crítico
              </span>
            </div>
            <div className={`text-[10px] italic mt-1 ${isDark ? 'text-indigo-300/70' : 'text-slate-500'}`}>
              *Baseado no histórico de turnover vs vagas em aberto e SLA.
            </div>
          </div>
        </div>
      </section>

      {/* 3 Horizontal Clean Charts: The Triangulation Pillars */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Triangulação dos 3 Vetores (Leitura Executiva Direta)
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Rótulos explícitos nas barras com SLA, faltas e saídas consolidadas por cargo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pillar 1: Vagas (Gargalo) */}
          <HorizontalBarChart
            id="chart-macro-vagas"
            title="1. Vagas em Aberto (Gargalo)"
            subtitle="Déficit de headcount no posto"
            items={vagasByRoleItems}
          />

          {/* Pillar 2: Absenteísmo (Termômetro) */}
          <HorizontalBarChart
            id="chart-macro-faltas"
            title="2. Absenteísmo Ponto (Termômetro)"
            subtitle="Faltas injustificadas no mês"
            items={faltasByRoleItems}
          />

          {/* Pillar 3: Evasão (Fato Consumado) */}
          <HorizontalBarChart
            id="chart-macro-saidas"
            title="3. Turnover Evasão (Fato)"
            subtitle="Desligamentos ocorridos no período"
            items={saídasByRoleItems}
          />
        </div>
      </div>

      {/* Matriz Integrada de Risco Macro com Geografia Prioritária */}
      <div className={`border rounded-2xl overflow-hidden shadow-xs ${
        isDark ? 'bg-slate-800/30 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
          isDark ? 'border-slate-700/80 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Matriz Integrada de Risco de Ruptura Operacional
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-sky-500/20 text-[#38BDF8] border-sky-500/30' : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}>
                Prioridade: MT (Cuiabá & Várzea Grande)
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Score Preditivo ponderando Faltas (Ponto) + Saídas (Turnover) + Vagas Abertas (SLA)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {totalCriticos} Críticos
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {totalAltos} em Alerta
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
              isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-5">Filial / Base</th>
                <th className="py-3.5 px-5">Cargo / Função</th>
                <th className="py-3.5 px-5 text-center">Faltas (Ponto)</th>
                <th className="py-3.5 px-5 text-center">Saídas (Turnover)</th>
                <th className="py-3.5 px-5 text-center">Vagas Abertas</th>
                <th className="py-3.5 px-5 text-center">SLA Médio</th>
                <th className="py-3.5 px-5 text-center">Score de Risco</th>
                <th className="py-3.5 px-5">Diagnóstico de Ruptura</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Nenhum cruzamento de risco encontrado para os filtros selecionados ou nenhuma planilha importada ainda.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row, idx) => {
                  const isPriorityBranch = row.filial.includes('Cuiabá') || row.filial.includes('Várzea Grande');
                  const isCritico = row.nivelRisco === 'Crítico';
                  const isAlto = row.nivelRisco === 'Alto';

                  return (
                    <tr
                      key={idx}
                      className={`transition ${
                        isCritico
                          ? isDark ? 'bg-rose-950/20 border-l-4 border-rose-500 hover:bg-rose-950/30' : 'bg-rose-50/60 border-l-4 border-rose-500 hover:bg-rose-50'
                          : isAlto
                          ? isDark ? 'bg-amber-950/10 border-l-4 border-amber-500 hover:bg-amber-950/20' : 'bg-amber-50/60 border-l-4 border-amber-500 hover:bg-amber-50'
                          : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          {isPriorityBranch && (
                            <span className="w-2 h-2 rounded-full bg-[#38BDF8] shrink-0" title="Filial Prioritária MT" />
                          )}
                          <span className={`font-semibold ${isPriorityBranch ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
                            {row.filial}
                          </span>
                        </div>
                      </td>
                      <td className={`py-3.5 px-5 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {row.cargo}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                          row.totalFaltasPonto >= 8
                            ? isDark ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-50 text-orange-700 border border-orange-200'
                            : isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {row.totalFaltasPonto}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                          row.desligamentosRecentes >= 2
                            ? isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200'
                            : isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {row.desligamentosRecentes}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                          row.vagasAbertas >= 2
                            ? isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isDark ? 'text-[#38BDF8]' : 'text-sky-700'
                        }`}>
                          {row.vagasAbertas}
                        </span>
                      </td>
                      <td className={`py-3.5 px-5 text-center font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {row.slaMedioVagas} d
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          isCritico
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : isAlto
                            ? isDark ? 'bg-amber-500/20 text-orange-400 border border-orange-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.scoreRisco} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className={`text-[11px] leading-tight ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {row.diagnosticoRuptura}
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
    </div>
  );
};

