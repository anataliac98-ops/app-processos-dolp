import React, { useState } from 'react';
import {
  VagaRecord,
  PessoaRecord,
  PontoRecord,
  DatasetStats,
  GlobalFilters,
} from '../types';
import { computeMacroRisk, computeIndividualRisk } from '../services/riskEngine';
import { exportAnalysisWordReport, generateMarkdownReportText } from '../services/reportExporter';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Printer,
  Layers,
  Briefcase,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Sparkles,
  Download,
  Copy,
  Check,
  FileText,
} from 'lucide-react';

interface ExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vagas: VagaRecord[];
  pessoas: PessoaRecord[];
  ponto: PontoRecord[];
  stats: DatasetStats;
  filters: GlobalFilters;
}

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  isOpen,
  onClose,
  vagas,
  pessoas,
  ponto,
  stats,
  filters,
}) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  if (!isOpen) return null;

  const { dynamicDiagnosisText, topRiskRole, topRiskBranch, priorityBranchesMatrix } = computeMacroRisk(vagas, pessoas, ponto);
  const individualRisk = computeIndividualRisk(pessoas, ponto, vagas);
  const criticalIndividuals = individualRisk.filter(r => r.nivelRisco === 'Crítico');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    setIsExportingWord(true);
    try {
      exportAnalysisWordReport({ vagas, pessoas, ponto, stats, filters });
    } catch (e) {
      console.error('Erro ao gerar relatório Word:', e);
    } finally {
      setTimeout(() => setIsExportingWord(false), 800);
    }
  };

  const handleCopyText = async () => {
    try {
      const text = generateMarkdownReportText({ vagas, pessoas, ponto, stats, filters });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Erro ao copiar texto:', e);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto ${
      isDark ? 'bg-slate-950/85' : 'bg-slate-900/60'
    }`}>
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden my-6 flex flex-col max-h-[92vh] ${
        isDark ? 'bg-[#0F172A] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        {/* Modal Top Header */}
        <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b shrink-0 ${
          isDark ? 'bg-[#020617] text-white border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-sky-100 text-sky-700 border-sky-200'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Relatório Completo de Análise Preditiva
                </h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-sky-500/20 text-[#38BDF8] border-sky-500/30' : 'bg-sky-100 text-sky-800 border-sky-200'
                }`}>
                  Todas as Abas
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Triangulação Cruzada: Recrutamento (SLA) × Turnover (Evasão) × Absenteísmo (Ponto)
              </p>
            </div>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Word Download Button */}
            <button
              onClick={handleDownloadWord}
              type="button"
              id="btn-export-word-modal-header"
              title="Baixar relatório formatado em Word (.doc) com todas as 4 abas"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-[#38BDF8] hover:bg-sky-400 text-slate-950'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {isExportingWord ? 'Gerando...' : 'Baixar Word (.doc)'}
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              type="button"
              id="btn-print-pdf-modal"
              title="Imprimir ou Salvar em PDF"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            {/* Copy Text Button */}
            <button
              onClick={handleCopyText}
              type="button"
              id="btn-copy-report-text"
              title="Copiar texto formatado do parecer executivo"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              type="button"
              id="btn-close-modal-x"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Document */}
        <div id="printable-executive-report" className={`p-6 overflow-y-auto space-y-6 text-xs leading-relaxed ${
          isDark ? 'text-slate-200' : 'text-slate-700'
        }`}>
          {/* Executive Overview Header */}
          <div className={`border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#38BDF8]' : 'text-sky-700'
                }`}>
                  Parecer e Sumário Estratégico
                </span>
                <h3 className={`text-xl font-bold mt-0.5 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Diagnóstico de Ruptura, Retenção e SLA de Pessoal
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Filtros Ativos: Filial (<strong>{filters.filial}</strong>) | Cargo (<strong>{filters.cargo}</strong>) | Solicitante (<strong>{filters.solicitante || 'Todos'}</strong>)
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[11px] font-semibold block font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border mt-1 inline-block ${
                  isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}>
                  Análise Segura (LGPD Compliant)
                </span>
              </div>
            </div>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className={`p-3.5 rounded-xl border ${
              isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vagas em Aberto</span>
              <div className={`text-xl font-bold font-mono mt-0.5 ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>{stats.vagasAbertas}</div>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SLA Médio: {stats.slaMedioGeral} dias</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${
              isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Taxa de Turnover</span>
              <div className={`text-xl font-bold font-mono mt-0.5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{stats.taxaTurnoverGeral}%</div>
              <span className={`text-[10px] font-semibold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{stats.taxaTurnoverPrecoce}% precoce (&lt;90d)</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${
              isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Faltas no Ponto</span>
              <div className={`text-xl font-bold font-mono mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{stats.totalFaltasGeral}</div>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Injustificadas no mês</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${
              isDark ? 'bg-rose-950/30 border-rose-500/30' : 'bg-rose-50 border-rose-200 shadow-xs'
            }`}>
              <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>Risco Crítico</span>
              <div className={`text-xl font-bold font-mono mt-0.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>{stats.colaboradoresRiscoCritico}</div>
              <span className={`text-[10px] font-semibold ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>Substituição + Faltas</span>
            </div>
          </div>

          {/* Automated Diagnosis Section */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark
              ? 'bg-gradient-to-br from-indigo-900/30 via-slate-800/40 to-slate-900/60 border-indigo-500/30'
              : 'bg-indigo-50/70 border-indigo-200'
          }`}>
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isDark ? 'text-indigo-300' : 'text-indigo-800'
            }`}>
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Diagnóstico Executivo Automático</span>
            </div>
            <div className={`text-xs font-mono leading-relaxed whitespace-pre-line p-3 rounded-lg border ${
              isDark ? 'bg-slate-950/70 border-slate-800 text-indigo-100' : 'bg-white border-indigo-100 text-slate-800'
            }`}>
              {dynamicDiagnosisText}
            </div>
          </div>

          {/* Top Priority Roles Table */}
          <div className="space-y-2">
            <h4 className={`font-bold uppercase text-[11px] tracking-wider flex items-center justify-between ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <span>Matriz de Risco Operacional por Polo e Função</span>
              <span className={`text-[10px] ${isDark ? 'text-[#38BDF8]' : 'text-sky-700 font-semibold'}`}>Triangulação R&S × Ponto × Turnover</span>
            </h4>
            <div className={`border rounded-xl overflow-hidden ${
              isDark ? 'border-slate-700/80' : 'border-slate-200 shadow-xs'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
                  isDark ? 'bg-slate-900/60 text-slate-400 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3">Filial</th>
                    <th className="py-2.5 px-3">Cargo</th>
                    <th className="py-2.5 px-3 text-center">Faltas</th>
                    <th className="py-2.5 px-3 text-center">Saídas</th>
                    <th className="py-2.5 px-3 text-center">Vagas</th>
                    <th className="py-2.5 px-3 text-center">Risco</th>
                    <th className="py-2.5 px-3">Ação Recomendada</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                  {priorityBranchesMatrix.slice(0, 6).map((row, idx) => (
                    <tr key={idx} className={row.nivelRisco === 'Crítico' ? (isDark ? 'bg-rose-950/20' : 'bg-rose-50/50') : ''}>
                      <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.filial}</td>
                      <td className={`py-2.5 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.cargo}</td>
                      <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{row.totalFaltasPonto}</td>
                      <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{row.desligamentosRecentes}</td>
                      <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>{row.vagasAbertas}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.nivelRisco === 'Crítico'
                            ? 'bg-rose-500 text-white'
                            : isDark
                              ? 'bg-amber-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {row.nivelRisco}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{row.diagnosticoRuptura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Micro Risk Nominative Table */}
          {criticalIndividuals.length > 0 && (
            <div className="space-y-2">
              <h4 className={`font-bold uppercase text-[11px] tracking-wider ${
                isDark ? 'text-rose-400' : 'text-rose-700'
              }`}>
                Alerta de Substituição Nominal (Ponto × Vagas Abertas)
              </h4>
              <div className={`border rounded-xl overflow-hidden ${
                isDark ? 'border-rose-500/30 bg-rose-950/10' : 'border-rose-200 bg-rose-50/40'
              }`}>
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase font-bold text-[10px] tracking-wider border-b ${
                    isDark ? 'bg-rose-950/30 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Colaborador</th>
                      <th className="py-2.5 px-3">Cargo / Filial</th>
                      <th className="py-2.5 px-3 text-center">Faltas Injust.</th>
                      <th className="py-2.5 px-3 text-center">Vaga R&S</th>
                      <th className="py-2.5 px-3">Status de Retenção</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-rose-900/30' : 'divide-rose-200'}`}>
                    {criticalIndividuals.map((ind) => (
                      <tr key={ind.matricula}>
                        <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {ind.nome} <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>#{ind.matricula}</span>
                        </td>
                        <td className={`py-2.5 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{ind.cargo} ({ind.filial})</td>
                        <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{ind.faltasInjustificadas} faltas</td>
                        <td className={`py-2.5 px-3 text-center font-mono font-bold ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>{ind.codigoVagaSubstituicao || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                            SUBSTITUIÇÃO ABERTA
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Direct Word Download Banner inside modal */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-blue-50/70 border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${
                isDark ? 'bg-sky-500/10 text-[#38BDF8] border-sky-500/20' : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Extrair Relatório Executivo Completo em Word (Todas as Abas)
                </span>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Gera documento .doc formatado para Microsoft Word com todas as 4 abas: Visão Integrada, SLA de Vagas, Turnover e Risco Individual.
                </span>
              </div>
            </div>
            <button
              type="button"
              id="btn-export-word-modal-bottom"
              onClick={handleDownloadWord}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#38BDF8] hover:bg-sky-400 text-slate-950'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              <Download className="w-4 h-4" />
              {isExportingWord ? 'Gerando...' : 'Exportar Relatório Word (.doc)'}
            </button>
          </div>

          {/* Signatures & Methodology note */}
          <div className={`pt-4 border-t grid grid-cols-2 gap-8 text-center text-[11px] ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
            <div className={`border-t pt-2 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
              <span className={`font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>Coordenação de Recursos Humanos & R&S</span>
              <span>Validação de Vagas e Indicadores de Retenção</span>
            </div>
            <div className={`border-t pt-2 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
              <span className={`font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>Gerência de Operações & Logística</span>
              <span>Plano de Mitigação de Rupturas e Escala</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
