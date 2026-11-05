/* Análise ESE — configuração geral */
var CONFIG = {
  SISTEMA: 'Análise ESE',
  VERSAO: '0.2.0.0',
  DESENVOLVEDOR: 'Vettore Sistemas',
  CHAVE_LOCAL: 'analise-ese-config-v1'
};

/* Sondas pré-cadastradas. pos = distância (cm) a partir da ponta distal. */
var SONDAS = {
  'alacer36': {
    nome: 'Alacer 36 canais (E-sleeve distal 7 cm)',
    canais: (function () {
      var p = [34,33,32,31,30,29,28,27,26,24,22,20,18,16,14,13,12,11,10,9.5,9,8.5,8,7.5,7,6.5,6,5.5,5,4.5,4,3.5,3,2.5,2,0];
      return p.map(function (v, i) { return { nome: 'P' + (i + 1), pos: v }; });
    })(),
    proximal: [0,1,2,3,4,5,6,7,8,9],          // cluster proximal (ESE no exame padrão)
    esleeve: [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34] // faringe + E-sleeve distal (retirada)
  }
};

/* Valores de referência (editáveis em Referências). null = sem referência -> regra não aplicada */
var PRESETS_REF = {
  'solid': {
    nome: 'Solid state — ManoView (Medtronic)',
    fonte: 'Template HROM, BSG (Medtronic ManoView)',
    lvIrpMax: 8, lvIbpMax: null, lvRtMin: null, lvAusenteMax: null, lvBaixoMin: null, lvAltoMax: null,
    repousoMin: 34, repMedMin: null, repMedMax: null, repousoMax: 104, residualMax: 12,
    aberturaMin: 0.48, aberturaMax: 1.02,
    extMin: null, extMax: null, faringeMin: null, faringeMax: null,
    posMin: null, posMax: null, phciMin: null, phciMax: null
  },
  'perfusao': {
    nome: 'Perfusão — Multiplex/Alacer (Silva et al., 2018)',
    fonte: 'Arq Gastroenterol 2018 — p5–p95, 32 voluntários',
    lvIrpMax: 8, lvIbpMax: null, lvRtMin: null, lvAusenteMax: null, lvBaixoMin: null, lvAltoMax: null,
    repousoMin: 16.7, repMedMin: null, repMedMax: null, repousoMax: 184.4, residualMax: 12,
    aberturaMin: null, aberturaMax: null,
    extMin: null, extMax: null, faringeMin: null, faringeMax: null,
    posMin: null, posMax: null, phciMin: null, phciMax: null
  },
  'estudo': {
    nome: 'Estudo ESE (este trabalho) — preencher com a casuística',
    fonte: 'Texto do trabalho: extensão 1,5–3,7 cm; abertura média 0,5 s',
    lvIrpMax: 8, lvIbpMax: null, lvRtMin: null, lvAusenteMax: null, lvBaixoMin: null, lvAltoMax: null,
    repousoMin: 34, repMedMin: null, repMedMax: null, repousoMax: 104, residualMax: 12,
    aberturaMin: null, aberturaMax: null,
    extMin: 1.5, extMax: 3.7, faringeMin: null, faringeMax: null,
    posMin: null, posMax: null, phciMin: null, phciMax: null
  }
};

var CFG_PADRAO = {
  sonda: 'alacer36',
  regiaoModo: 'proximal',       // proximal | esleeve | custom
  regiaoCustom: [],
  contorno: 30,                 // contorno isobárico (mmHg)
  bandaAcima: 2.0,              // cm acima do centro do ESE (acompanha elevação laríngea)
  bandaAbaixo: 0.0,             // cm abaixo do centro
  faringeAltura: 5.0,           // cm de faringe acima da banda do ESE
  farAfast: 0.5,                // cm de afastamento entre a banda do ESE e a zona faríngea
  posAbaixo: 3.0,               // cm de esôfago superior abaixo do centro
  repIni: -3.0, repFim: -0.7,   // janela de repouso (s) relativa ao início da abertura
  farIni: -1.5, farFim: 1.0,    // janela da contração faríngea (s) relativa a início/fim da abertura
  posJanela: 2.5,               // janela pós-deglutição (s) após o fim da abertura
  segHipo: 4, segMeso: 7, segVelo: 10, // cm acima do ápice do ESE: limites dos segmentos faríngeos
  volUmidaPadrao: 5,            // mL atribuídos às deglutições úmidas marcadas no Multiplex
  limiarIntegral: 20,           // mmHg — pressão mínima somada nas integrais contráteis (convenção DCI)
  tolCoord: 0.10,               // s — tolerância da coordenação
  durMin: 0.10,                 // s — duração mínima da abertura
  durMax: 2.0,                  // s — duração máxima de abertura aceita na detecção automática
  limiarRelPct: 50,             // % do repouso, quando o repouso < contorno
  intervaloMin: 2.0,            // s entre deglutições
  intervaloSeq: 5.0,            // s — abaixo disso marca "deglutição sequencial"
  fonteDeg: 'auto',             // auto | marcadores | manual
  selecaoModo: 'auto',          // auto | manual
  nSelecao: 3,
  trechoModo: 'auto',           // auto | manual | tudo
  trechoIni: 0, trechoFim: 0,
  comp: { modo: 'nenhuma', angulo: 90, refPos: null, coef: 0.7356, sinal: -1, zIni: 0, zFim: 5 },
  refPreset: 'estudo',
  refs: null,
  escalaMax: 150, escalaMin: -10
};
