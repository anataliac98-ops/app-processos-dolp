import * as XLSX from 'xlsx';
import { VagaRecord, PessoaRecord, PontoRecord } from '../types';

// Helper to normalize column names for fuzzy mapping
function normalizeKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Safely extracts a column value from a raw Excel row object.
 * Priority:
 * 1. Exact normalized match (e.g. 'unidade' === 'unidade')
 * 2. Prefix/Suffix/Sub-word match (e.g. 'nome_da_unidade' contains 'unidade')
 * CRITICAL: NEVER do `normPk.includes(normK)` because that allows short column names like 'id' to match 'unidade', 'rg' to match 'cargo', 're' to match 'recrutador'!
 */
function getColumnValue(
  row: Record<string, any>,
  preferredKeys: string[],
  forbiddenKeys: string[] = []
): any {
  if (!row || typeof row !== 'object') return '';
  const rowKeys = Object.keys(row);
  const normalizedRowKeys = rowKeys.map(k => ({ raw: k, norm: normalizeKey(k) }));
  const normForbidden = forbiddenKeys.map(f => normalizeKey(f));

  // 1. Pass 1: Exact matches
  for (const pk of preferredKeys) {
    const normPk = normalizeKey(pk);
    for (const { raw, norm } of normalizedRowKeys) {
      if (norm === normPk) {
        const val = row[raw];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }

  // 2. Pass 2: Column name starts with or ends with preferred key, or contains it with length >= 3
  for (const pk of preferredKeys) {
    const normPk = normalizeKey(pk);
    if (normPk.length < 3) continue;

    for (const { raw, norm } of normalizedRowKeys) {
      // Reject if column name matches any forbidden key
      const isForbidden = normForbidden.some(
        fb => fb.length >= 2 && (norm === fb || norm.startsWith(fb) || norm.endsWith(fb))
      );
      if (isForbidden) continue;

      if (norm.includes(normPk)) {
        const val = row[raw];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }

  // 3. Pass 3: Fallback prefix match
  for (const pk of preferredKeys) {
    const normPk = normalizeKey(pk);
    for (const { raw, norm } of normalizedRowKeys) {
      if (norm.startsWith(normPk) || norm.endsWith(normPk)) {
        const isForbidden = normForbidden.some(
          fb => fb.length >= 2 && (norm === fb || norm.startsWith(fb) || norm.endsWith(fb))
        );
        if (!isForbidden) {
          const val = row[raw];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return val;
          }
        }
      }
    }
  }

  return '';
}

// Convert Excel dates (serial, Date, or string) to YYYY-MM-DD
function parseExcelDate(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    if (y < 1990 || y > 2100) return '';
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number') {
    if (val <= 0) return '';
    // Excel base date serial conversion (using 25569 offset from 1970-01-01)
    const dateInfo = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateInfo.getTime())) {
      const y = dateInfo.getUTCFullYear();
      if (y < 1990 || y > 2100) return '';
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (
    !str ||
    str === '-' ||
    str === '0' ||
    str.startsWith('0000') ||
    str.startsWith('00/00') ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined'
  ) {
    return '';
  }

  // check DD/MM/YYYY or D/M/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = '20' + year;
    const numY = parseInt(year, 10);
    const numM = parseInt(month, 10);
    const numD = parseInt(day, 10);
    if (numY < 1990 || numY > 2100 || numM < 1 || numM > 12 || numD < 1 || numD > 31) {
      return '';
    }
    return `${year}-${month}-${day}`;
  }

  // check YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    const numY = parseInt(year, 10);
    const numM = parseInt(month, 10);
    const numD = parseInt(day, 10);
    if (numY < 1990 || numY > 2100 || numM < 1 || numM > 12 || numD < 1 || numD > 31) {
      return '';
    }
    return `${year}-${month}-${day}`;
  }

  return '';
}

function calculateDiffDays(startStr: string, endStr?: string): number {
  if (!startStr) return 0;
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 1. Parse Vagas Spreadsheet: grid_tb_oper_contratacao_vaga
export function parseVagasSheet(buffer: ArrayBuffer | Uint8Array): VagaRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row, index) => {
    const codigo = String(
      getColumnValue(row, ['codigo_vaga', 'cod_vaga', 'num_vaga', 'id_vaga', 'requisicao', 'codigo', 'vaga', 'num', 'id']) ||
      `VAG-${1000 + index}`
    ).trim();

    const cargo = String(
      getColumnValue(row, ['funcao', 'cargo', 'posicao', 'titulo', 'nome_cargo', 'perfil'], ['tipo', 'tempo', 'id', 'cod', 'rg', 'cpf']) ||
      'Cargo Operacional'
    ).trim();

    // Priority to Unidade column, ensuring ID/Code columns are NOT matched
    const filialRaw = String(
      getColumnValue(
        row,
        ['unidade', 'filial', 'base', 'cidade', 'polo', 'localidade', 'municipio', 'local'],
        ['id', 'cod', 'num', 'cd', 'codigo', 'departamento', 'setor', 'cpf', 'rg', 'matricula']
      ) || 'CUIABÁ - MT'
    ).trim();

    // Prevent pure numeric values if wrongly captured
    const filial = (/^\d+$/.test(filialRaw) && filialRaw.length <= 6) ? `Unidade ${filialRaw}` : filialRaw;

    const dataSolRaw = getColumnValue(
      row,
      ['solicitacao', 'dt_solicitacao', 'data_solicitacao', 'dt_abertura', 'data_abertura', 'abertura', 'criacao', 'datasolicitacao', 'dt_criacao', 'data_inicio'],
      ['fechamento', 'conclusao', 'admissao', 'cancelamento']
    );
    const dataFechRaw = getColumnValue(
      row,
      ['fechamento', 'dt_fechamento', 'data_fechamento', 'data_conclusao', 'conclusao', 'admissao', 'dt_admissao', 'data_admissao', 'dt_encerra']
    );

    const dataSolicitacao = parseExcelDate(dataSolRaw) || '2026-07-01';
    const dataFechamento = dataFechRaw ? parseExcelDate(dataFechRaw) : undefined;

    const statusRaw = String(getColumnValue(row, ['status', 'situacao', 'estado', 'fase', 'etapa_status']) || '').toLowerCase();
    let status: VagaRecord['status'] = 'Aberta';
    if (statusRaw.includes('fech') || statusRaw.includes('concl') || statusRaw.includes('encerr') || dataFechamento) {
      status = 'Fechada';
    } else if (statusRaw.includes('canc')) {
      status = 'Cancelada';
    } else if (statusRaw.includes('andam') || statusRaw.includes('proc') || statusRaw.includes('selec')) {
      status = 'Em Andamento';
    }

    const motivoRaw = String(getColumnValue(row, ['motivo', 'tipo_vaga', 'justificativa', 'natureza', 'motivo_abertura', 'tipo']) || '').toLowerCase();
    let motivo: VagaRecord['motivo'] = 'Substituição';
    if (motivoRaw.includes('aumento') || motivoRaw.includes('novo') || motivoRaw.includes('expans')) {
      motivo = 'Aumento de Quadro';
    } else if (motivoRaw.includes('reserva') || motivoRaw.includes('banco')) {
      motivo = 'Cadastro reserva';
    } else if (motivoRaw.includes('transf')) {
      motivo = 'Transferência';
    }

    const etapaRaw = String(getColumnValue(row, ['etapa', 'etapa_atual', 'fase_atual', 'status_etapa', 'fase', 'situacao_etapa']) || '').trim();
    const etapa = etapaRaw || (status === 'Fechada' ? 'Concluída' : 'Divulgação (divulgada)');

    const pessoaSustituida = String(
      getColumnValue(row, ['pessoa_substituida', 'pessoalsubstituida', 'substituido', 'colaborador_antigo', 'substituto', 'desligado', 'ex_colaborador']) || ''
    ).trim() || undefined;

    const slaCalculado = calculateDiffDays(dataSolicitacao, dataFechamento);
    const slaDiasRaw = Number(getColumnValue(row, ['sla_dias', 'sla_atual', 'dias_aberto', 'dias_aberta', 'tempo_aberto', 'sladias', 'sla'])) || slaCalculado;

    return {
      id: `vaga-${index}-${codigo}`,
      codigoVaga: codigo,
      cargo,
      filial,
      dataSolicitacao,
      dataFechamento,
      status,
      motivo,
      etapa,
      pessoaSustituida,
      slaDias: slaDiasRaw > 0 ? slaDiasRaw : 1,
      slaMeta: Number(getColumnValue(row, ['meta_dias', 'sla_meta', 'meta', 'prazo_meta', 'prazo'])) || 25,
      solicitante: String(
        getColumnValue(row, [
          'solicitante',
          'solicitante_nome',
          'nome_solicitante',
          'gestor',
          'requisitor',
          'requisitante',
          'solicitado_por',
          'usuario_solicitante',
          'responsavel_vaga',
          'criado_por',
          'aberto_por',
          'solicitacao_por',
          'aprovador',
          'autor',
          'emissor',
          'lider',
        ]) || 'Gestão Operacional'
      ).trim(),
      recrutador: String(
        getColumnValue(row, ['recrutador', 'nome_recrutador', 'responsavel_selecao', 'analista_rh', 'analista', 'psicologo', 'selecionador'], ['re', 'matricula', 'recisao', 'rescisao']) ||
        'Equipe R&S'
      ).trim(),
      nivelPrioridade: slaDiasRaw > 30 ? 'Alta' : 'Normal',
    };
  });
}

// 2. Parse Turnover Spreadsheet: grid_tb_oper_pessoa_relatorio / Exportação DOLP
export function parsePessoasSheet(buffer: ArrayBuffer | Uint8Array): PessoaRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row, index) => {
    const idFromSheet = String(
      getColumnValue(row, ['id_pessoa', 'cod_pessoa', 'identificador', 'id', 'cod']) || ''
    ).trim();

    const empresa = String(
      getColumnValue(row, ['empresa', 'razao_social', 'companhia', 'filial_empresa']) ||
      'DOLP ENGENHARIA LTDA - MT'
    ).trim();

    const matriculaDolp = String(
      getColumnValue(row, ['matricula_dolp', 'matriculadolp', 're_dolp', 'chapa_dolp', 'matr_dolp']) || ''
    ).trim();

    const matriculaContratante = String(
      getColumnValue(row, ['matricula_contratante', 'matriculacontratante', 'contratante', 're_contratante']) || ''
    ).trim();

    // Choose primary matricula
    const matricula =
      matriculaDolp ||
      matriculaContratante ||
      String(
        getColumnValue(row, ['matricula', 'chapa', 'registro', 'cod_func', 'num_cad', 're'], ['contratante']) ||
        `MT-${10000 + index}`
      ).trim();

    const nome = String(
      getColumnValue(
        row,
        ['nome', 'colaborador', 'funcionario', 'pessoa', 'nome_completo', 'nome_funcionario'],
        ['gestor', 'sup', 'lider', 'mae', 'pai', 'conjuge', 'substituto']
      ) || `Colaborador ${index + 1}`
    ).trim();

    const cargo = String(
      getColumnValue(
        row,
        ['funcao', 'cargo', 'posicao', 'titulo', 'nome_cargo', 'perfil', 'funcao_contrato'],
        ['tipo', 'tempo', 'id', 'cod', 'rg', 'cpf']
      ) || 'ELETRICISTA DE REDES DE DISTRIBUIÇÃO'
    ).trim();

    const tipoFuncao = String(
      getColumnValue(
        row,
        ['tipo_funcao', 'tipofuncao', 'tipo_cargo', 'tipo_de_funcao', 'categoria_funcao'],
        ['funcao']
      ) || 'OPERACIONAL'
    ).trim();

    // Filial / Unidade (Crucial: avoids capturing 'ID', 'COD', 'MATRICULA')
    const filialRaw = String(
      getColumnValue(
        row,
        ['unidade', 'filial', 'base', 'cidade', 'polo', 'localidade', 'municipio', 'local'],
        ['id', 'cod', 'num', 'cd', 'codigo', 'departamento', 'setor', 'cpf', 'rg', 'matricula']
      ) || 'CUIABÁ - MT'
    ).trim();

    const filial = (/^\d+$/.test(filialRaw) && filialRaw.length <= 6) ? `Unidade ${filialRaw}` : filialRaw;

    const departamento = String(
      getColumnValue(
        row,
        ['departamento', 'setor', 'area', 'cc', 'centro_custo', 'lotacao', 'depto'],
        ['unidade', 'filial', 'base']
      ) || 'OPERACIONAL - CUIABA'
    ).trim();

    // Demographic data
    const dtNascRaw = getColumnValue(row, ['dt_nascimento', 'dtnascimento', 'data_nascimento', 'datanascimento', 'nascimento', 'data_nasc']);
    const dataNascimento = parseExcelDate(dtNascRaw);
    const idadeRaw = Number(getColumnValue(row, ['idade', 'anos', 'idade_anos']));
    const idade = idadeRaw > 0 ? idadeRaw : (dataNascimento ? new Date().getFullYear() - parseInt(dataNascimento.slice(0, 4), 10) : undefined);

    const naturalidade = String(getColumnValue(row, ['naturalidade', 'cidade_natal', 'origem', 'natural']) || '').trim();
    const estadoCivil = String(getColumnValue(row, ['estado_civil', 'estadocivil', 'civil', 'est_civil']) || '').trim();

    // Documents
    const cpf = String(getColumnValue(row, ['cpf', 'num_cpf', 'numcpf', 'doc_cpf']) || '').trim();
    const rg = String(getColumnValue(row, ['rg', 'num_rg', 'identidade', 'numrg', 'registro_geral'], ['cargo', 'orgao']) || '').trim();
    const orgaoExpeditor = String(getColumnValue(row, ['orgao_expeditor', 'orgaoexpeditor', 'orgao_emissor', 'orgao', 'expeditor', 'emissor_rg']) || '').trim();

    // Dates
    const dtAdmRaw = getColumnValue(row, [
      'dt_admissao',
      'dtadmissao',
      'data_admissao',
      'dataadmissao',
      'admissao',
      'dt_adm',
      'data_adm',
      'dt_inicio',
      'datainicio',
      'inicio',
    ]);
    const dtDemRaw = getColumnValue(row, [
      'dt_desligamento',
      'dtdesligamento',
      'data_desligamento',
      'datadesligamento',
      'desligamento',
      'dt_deslig',
      'demissao',
      'dt_demissao',
      'data_demissao',
      'datademissao',
      'dt_saida',
      'datasaida',
      'rescisao',
      'data_rescisao',
      'saida',
    ]);

    const dataAdmissao = parseExcelDate(dtAdmRaw) || '2024-05-13';
    const dataDemissao = dtDemRaw ? parseExcelDate(dtDemRaw) : undefined;

    // Situacao / Status
    const situacaoRaw = String(getColumnValue(row, ['situacao', 'estado_func', 'situacao_folha', 'status_func']) || '').trim();
    const statusRaw = String(getColumnValue(row, ['status', 'situacao_folha', 'situacao']) || '').toLowerCase();

    const isDesligado =
      situacaoRaw.toLowerCase().includes('deslig') ||
      statusRaw.includes('demit') ||
      statusRaw.includes('deslig') ||
      statusRaw.includes('inativ') ||
      statusRaw.includes('rescis') ||
      !!dataDemissao;

    const status: PessoaRecord['status'] = isDesligado ? 'Desligado' : 'Ativo';
    const situacao = situacaoRaw || (isDesligado ? 'Desligado' : 'Em Atividade');

    // Tenure calculation
    const diffDays = calculateDiffDays(dataAdmissao, dataDemissao);
    const tempoDeCasaDias = diffDays > 0 ? diffDays : 30;
    const tempoDeCasaMeses = Number((tempoDeCasaDias / 30.4).toFixed(1));

    let faixaTempoCasa: PessoaRecord['faixaTempoCasa'] = '> 2 anos';
    if (tempoDeCasaDias <= 90) faixaTempoCasa = '< 90 dias (Precoce)';
    else if (tempoDeCasaDias <= 180) faixaTempoCasa = '90 - 180 dias';
    else if (tempoDeCasaDias <= 365) faixaTempoCasa = '180 dias - 1 ano';
    else if (tempoDeCasaDias <= 730) faixaTempoCasa = '1 - 2 anos';

    // Type of departure
    const tipoRaw = String(
      getColumnValue(row, ['tipo_rescisao', 'tipo_desligamento', 'iniciativa', 'motivo_tipo', 'tipo_de_rescisao', 'forma_desligamento']) || ''
    ).toLowerCase();

    let tipoDesligamento: PessoaRecord['tipoDesligamento'] = undefined;
    if (isDesligado) {
      if (tipoRaw.includes('pedido') || tipoRaw.includes('volunt')) {
        tipoDesligamento = 'Voluntário (Pedido)';
      } else if (tipoRaw.includes('experien') || tempoDeCasaDias <= 90) {
        tipoDesligamento = 'Término de Experiência';
      } else if (tipoRaw.includes('acordo')) {
        tipoDesligamento = 'Acordo Mútuo';
      } else {
        tipoDesligamento = 'Involuntário (Empresa)';
      }
    }

    const motivoSaida = isDesligado
      ? String(getColumnValue(row, ['motivo', 'causa', 'motivo_saida', 'motivo_desligamento', 'causa_rescisao', 'observacao']) || 'Ajuste Operacional / Transição').trim()
      : undefined;

    // Superior Imediato / Gestor
    const gestor = String(
      getColumnValue(row, ['sup_imed', 'supimed', 'superior_imediato', 'supervisor_imediato', 'gestor', 'lider', 'coordenador', 'supervisor', 'responsavel']) ||
      'DIEFFERSON VITORINO DE MACEDO'
    ).trim();

    // Contact & flags
    const celular = String(getColumnValue(row, ['n_celular', 'num_celular', 'celular', 'telefone', 'contato', 'tel_celular', 'fone', 'num_tel']) || '').trim();
    const membroCipa = String(getColumnValue(row, ['membro_cipa', 'cipa', 'cipista']) || 'NÃO').trim().toUpperCase();
    const ancora = String(getColumnValue(row, ['ancora', 'ancora?', 'func_ancora']) || 'NÃO').trim().toUpperCase();

    return {
      id: idFromSheet ? `pes-${idFromSheet.replace(/\./g, '')}` : `pes-${index}-${matricula}`,
      matricula,
      matriculaDolp,
      matriculaContratante,
      empresa,
      nome,
      cargo,
      tipoFuncao,
      filial,
      departamento,
      dataNascimento,
      idade,
      naturalidade,
      estadoCivil,
      cpf,
      rg,
      orgaoExpeditor,
      situacao,
      celular,
      membroCipa,
      ancora,
      dataAdmissao,
      dataDemissao,
      status,
      tempoDeCasaDias,
      tempoDeCasaMeses,
      faixaTempoCasa,
      tipoDesligamento,
      motivoSaida,
      gestor,
    };
  });
}

// 3. Parse Ponto / Absenteísmo Spreadsheet: r09...xls
export function parsePontoSheet(buffer: ArrayBuffer | Uint8Array): PontoRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row, index) => {
    const matricula = String(
      getColumnValue(row, ['matricula', 'chapa', 're', 'id_func', 'cod_pessoa', 'registro', 'matricula_dolp']) ||
      `MT-${10000 + index}`
    ).trim();

    const nome = String(
      getColumnValue(row, ['nome', 'colaborador', 'funcionario', 'pessoa', 'nome_completo'], ['gestor', 'sup']) ||
      `Colaborador ${index + 1}`
    ).trim();

    const cargo = String(
      getColumnValue(row, ['funcao', 'cargo', 'posicao', 'funcao_colaborador'], ['id', 'tipo', 'rg']) ||
      'Operador'
    ).trim();

    const filialRaw = String(
      getColumnValue(
        row,
        ['unidade', 'filial', 'base', 'cidade', 'polo', 'localidade', 'local'],
        ['id', 'cod', 'num', 'cd', 'codigo', 'departamento', 'setor', 'cpf', 'rg', 'matricula']
      ) || 'CUIABÁ - MT'
    ).trim();

    const filial = (/^\d+$/.test(filialRaw) && filialRaw.length <= 6) ? `Unidade ${filialRaw}` : filialRaw;

    const periodo = String(
      getColumnValue(row, ['periodo', 'competencia', 'mes', 'ano_mes', 'mes_ano', 'data_apuracao']) ||
      '2026-07'
    ).trim();

    const faltasInjust = Number(
      getColumnValue(row, ['faltas_injustificadas', 'faltas_injust', 'falta_injust', 'faltas', 'dias_falta', 'qtde_faltas', 'injustificadas'])
    ) || 0;

    const faltasJust = Number(
      getColumnValue(row, ['faltas_justificadas', 'faltas_just', 'falta_just', 'justificadas', 'declaracao', 'abono'])
    ) || 0;

    const atestados = Number(
      getColumnValue(row, ['dias_atestado', 'atestado_dias', 'atestados', 'afastamento', 'dias_afastamento', 'licenca_medica', 'medico'])
    ) || 0;

    const atrasos = Number(
      getColumnValue(row, ['atrasos_minutos', 'atrasos_min', 'atraso_minutos', 'atrasos', 'min_atraso', 'minutos_atraso'])
    ) || 0;

    // total hours absent calculation
    const horasEstimadas = (faltasInjust + atestados) * 8 + Math.round(atrasos / 60);
    const horasFalta = Number(
      getColumnValue(row, ['horas_falta', 'total_horas', 'horas_ausencia', 'total_horas_falta', 'horas_debito'])
    ) || horasEstimadas;

    // Presença percentual (base 22 dias úteis = 176 horas)
    const baseHoras = 176;
    const presenca = Math.max(30, Math.min(100, Number((((baseHoras - Math.min(baseHoras, horasFalta)) / baseHoras) * 100).toFixed(1))));

    return {
      id: `pt-${index}-${matricula}`,
      matricula,
      nome,
      cargo,
      filial,
      periodo,
      faltasInjustificadas: Math.max(0, faltasInjust),
      faltasJustificadas: Math.max(0, faltasJust),
      atestadosDias: Math.max(0, atestados),
      atrasosMinutos: Math.max(0, atrasos),
      horasFaltaTotal: horasFalta,
      percentualPresenca: presenca,
    };
  });
}

// Generate Downloadable XLSX Templates for User Convenience
export function generateSampleExcelWorkbook(type: 'vagas' | 'pessoas' | 'ponto'): void {
  const wb = XLSX.utils.book_new();

  if (type === 'vagas') {
    const data = [
      {
        'Código Vaga': 'VAG-2026-081',
        'Cargo': 'Operador de Empilhadeira',
        'Unidade': 'CUIABÁ - MT',
        'Data Solicitação': '2026-07-02',
        'Data Fechamento': '',
        'Status': 'Aberta',
        'Motivo': 'Substituição',
        'Pessoa Substituída': 'Marcos Vinicius de Souza',
        'SLA Meta Dias': 25,
        'Solicitante': 'Gerson Lima',
        'Recrutador': 'Camila Santos'
      },
      {
        'Código Vaga': 'VAG-2026-088',
        'Cargo': 'Motorista Carreteiro',
        'Unidade': 'VÁRZEA GRANDE - MT',
        'Data Solicitação': '2026-07-05',
        'Data Fechamento': '',
        'Status': 'Aberta',
        'Motivo': 'Substituição',
        'Pessoa Substituída': 'Luciano Ribeiro Mendes',
        'SLA Meta Dias': 30,
        'Solicitante': 'Eduardo Guimarães',
        'Recrutador': 'Lucas Fagundes'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Vagas');
    XLSX.writeFile(wb, 'grid_tb_oper_contratacao_vaga.xlsx');
  } else if (type === 'pessoas') {
    const data = [
      {
        'Matrícula': 'MT-10442',
        'Nome': 'Marcos Vinicius de Souza',
        'Cargo': 'Operador de Empilhadeira',
        'Unidade': 'CUIABÁ - MT',
        'Departamento': 'Logística',
        'Data Admissão': '2026-03-01',
        'Data Demissão': '2026-07-01',
        'Status': 'Desligado',
        'Tipo Desligamento': 'Voluntário (Pedido)',
        'Motivo Saída': 'Proposta concorrente / Escala',
        'Gestor': 'Gerson Lima'
      },
      {
        'Matrícula': 'MT-10512',
        'Nome': 'Ronaldo Peixoto de Abreu',
        'Cargo': 'Operador de Empilhadeira',
        'Unidade': 'CUIABÁ - MT',
        'Departamento': 'Logística',
        'Data Admissão': '2026-04-15',
        'Data Demissão': '2026-07-09',
        'Status': 'Desligado',
        'Tipo Desligamento': 'Involuntário (Empresa)',
        'Motivo Saída': 'Faltas no período de experiência',
        'Gestor': 'Gerson Lima'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pessoas');
    XLSX.writeFile(wb, 'grid_tb_oper_pessoa_relatorio.xlsx');
  } else {
    const data = [
      {
        'Matrícula': 'MT-10442',
        'Nome': 'Marcos Vinicius de Souza',
        'Cargo': 'Operador de Empilhadeira',
        'Unidade': 'CUIABÁ - MT',
        'Competência': '2026-07',
        'Faltas Injustificadas': 7,
        'Faltas Justificadas': 3,
        'Dias Atestado': 6,
        'Atrasos Minutos': 240,
        'Total Horas Falta': 62
      },
      {
        'Matrícula': 'MT-10811',
        'Nome': 'Gabriel Antunes Prado',
        'Cargo': 'Auxiliar de Operações Logísticas',
        'Unidade': 'CUIABÁ - MT',
        'Competência': '2026-07',
        'Faltas Injustificadas': 6,
        'Faltas Justificadas': 1,
        'Dias Atestado': 4,
        'Atrasos Minutos': 150,
        'Total Horas Falta': 52
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Ponto_Faltas');
    XLSX.writeFile(wb, 'relatorio_ponto_faltas_r09.xlsx');
  }
}
