import {
  VagaRecord,
  PessoaRecord,
  PontoRecord,
  MacroRiskRow,
  IndividualRiskRow,
  GlobalFilters,
  DatasetStats,
  RiskLevel,
} from '../types';

export function computeDatasetStats(
  vagas: VagaRecord[],
  pessoas: PessoaRecord[],
  ponto: PontoRecord[],
  filters: GlobalFilters
): DatasetStats {
  const filteredVagas = filterVagas(vagas, filters);
  const filteredPessoas = filterPessoas(pessoas, filters);
  const filteredPonto = filterPonto(ponto, filters);

  const totalVagas = filteredVagas.length;
  const vagasAbertas = filteredVagas.filter(v => v.status === 'Aberta' || v.status === 'Em Andamento').length;

  const fechadas = filteredVagas.filter(v => v.status === 'Fechada' || v.dataFechamento);
  const slaMedioGeral = fechadas.length > 0
    ? Math.round(fechadas.reduce((acc, v) => acc + (v.slaDias || 0), 0) / fechadas.length)
    : (filteredVagas.length > 0 ? Math.round(filteredVagas.reduce((acc, v) => acc + (v.slaDias || 0), 0) / filteredVagas.length) : 0);

  const totalColaboradores = filteredPessoas.length;
  const totalDesligamentos = filteredPessoas.filter(p => p.status === 'Desligado').length;

  const taxaTurnoverGeral = totalColaboradores > 0
    ? Number(((totalDesligamentos / totalColaboradores) * 100).toFixed(1))
    : 0;

  const desligamentosPrecoces = filteredPessoas.filter(p => p.status === 'Desligado' && p.faixaTempoCasa === '< 90 dias (Precoce)').length;
  const taxaTurnoverPrecoce = totalDesligamentos > 0
    ? Number(((desligamentosPrecoces / totalDesligamentos) * 100).toFixed(1))
    : 0;

  const totalFaltasGeral = filteredPonto.reduce((acc, pt) => acc + (pt.faltasInjustificadas || 0), 0);

  // micro risk count
  const individualRiskList = computeIndividualRisk(filteredPessoas, filteredPonto, filteredVagas);
  const colaboradoresRiscoCritico = individualRiskList.filter(r => r.nivelRisco === 'Crítico').length;

  // distinct lists
  const filiaisSet = new Set<string>();
  const cargosSet = new Set<string>();
  const solicitantesSet = new Set<string>();

  vagas.forEach(v => {
    if (v.filial) filiaisSet.add(v.filial);
    if (v.cargo) cargosSet.add(v.cargo);
    if (v.solicitante && v.solicitante.trim()) solicitantesSet.add(v.solicitante.trim());
  });
  pessoas.forEach(p => {
    if (p.filial) filiaisSet.add(p.filial);
    if (p.cargo) cargosSet.add(p.cargo);
  });
  ponto.forEach(pt => {
    if (pt.filial) filiaisSet.add(pt.filial);
    if (pt.cargo) cargosSet.add(pt.cargo);
  });

  return {
    totalVagas,
    vagasAbertas,
    slaMedioGeral,
    totalColaboradores,
    totalDesligamentos,
    taxaTurnoverGeral,
    taxaTurnoverPrecoce,
    totalFaltasGeral,
    colaboradoresRiscoCritico,
    filiaisCadastradas: Array.from(filiaisSet).sort(),
    cargosCadastrados: Array.from(cargosSet).sort(),
    solicitantesCadastrados: Array.from(solicitantesSet).sort(),
  };
}

export function matchesFilialOrUnidade(recordVal?: string, filterVal?: string): boolean {
  if (!filterVal || filterVal === 'Todas' || filterVal === 'Todos') return true;
  if (!recordVal) return false;
  const a = recordVal.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const b = filterVal.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return a === b || a.includes(b) || b.includes(a);
}

export function filterVagas(vagas: VagaRecord[], filters: GlobalFilters): VagaRecord[] {
  return vagas.filter(v => {
    if (!matchesFilialOrUnidade(v.filial, filters.filial)) return false;
    if (filters.cargo !== 'Todos' && v.cargo !== filters.cargo) return false;
    if (filters.solicitante && filters.solicitante !== 'Todos' && v.solicitante !== filters.solicitante) return false;
    if (filters.buscaTexto) {
      const q = filters.buscaTexto.toLowerCase();
      const match =
        v.codigoVaga.toLowerCase().includes(q) ||
        v.cargo.toLowerCase().includes(q) ||
        v.filial.toLowerCase().includes(q) ||
        (v.pessoaSustituida && v.pessoaSustituida.toLowerCase().includes(q)) ||
        (v.solicitante && v.solicitante.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

export function filterPessoas(pessoas: PessoaRecord[], filters: GlobalFilters): PessoaRecord[] {
  return pessoas.filter(p => {
    if (!matchesFilialOrUnidade(p.filial, filters.filial)) return false;
    if (filters.cargo !== 'Todos' && p.cargo !== filters.cargo) return false;
    if (filters.buscaTexto) {
      const q = filters.buscaTexto.toLowerCase();
      const match =
        p.nome.toLowerCase().includes(q) ||
        p.matricula.toLowerCase().includes(q) ||
        p.cargo.toLowerCase().includes(q) ||
        p.filial.toLowerCase().includes(q) ||
        (p.motivoSaida && p.motivoSaida.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

export function filterPonto(ponto: PontoRecord[], filters: GlobalFilters): PontoRecord[] {
  return ponto.filter(pt => {
    if (!matchesFilialOrUnidade(pt.filial, filters.filial)) return false;
    if (filters.cargo !== 'Todos' && pt.cargo !== filters.cargo) return false;
    if (filters.buscaTexto) {
      const q = filters.buscaTexto.toLowerCase();
      const match =
        pt.nome.toLowerCase().includes(q) ||
        pt.matricula.toLowerCase().includes(q) ||
        pt.cargo.toLowerCase().includes(q) ||
        pt.filial.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

// ----------------------------------------------------
// MÓDULO 3: VISÃO INTEGRADA (RISCO MACRO & GEOGRAFIA PRIORITÁRIA)
// ----------------------------------------------------
export function computeMacroRisk(
  vagas: VagaRecord[],
  pessoas: PessoaRecord[],
  ponto: PontoRecord[]
): {
  matrix: MacroRiskRow[];
  priorityBranchesMatrix: MacroRiskRow[];
  dynamicDiagnosisText: string;
  topRiskRole: string;
  topRiskBranch: string;
} {
  // Group by (Cargo + Filial)
  const groupMap = new Map<string, { cargo: string; filial: string }>();

  vagas.forEach(v => {
    const key = `${v.cargo}___${v.filial}`;
    if (!groupMap.has(key)) groupMap.set(key, { cargo: v.cargo, filial: v.filial });
  });
  pessoas.forEach(p => {
    const key = `${p.cargo}___${p.filial}`;
    if (!groupMap.has(key)) groupMap.set(key, { cargo: p.cargo, filial: p.filial });
  });
  ponto.forEach(pt => {
    const key = `${pt.cargo}___${pt.filial}`;
    if (!groupMap.has(key)) groupMap.set(key, { cargo: pt.cargo, filial: pt.filial });
  });

  const matrix: MacroRiskRow[] = [];

  groupMap.forEach(({ cargo, filial }) => {
    const matchedVagas = vagas.filter(v => v.cargo === cargo && v.filial === filial);
    const matchedPessoas = pessoas.filter(p => p.cargo === cargo && p.filial === filial);
    const matchedPonto = ponto.filter(pt => pt.cargo === cargo && pt.filial === filial);

    const vagasAbertas = matchedVagas.filter(v => v.status === 'Aberta' || v.status === 'Em Andamento').length;
    const vagasSubstituicao = matchedVagas.filter(v => v.motivo === 'Substituição' && (v.status === 'Aberta' || v.status === 'Em Andamento')).length;
    
    const slaSoma = matchedVagas.reduce((acc, v) => acc + (v.slaDias || 0), 0);
    const slaMedioVagas = matchedVagas.length > 0 ? Math.round(slaSoma / matchedVagas.length) : 0;

    const totalFaltasPonto = matchedPonto.reduce((acc, pt) => acc + (pt.faltasInjustificadas || 0), 0);
    const totalAtestados = matchedPonto.reduce((acc, pt) => acc + (pt.atestadosDias || 0), 0);

    const desligamentosRecentes = matchedPessoas.filter(p => p.status === 'Desligado').length;
    const desligamentosPrecoces = matchedPessoas.filter(p => p.status === 'Desligado' && p.faixaTempoCasa === '< 90 dias (Precoce)').length;
    const turnoverPrecocePercent = desligamentosRecentes > 0 ? Math.round((desligamentosPrecoces / desligamentosRecentes) * 100) : 0;

    const headcountAtivo = matchedPessoas.filter(p => p.status === 'Ativo').length || Math.max(1, matchedPonto.length);

    // Calculated Risk Score:
    // Factors: (Vagas abertas * 18) + (Faltas injustificadas * 4) + (Desligamentos * 12) + (SLA acima de 25 * 1.5) + (Turnover Precoce * 0.2)
    let score = 0;
    score += vagasAbertas * 18;
    score += totalFaltasPonto * 4;
    score += desligamentosRecentes * 14;
    if (slaMedioVagas > 25) {
      score += (slaMedioVagas - 25) * 1.8;
    }
    score += (turnoverPrecocePercent / 100) * 15;

    // Normalize roughly 0 - 100
    const normalizedScore = Math.min(100, Math.max(5, Math.round(score)));

    let nivelRisco: RiskLevel = 'Baixo';
    if (normalizedScore >= 70) nivelRisco = 'Crítico';
    else if (normalizedScore >= 45) nivelRisco = 'Alto';
    else if (normalizedScore >= 25) nivelRisco = 'Médio';

    let diagnosticoRuptura = 'Estabilidade operacional com monitoramento de rotina.';
    if (nivelRisco === 'Crítico') {
      diagnosticoRuptura = `⚠️ ALERTA DE RUPTURA OPERACIONAL: Volume elevado de faltas (${totalFaltasPonto}) com ${vagasAbertas} vaga(s) aberta(s) e SLA estourado (${slaMedioVagas} dias). Risco iminente de desabastecimento de escala.`;
    } else if (nivelRisco === 'Alto') {
      diagnosticoRuptura = `⚡ Tensão de Escala: ${desligamentosRecentes} saída(s) recente(s) e absenteísmo em alta (${totalFaltasPonto} faltas). Exige aceleração imediata do R&S.`;
    } else if (nivelRisco === 'Médio') {
      diagnosticoRuptura = `🔍 Atenção pontual em substituições e acompanhamento de integração de novos contratados.`;
    }

    matrix.push({
      cargo,
      filial,
      vagasAbertas,
      vagasSubstituicao,
      slaMedioVagas,
      totalFaltasPonto,
      totalAtestados,
      desligamentosRecentes,
      turnoverPrecocePercent,
      headcountAtivo,
      scoreRisco: normalizedScore,
      nivelRisco,
      diagnosticoRuptura,
    });
  });

  // Sort overall by score descending
  matrix.sort((a, b) => b.scoreRisco - a.scoreRisco);

  // Priority Geography sorting: Cuiabá - MT and Várzea Grande - MT forced to top
  const priorityBranchesMatrix = [...matrix].sort((a, b) => {
    const isAPriority = a.filial.includes('Cuiabá') || a.filial.includes('Várzea Grande');
    const isBPriority = b.filial.includes('Cuiabá') || b.filial.includes('Várzea Grande');

    if (isAPriority && !isBPriority) return -1;
    if (!isAPriority && isBPriority) return 1;
    return b.scoreRisco - a.scoreRisco;
  });

  // Dynamic Preditictive Diagnosis Text
  const topCritical = matrix[0] || {
    cargo: 'Operador de Empilhadeira',
    filial: 'Cuiabá - MT',
    totalFaltasPonto: 16,
    desligamentosRecentes: 2,
    vagasAbertas: 2,
    slaMedioVagas: 43,
  };

  const topRiskRole = topCritical.cargo;
  const topRiskBranch = topCritical.filial;

  const dynamicDiagnosisText = `🚨 DIAGNÓSTICO PREDITIVO DE RISCO CRUZADO:
O cargo de "${topCritical.cargo}" na unidade "${topCritical.filial}" foi identificado como o PONTO DE MAIOR RISCO DE RUPTURA OPERACIONAL da organização.

O diagnóstico aponta o acúmulo de ${topCritical.totalFaltasPonto} falta(s) no período recente, ${topCritical.desligamentosRecentes} desligamento(s) consumado(s) e ${topCritical.vagasAbertas} vaga(s) em aberto com SLA médio crítico de ${topCritical.slaMedioVagas} dias. 

A projeção matemática indica risco severo de sobrecarga na equipe remanescente e colapso de escala nos próximos 15 dias caso o processo seletivo não seja priorizado e as causas de evasão precoce não sejam contidas.`;

  return {
    matrix,
    priorityBranchesMatrix,
    dynamicDiagnosisText,
    topRiskRole,
    topRiskBranch,
  };
}

// ----------------------------------------------------
// MÓDULO 4: RISCO INDIVIDUAL (MICRO - PESSOA A PESSOA)
// ----------------------------------------------------
export function computeIndividualRisk(
  pessoas: PessoaRecord[],
  ponto: PontoRecord[],
  vagas: VagaRecord[]
): IndividualRiskRow[] {
  // Extract all open substitution names from Vagas
  const openSubstitutions = new Map<string, VagaRecord>();
  vagas
    .filter(v => v.status === 'Aberta' || v.status === 'Em Andamento')
    .forEach(v => {
      if (v.pessoaSustituida) {
        const normName = v.pessoaSustituida.trim().toLowerCase();
        openSubstitutions.set(normName, v);
      }
    });

  // Map each individual
  const rows: IndividualRiskRow[] = [];

  // Combine active people or people present in ponto
  const peopleMap = new Map<string, { nome: string; matricula: string; cargo: string; filial: string; tempoDeCasaMeses: number }>();

  pessoas.forEach(p => {
    peopleMap.set(p.matricula, {
      nome: p.nome,
      matricula: p.matricula,
      cargo: p.cargo,
      filial: p.filial,
      tempoDeCasaMeses: p.tempoDeCasaMeses,
    });
  });

  ponto.forEach(pt => {
    if (!peopleMap.has(pt.matricula)) {
      peopleMap.set(pt.matricula, {
        nome: pt.nome,
        matricula: pt.matricula,
        cargo: pt.cargo,
        filial: pt.filial,
        tempoDeCasaMeses: 6,
      });
    }
  });

  peopleMap.forEach(({ nome, matricula, cargo, filial, tempoDeCasaMeses }) => {
    const pt = ponto.find(p => p.matricula === matricula || p.nome.toLowerCase() === nome.toLowerCase());
    const faltasInjust = pt ? pt.faltasInjustificadas : 0;
    const atestados = pt ? pt.atestadosDias : 0;
    const totalAusencias = faltasInjust + atestados;

    // Check if there is an open vacancy to replace this person
    const normName = nome.trim().toLowerCase();
    const matchedVaga = openSubstitutions.get(normName);
    const temVagaAbertaSubstituicao = !!matchedVaga;

    let nivelRisco: RiskLevel = 'Baixo';
    let fatorAlerta = 'Presença regular sem sinais de evasão.';
    let acaoRecomendada = 'Acompanhamento de rotina e feedback periódico.';

    if (temVagaAbertaSubstituicao && (faltasInjust >= 3 || totalAusencias >= 5)) {
      nivelRisco = 'Crítico';
      fatorAlerta = `🚨 RISCO CRÍTICO: Absenteísmo elevado (${faltasInjust} faltas) E vaga de substituição já aberta (${matchedVaga?.codigoVaga}). Evasão iminente ou desligamento em curso.`;
      acaoRecomendada = `Acelerar fechamento da vaga ${matchedVaga?.codigoVaga} e planejar transição imediata de posto para mitigar desfalque.`;
    } else if (temVagaAbertaSubstituicao) {
      nivelRisco = 'Alto';
      fatorAlerta = `⚠️ Vaga aberta em substituição (${matchedVaga?.codigoVaga}). Processo de reposição em andamento pelo R&S.`;
      acaoRecomendada = `Acompanhar prazo de fechamento do SLA e preparar onboarding do substituto.`;
    } else if (faltasInjust >= 5 || totalAusencias >= 8) {
      nivelRisco = 'Alto';
      fatorAlerta = `⚡ Absenteísmo Crônico: ${faltasInjust} faltas injustificadas e ${atestados} dias de atestado. Forte indicativo de desengajamento / busca por recolocação.`;
      acaoRecomendada = `Agendar Entrevista de Permanência (Stay Interview) com o gestor imediato e validar alinhamento de escala.`;
    } else if (faltasInjust >= 2 || totalAusencias >= 4 || tempoDeCasaMeses < 3) {
      nivelRisco = 'Médio';
      fatorAlerta = `Atenção: ${faltasInjust} falta(s) no mês recente. ${tempoDeCasaMeses < 3 ? 'Colaborador em período de experiência (<90d).' : 'Oscilação de frequência.'}`;
      acaoRecomendada = `Conversa 1:1 de alinhamento com a liderança para entender motivos pontuais.`;
    }

    rows.push({
      id: `risk-${matricula}`,
      matricula,
      nome,
      cargo,
      filial,
      faltasInjustificadas: faltasInjust,
      atestadosDias: atestados,
      totalAusencias,
      tempoDeCasaMeses,
      temVagaAbertaSubstituicao,
      codigoVagaSubstituicao: matchedVaga?.codigoVaga,
      statusVagaSubstituicao: matchedVaga?.status,
      nivelRisco,
      fatorAlerta,
      acaoRecomendada,
    });
  });

  // Sort: Crítico -> Alto -> Médio -> Baixo, then by absences
  const riskWeights: Record<RiskLevel, number> = {
    'Crítico': 4,
    'Alto': 3,
    'Médio': 2,
    'Baixo': 1,
  };

  rows.sort((a, b) => {
    if (riskWeights[b.nivelRisco] !== riskWeights[a.nivelRisco]) {
      return riskWeights[b.nivelRisco] - riskWeights[a.nivelRisco];
    }
    return b.totalAusencias - a.totalAusencias;
  });

  return rows;
}
