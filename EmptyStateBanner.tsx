import React from 'react';
import { FileSpreadsheet, ArrowRight, Sparkles, CheckCircle2, Play, Briefcase, Users, AlertTriangle } from 'lucide-react';
import { TabType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateBannerProps {
  onNavigateTab: (tab: TabType) => void;
  onLoadDemo: () => void;
}

export const EmptyStateBanner: React.FC<EmptyStateBannerProps> = ({
  onNavigateTab,
  onLoadDemo,
}) => {
  const { isDark } = useTheme();

  return (
    <div className={`border-2 border-dashed rounded-2xl p-6 lg:p-8 text-center shadow-md relative overflow-hidden backdrop-blur-xs ${
      isDark
        ? 'bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-sky-950/40 border-sky-500/40'
        : 'bg-gradient-to-br from-sky-50/80 via-white to-slate-50 border-sky-300'
    }`}>
      <div className="max-w-2xl mx-auto space-y-4 relative z-10">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
          isDark
            ? 'bg-sky-500/10 border-sky-500/30 text-[#38BDF8]'
            : 'bg-sky-100 border-sky-200 text-sky-800'
        }`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>Painel Aguardando Planilhas</span>
        </div>

        <h3 className={`text-xl lg:text-2xl font-bold tracking-tight ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          Anexe suas planilhas diretamente em cada aba
        </h3>

        <p className={`text-xs sm:text-sm leading-relaxed ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Cada aba do aplicativo possui sua própria área para anexar a respectiva planilha. O painel se reconstrói e correlaciona as métricas automaticamente.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('vagas')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer ${
              isDark
                ? 'bg-[#38BDF8] hover:bg-sky-400 text-slate-950'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Anexar Vagas (R&amp;S)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('turnover')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer ${
              isDark
                ? 'bg-orange-500 hover:bg-orange-400 text-slate-950'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Anexar Turnover</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('individual')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer ${
              isDark
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Anexar Ponto &amp; Faltas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onLoadDemo}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
            <span>Ver com Modelo Demo MT</span>
          </button>
        </div>

        <div className={`pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left border-t mt-6 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}>
          <div
            onClick={() => onNavigateTab('vagas')}
            className={`p-3 cursor-pointer rounded-xl border transition ${
              isDark
                ? 'bg-slate-950/60 hover:bg-slate-800/40 border-slate-800'
                : 'bg-white hover:bg-sky-50/50 border-slate-200 shadow-xs'
            }`}
          >
            <span className={`text-[10px] font-bold block uppercase ${isDark ? 'text-[#38BDF8]' : 'text-sky-700'}`}>Aba: SLA de Vagas</span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>grid_tb_oper_contratacao_vaga.xlsx</span>
            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tempo de fechamento e reposições</p>
          </div>
          <div
            onClick={() => onNavigateTab('turnover')}
            className={`p-3 cursor-pointer rounded-xl border transition ${
              isDark
                ? 'bg-slate-950/60 hover:bg-slate-800/40 border-slate-800'
                : 'bg-white hover:bg-orange-50/50 border-slate-200 shadow-xs'
            }`}
          >
            <span className={`text-[10px] font-bold block uppercase ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Aba: Turnover</span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>grid_tb_oper_pessoa_relatorio.xlsx</span>
            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Evasão precoce e motivos de saída</p>
          </div>
          <div
            onClick={() => onNavigateTab('individual')}
            className={`p-3 cursor-pointer rounded-xl border transition ${
              isDark
                ? 'bg-slate-950/60 hover:bg-slate-800/40 border-slate-800'
                : 'bg-white hover:bg-rose-50/50 border-slate-200 shadow-xs'
            }`}
          >
            <span className={`text-[10px] font-bold block uppercase ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>Aba: Risco Individual</span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>relatorio_ponto_faltas_r09.xls</span>
            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Absenteísmo e triagem de colaboradores</p>
          </div>
        </div>
      </div>
    </div>
  );
};

