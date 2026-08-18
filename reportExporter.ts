import {
  VagaRecord,
  PessoaRecord,
  PontoRecord,
  DatasetStats,
  GlobalFilters,
} from '../types';
import { computeMacroRisk, computeIndividualRisk } from './riskEngine';

export interface ExportReportOptions {
  vagas: VagaRecord[];
  pessoas: PessoaRecord[];
  ponto: PontoRecord[];
  stats: DatasetStats;
  filters: GlobalFilters;
}

/**
 * Gera e dispara o download do relatório executivo completo em formato Word (.doc)
 * com tipografia uniforme (Calibri/Arial), tabelas padronizadas, centralizadas,
 * com larguras percentuais controladas e sem quebras desordenadas.
 */
export function exportAnalysisWordReport({
  vagas,
  pessoas,
  ponto,
  stats,
  filters,
}: ExportReportOptions): void {
  const macroRisk = computeMacroRisk(vagas, pessoas, ponto);
  const individualRisk = computeIndividualRisk(pessoas, ponto, vagas);
  const criticalIndividuals = individualRisk.filter(r => r.nivelRisco === 'Crítico');
  const highRiskIndividuals = individualRisk.filter(r => r.nivelRisco === 'Alto');

  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaEmissao = new Date().toLocaleTimeString('pt-BR');
  const dataIso = new Date().toISOString().split('T')[0];

  // Agrupamentos de Vagas
  const vagasAbertas = vagas.filter(v => v.status === 'Aberta' || v.status === 'Em Andamento');
  const vagasFechadas = vagas.filter(v => v.status === 'Fechada' || v.dataFechamento);
  const vagasEstouradas = vagas.filter(v => (v.slaDias || 0) > (v.slaMeta || 25));

  // Agrupamentos de Pessoal & Turnover
  const desligados = pessoas.filter(p => p.status === 'Desligado');
  const ativos = pessoas.filter(p => p.status === 'Ativo');
  const precoces = desligados.filter(p => p.faixaTempoCasa === '< 90 dias (Precoce)');

  // HTML formatado estritamente com a mesma fonte e regras avançadas para Word
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Relatório Executivo de RH Preditivo</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm 1.5cm 1.5cm 1.5cm;
      mso-page-orientation: portrait;
    }
    * {
      box-sizing: border-box;
      font-family: 'Calibri', 'Segoe UI', Arial, Helvetica, sans-serif !important;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, Helvetica, sans-serif !important;
      font-size: 10pt;
      line-height: 1.4;
      color: #1e293b;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif !important;
      font-size: 17pt;
      color: #0f172a;
      font-weight: bold;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: -0.3px;
    }
    h2 {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif !important;
      font-size: 12pt;
      color: #0369a1;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
      font-weight: bold;
      page-break-after: avoid;
    }
    h3 {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif !important;
      font-size: 10.5pt;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
      font-weight: bold;
      page-break-after: avoid;
    }
    p {
      margin-top: 3px;
      margin-bottom: 6px;
      font-size: 9.5pt;
      color: #334155;
    }
    .header-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 6px solid #0284c7;
      padding: 12px 16px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .kpi-container {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .kpi-cell {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: center;
      vertical-align: middle;
      width: 25%;
    }
    .kpi-title {
      font-size: 8pt;
      color: #64748b;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kpi-value {
      font-size: 16pt;
      font-weight: bold;
      color: #0369a1;
      margin: 2px 0;
    }
    .kpi-subtitle {
      font-size: 7.5pt;
      color: #64748b;
    }
    .callout-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 4px solid #2563eb;
      padding: 10px 14px;
      margin: 10px 0 14px 0;
      font-size: 9pt;
      line-height: 1.45;
      page-break-inside: avoid;
    }
    .critical-alert-box {
      background-color: #fff1f2;
      border: 1px solid #fecdd3;
      border-left: 4px solid #e11d48;
      padding: 10px 14px;
      margin: 10px 0 14px 0;
      font-size: 9pt;
      line-height: 1.45;
      page-break-inside: avoid;
    }

    /* TABELAS UNIFICADAS E CONTROLADAS */
    table.report-table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 16px;
      font-size: 8.5pt;
      table-layout: fixed;
    }
    table.report-table thead {
      display: table-header-group;
    }
    table.report-table tr {
      page-break-inside: avoid;
    }
    table.report-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: bold;
      padding: 6px 6px;
      border: 1px solid #0f172a;
      font-size: 8pt;
      text-transform: uppercase;
      vertical-align: middle;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    table.report-table td {
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    table.report-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* ALINHAMENTOS PADRÃO */
    .align-left { text-align: left; }
    .align-center { text-align: center; }
    .align-right { text-align: right; }

    /* BADGES DE STATUS E RISCO */
    .badge {
      display: inline-block;
      padding: 2px 5px;
      font-size: 7.5pt;
      font-weight: bold;
      border-radius: 3px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .badge-critico { background-color: #e11d48; color: #ffffff; }
    .badge-alto { background-color: #f97316; color: #ffffff; }
    .badge-medio { background-color: #eab308; color: #000000; }
    .badge-baixo { background-color: #10b981; color: #ffffff; }
    .badge-estourado { background-color: #be123c; color: #ffffff; }
    .badge-ok { background-color: #059669; color: #ffffff; }

    /* BLOCO DE ASSINATURA */
    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .signature-cell {
      width: 50%;
      padding: 14px 20px;
      text-align: center;
      vertical-align: top;
      font-size: 8.5pt;
    }
    .signature-line {
      border-top: 1px solid #64748b;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>

  <!-- ============================================================ -->
  <!-- CABEÇALHO EXECUTIVO INSTITUCIONAL -->
  <!-- ============================================================ -->
  <div class="header-card">
    <h1>Relatório Executivo de RH Preditivo</h1>
    <p style="font-size: 10.5pt; color: #0369a1; font-weight: bold; margin: 2px 0;">
      Triangulação Integrada: Recrutamento (SLA) &times; Turnover (Evasão) &times; Absenteísmo (Ponto)
    </p>
    <p style="font-size: 8.5pt; color: #475569; margin: 3px 0 0 0;">
      <strong>Data de Emissão:</strong> ${dataHoje} às ${horaEmissao} | 
      <strong>Conformidade:</strong> Análise Segura LGPD (Processamento Seguro em Memória)
    </p>
    <p style="font-size: 8.5pt; color: #475569; margin: 2px 0 0 0;">
      <strong>Filtros Aplicados:</strong> Filial: <u>${filters.filial}</u> | Cargo: <u>${filters.cargo}</u> | Solicitante: <u>${filters.solicitante || 'Todos'}</u>
    </p>
  </div>

  <!-- KPI SUMMARY CARDS -->
  <table class="kpi-container">
    <tr>
      <td class="kpi-cell">
        <div class="kpi-title">Vagas em Aberto</div>
        <div class="kpi-value">${stats.vagasAbertas}</div>
        <div class="kpi-subtitle">SLA Médio: ${stats.slaMedioGeral}d (Meta: 25d)</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Taxa de Turnover</div>
        <div class="kpi-value" style="color: #ea580c;">${stats.taxaTurnoverGeral}%</div>
        <div class="kpi-subtitle">${stats.taxaTurnoverPrecoce}% precoce (&lt;90d)</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Faltas Injustificadas</div>
        <div class="kpi-value" style="color: #475569;">${stats.totalFaltasGeral}</div>
        <div class="kpi-subtitle">Absenteísmo no período</div>
      </td>
      <td class="kpi-cell" style="background-color: #fff1f2; border-color: #fecdd3;">
        <div class="kpi-title" style="color: #be123c;">Risco Crítico Micro</div>
        <div class="kpi-value" style="color: #e11d48;">${stats.colaboradoresRiscoCritico}</div>
        <div class="kpi-subtitle" style="color: #9f1239;">Faltas + Vaga Aberta</div>
      </td>
    </tr>
  </table>

  <!-- DIAGNÓSTICO EXECUTIVO AUTOMÁTICO -->
  <div class="callout-box">
    <strong style="color: #1e3a8a; font-size: 9.5pt; text-transform: uppercase;">
      &bull; Diagnóstico Executivo de Ruptura Operacional
    </strong>
    <p style="margin-top: 5px; font-size: 9pt; color: #1e293b; line-height: 1.45;">
      ${macroRisk.dynamicDiagnosisText}
    </p>
    <p style="margin-top: 5px; font-size: 8.5pt; color: #334155;">
      <strong>Polo de Maior Criticidade:</strong> ${macroRisk.topRiskBranch} &nbsp;|&nbsp; 
      <strong>Função mais Impactada:</strong> ${macroRisk.topRiskRole}
    </p>
  </div>

  <!-- ============================================================ -->
  <!-- SEÇÃO 1: ABA VISÃO INTEGRADA (RISCO MACRO & TRIANGULAÇÃO) -->
  <!-- ============================================================ -->
  <h2>1. Visão Integrada &bull; Matriz de Risco Operacional Macro</h2>
  <p>
    A triangulação analítica correlaciona a demanda reprimida em Recrutamento (vagas em aberto e SLA), o histórico de retenção (desligamentos) e o absenteísmo no ponto eletrônico para antecipar desabastecimento de postos.
  </p>

  <table class="report-table">
    <thead>
      <tr>
        <th class="align-left" style="width: 14%;">Filial / Polo</th>
        <th class="align-left" style="width: 16%;">Cargo / Função</th>
        <th class="align-center" style="width: 8%;">Faltas Ponto</th>
        <th class="align-center" style="width: 8%;">Atestados</th>
        <th class="align-center" style="width: 8%;">Saídas</th>
        <th class="align-center" style="width: 8%;">Vagas Abertas</th>
        <th class="align-center" style="width: 8%;">SLA Médio</th>
        <th class="align-center" style="width: 10%;">Nível Risco</th>
        <th class="align-left" style="width: 20%;">Diagnóstico & Ação</th>
      </tr>
    </thead>
    <tbody>
      ${macroRisk.priorityBranchesMatrix.map(m => `
        <tr>
          <td class="align-left"><strong>${m.filial}</strong></td>
          <td class="align-left">${m.cargo}</td>
          <td class="align-center" style="font-weight: bold; color: #ea580c;">${m.totalFaltasPonto}</td>
          <td class="align-center">${m.totalAtestados}d</td>
          <td class="align-center" style="font-weight: bold; color: #7c3aed;">${m.desligamentosRecentes}</td>
          <td class="align-center" style="font-weight: bold; color: #0284c7;">${m.vagasAbertas}</td>
          <td class="align-center">${m.slaMedioVagas}d</td>
          <td class="align-center">
            <span class="badge ${
              m.nivelRisco === 'Crítico' ? 'badge-critico' : 
              m.nivelRisco === 'Alto' ? 'badge-alto' : 
              m.nivelRisco === 'Médio' ? 'badge-medio' : 'badge-baixo'
            }">
              ${m.nivelRisco}
            </span>
          </td>
          <td class="align-left" style="font-size: 8pt;">${m.diagnosticoRuptura}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- ============================================================ -->
  <!-- SEÇÃO 2: ABA SLA DE VAGAS & RECRUTAMENTO (R&S) -->
  <!-- ============================================================ -->
  <h2>2. SLA de Vagas &bull; Recrutamento & Seleção (R&S)</h2>
  <p>
    Auditoria do pipeline de reposição e atração de talentos, confrontando o tempo decorrido de fechamento de cada processo seletivo frente à meta acordada de 25 dias.
  </p>

  <table class="kpi-container">
    <tr>
      <td class="kpi-cell">
        <div class="kpi-title">Total de Vagas</div>
        <div class="kpi-value">${vagas.length}</div>
        <div class="kpi-subtitle">Registradas no período</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Vagas em Aberto</div>
        <div class="kpi-value" style="color: #0284c7;">${vagasAbertas.length}</div>
        <div class="kpi-subtitle">Em andamento / triagem</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Vagas Concluídas</div>
        <div class="kpi-value" style="color: #059669;">${vagasFechadas.length}</div>
        <div class="kpi-subtitle">Contratações finalizadas</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">SLA Estourado (&gt;25d)</div>
        <div class="kpi-value" style="color: #dc2626;">${vagasEstouradas.length}</div>
        <div class="kpi-subtitle">${vagas.length > 0 ? Math.round((vagasEstouradas.length / vagas.length) * 100) : 0}% do volume total</div>
      </td>
    </tr>
  </table>

  <h3>Detalhamento das Vagas Registradas (${vagas.length} vagas)</h3>
  <table class="report-table">
    <thead>
      <tr>
        <th class="align-center" style="width: 11%;">Código</th>
        <th class="align-left" style="width: 17%;">Cargo</th>
        <th class="align-left" style="width: 14%;">Filial</th>
        <th class="align-left" style="width: 14%;">Solicitante</th>
        <th class="align-center" style="width: 9%;">Data Solicit.</th>
        <th class="align-center" style="width: 9%;">Status</th>
        <th class="align-left" style="width: 14%;">Motivo da Abertura</th>
        <th class="align-center" style="width: 6%;">SLA</th>
        <th class="align-center" style="width: 6%;">Situação</th>
      </tr>
    </thead>
    <tbody>
      ${vagas.map(v => {
        const sla = v.slaDias || 0;
        const meta = v.slaMeta || 25;
        const isEstourado = sla > meta;
        return `
          <tr>
            <td class="align-center"><strong>${v.codigoVaga}</strong></td>
            <td class="align-left">${v.cargo}</td>
            <td class="align-left">${v.filial}</td>
            <td class="align-left">${v.solicitante || 'Gestão Operacional'}</td>
            <td class="align-center">${v.dataSolicitacao}</td>
            <td class="align-center">${v.status}</td>
            <td class="align-left" style="font-size: 8pt;">
              ${v.motivo}${v.pessoaSustituida ? ` (Subst: ${v.pessoaSustituida})` : ''}
            </td>
            <td class="align-center" style="font-weight: bold;">${sla}d</td>
            <td class="align-center">
              <span class="badge ${isEstourado ? 'badge-estourado' : 'badge-ok'}">
                ${isEstourado ? 'ESTOURADO' : 'NO PRAZO'}
              </span>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- ============================================================ -->
  <!-- SEÇÃO 3: ABA TURNOVER & EVASÃO DE PESSOAL -->
  <!-- ============================================================ -->
  <h2>3. Diagnóstico de Evasão &bull; Turnover & Retenção</h2>
  <p>
    Mapeamento do efetivo ativo e histórico de desligamentos. A incidência de <strong>Turnover Precoce (&lt;90 dias)</strong> requer intervenções no processo seletivo e no acompanhamento de integração (onboarding).
  </p>

  <table class="kpi-container">
    <tr>
      <td class="kpi-cell">
        <div class="kpi-title">Quadro Total</div>
        <div class="kpi-value">${pessoas.length}</div>
        <div class="kpi-subtitle">${ativos.length} ativos / ${desligados.length} desligados</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Taxa de Turnover</div>
        <div class="kpi-value" style="color: #ea580c;">${stats.taxaTurnoverGeral}%</div>
        <div class="kpi-subtitle">${desligados.length} desligamentos totais</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Turnover Precoce (&lt;90d)</div>
        <div class="kpi-value" style="color: #be123c;">${precoces.length}</div>
        <div class="kpi-subtitle">${stats.taxaTurnoverPrecoce}% das saídas totais</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-title">Estabilidade de Quadro</div>
        <div class="kpi-value" style="color: #059669;">${pessoas.length > 0 ? ((ativos.length / pessoas.length) * 100).toFixed(1) : 0}%</div>
        <div class="kpi-subtitle">Percentual de ativos retidos</div>
      </td>
    </tr>
  </table>

  <h3>Relação de Colaboradores e Histórico de Desligamentos (${pessoas.length} registros)</h3>
  <table class="report-table">
    <thead>
      <tr>
        <th class="align-center" style="width: 10%;">Matrícula</th>
        <th class="align-left" style="width: 18%;">Nome do Colaborador</th>
        <th class="align-left" style="width: 16%;">Cargo</th>
        <th class="align-left" style="width: 14%;">Filial</th>
        <th class="align-center" style="width: 9%;">Admissão</th>
        <th class="align-center" style="width: 9%;">Demissão</th>
        <th class="align-center" style="width: 8%;">Status</th>
        <th class="align-center" style="width: 8%;">Tempo Casa</th>
        <th class="align-left" style="width: 8%;">Faixa / Motivo</th>
      </tr>
    </thead>
    <tbody>
      ${pessoas.map(p => {
        const isPrecoce = p.faixaTempoCasa === '< 90 dias (Precoce)';
        return `
          <tr>
            <td class="align-center"><strong>#${p.matricula}</strong></td>
            <td class="align-left">${p.nome}</td>
            <td class="align-left">${p.cargo}</td>
            <td class="align-left">${p.filial}</td>
            <td class="align-center">${p.dataAdmissao}</td>
            <td class="align-center">${p.dataDemissao || '-'}</td>
            <td class="align-center"><strong>${p.status}</strong></td>
            <td class="align-center">${p.tempoDeCasaDias ? `${p.tempoDeCasaDias}d` : '-'}</td>
            <td class="align-left" style="font-size: 8pt;">
              ${isPrecoce ? '<span class="badge badge-critico">&lt;90D (PRECOCE)</span> ' : ''}
              ${p.motivoSaida || p.tipoDesligamento || p.faixaTempoCasa || '-'}
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- ============================================================ -->
  <!-- SEÇÃO 4: ABA RISCO INDIVIDUAL & ABSENTEÍSMO (MICRO / PONTO) -->
  <!-- ============================================================ -->
  <h2>4. Matriz de Risco Individual &bull; Micro & Absenteísmo no Ponto</h2>
  <p>
    Cruzamento nominal avançado entre dados de ponto eletrônico (faltas injustificadas e atestados) e solicitações abertas de vaga para substituição.
  </p>

  <div class="critical-alert-box">
    <strong style="color: #9f1239; font-size: 9.5pt; text-transform: uppercase;">
      &bull; Alerta de Risco Micro: ${criticalIndividuals.length} Colaborador(es) em Risco Crítico e ${highRiskIndividuals.length} em Risco Alto
    </strong>
    <p style="margin-top: 4px; font-size: 8.5pt;">
      Identificados colaboradores que combinam faltas recorrentes e vaga de substituição em andamento, exigindo ação de contenção imediata da liderança.
    </p>
  </div>

  <h3>Matriz Nominal de Risco Individual e Ações Recomendadas</h3>
  <table class="report-table">
    <thead>
      <tr>
        <th class="align-center" style="width: 9%;">Matrícula</th>
        <th class="align-left" style="width: 17%;">Colaborador</th>
        <th class="align-left" style="width: 16%;">Cargo / Unidade</th>
        <th class="align-center" style="width: 6%;">Faltas</th>
        <th class="align-center" style="width: 6%;">Atestados</th>
        <th class="align-center" style="width: 11%;">Vaga Substit.</th>
        <th class="align-center" style="width: 8%;">Nível</th>
        <th class="align-left" style="width: 14%;">Fator de Alerta</th>
        <th class="align-left" style="width: 13%;">Ação Imediata</th>
      </tr>
    </thead>
    <tbody>
      ${individualRisk.map(ind => `
        <tr ${ind.nivelRisco === 'Crítico' ? 'style="background-color: #fff1f2;"' : ''}>
          <td class="align-center"><strong>#${ind.matricula}</strong></td>
          <td class="align-left"><strong>${ind.nome}</strong></td>
          <td class="align-left">${ind.cargo} (${ind.filial})</td>
          <td class="align-center" style="font-weight: bold; color: #ea580c;">${ind.faltasInjustificadas}</td>
          <td class="align-center">${ind.atestadosDias}d</td>
          <td class="align-center">
            ${ind.temVagaAbertaSubstituicao ? 
              `<span class="badge badge-critico">ABERTA (${ind.codigoVagaSubstituicao || 'Sim'})</span>` : 
              '<span style="color: #64748b;">Não</span>'
            }
          </td>
          <td class="align-center">
            <span class="badge ${
              ind.nivelRisco === 'Crítico' ? 'badge-critico' : 
              ind.nivelRisco === 'Alto' ? 'badge-alto' : 
              ind.nivelRisco === 'Médio' ? 'badge-medio' : 'badge-baixo'
            }">
              ${ind.nivelRisco}
            </span>
          </td>
          <td class="align-left" style="font-size: 8pt;">${ind.fatorAlerta}</td>
          <td class="align-left" style="font-size: 8pt;">${ind.acaoRecomendada}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- ============================================================ -->
  <!-- SEÇÃO 5: DIRETRIZES FINAIS & ASSINATURAS -->
  <!-- ============================================================ -->
  <h2>5. Parecer Conclusivo & Plano de Ação Estratégico</h2>
  <div class="callout-box">
    <ol style="margin: 0; padding-left: 18px; font-size: 9pt; line-height: 1.55;">
      <li><strong>Prioridade Zero em R&S:</strong> Acelerar triagens e entrevistas para vagas com SLA estourado nos polos de ${macroRisk.topRiskBranch}, com foco no cargo de ${macroRisk.topRiskRole}.</li>
      <li><strong>Entrevistas de Permanência (Stay Interviews):</strong> Conduzir alinhamentos individuais com colaboradores em Risco Alto e Crítico para diagnosticar descontentamento ou necessidade de ajuste de escala.</li>
      <li><strong>Reestruturação do Onboarding:</strong> Estabelecer tutoria nos primeiros 90 dias para conter a taxa de turnover precoce de ${stats.taxaTurnoverPrecoce}%.</li>
      <li><strong>Revisão de Escalas e Banco de Horas:</strong> Ajustar alocação de postos nas unidades com pico de absenteísmo para evitar sobrecarga dos profissionais presentes.</li>
    </ol>
  </div>

  <table class="signature-table">
    <tr>
      <td class="signature-cell">
        <div class="signature-line"></div>
        <strong>Coordenação de Recursos Humanos & R&S</strong><br>
        <span style="color: #64748b; font-size: 8pt;">Validação de Vagas, SLA e Indicadores de Retenção</span>
      </td>
      <td class="signature-cell">
        <div class="signature-line"></div>
        <strong>Gerência de Operações & Logística</strong><br>
        <span style="color: #64748b; font-size: 8pt;">Aprovação do Plano de Mitigação de Rupturas de Escala</span>
      </td>
    </tr>
  </table>

  <p style="text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 20px;">
    Documento gerado automaticamente pelo Sistema de Inteligência de RH Preditivo em ${dataHoje} às ${horaEmissao}.
  </p>

</body>
</html>
  `.trim();

  // Criação do Blob Word (.doc / HTML MIME compatível com Word e LibreOffice) com UTF-8 BOM
  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `Relatorio_Completo_RH_Preditivo_${dataIso}.doc`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

/**
 * Gera texto formatado em Markdown do Sumário Executivo para cópia rápida
 */
export function generateMarkdownReportText({
  vagas,
  pessoas,
  ponto,
  stats,
  filters,
}: ExportReportOptions): string {
  const macroRisk = computeMacroRisk(vagas, pessoas, ponto);
  const individualRisk = computeIndividualRisk(pessoas, ponto, vagas);
  const critical = individualRisk.filter(r => r.nivelRisco === 'Crítico');
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  return `
======================================================
  RELATÓRIO EXECUTIVO DE ANÁLISE - RH PREDITIVO
  Data de Emissão: ${dataHoje}
======================================================

1. FILTROS DA ANÁLISE:
- Filial: ${filters.filial}
- Cargo: ${filters.cargo}
- Solicitante: ${filters.solicitante || 'Todos'}

2. INDICADORES CHAVE CONSOLIDADOS (KPIS DE TODAS AS ABAS):
- Vagas em Aberto: ${stats.vagasAbertas} (SLA Médio: ${stats.slaMedioGeral} dias | Meta: 25d)
- Total de Colaboradores: ${stats.totalColaboradores} (${stats.totalDesligamentos} desligamentos)
- Taxa Geral de Turnover: ${stats.taxaTurnoverGeral}%
- Taxa de Turnover Precoce (<90d): ${stats.taxaTurnoverPrecoce}%
- Total de Faltas Injustificadas no Mês: ${stats.totalFaltasGeral}
- Colaboradores em Risco Crítico de Ruptura: ${stats.colaboradoresRiscoCritico}

3. DIAGNÓSTICO PREDITIVO (VISÃO INTEGRADA):
${macroRisk.dynamicDiagnosisText}

4. PRINCIPAIS BASES E POSTOS EM RISCO (MATRIZ MACRO):
${macroRisk.priorityBranchesMatrix.slice(0, 6).map(m => `• [${m.nivelRisco.toUpperCase()}] ${m.filial} - ${m.cargo}: ${m.totalFaltasPonto} faltas, ${m.desligamentosRecentes} saídas, ${m.vagasAbertas} vagas abertas. Ação: ${m.diagnosticoRuptura}`).join('\n')}

5. ALERTAS NOMINAIS CRÍTICOS (FALTAS + VAGA DE SUBSTITUIÇÃO EM ABERTO):
${critical.length === 0 ? 'Nenhum colaborador com vaga de substituição em aberto.' : critical.map(c => `• ${c.nome} (Matrícula #${c.matricula}) - ${c.cargo} (${c.filial}) -> ${c.faltasInjustificadas} faltas injustificadas | Vaga em R&S: ${c.codigoVagaSubstituicao || 'Sim'}`).join('\n')}

======================================================
Relatório gerado automaticamente pela Plataforma de RH Preditivo.
`.trim();
}
