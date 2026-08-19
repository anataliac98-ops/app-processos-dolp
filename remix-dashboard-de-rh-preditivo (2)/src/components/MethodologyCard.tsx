import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MethodologyCardProps {
  tab: 'vagas' | 'turnover' | 'integrada' | 'individual';
}

export const MethodologyCard: React.FC<MethodologyCardProps> = ({ tab }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { isDark } = useTheme();

  const contentMap = {
    vagas: {
      badge: 'Metodologia de R&S',
      title: 'Eficiência de Atração e Gargalo Operacional (SLA)',
      summary: 'A Vaga em aberto é o sintoma da perda de força de trabalho e o gargalo que sobrecarrega a equipe remanescente.',
      formula: 'SLA (dias) = Data de Fechamento (ou Hoje) − Data de Solicitação. Meta Padrão: 25 dias para operacionais.',
      insights: [
        'Vagas com mais de 30 dias em aberto dobram o risco de burnout e absenteísmo nos colegas de turno.',
        'Separar vagas por motivo (Substituição vs Aumento de Quadro) isola custos de rotatividade de expansão.',
        'Monitorar pessoas em substituição permite antecipar a curva de aprendizagem antes do desfalque final.'
      ],
      borderGlow: isDark
        ? 'border-sky-500/30 bg-slate-900/80'
        : 'border-sky-200 bg-sky-50/40 text-slate-800',
      badgeColor: isDark
        ? 'bg-sky-500/20 text-[#38BDF8] border-sky-500/30'
        : 'bg-sky-100 text-sky-800 border-sky-200',
      accentColor: isDark ? 'text-[#38BDF8]' : 'text-sky-700',
      dotColor: isDark ? 'bg-[#38BDF8]' : 'bg-sky-600',
    },
    turnover: {
      badge: 'Metodologia de Evasão',
      title: 'Diagnóstico de Saídas e Retenção de Talentos',
      summary: 'O Turnover é o fato consumado: mede o custo real, a perda de conhecimento e a aderência da contratação.',
      formula: 'Taxa de Turnover = (Total de Desligamentos / Efetivo Médio Ativo) × 100. Foco em Evasão Precoce (< 90 dias).',
      insights: [
        'Evasão precoce (< 90 dias) indica desalinhamento de perfil no recrutamento ou falha no onboarding.',
        'Evasão de médio prazo (6 a 12 meses) correlaciona-se diretamente com escala e liderança.',
        'Mapear bases prioritárias (Cuiabá e Várzea Grande) revela disparidades de oferta salarial local.'
      ],
      borderGlow: isDark
        ? 'border-orange-500/30 bg-slate-900/80'
        : 'border-orange-200 bg-orange-50/40 text-slate-800',
      badgeColor: isDark
        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
        : 'bg-orange-100 text-orange-800 border-orange-200',
      accentColor: isDark ? 'text-orange-400' : 'text-orange-700',
      dotColor: isDark ? 'bg-orange-500' : 'bg-orange-600',
    },
    integrada: {
      badge: 'Metodologia Preditiva Integrada',
      title: 'A Tríade de RH: Absenteísmo (Termômetro) → Turnover (Fato) → Vagas (Gargalo)',
      summary: 'A análise preditiva cruza os 3 vetores simultaneamente. O absenteísmo antecede a saída, que gera a vaga aberta, que sobrecarrega a base e reinicia o ciclo vicioso.',
      formula: 'Score de Risco = f(Faltas Recentes × 4, Desligamentos × 14, Vagas Abertas × 18, SLA Excedente × 1.8)',
      insights: [
        'Ruptura Operacional ocorre quando uma base tem alto absenteísmo somado a vagas com SLA estourado.',
        'As filiais de Cuiabá - MT e Várzea Grande - MT recebem priorização algorítmica no topo da matriz.',
        'O Diagnóstico Automático calcula e redige a recomendação gerencial em tempo real.'
      ],
      borderGlow: isDark
        ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950/90'
        : 'border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 border-indigo-200',
      badgeColor: isDark
        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        : 'bg-indigo-100 text-indigo-800 border-indigo-200',
      accentColor: isDark ? 'text-indigo-400' : 'text-indigo-700',
      dotColor: isDark ? 'bg-indigo-500' : 'bg-indigo-600',
    },
    individual: {
      badge: 'Metodologia de Risco Micro',
      title: 'Prevenção Individual de Fuga e Alerta de Substituição',
      summary: 'Mapeamento pessoa a pessoa: cruza a curva de absenteísmo individual com as requisições de vagas abertas com o nome do colaborador em substituição.',
      formula: 'Flag Crítica = Colaborador com Faltas Excessivas (≥ 3) + Vaga de Substituição Já Aberta no R&S.',
      insights: [
        'Identifica silenciosamente processos de desligamento ou colaboradores em "aviso informal" antes do impacto operacional.',
        'Permite à liderança realizar Entrevistas de Permanência (Stay Interviews) antes da saída consolidada.',
        'Prioriza o time de R&S para fechar com urgência os postos que já estão desfalcados na escala.'
      ],
      borderGlow: isDark
        ? 'border-rose-500/30 bg-slate-900/80'
        : 'border-rose-200 bg-rose-50/40 text-slate-800',
      badgeColor: isDark
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        : 'bg-rose-100 text-rose-800 border-rose-200',
      accentColor: isDark ? 'text-rose-400' : 'text-rose-700',
      dotColor: isDark ? 'bg-rose-500' : 'bg-rose-600',
    },
  }[tab];

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 shadow-sm backdrop-blur-xs ${contentMap.borderGlow}`}>
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${contentMap.badgeColor}`}>
            {contentMap.badge}
          </span>
          <h4 className={`text-sm font-semibold tracking-tight flex items-center gap-1.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <Sparkles className={`w-4 h-4 ${contentMap.accentColor} inline`} />
            {contentMap.title}
          </h4>
        </div>
        <button
          type="button"
          className={`p-1 transition-colors ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Expandir ou recolher metodologia"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className={`mt-4 pt-4 border-t text-xs space-y-3 ${
          isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
        }`}>
          <p className={`italic leading-relaxed font-medium ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            "{contentMap.summary}"
          </p>

          <div className={`rounded-xl p-3 border font-mono text-[11px] flex items-center gap-2 overflow-x-auto ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
          }`}>
            <span className={`font-bold uppercase tracking-wider shrink-0 ${contentMap.accentColor}`}>FÓRMULA:</span>
            <span>{contentMap.formula}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {contentMap.insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-2 p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${contentMap.dotColor}`}></span>
                <span className="text-[11px] leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

