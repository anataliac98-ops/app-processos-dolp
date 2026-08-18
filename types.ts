export type TabType = 'integrada' | 'vagas' | 'turnover' | 'individual';

export interface VagaRecord {
  id: string;
  codigoVaga: string;
  cargo: string;
  filial: string;
  dataSolicitacao: string; // YYYY-MM-DD
  dataFechamento?: string; // YYYY-MM-DD or empty if open
  status: 'Aberta' | 'Fechada' | 'Em Andamento' | 'Cancelada';
  motivo: 'Substituição' | 'Aumento de Quadro' | 'Cadastro reserva' | 'Transferência';
  etapa?: string; // e.g. Divulgação (divulgada), Cards (aguardando divulgação), Triagem, Entrevista
  pessoaSustituida?: string; // Colaborador sendo substituído
  slaDias: number; // Dias corridos entre solicitação e fechamento (ou hoje)
  slaMeta: number; // Meta acordada (ex: 25 dias)
  solicitante?: string;
  recrutador?: string;
  nivelPrioridade?: 'Alta' | 'Média' | 'Normal';
}

export interface PessoaRecord {
  id: string;
  matricula: string;
  matriculaDolp?: string;
  matriculaContratante?: string;
  empresa?: string;
  nome: string;
  cargo: string;
  tipoFuncao?: string;
  filial: string;
  departamento: string;
  dataNascimento?: string;
  idade?: number;
  naturalidade?: string;
  estadoCivil?: string;
  cpf?: string;
  rg?: string;
  orgaoExpeditor?: string;
  situacao?: string; // Em Atividade, Afastado, Desligado, Atestado Médico
  celular?: string;
  membroCipa?: string; // SIM / NÃO
  ancora?: string; // SIM / NÃO
  dataAdmissao: string;
  dataDemissao?: string;
  status: 'Ativo' | 'Desligado';
  tempoDeCasaDias: number;
  tempoDeCasaMeses: number;
  faixaTempoCasa: '< 90 dias (Precoce)' | '90 - 180 dias' | '180 dias - 1 ano' | '1 - 2 anos' | '> 2 anos';
  tipoDesligamento?: 'Voluntário (Pedido)' | 'Involuntário (Empresa)' | 'Término de Experiência' | 'Acordo Mútuo';
  motivoSaida?: string;
  gestor?: string;
}

export interface PontoRecord {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;
  filial: string;
  periodo: string; // ex: 2026-07
  faltasInjustificadas: number;
  faltasJustificadas: number;
  atestadosDias: number;
  atrasosMinutos: number;
  horasFaltaTotal: number;
  saldoHoras?: number;
  percentualPresenca: number; // e.g. 92.5%
}

export type RiskLevel = 'Crítico' | 'Alto' | 'Médio' | 'Baixo';

export interface MacroRiskRow {
  cargo: string;
  filial: string;
  vagasAbertas: number;
  vagasSubstituicao: number;
  slaMedioVagas: number;
  totalFaltasPonto: number;
  totalAtestados: number;
  desligamentosRecentes: number;
  turnoverPrecocePercent: number;
  headcountAtivo: number;
  scoreRisco: number; // 0 - 100
  nivelRisco: RiskLevel;
  diagnosticoRuptura: string;
}

export interface IndividualRiskRow {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;
  filial: string;
  faltasInjustificadas: number;
  atestadosDias: number;
  totalAusencias: number;
  tempoDeCasaMeses: number;
  temVagaAbertaSubstituicao: boolean;
  codigoVagaSubstituicao?: string;
  statusVagaSubstituicao?: string;
  nivelRisco: RiskLevel;
  fatorAlerta: string;
  acaoRecomendada: string;
  historicoObservacoes?: string;
}

export interface GlobalFilters {
  filial: string; // 'Todas' or specific
  cargo: string;  // 'Todos' or specific
  solicitante?: string; // 'Todos' or specific
  periodoMes?: string;
  buscaTexto: string;
}

export interface DatasetStats {
  totalVagas: number;
  vagasAbertas: number;
  slaMedioGeral: number;
  totalColaboradores: number;
  totalDesligamentos: number;
  taxaTurnoverGeral: number;
  taxaTurnoverPrecoce: number;
  totalFaltasGeral: number;
  colaboradoresRiscoCritico: number;
  filiaisCadastradas: string[];
  cargosCadastrados: string[];
  solicitantesCadastrados: string[];
}

export interface UploadedFilesState {
  vagasFileName?: string;
  vagasRowCount: number;
  vagasLoadedAt?: string;

  pessoasFileName?: string;
  pessoasRowCount: number;
  pessoasLoadedAt?: string;

  pontoFileName?: string;
  pontoRowCount: number;
  pontoLoadedAt?: string;
}
