import React, { useState, useMemo } from 'react';
import {
  TabType,
  GlobalFilters,
  VagaRecord,
  PessoaRecord,
  PontoRecord,
  UploadedFilesState,
} from './types';
import {
  INITIAL_VAGAS_DATA,
  INITIAL_PESSOAS_DATA,
  INITIAL_PONTO_DATA,
} from './data/mockData';
import { computeDatasetStats } from './services/riskEngine';
import { exportAnalysisWordReport } from './services/reportExporter';
import { Header } from './components/Header';
import { Module1VagasSLA } from './components/Module1VagasSLA';
import { Module2Turnover } from './components/Module2Turnover';
import { Module3VisaoIntegrada } from './components/Module3VisaoIntegrada';
import { Module4RiscoIndividual } from './components/Module4RiscoIndividual';
import { ExecutiveSummaryModal } from './components/ExecutiveSummaryModal';
import { EmptyStateBanner } from './components/EmptyStateBanner';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';
import {
  Layers,
  Briefcase,
  Users,
  AlertTriangle,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';

export default function App() {
  const { theme, isDark } = useTheme();
  const [currentTab, setCurrentTab] = useState<TabType>('integrada');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<GlobalFilters>({
    filial: 'Todas',
    cargo: 'Todos',
    solicitante: 'Todos',
    buscaTexto: '',
  });

  // Start initially with empty datasets so the user starts fresh and uploads their files
  const [vagasData, setVagasData] = useState<VagaRecord[]>([]);
  const [pessoasData, setPessoasData] = useState<PessoaRecord[]>([]);
  const [pontoData, setPontoData] = useState<PontoRecord[]>([]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilesState>({
    vagasRowCount: 0,
    vagasFileName: '',
    vagasLoadedAt: '',

    pessoasRowCount: 0,
    pessoasFileName: '',
    pessoasLoadedAt: '',

    pontoRowCount: 0,
    pontoFileName: '',
    pontoLoadedAt: '',
  });

  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState<boolean>(false);
  const [isExecutiveSummaryOpen, setIsExecutiveSummaryOpen] = useState<boolean>(false);

  const hasData = useMemo(() => {
    return vagasData.length > 0 || pessoasData.length > 0 || pontoData.length > 0;
  }, [vagasData, pessoasData, pontoData]);

  // Compute overall stats whenever datasets or filters change
  const stats = useMemo(() => {
    return computeDatasetStats(vagasData, pessoasData, pontoData, filters);
  }, [vagasData, pessoasData, pontoData, filters]);

  // Handlers for individual spreadsheet ingestion
  const handleVagasLoaded = (data: { vagas: VagaRecord[]; uploadedState: Partial<UploadedFilesState> }) => {
    setVagasData(data.vagas);
    setUploadedFiles(prev => ({ ...prev, ...data.uploadedState }));
    setIsCustomDataLoaded(true);
  };

  const handlePessoasLoaded = (data: { pessoas: PessoaRecord[]; uploadedState: Partial<UploadedFilesState> }) => {
    setPessoasData(data.pessoas);
    setUploadedFiles(prev => ({ ...prev, ...data.uploadedState }));
    setIsCustomDataLoaded(true);
  };

  const handlePontoLoaded = (data: { ponto: PontoRecord[]; uploadedState: Partial<UploadedFilesState> }) => {
    setPontoData(data.ponto);
    setUploadedFiles(prev => ({ ...prev, ...data.uploadedState }));
    setIsCustomDataLoaded(true);
  };

  // Handlers for clearing individual datasets
  const handleClearVagas = () => {
    setVagasData([]);
    setUploadedFiles(prev => ({
      ...prev,
      vagasRowCount: 0,
      vagasFileName: '',
      vagasLoadedAt: '',
    }));
  };

  const handleClearPessoas = () => {
    setPessoasData([]);
    setUploadedFiles(prev => ({
      ...prev,
      pessoasRowCount: 0,
      pessoasFileName: '',
      pessoasLoadedAt: '',
    }));
  };

  const handleClearPonto = () => {
    setPontoData([]);
    setUploadedFiles(prev => ({
      ...prev,
      pontoRowCount: 0,
      pontoFileName: '',
      pontoLoadedAt: '',
    }));
  };

  const handleResetDemoData = () => {
    setVagasData(INITIAL_VAGAS_DATA);
    setPessoasData(INITIAL_PESSOAS_DATA);
    setPontoData(INITIAL_PONTO_DATA);
    setUploadedFiles({
      vagasRowCount: INITIAL_VAGAS_DATA.length,
      vagasFileName: 'grid_tb_oper_contratacao_vaga.xlsx (Demo MT)',
      vagasLoadedAt: 'Padrão MT',

      pessoasRowCount: INITIAL_PESSOAS_DATA.length,
      pessoasFileName: 'grid_tb_oper_pessoa_relatorio.xlsx (Demo MT)',
      pessoasLoadedAt: 'Padrão MT',

      pontoRowCount: INITIAL_PONTO_DATA.length,
      pontoFileName: 'relatorio_ponto_faltas_r09.xls (Demo MT)',
      pontoLoadedAt: 'Padrão MT',
    });
    setFilters({ filial: 'Todas', cargo: 'Todos', buscaTexto: '' });
    setIsCustomDataLoaded(true);
  };

  const handleClearAllData = () => {
    setVagasData([]);
    setPessoasData([]);
    setPontoData([]);
    setUploadedFiles({
      vagasRowCount: 0,
      vagasFileName: '',
      vagasLoadedAt: '',

      pessoasRowCount: 0,
      pessoasFileName: '',
      pessoasLoadedAt: '',

      pontoRowCount: 0,
      pontoFileName: '',
      pontoLoadedAt: '',
    });
    setFilters({ filial: 'Todas', cargo: 'Todos', buscaTexto: '' });
    setIsCustomDataLoaded(false);
  };

  const navItems = [
    {
      id: 'integrada' as TabType,
      label: 'Visão Integrada',
      subtitle: 'Risco Macro',
      icon: Layers,
      countBadge: hasData ? 'Triangulação' : 'Aguardando',
      badgeClass: hasData ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    },
    {
      id: 'vagas' as TabType,
      label: 'SLA de Vagas',
      subtitle: 'Recrutamento',
      icon: Briefcase,
      countBadge: `${stats.vagasAbertas} abertas`,
      badgeClass: hasData ? 'bg-sky-500/20 text-[#38BDF8] border-sky-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    },
    {
      id: 'turnover' as TabType,
      label: 'Turnover (Evasão)',
      subtitle: 'Retenção',
      icon: Users,
      countBadge: `${stats.taxaTurnoverGeral}% taxa`,
      badgeClass: hasData ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    },
    {
      id: 'individual' as TabType,
      label: 'Risco Individual',
      subtitle: 'Micro / Ponto',
      icon: AlertTriangle,
      countBadge: `${stats.colaboradoresRiscoCritico} críticos`,
      badgeClass: hasData ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    },
  ];

  const handleSelectTab = (tab: TabType) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#0F172A] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      {/* Immersive Desktop Sidebar Navigation */}
      <aside className={`hidden lg:flex w-72 border-r flex-col p-6 shrink-0 justify-between transition-colors duration-200 ${
        isDark ? 'bg-[#020617] border-slate-800/80 text-slate-200' : 'bg-white border-slate-200/90 text-slate-700 shadow-xs'
      }`}>
        <div>
          {/* Brand Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 ${
                isDark ? 'text-[#38BDF8]' : 'text-sky-600'
              }`}>
                <span className={`w-2 h-2 rounded-full inline-block animate-pulse ${
                  isDark ? 'bg-[#38BDF8]' : 'bg-sky-600'
                }`}></span>
                Estratégico
              </div>
              <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                RH Preditivo
              </h1>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Inteligência de Pessoal & SLA
              </p>
            </div>
          </div>

          {/* Theme Switcher in Sidebar */}
          <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Aparência
              </span>
              <ThemeToggle compact={false} />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-slate-800/60 border-l-4 border-[#38BDF8] text-white shadow-sm'
                        : 'bg-sky-50/80 border-l-4 border-sky-600 text-sky-950 font-bold shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${
                      isActive
                        ? isDark ? 'text-[#38BDF8]' : 'text-sky-600'
                        : isDark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <div>
                      <div className="text-sm font-semibold leading-tight">{item.label}</div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.subtitle}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${item.badgeClass}`}>
                    {item.countBadge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Methodology & Safety Footnote */}
        <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-slate-900' : 'border-slate-200'}`}>
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="text-[10px] uppercase font-bold mb-1.5 flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Metodologia</span>
              <span className={isDark ? 'text-[#38BDF8]' : 'text-sky-600'}>Triangulação</span>
            </div>
            <p className="text-[11px] leading-relaxed italic">
              "Absenteísmo é o termômetro, Turnover é o fato, Vagas é o problema operacional."
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              100% Client-Side
            </span>
            <span>v2.5 MT</span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex">
          <div className={`w-72 border-r p-6 flex flex-col justify-between h-full ${
            isDark ? 'bg-[#020617] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[#38BDF8] text-xs font-bold uppercase tracking-widest mb-0.5">Estratégico</div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>RH Preditivo</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <ThemeToggle />
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between ${
                        isActive
                          ? isDark
                            ? 'bg-slate-800/60 border-l-4 border-[#38BDF8] text-white'
                            : 'bg-sky-50 border-l-4 border-sky-600 text-sky-950 font-bold'
                          : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? (isDark ? 'text-[#38BDF8]' : 'text-sky-600') : 'text-slate-400'}`} />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{item.countBadge}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className={`p-3.5 rounded-xl border text-[11px] ${
              isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span className="text-emerald-500 font-bold block mb-1">✓ LGPD Safe</span>
              Processamento seguro direto no navegador.
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top bar */}
        <div className={`lg:hidden border-b p-4 flex items-center justify-between sticky top-0 z-30 transition-colors ${
          isDark ? 'bg-[#020617] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`p-1.5 rounded-lg ${
                isDark ? 'text-slate-300 hover:text-white bg-slate-800/60' : 'text-slate-700 hover:text-slate-900 bg-slate-100'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>RH Preditivo</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle compact={true} />
            <span className={`text-xs font-semibold ${isDark ? 'text-[#38BDF8]' : 'text-sky-600'}`}>
              {navItems.find(n => n.id === currentTab)?.label}
            </span>
          </div>
        </div>

        {/* Workspace Canvas with Padding */}
        <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
          {/* Header with Title, Stats and Filters */}
          <Header
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            filters={filters}
            onFilterChange={setFilters}
            stats={stats}
            onResetDemoData={handleResetDemoData}
            onClearAllData={handleClearAllData}
            onOpenExecutiveSummary={() => setIsExecutiveSummaryOpen(true)}
            onExportWord={() =>
              exportAnalysisWordReport({
                vagas: vagasData,
                pessoas: pessoasData,
                ponto: pontoData,
                stats,
                filters,
              })
            }
            uploadedFiles={uploadedFiles}
            isCustomDataLoaded={isCustomDataLoaded}
            hasData={hasData}
          />

          {/* If there are no uploaded records yet and on Visão Integrada, show helpful banner with direct tab navigations */}
          {!hasData && currentTab === 'integrada' && (
            <EmptyStateBanner
              onNavigateTab={setCurrentTab}
              onLoadDemo={handleResetDemoData}
            />
          )}

          {/* Tab Views */}
          <div className="transition-all duration-300">
            {currentTab === 'integrada' && (
              <Module3VisaoIntegrada
                vagas={vagasData}
                pessoas={pessoasData}
                ponto={pontoData}
                filters={filters}
              />
            )}

            {currentTab === 'vagas' && (
              <Module1VagasSLA
                vagas={vagasData}
                filters={filters}
                uploadedFiles={uploadedFiles}
                onDataLoaded={handleVagasLoaded}
                onClearVagasData={handleClearVagas}
              />
            )}

            {currentTab === 'turnover' && (
              <Module2Turnover
                pessoas={pessoasData}
                filters={filters}
                uploadedFiles={uploadedFiles}
                onDataLoaded={handlePessoasLoaded}
                onClearPessoasData={handleClearPessoas}
              />
            )}

            {currentTab === 'individual' && (
              <Module4RiscoIndividual
                pessoas={pessoasData}
                ponto={pontoData}
                vagas={vagasData}
                filters={filters}
                uploadedFiles={uploadedFiles}
                onDataLoaded={handlePontoLoaded}
                onClearPontoData={handleClearPonto}
              />
            )}
          </div>
        </main>
      </div>

      {/* Executive Summary Modal */}
      <ExecutiveSummaryModal
        isOpen={isExecutiveSummaryOpen}
        onClose={() => setIsExecutiveSummaryOpen(false)}
        vagas={vagasData}
        pessoas={pessoasData}
        ponto={pontoData}
        stats={stats}
        filters={filters}
      />
    </div>
  );
}
