/* Avaliação especializada do ESE: dados clínicos, qualidade técnica, classificação (Consenso de Leuven adaptado),
   correlação clínico-manométrica, laudo estruturado, orientações e pendências para liberação. */
var Avaliacao = (function () {
  var F = Diagnostico.fmt, E = null, H = null;
  var $ = function (s) { return document.querySelector(s); };

  var REFS_BIB = [
    ['Omari TI, Ciucci M, et al. Defining Pharyngeal and Upper Esophageal Sphincter Disorders on High-Resolution Manometry-Impedance: The Leuven Consensus. Neurogastroenterol Motil 2026;38(4):e70042.', 'https://onlinelibrary.wiley.com/doi/10.1111/nmo.70042'],
    ['Omari TI, Ciucci M, Gozdzikowska K, et al. High-Resolution Pharyngeal Manometry and Impedance: Protocols and Metrics — Recommendations of a HRPM International Working Group. Dysphagia 2020;35:281–295.', 'https://researchnow.flinders.edu.au/en/publications/high-resolution-pharyngeal-manometry-and-impedance-protocols-and-/'],
    ['Omari T, Cock C, et al. Using high resolution manometry impedance to diagnose upper esophageal sphincter and pharyngeal motor disorders (509 pacientes × 120 controles; relaxamento anormal > 8 mmHg).', 'https://researchnow.flinders.edu.au/en/publications/using-high-resolution-manometry-impedance-to-diagnose-upper-esoph/'],
    ['Ghosh SK, Pandolfino JE, Zhang Q, Jarosz A, Kahrilas PJ. Deglutitive upper esophageal sphincter relaxation: a study of 75 volunteer subjects using solid-state HRM. Am J Physiol GI 2006;291:G525–G531.', 'https://journals.physiology.org/doi/full/10.1152/ajpgi.00081.2006'],
    ['Silva LC, Herbella FAM, Neves LR, et al. Anatomophysiology of the Pharyngo-Upper Esophageal Area in Light of High-Resolution Manometry. J Gastrointest Surg 2013;17:2033–2038.', 'https://repositorio.unifesp.br/items/6c8926b7-0e89-4417-9422-706bb15aacf0'],
    ['Upper esophageal sphincter resting pressure varies during esophageal manometry. ABCD Arq Bras Cir Dig 2014.', 'http://www.scielo.br/j/abcd/a/rgpQxzPbdVhK5jBmcXgyMtg/?lang=en'],
    ['Silva et al. Normal values of esophageal HRM — 24 canais perfusão (Multiplex/Alacer). Arq Gastroenterol 2018.', 'https://www.scielo.br/j/ag/a/PPbDtGgRhsDySmNkDSHQr5j/?lang=en'],
    ['Burgos-Santamaría D, et al. Normal values for water-perfused esophageal HRM. Rev Esp Enferm Dig 2015;107:354–358.', 'https://doaj.org/article/f83e0df2a9dc47249d52c84f7d06fb07'],
    ['Rosen SP, Jones CA, Hoffman MR, Knigge MA, McCulloch TM. Pressure abnormalities in patients with Zenker\'s diverticulum using pharyngeal HRM. Laryngoscope Investig Otolaryngol 2020;5:708–717.', 'https://onlinelibrary.wiley.com/doi/full/10.1002/lio2.434'],
    ['Cock C, Besanko L, Kritas S, et al. Maximum UES admittance: a non-specific marker of UES dysfunction. Neurogastroenterol Motil 2016;28:225–233.', 'https://core.ac.uk/download/81291691.pdf'],
    ['Jones CA, et al. Normative High-Resolution Pharyngeal Manometry: Impact of Age, Size of System, and Sex. Dysphagia 2024;39:648–665.', 'https://pesquisa.bvsalud.org/opsuruguay/resource/es/mdl-38231239'],
    ['Walters RK, et al. A Systematic Review of Pharyngeal HRM Normative Data. Am J Speech Lang Pathol 2024.', 'https://pubs.asha.org/doi/10.1044/2023_AJSLP-23-00221'],
    ['Norton P, Herbella FAM, Schlottmann F, Patti MG. The upper esophageal sphincter in the high-resolution manometry era. Langenbecks Arch Surg 2021;406:2611–2619.', 'https://link.springer.com/content/pdf/10.1007/s00423-021-02319-1.pdf'],
    ['Belafsky PC, et al. Validity and reliability of the Eating Assessment Tool (EAT-10). Ann Otol Rhinol Laryngol 2008 — ponto de corte ≥ 3.', ''],
    ['Crary MA, Mann GD, Groher ME. Functional Oral Intake Scale (FOIS). Arch Phys Med Rehabil 2005.', '']
  ];

  // EAT-10 — itens em paráfrase (instrumento de autoavaliação; 0 = sem problema … 4 = problema grave)
  var EAT10 = ['Problema de deglutição causou perda de peso', 'Interfere em sair para comer fora', 'Engolir líquidos exige esforço extra',
    'Engolir sólidos exige esforço extra', 'Engolir comprimidos exige esforço extra', 'Engolir é doloroso', 'O prazer de comer é afetado pela deglutição',
    'Sensação de alimento parado na garganta', 'Tosse ao comer', 'Engolir causa estresse'];
  var FOIS = ['1 — Nada por via oral', '2 — Via alternativa com mínimas tentativas orais', '3 — Via alternativa + via oral consistente',
    '4 — Via oral total, consistência única', '5 — Via oral total, várias consistências com preparo especial', '6 — Via oral total sem preparo, com restrições específicas', '7 — Via oral total sem restrições'];
  var SINTOMAS = [['disfOro', 'Disfagia orofaríngea (dificuldade em iniciar a deglutição)'], ['engasgo', 'Engasgos / tosse durante ou após deglutir'], ['regNasal', 'Regurgitação nasal'],
    ['vozMolhada', 'Voz molhada após deglutir'], ['globus', 'Globus (sensação de bolo na garganta)'], ['regAlim', 'Regurgitação de alimento não digerido / halitose'], ['ruidoCerv', 'Ruído cervical (gargarejo) ao deglutir'],
    ['pneumonia', 'Pneumonia de repetição / aspirativa'], ['disfEso', 'Disfagia retroesternal (esofágica)'], ['pirose', 'Pirose / regurgitação ácida'], ['rouquidao', 'Pigarro / rouquidão / tosse crônica']];
  var ALARMES = [['perdaPeso', 'Perda de peso não intencional'], ['odinofagia', 'Odinofagia'], ['sangramento', 'Hematêmese / sangramento'], ['massa', 'Massa ou linfonodo cervical'],
    ['disfoniaTab', 'Disfonia persistente em tabagista/etilista'], ['progressiva', 'Disfagia rapidamente progressiva']];
  var COMORB = [['avc', 'AVC'], ['parkinson', 'Doença de Parkinson'], ['ela', 'ELA / doença do neurônio motor'], ['miastenia', 'Miastenia gravis'], ['miosite', 'Miosite / miopatia (inclui corpúsculos de inclusão, distrofia oculofaríngea)'],
    ['demencia', 'Demência'], ['radio', 'Radioterapia de cabeça e pescoço'], ['cirCerv', 'Cirurgia cervical / de coluna cervical anterior'], ['drge', 'DRGE conhecida'], ['acalasia', 'Acalasia / distúrbio motor esofágico'], ['eoe', 'Esofagite eosinofílica'], ['zenker', 'Divertículo de Zenker conhecido'], ['iot', 'Intubação orotraqueal prolongada / traqueostomia']];
  var TEC_MANUAL = [['adaptacao', 'Adaptação ≥ 5 min após a passagem da sonda'], ['zero', 'Zero/calibração conferidos antes do exame'], ['canais', 'Canais sem amortecimento/obstrução; zero reconferido ao final (deriva)'],
    ['colab', 'Paciente colaborativo, deglutições sob comando'], ['bolusDoc', 'Volume e consistência de cada bolus registrados (IDDSI)'], ['anestesia', 'Anestesia tópica nasal registrada (sim/não)']];

  function novo() {
    return { clin: { idade: '', sexo: '', queixa: '', duracao: '', exames: '', medic: '', sint: {}, alarme: {}, comorb: {}, eat: [null, null, null, null, null, null, null, null, null, null], fois: '' },
      tec: { posicao: '', profNarina: '', dataExame: '', tolerancia: '' }, bolus: {}, medico: { nome: '', crm: '', revisado: false }, texto: null, chave: null };
  }
  function chaveExame() { return 'ese-av:' + (E.ex.arquivo || '') + ':' + (E.ex.paciente || '') + ':' + E.ex.nAmostras; }
  function garantir() {
    if (E.av && E.av.chave === chaveExame()) return E.av;
    var av = novo(); av.chave = chaveExame();
    try { var s = localStorage.getItem(av.chave); if (s) { var o = JSON.parse(s); for (var k in o) av[k] = o[k]; av.chave = chaveExame(); } } catch (e) {}
    E.av = av; return av;
  }
  function salvar() { try { localStorage.setItem(E.av.chave, JSON.stringify(E.av)); } catch (e) {} }

  /* ---------- bolus por deglutição ---------- */
  function bolusDe(m) {
    var b = E.av.bolus[m.chave];
    if (b) return b;
    var fs = E.ex.fs, mk = null;
    E.ex.eventos.forEach(function (e) { if (e.tipo === 'deg' && Math.abs(e.ini - m.abIni) < 3 * fs && (!mk || Math.abs(e.ini - m.abIni) < Math.abs(mk.ini - m.abIni))) mk = e; });
    if (mk && mk.cod === 'DSc') return { vol: 0, cons: 'seca', auto: true, parcial: false };
    if (mk && mk.cod === 'DUm') return { vol: E.cfg.volUmidaPadrao, cons: '0', auto: true, parcial: false };
    return { vol: null, cons: '', auto: true, parcial: false };
  }

  /* ---------- classificação ---------- */
  function semOnda(m) { var h = m.leuven.seg.hipo; return h && h.pico != null && h.pico < 10 && !(m.picoPos >= 2 * m.limiar); }
  // válidas para Leuven: mantém deglutições SEM abertura (falha de relaxamento é achado, não artefato); exclui excluídas, artefatos, sequenciais e relaxamentos sem onda faríngea
  function validas() { return E.lista.filter(function (m) { return !m.excluida && !m.artefato && !m.sequencial && !semOnda(m); }); }
  function bolusLiq(m) { var b = bolusDe(m); return b.cons !== 'seca' && !b.parcial && (b.vol == null || b.vol > 0); }

  function classificar() {
    var refs = E.cfg.refs, R = { ues: {}, far: {}, tonus: {}, coord: {}, notas: [] };
    var v = validas();
    // ---- Disfunção do ESE (Leuven): maioria (2 de 3) das deglutições ≥ 10 mL com ≥ 2 de: IBP alta, IRP alta, MaxAd baixa, RT curto; IBP e/ou IRP obrigatória
    var el = v.filter(function (m) { var b = bolusDe(m); return b.vol != null && b.vol >= 10 && b.cons !== 'seca' && !b.parcial; });
    var crit = [];
    if (refs.lvIrpMax != null) crit.push('IRP'); if (refs.lvIbpMax != null) crit.push('IBP'); if (refs.lvRtMin != null) crit.push('RT');
    R.ues.criteriosDisponiveis = crit;
    el.forEach(function (m) {
      var L = m.leuven, f = { irp: refs.lvIrpMax != null && (m.semAbertura || (L.irp != null && L.irp > refs.lvIrpMax)), ibp: refs.lvIbpMax != null && L.ibp != null && L.ibp > refs.lvIbpMax, rt: refs.lvRtMin != null && (m.semAbertura || (L.rt != null && L.rt < refs.lvRtMin)) };
      f.n = (f.irp ? 1 : 0) + (f.ibp ? 1 : 0) + (f.rt ? 1 : 0); f.atende = f.n >= 2 && (f.irp || f.ibp); m.lvFlags = f;
    });
    var at = el.filter(function (m) { return m.lvFlags.atende; }).length;
    R.ues.n = el.length; R.ues.atende = at;
    R.ues.irpAlta = el.filter(function (m) { return m.lvFlags.irp; }).length;
    var vl = v.filter(bolusLiq); R.ues.nLiq = vl.length;
    R.ues.pressurizacao = vl.filter(function (m) { return m.leuven.pressurizacao; }).length;
    if (!el.length) { R.ues.status = 'inconclusivo'; R.ues.texto = 'Não avaliável pelos critérios de Leuven: não há deglutições de ≥ 10 mL registradas (deglutições secas, de 5 mL e fracionadas não confirmam disfunção do ESE).'; }
    else if (el.length < 3) { R.ues.status = 'inconclusivo'; R.ues.texto = 'Inconclusivo: apenas ' + el.length + ' deglutição(ões) de ≥ 10 mL válida(s); o consenso pede no mínimo 3 por desafio.'; }
    else if (at * 2 > el.length) { R.ues.status = 'confirmada'; R.ues.texto = 'Disfunção do ESE: ' + at + ' de ' + el.length + ' deglutições de ≥ 10 mL preenchem ≥ 2 critérios (com IRP e/ou IBP elevada).'; }
    else if (R.ues.irpAlta * 2 > el.length) {
      R.ues.status = 'irpIsolada';
      R.ues.texto = 'UES IRP acima do limite (' + F(refs.lvIrpMax, 0) + ' mmHg) na maioria das deglutições de ≥ 10 mL (' + R.ues.irpAlta + '/' + el.length + '), sem segundo critério ' + (crit.length < 2 ? 'avaliável (limiares definidos: ' + crit.join(', ') + '; admitância exige impedância)' : 'presente') +
        '. Pelo Consenso de Leuven, disfunção do ESE NÃO confirmada — achado isolado; buscar evidência de suporte (pressurização hipofaríngea, videofluoroscopia com redução da abertura do segmento faringoesofágico).';
    } else { R.ues.status = 'naoConf'; R.ues.texto = 'Disfunção do ESE não confirmada: ' + at + ' de ' + el.length + ' deglutições de ≥ 10 mL preenchem os critérios' + (crit.length < 2 ? ' (limiares definidos apenas para: ' + (crit.join(', ') || 'nenhum') + ')' : '') + '.'; }
    // estímulo-resposta
    var porVol = {};
    v.forEach(function (m) { var b = bolusDe(m); if (b.vol == null || b.cons === 'seca') return; var k = b.vol + ' mL' + (b.cons && b.cons !== '0' ? ' IDDSI ' + b.cons : ''); (porVol[k] = porVol[k] || []).push(m); });
    R.ues.porVolume = Object.keys(porVol).map(function (k) {
      return { k: k, n: porVol[k].length, irp: Analise.estat(porVol[k].map(function (m) { return m.leuven.irp; })).mediana, ibp: Analise.estat(porVol[k].map(function (m) { return m.leuven.ibp; })).mediana, rt: Analise.estat(porVol[k].map(function (m) { return m.leuven.rt; })).mediana };
    });
    if (R.ues.status === 'confirmada' && R.ues.porVolume.length > 1) {
      var pv = R.ues.porVolume.filter(function (p) { return p.irp != null; }).map(function (p) { return { vol: parseFloat(p.k), irp: p.irp }; }).sort(function (a, b) { return a.vol - b.vol; });
      if (pv.length > 1 && !(pv[pv.length - 1].irp > pv[0].irp)) R.ues.texto += ' Atenção: sem acentuação com o aumento de volume (critério de estímulo-resposta não demonstrado).';
    }
    if (R.ues.status !== 'confirmada' && R.ues.pressurizacao * 2 > vl.length && vl.length) R.ues.suporte = 'Pressurização hipofaríngea estimada (> 20 mmHg acima da linha de base) em ' + R.ues.pressurizacao + ' de ' + vl.length + ' deglutições — achado de suporte para obstrução ao fluxo.';

    // ---- Função contrátil faríngea: maioria das deglutições (qualquer volume) com AUSENTE/BAIXA em ≥ 1 segmento → hipocontratilidade; ALTA → hipercontratilidade
    var vb = v.filter(bolusLiq); // deglutições com bolus (Leuven: 'bolus swallows of any volume')
    var segN = { hipo: 'hipofaringe', meso: 'mesofaringe', velo: 'velofaringe' };
    var capt = ['hipo', 'meso', 'velo'].filter(function (s) { return vb.length && vb.filter(function (m) { return m.leuven.seg[s].pico != null; }).length * 2 > vb.length; });
    R.far.captados = capt.map(function (s) { return segN[s]; });
    R.far.naoCaptados = ['hipo', 'meso', 'velo'].filter(function (s) { return capt.indexOf(s) < 0; }).map(function (s) { return segN[s]; });
    var baixo = 0, alto = 0, porSeg = {};
    vb.forEach(function (m) {
      var b = false, a = false;
      capt.forEach(function (s) {
        var p = m.leuven.seg[s].pico; if (p == null) return;
        if (refs.lvAusenteMax == null && refs.lvBaixoMin == null && refs.lvAltoMax == null) return;
        var c = refs.lvAusenteMax != null && p < refs.lvAusenteMax ? 'ausente' : refs.lvBaixoMin != null && p < refs.lvBaixoMin ? 'baixa' : refs.lvAltoMax != null && p > refs.lvAltoMax ? 'alta' : 'normal';
        m.leuven.seg[s].cls = c; (porSeg[s] = porSeg[s] || []).push(c);
        if (c === 'ausente' || c === 'baixa') b = true; if (c === 'alta') a = true;
      });
      m.farBaixa = b; m.farAlta = a; if (b) baixo++; if (a) alto++;
    });
    R.far.picos = capt.map(function (s) { return { seg: segN[s], e: Analise.estat(vb.map(function (m) { return m.leuven.seg[s].pico; })) }; });
    if (!capt.length) { R.far.status = 'naoAval'; R.far.texto = 'Função contrátil faríngea não avaliável: nenhum segmento faríngeo captado acima do ESE.'; }
    else if (baixo * 2 > vb.length) {
      var todos = capt.every(function (s) { return (porSeg[s] || []).filter(function (c) { return c === 'ausente' || c === 'baixa'; }).length * 2 > vb.length; });
      R.far.status = 'hipo'; R.far.global = todos && capt.length === 3;
      R.far.texto = capt.length === 3 ? 'Hipocontratilidade faríngea ' + (R.far.global ? 'global' : 'fragmentada') + ' (' + baixo + ' de ' + vb.length + ' deglutições com contração ausente/baixa).'
        : 'Hipocontração em ' + R.far.captados.join(' e ') + ' (' + baixo + ' de ' + vb.length + ' deglutições); demais segmentos não avaliados — graduação global/fragmentada exige os 3 segmentos.';
    } else if (alto * 2 > vb.length) { R.far.status = 'hiper'; R.far.texto = 'Hipercontratilidade faríngea (' + alto + ' de ' + vb.length + ' deglutições) — frequentemente compensatória a obstrução no ESE.'; }
    else {
      R.far.status = refs.lvBaixoMin == null && refs.lvAltoMax == null && refs.lvAusenteMax == null ? 'semAusencia' : 'normal';
      R.far.texto = R.far.status === 'normal' ? 'Contratilidade faríngea preservada nos segmentos captados (' + R.far.captados.join(', ') + ').' :
        'Pressões faríngeas medidas nos segmentos captados (' + R.far.captados.join(', ') + '), sem classificação: não há limiares AUSENTE/BAIXA/ALTA validados para este sistema (definir em Referências).';
      if (R.far.naoCaptados.length) R.far.texto += ' Não captados: ' + R.far.naoCaptados.join(', ') + '.';
    }
    // combinada
    R.combinada = R.ues.status === 'confirmada' && R.far.status === 'hipo';

    // ---- Tônus basal e coordenação (do estudo)
    var a = E.aval; function it(k) { return a.itens.filter(function (i) { return i.m.k === k; })[0]; }
    R.tonus = it('pRepousoMax'); R.ext = it('ext'); R.abert = it('tAbertura'); R.coord = a.coord;
    var sel = E.lista.filter(function (m) { return m.selecionada; });
    R.coordN = [sel.filter(function (s) { return s.coord; }).length, sel.filter(function (s) { return s.coord != null; }).length];
    return R;
  }

  /* ---------- qualidade técnica ---------- */
  function qualidade(R) {
    var itens = [], av = E.av, v = validas(), fs = E.ex.fs;
    function add(st, txt) { itens.push({ st: st, txt: txt }); }
    // ESE identificado
    var semZona = v.filter(function (m) { return m.flags.some(function (f) { return /borda/.test(f); }); }).length;
    add(v.length ? 'ok' : 'erro', v.length ? 'ESE identificado e deglutições com abertura medida: ' + v.length : 'Nenhuma deglutição válida com abertura identificada');
    if (semZona) add('alerta', 'ESE na borda da região em ' + semZona + ' deglutição(ões) — posicionamento da sonda/região a conferir');
    // resolução
    var zInf = Math.min.apply(null, v.map(function (m) { return m.eseInf; }).concat([E.g.zTop])) - 1;
    var cs = E.g.canais.filter(function (c) { return c.pos >= zInf; }), maxEsp = 0; for (var i = 1; i < cs.length; i++) maxEsp = Math.max(maxEsp, cs[i - 1].pos - cs[i].pos);
    add(maxEsp <= 1.0 + 1e-6 ? 'ok' : 'alerta', 'Espaçamento máximo entre sensores do ESE à faringe: ' + F(maxEsp, 1) + ' cm' + (maxEsp > 1 ? ' (consenso HRPM recomenda 1 cm)' : ''));
    // faringe
    add(R.far.captados.length >= 2 ? 'ok' : R.far.captados.length ? 'alerta' : 'erro', 'Segmentos faríngeos captados: ' + (R.far.captados.join(', ') || 'nenhum') + (R.far.naoCaptados.length ? ' · não captados: ' + R.far.naoCaptados.join(', ') : ''));
    // número de deglutições
    add(v.length >= 3 ? 'ok' : 'erro', 'Deglutições válidas (sem artefato/exclusão): ' + v.length + ' (mínimo 3)');
    if (E.cfg.fonteDeg === 'auto') add('erro', 'Deglutições encontradas pela detecção automática, que depende do próprio relaxamento do ESE — para classificar, use “Marcadores do arquivo” ou “Manual” em Análise (evita perder deglutições sem relaxamento)');
    var rel = v.filter(function (m) { return m.limiarRelativo; }).length;
    if (rel) add('alerta', rel + ' deglutição(ões) com repouso abaixo do contorno de ' + E.cfg.contorno + ' mmHg — extensão e tempo de abertura pelo contorno não interpretáveis nelas');
    var sOnda = E.lista.filter(function (m) { return !m.excluida && semOnda(m); }).length;
    if (sOnda) add('info', sOnda + ' relaxamento(s) sem onda faríngea (possível eructação/deglutição incompleta) fora da classificação');
    var seq = E.lista.filter(function (m) { return !m.excluida && m.sequencial; }).length;
    if (seq) add('info', seq + ' deglutição(ões) sequencial(is) fora da classificação');
    var b10 = v.filter(function (m) { var b = bolusDe(m); return b.vol >= 10 && b.cons !== 'seca' && !b.parcial; }).length;
    add(b10 >= 3 ? 'ok' : 'alerta', 'Deglutições de ≥ 10 mL: ' + b10 + (b10 < 3 ? ' — o Consenso de Leuven exige ≥ 10 mL (≥ 3 repetições) para confirmar disfunção do ESE' : ''));
    var semVol = v.filter(function (m) { return bolusDe(m).vol == null; }).length;
    if (semVol) add('alerta', semVol + ' deglutição(ões) sem volume/consistência informados');
    // intervalo
    var curtos = 0; for (var k = 1; k < E.lista.length; k++) if ((E.lista[k].abIni - E.lista[k - 1].abIni) / fs < 10) curtos++;
    add(curtos ? 'alerta' : 'ok', curtos ? curtos + ' intervalo(s) < 10 s entre deglutições (protocolo pede ≥ 10 s)' : 'Intervalos entre deglutições ≥ 10 s');
    // sistema
    {
      if (E.ex.origem === 'mpx') add('alerta', 'Sistema de perfusão: o consenso HRPM recomenda sensores solid-state; contrações faríngeas rápidas tendem a ser subestimadas e os limiares publicados não são diretamente transponíveis');
      if (E.ex.fs < 50) add('alerta', 'Amostragem de ' + F(E.ex.fs, 0) + ' Hz (< 50 Hz): eventos faríngeos (≈ 0,3 s) e o IRP de 0,25 s têm resolução temporal limitada');
    }
    // posição
    var c = E.cfg.comp;
    add(c.modo === 'nenhuma' ? 'info' : 'ok', 'Posição/compensação: ' + ({ nenhuma: 'paciente deitado, sem compensação', arquivo: 'compensação aplicada no Multiplex', hidrostatica: 'compensação hidrostática a ' + c.angulo + '°', janela: 'zero por janela atmosférica' })[c.modo]);
    // variabilidade
    var cv = R.tonus.e.media ? R.tonus.e.dp / R.tonus.e.media : 0;
    add(cv > 0.4 ? 'alerta' : 'ok', 'Variabilidade da pressão basal entre as deglutições selecionadas: CV ' + F(cv * 100, 0) + '%');
    var art = E.lista.filter(function (m) { return m.artefato && !m.excluida; }).length;
    if (art) add('alerta', art + ' deglutição(ões) com possível artefato não excluída(s)');
    var aj = E.lista.filter(function (m) { return m.ajustada; }).length;
    if (aj) add('info', aj + ' deglutição(ões) com marcação ajustada manualmente');
    add(av.tec.posicao ? 'ok' : 'pend', 'Posição do paciente: ' + (av.tec.posicao || 'não informada'));
    TEC_MANUAL.forEach(function (t) { add(av.tec[t[0]] ? 'ok' : 'pend', t[1]); });
    var nErro = itens.filter(function (i) { return i.st === 'erro' && !/detecção automática/.test(i.txt); }).length, nAl = itens.filter(function (i) { return i.st === 'alerta'; }).length;
    return { itens: itens, grau: nErro ? 'inadequada' : nAl ? 'limitada' : 'adequada' };
  }

  /* ---------- correlação e orientações ---------- */
  function orientacoes(R) {
    var cl = E.av.clin, o = [], dd = [];
    var alarme = ALARMES.filter(function (a) { return cl.alarme[a[0]]; }).map(function (a) { return a[1].toLowerCase(); });
    var eat = eatTotal();
    if (alarme.length) o.push('Sinais de alarme (' + alarme.join(', ') + '): prioridade para endoscopia digestiva alta e avaliação otorrinolaringológica com nasofibrolaringoscopia, para excluir lesão estrutural/neoplásica, independentemente do resultado manométrico.');
    if (R.ues.status === 'irpIsolada') o.push('UES IRP elevada isolada (critério insuficiente pelo Consenso de Leuven): se houver disfagia cervical, regurgitação ou suspeita de Zenker, complementar com esofagograma com incidências laterais e/ou videofluoroscopia; repetir com bolus de 10–20 mL e espessados para testar resposta volume-dependente.');
    if (R.ues.status === 'confirmada') {
      dd.push('Disfunção do cricofaríngeo (barra do cricofaríngeo)', 'Divertículo de Zenker' + (cl.sint.regAlim || cl.comorb.zenker ? ' — favorecido pela regurgitação/halitose ou diagnóstico prévio' : ''), 'Estenose/fibrose pós-radioterapia ou pós-cirúrgica' + (cl.comorb.radio || cl.comorb.cirCerv ? ' — favorecida pelo antecedente' : ''), 'Membrana (web) cervical', 'Compressão extrínseca (osteófito cervical, tireoide)');
      o.push('Esofagograma baritado com incidências laterais e/ou videofluoroscopia da deglutição para caracterizar barra do cricofaríngeo, divertículo de Zenker, membrana ou estenose.');
      o.push('Endoscopia digestiva alta cuidadosa na transição faringoesofágica.');
      o.push('Após confirmação por videofluoroscopia/esofagograma da redução da abertura do segmento faringoesofágico, e com contração faríngea preservada, discutir em equipe (gastroenterologia, cirurgia/ORL, fonoaudiologia) opções como dilatação, toxina botulínica ou miotomia do cricofaríngeo' + (R.far.status === 'hipo' ? '; com hipocontratilidade faríngea associada, a miotomia tem benefício incerto e o risco de aspiração deve ser avaliado antes' : '') + '.');
    }
    if (R.far.status === 'hipo') {
      dd.push('Doença neurológica (AVC, Parkinson, ELA, miastenia)' + (cl.comorb.avc || cl.comorb.parkinson || cl.comorb.ela || cl.comorb.miastenia ? ' — compatível com o antecedente informado' : ''), 'Miopatia (miosite por corpúsculos de inclusão, distrofia oculofaríngea, polimiosite)', 'Sequela de radioterapia de cabeça e pescoço', 'Presbifagia/sarcopenia');
      o.push('Videofluoroscopia e/ou FEES para quantificar penetração/aspiração e resíduos faríngeos (hipocontratilidade aumenta o risco de aspiração).');
      o.push('Fonoaudiologia: terapia de deglutição, manobras compensatórias e adequação de consistências (IDDSI) guiadas pelo exame instrumental.');
      if (!(cl.comorb.avc || cl.comorb.parkinson || cl.comorb.ela || cl.comorb.miastenia || cl.comorb.miosite)) o.push('Sem doença neuromuscular conhecida: considerar avaliação neurológica (incluindo investigação de miastenia e miopatias conforme a clínica).');
    }
    if ((R.far.status === 'semAusencia' || R.far.status === 'naoAval') && (cl.sint.disfOro || cl.sint.engasgo || cl.sint.regNasal || cl.sint.vozMolhada || cl.sint.pneumonia || cl.comorb.avc || cl.comorb.parkinson || cl.comorb.ela || cl.comorb.miastenia || cl.comorb.miosite))
      o.push('Contratilidade faríngea não graduável neste exame; com sintomas orofaríngeos e/ou doença neurológica/neuromuscular, a avaliação instrumental (videofluoroscopia ou FEES) é necessária para estimar risco de aspiração.');
    if (R.combinada) o.push('Disfunção combinada (obstrução no ESE + hipocontratilidade faríngea): o Consenso de Leuven recomenda videofluoroscopia para definir o componente predominante.');
    if (R.tonus.cls === 'baixo' || R.tonus.cls === 'alto') o.push('Pressão basal do ESE fora da faixa de referência: o Consenso de Leuven não utiliza a pressão basal para diagnóstico; o valor varia com a orientação do sensor (perfusão unidirecional), ansiedade e tempo de sonda (cai ao longo do exame). Interpretar apenas como dado descritivo.');
    var normal = R.ues.status !== 'confirmada' && R.ues.status !== 'irpIsolada' && R.far.status !== 'hipo';
    if (normal && (eat >= 3 || cl.sint.disfOro || cl.sint.engasgo)) o.push('Manometria do ESE sem alterações não exclui disfagia (Leuven): sintomas presentes justificam videofluoroscopia/FEES e avaliação da fase esofágica (manometria esofágica completa).');
    if (cl.sint.disfEso) o.push('Disfagia retroesternal: interpretar em conjunto com a manometria esofágica completa (Chicago 4.0); sintomas cervicais podem ser referidos de doença esofágica distal.');
    if (eat >= 3) o.push('EAT-10 = ' + eat + ' (≥ 3): risco de disfagia autorreferido — acompanhamento fonoaudiológico recomendado.');
    if (cl.fois && +cl.fois <= 5) o.push('FOIS ' + cl.fois + ': ingestão oral restrita — avaliar estado nutricional e necessidade de via alternativa/dieta modificada.');
    if (cl.sint.pneumonia) o.push('Pneumonia de repetição: avaliação instrumental de aspiração é recomendada antes de liberar dieta.');
    return { orient: o, dd: dd, alarme: alarme };
  }
  function eatTotal() { var t = E.av.clin.eatTotal; return t === '' || t == null || !isFinite(+t) ? null : +t; }

  /* ---------- pendências para liberar o laudo ---------- */
  function pendencias(Q, R) {
    var p = [], av = E.av, refs = E.cfg.refs;
    if (!av.medico.nome || !av.medico.crm) p.push('Médico responsável e CRM não preenchidos');
    if (!av.clin.queixa && !E.ex.indicacao) p.push('Indicação/queixa clínica não preenchida');
    if (Q.grau === 'inadequada') p.push('Qualidade técnica inadequada — corrigir antes de laudar');
    if (TEC_MANUAL.some(function (t) { return !av.tec[t[0]]; })) p.push('Checklist técnico manual incompleto');
    if (E.cfg.fonteDeg === 'auto') p.push('Classificação baseada em detecção automática — trocar para “Marcadores do arquivo” ou “Manual” em Análise');
    if (!av.tec.posicao) p.push('Posição do paciente não informada');
    if (!av.tec.dataExame) p.push('Data do exame não informada');
    if (E.lista.filter(function (m) { return m.selecionada; }).length < 3) p.push('Menos de 3 deglutições selecionadas para as médias');
    if (!av.medico.revisado) p.push('Confirmação de revisão visual de todas as deglutições e marcações');
    return p;
  }

  /* ---------- laudo estruturado ---------- */
  function laudoTexto(R, Q, O) {
    var ex = E.ex, av = E.av, cl = av.clin, cfg = E.cfg, v = validas(), sel = E.lista.filter(function (m) { return m.selecionada; });
    var L = [];
    L.push('LAUDO — MANOMETRIA DE ALTA RESOLUÇÃO: FARINGE E ESFÍNCTER SUPERIOR DO ESÔFAGO');
    L.push('');
    L.push('Paciente: ' + (ex.paciente || '—') + (cl.idade ? ' · ' + cl.idade + ' anos' : '') + (cl.sexo ? ' · ' + cl.sexo : ''));
    L.push('Médico solicitante: ' + (ex.medico || '—'));
    L.push('Indicação: ' + (cl.queixa || ex.indicacao || '—') + (cl.duracao ? ' (há ' + cl.duracao + ')' : ''));
    var s = SINTOMAS.filter(function (x) { return cl.sint[x[0]]; }).map(function (x) { return x[1].toLowerCase(); });
    if (s.length) L.push('Sintomas: ' + s.join('; ') + '.');
    var cm = COMORB.filter(function (x) { return cl.comorb[x[0]]; }).map(function (x) { return x[1]; });
    if (cm.length) L.push('Antecedentes: ' + cm.join('; ') + '.');
    var eat = eatTotal(); if (eat != null) L.push('EAT-10: ' + eat + (eat >= 3 ? ' (alterado, ≥ 3)' : ' (< 3)') + '.' + (cl.fois ? ' FOIS: ' + cl.fois + '.' : ''));
    L.push('');
    L.push('TÉCNICA');
    L.push('Sistema de perfusão com ' + ex.canais.length + ' canais (' + (SONDAS[cfg.sonda] ? SONDAS[cfg.sonda].nome : 'sonda configurada') + '), amostragem ' + F(ex.fs, 0) + ' Hz. Região analisada: ' + E.descRegiao + '.');
    L.push('Data do exame: ' + (av.tec.dataExame || 'não informada') + '. ESE a ' + (av.tec.profNarina ? av.tec.profNarina + ' cm da narina' : '— cm da narina (não informado)') + '. Tolerância: ' + (av.tec.tolerancia || 'não informada') + '.');
    L.push('Posição: ' + (av.tec.posicao || 'não informada') + '. Tratamento postural: ' + ({ nenhuma: 'sem compensação', arquivo: 'compensação postural aplicada no software do equipamento', hidrostatica: 'paciente a ' + cfg.comp.angulo + '°, com compensação hidrostática', janela: 'zero por janela atmosférica' })[cfg.comp.modo] + '. Contorno isobárico de referência: ' + cfg.contorno + ' mmHg.');
    var vols = {}; v.forEach(function (m) { var b = bolusDe(m); var k = b.vol == null ? 'volume não informado' : b.cons === 'seca' ? 'seca' : b.vol + ' mL' + (b.cons && b.cons !== '0' ? ' IDDSI ' + b.cons : ' líquido fino'); vols[k] = (vols[k] || 0) + 1; });
    L.push('Deglutições: ' + E.lista.length + ' registradas, ' + v.length + ' válidas (' + Object.keys(vols).map(function (k) { return vols[k] + ' × ' + k; }).join(', ') + '); ' + sel.length + ' selecionadas para os parâmetros médios.');
    L.push('Qualidade técnica: ' + Q.grau.toUpperCase() + '.');
    L.push('');
    L.push('RESULTADOS');
    function lin(nome, it, un, d) { if (!it || !it.e.n) return; L.push('• ' + nome + ': ' + F(it.e.media, d) + ' ' + un + ' (mediana ' + F(it.e.mediana, d) + '; DP ' + F(it.e.dp, d) + ')' + (it.refTxt && it.refTxt !== '—' ? ' — ref. ' + it.refTxt : '') + (it.cls === 'baixo' ? ' — ABAIXO' : it.cls === 'alto' ? ' — ACIMA' : '')); }
    var a = E.aval; function it(k) { return a.itens.filter(function (i) { return i.m.k === k; })[0]; }
    L.push('Métricas do estudo (contorno isobárico) — média das ' + sel.length + ' deglutições selecionadas:');
    lin('Extensão manométrica do ESE', it('ext'), 'cm', 1);
    lin('Pressão basal do ESE (máxima em repouso)', it('pRepousoMax'), 'mmHg', 1);
    lin('Pressão média de repouso (área ≥ contorno)', it('pRepouso'), 'mmHg', 1);
    lin('Tempo de abertura do ESE (contorno ' + cfg.contorno + ' mmHg)', it('tAbertura'), 's', 2);
    var eI = { n: 0 }, eR = { n: 0 }, eB = { n: 0 };
    if (R.ues.porVolume.length) {
      L.push('• Métricas de Leuven — medianas por desafio (todas as deglutições válidas, não fracionadas):');
      R.ues.porVolume.forEach(function (pv) { L.push('   ' + pv.k + ' (n=' + pv.n + '): UES IRP ' + F(pv.irp, 1) + ' mmHg · UES RT ' + F(pv.rt, 2) + ' s · IBP estimada ' + F(pv.ibp, 1) + ' mmHg'); });
      L.push('   (IRP = mediana das menores amostras em 0,25 s; RT = e-sleeve < 50% da basal ou 35 mmHg; IBP estimada por pressão a 1 cm acima do ápice geométrico do ESE, sem impedância)');
    }
    if (eI.n) L.push('• UES IRP (mediana das menores amostras em 0,25 s, padrão Leuven): ' + F(eI.media, 1) + ' mmHg' + (E.cfg.refs.lvIrpMax != null ? ' — limite ' + F(E.cfg.refs.lvIrpMax, 0) + ' mmHg' : ''));
    if (eR.n) L.push('• UES RT (e-sleeve < 50% da basal ou 35 mmHg): ' + F(eR.media, 2) + ' s');
    if (eB.n) L.push('• Pressão hipofaríngea durante o fluxo (IBP estimada 1 cm acima do ápice do ESE, sem impedância): ' + F(eB.media, 1) + ' mmHg');
    lin('Pressão máxima de contração faríngea (acima do ESE)', it('picoFar'), 'mmHg', 1);
    lin('Pressão máxima pós-deglutição do esôfago superior', it('picoPos'), 'mmHg', 1);
    lin('Integral contrátil faríngea', it('phci'), 'mmHg·cm·s', 0);
    lin('Integral contrátil pós-deglutição', it('uesci'), 'mmHg·cm·s', 0);
    if (R.coordN[1]) L.push('• Pico faríngeo durante o relaxamento do ESE (métrica descritiva do estudo, deglutições selecionadas): ' + R.coordN[0] + ' de ' + R.coordN[1] + '.');
    L.push('');
    L.push('CLASSIFICAÇÃO (Consenso de Leuven, adaptado a manometria sem impedância)');
    L.push('• Limiar de UES IRP: ' + (E.cfg.refs.lvIrpMax != null ? F(E.cfg.refs.lvIrpMax, 0) + ' mmHg (derivado de sistema solid-state com impedância, 10 mL; não validado para perfusão)' : 'não definido') + '. IBP e UES RT: ' + (E.cfg.refs.lvIbpMax == null && E.cfg.refs.lvRtMin == null ? 'sem limiar validado para perfusão — critérios não aplicados.' : 'limiares definidos pelo serviço.'));
    L.push('• Esfíncter superior do esôfago: ' + R.ues.texto + (R.ues.suporte ? ' ' + R.ues.suporte : ''));
    L.push('• Função contrátil faríngea: ' + R.far.texto);
    if (R.combinada) L.push('• Disfunção combinada (ESE + hipocontratilidade faríngea).');
    L.push('');
    L.push('CONCLUSÃO');
    L.push(conclusao(R));
    if (O.dd.length) { L.push(''); L.push('DIAGNÓSTICOS DIFERENCIAIS A CONSIDERAR'); O.dd.forEach(function (d) { L.push('• ' + d); }); }
    if (O.orient.length) { L.push(''); L.push('RECOMENDAÇÕES'); O.orient.forEach(function (d) { L.push('• ' + d); }); }
    L.push('');
    L.push('LIMITAÇÕES');
    if (E.ex.origem === 'mpx') L.push('• Sistema de perfusão' + (E.ex.fs < 50 ? ' com amostragem de ' + F(E.ex.fs, 0) + ' Hz' : '') + ': pressões faríngeas podem ser subestimadas; o consenso HRPM recomenda solid-state.');
    L.push('• Sensores de perfusão unidirecionais: a pressão do ESE (radialmente assimétrica) depende da orientação da sonda.');
    L.push('• Ápice do ESE e segmentos faríngeos definidos por aproximação geométrica (banda fixa acima do centro do ESE em repouso).');
    L.push('• Sistema sem impedância: admitância máxima do ESE e pressão no nadir de impedância não disponíveis; a IBP é estimada por pressão.');
    L.push('• Valores de referência publicados derivam majoritariamente de sistemas solid state e de protocolos distintos; aplicar a perfusão com cautela até haver normatização própria.');
    if (R.far.naoCaptados.length) L.push('• Segmentos faríngeos não captados: ' + R.far.naoCaptados.join(', ') + '.');
    L.push('• Manometria normal da faringe/ESE não exclui disfagia; correlacionar com videofluoroscopia/FEES.');
    L.push('');
    L.push((av.medico.nome || '________________________') + ' — CRM ' + (av.medico.crm || '________'));
    L.push('Laudo emitido em ' + new Date().toLocaleDateString('pt-BR'));
    return L.join('\n');
  }
  function conclusao(R) {
    var p = [];
    if (R.ues.status === 'confirmada') p.push('disfunção do esfíncter superior do esôfago (falha de relaxamento/abertura)');
    else if (R.ues.status === 'irpIsolada') p.push('pressão de relaxamento do ESE (UES IRP) elevada isolada, insuficiente para o diagnóstico de disfunção do ESE');
    if (R.far.status === 'hipo') p.push(R.far.texto.split(' (')[0].toLowerCase());
    if (R.far.status === 'hiper') p.push('hipercontratilidade faríngea');
    var far = R.far.status === 'naoAval' ? 'Contratilidade faríngea não avaliável (faringe não captada).' : R.far.status === 'semAusencia' ? 'Pressões faríngeas registradas apenas em ' + R.far.captados.join(', ') + ', sem graduação validada para este sistema.' : R.far.status === 'normal' ? 'Contratilidade faríngea preservada em ' + R.far.captados.join(', ') + '.' : '';
    var basal = 'Pressão basal do ESE de ' + F(R.tonus.e.media, 1) + ' mmHg (dado descritivo).';
    if (!p.length) {
      if (R.ues.status === 'inconclusivo') return 'Avaliação do ESE inconclusiva: ' + R.ues.texto.replace(/^[^:]+:\s*/, '') + ' ' + far + ' ' + basal;
      return 'Relaxamento manométrico do ESE sem critérios de disfunção pelos parâmetros disponíveis (abertura não avaliável sem impedância/videofluoroscopia). ' + far + ' ' + basal;
    }
    return 'Estudo compatível com ' + (p.length > 1 ? p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1] : p[0]) + '. ' + (far && R.far.status !== 'hipo' && R.far.status !== 'hiper' ? far + ' ' : '') + basal;
  }

  /* ---------- render ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chk(grupo, k, rot, val) { return '<label class="chk"><input type="checkbox" data-g="' + grupo + '" data-k="' + k + '"' + (val ? ' checked' : '') + '> ' + rot + '</label>'; }
  function tagSt(st) { return { ok: '<span class="tag ok">ok</span>', alerta: '<span class="tag al">atenção</span>', erro: '<span class="tag err">falha</span>', info: '<span class="tag">info</span>', pend: '<span class="tag al">confirmar</span>' }[st]; }

  function render(e) {
    E = e; var el = $('#avArea');
    if (!E.ex) { el.innerHTML = '<div class="card suave">Abra um exame.</div>'; return; }
    var av = garantir(), cl = av.clin;
    var R = classificar(), Q = qualidade(R), O = orientacoes(R), P = pendencias(Q, R);
    var h = '';
    // resumo
    var stU = { confirmada: ['Disfunção confirmada', 'err'], irpIsolada: ['Não confirmada (IRP isolada)', 'al'], naoConf: ['Não confirmada', 'ok'], inconclusivo: ['Inconclusivo', 'al'] }[R.ues.status];
    var stF = { hipo: ['Hipocontratilidade', 'err'], hiper: ['Hipercontratilidade', 'al'], normal: ['Preservada', 'ok'], semAusencia: ['Presente (não graduada)', ''], naoAval: ['Não avaliável', 'al'] }[R.far.status];
    h += '<div class="cards">' +
      kpi('Disfunção do ESE (Leuven)', '<span class="tag ' + stU[1] + '">' + stU[0] + '</span>') +
      kpi('Contratilidade faríngea', '<span class="tag ' + stF[1] + '">' + stF[0] + '</span>') +
      kpi('Pressão basal', F(R.tonus.e.media, 1) + ' mmHg <span class="tag ' + (R.tonus.cls === 'normal' ? 'ok' : R.tonus.cls === 'sem ref' ? '' : 'err') + '">' + ({ normal: 'normal', baixo: 'hipotônico', alto: 'hipertônico' }[R.tonus.cls] || '—') + '</span>') +
      kpi('Pico faríngeo no relaxamento', R.coordN[1] ? R.coordN[0] + '/' + R.coordN[1] : '—') +
      kpi('Qualidade técnica', '<span class="tag ' + (Q.grau === 'adequada' ? 'ok' : Q.grau === 'limitada' ? 'al' : 'err') + '">' + Q.grau + '</span>') +
      kpi('Liberação do laudo', P.length ? '<span class="tag al">' + P.length + ' pendência(s)</span>' : '<span class="tag ok">pronto para assinatura</span>') + '</div>';

    // 1 dados clínicos
    h += '<div class="card"><div class="card-tit">1. Dados clínicos e triagem <span class="dica">A interpretação manométrica depende do contexto clínico.</span></div>';
    h += '<div class="form-grid">' + campoTxt('clin', 'queixa', 'Indicação / queixa principal', cl.queixa, 'ex.: disfagia orofaríngea para sólidos') +
      campoTxt('clin', 'duracao', 'Duração dos sintomas', cl.duracao, 'ex.: 6 meses') + campoTxt('clin', 'idade', 'Idade (anos)', cl.idade, '') +
      '<label class="campo">Sexo<span class="ent"><select data-g="clin" data-k="sexo"><option value=""></option><option' + (cl.sexo === 'feminino' ? ' selected' : '') + '>feminino</option><option' + (cl.sexo === 'masculino' ? ' selected' : '') + '>masculino</option></select></span></label>' +
      campoTxt('clin', 'exames', 'Exames prévios (EDA, VFSS, FEES, esofagograma)', cl.exames, '') + campoTxt('clin', 'medic', 'Medicações relevantes', cl.medic, 'ex.: opioides, anticolinérgicos, neurolépticos') + '</div>';
    h += '<div class="grid3"><div><b class="sub-t">Sintomas</b>' + SINTOMAS.map(function (s) { return chk('sint', s[0], s[1], cl.sint[s[0]]); }).join('') + '</div>' +
      '<div><b class="sub-t">Sinais de alarme</b>' + ALARMES.map(function (s) { return chk('alarme', s[0], s[1], cl.alarme[s[0]]); }).join('') + '</div>' +
      '<div><b class="sub-t">Antecedentes</b>' + COMORB.map(function (s) { return chk('comorb', s[0], s[1], cl.comorb[s[0]]); }).join('') + '</div></div>';
    var eat = eatTotal();
    h += '<div class="grid2" style="margin-top:12px"><div><b class="sub-t">EAT-10 — escore total (0–40) ' + (eat == null ? '' : eat >= 3 ? '<span class="tag err">≥ 3 alterado</span>' : '<span class="tag ok">&lt; 3</span>') + '</b>' +
      '<label class="campo"><span class="ent"><input type="number" min="0" max="40" step="1" data-g="clin" data-k="eatTotal" value="' + esc(cl.eatTotal == null ? '' : cl.eatTotal) + '"></span></label>' +
      '<p class="suave">Aplicar a versão brasileira validada (Gonçalves et al., CoDAS 2013), com os 10 itens respondidos pelo paciente; ponto de corte ≥ 3 (Belafsky et al., 2008).</p></div>' +
      '<div><b class="sub-t">FOIS — nível de ingestão oral</b><select data-g="clin" data-k="fois" style="width:100%"><option value=""></option>' + FOIS.map(function (t, i) { return '<option value="' + (i + 1) + '"' + (+cl.fois === i + 1 ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      (O.alarme.length ? '<div class="aviso" style="margin-top:12px"><b>Sinal de alarme:</b> ' + esc(O.alarme.join(', ')) + '. Endoscopia e avaliação ORL têm prioridade.</div>' : '') + '</div></div></div>';

    // 2 protocolo / qualidade
    h += '<div class="card"><div class="card-tit">2. Protocolo e qualidade técnica <span class="dica">Itens automáticos + checklist do executante.</span></div><div class="grid2"><div><table class="tab"><tbody>' +
      Q.itens.map(function (i) { return '<tr><td style="width:84px">' + tagSt(i.st) + '</td><td>' + esc(i.txt) + '</td></tr>'; }).join('') + '</tbody></table></div><div><b class="sub-t">Dados do procedimento</b><div class="form-grid">' +
      '<label class="campo">Posição do paciente<span class="ent"><select data-g="tecv" data-k="posicao"><option value=""></option>' + ['sentado (90°)', 'semissentado (45°)', 'decúbito dorsal (0°)'].map(function (o) { return '<option' + (av.tec.posicao === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></span></label>' +
      campoTxt('tecv', 'profNarina', 'ESE a (cm da narina)', av.tec.profNarina, 'ex.: 18') + campoTxt('tecv', 'dataExame', 'Data do exame', av.tec.dataExame, 'dd/mm/aaaa') + campoTxt('tecv', 'tolerancia', 'Tolerância / intercorrências', av.tec.tolerancia, 'ex.: boa; tosse em 1 deglutição') +
      '</div><b class="sub-t">Checklist do executante</b>' +
      TEC_MANUAL.map(function (t) { return chk('tec', t[0], t[1], av.tec[t[0]]); }).join('') +
      '<p class="suave">Protocolo de referência (Leuven): iniciar com 5 mL de líquido fino (IDDSI 0); obrigatoriamente 10 mL de líquido fino e 5 e/ou 10 mL espessado (IDDSI 2–4); 20 mL fino se tolerado; ≥ 3 repetições por desafio, em deglutição única sob comando; repetir deglutições fracionadas. Protocolo do estudo: paciente sentado, E-sleeve no cricofaríngeo na retirada, ≥ 5 deglutições com intervalo ≥ 10 s.</p></div></div></div>';

    // 3 bolus por deglutição
    h += '<div class="card"><div class="card-tit">3. Bolus e métricas por deglutição <span class="dica">Informe volume e consistência — os critérios de Leuven só confirmam disfunção do ESE em bolus de ≥ 10 mL.</span></div><div class="tabela-rol alta"><table class="tab" id="tabBolus"><thead><tr><th>#</th><th>Tempo</th><th>Volume (mL)</th><th>Consistência</th><th>Fracionada</th><th>UES IRP</th><th>UES RT (s)</th><th>IBP est.</th><th>Pressuriz.</th><th>Hipofaringe pico</th><th>Critérios ESE</th></tr></thead><tbody>' +
      E.lista.map(function (m) {
        var b = bolusDe(m), L = m.leuven, f = m.lvFlags, fs = E.ex.fs, excl = m.excluida || m.artefato || m.semAbertura;
        var cons = ['', 'seca', '0', '1', '2', '3', '4'].map(function (c) { return '<option value="' + c + '"' + (b.cons === c ? ' selected' : '') + '>' + (c === '' ? '—' : c === 'seca' ? 'seca (saliva)' : 'IDDSI ' + c) + '</option>'; }).join('');
        var hp = L.seg.hipo; var cls = hp.cls === 'ausente' ? 'err' : hp.cls === 'baixa' ? 'al' : hp.cls === 'alta' ? 'al' : '';
        return '<tr' + (excl ? ' class="excl"' : '') + '><td>' + m.num + '</td><td>' + Graficos.rotTempo(m.abIni / fs) + '</td><td><input type="number" min="0" step="1" data-b="vol" data-c="' + m.chave + '" value="' + (b.vol == null ? '' : b.vol) + '"></td><td><select data-b="cons" data-c="' + m.chave + '">' + cons + '</select></td><td><input type="checkbox" data-b="parcial" data-c="' + m.chave + '"' + (b.parcial ? ' checked' : '') + '></td>' +
          '<td' + (f && f.irp ? ' class="st-alto"' : '') + '>' + F(L.irp, 1) + '</td><td' + (f && f.rt ? ' class="st-alto"' : '') + '>' + F(L.rt, 2) + '</td><td' + (f && f.ibp ? ' class="st-alto"' : '') + '>' + F(L.ibp, 1) + '</td><td>' + (L.pressurizacao ? '<span class="tag al">sim</span>' : L.pressurizacao === false ? 'não' : '—') + '</td>' +
          '<td>' + (hp.pico == null ? '—' : F(hp.pico, 0) + (hp.cls && hp.cls !== 'normal' ? ' <span class="tag ' + cls + '">' + hp.cls + '</span>' : '')) + '</td><td>' + (f ? (f.atende ? '<span class="tag err">' + f.n + ' — atende</span>' : f.n) : '<span class="suave">n/a (&lt; 10 mL)</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (R.ues.porVolume.length ? '<div class="linha-form suave">Estímulo-resposta (medianas): ' + R.ues.porVolume.map(function (p) { return '<span class="tag">' + esc(p.k) + ' · n=' + p.n + ' · IRP ' + F(p.irp, 1) + ' · RT ' + F(p.rt, 2) + ' s · IBP ' + F(p.ibp, 1) + '</span>'; }).join(' ') + '</div>' : '') + '</div>';

    // 4 classificação
    h += '<div class="card"><div class="card-tit">4. Classificação — Consenso de Leuven (adaptado)</div>' +
      '<div class="grid2"><div class="bloco-cl"><b>Esfíncter superior do esôfago</b><p>' + esc(R.ues.texto) + '</p>' + (R.ues.suporte ? '<p class="suave">' + esc(R.ues.suporte) + '</p>' : '') +
      '<p class="suave">Regra: maioria (2 de 3) das deglutições de ≥ 10 mL com ≥ 2 de: IBP alta, UES IRP alta, admitância máxima baixa, UES RT curto — com IBP e/ou IRP entre eles; achados devem acentuar-se com o aumento de volume/viscosidade.</p></div>' +
      '<div class="bloco-cl"><b>Função contrátil faríngea</b><p>' + esc(R.far.texto) + '</p>' + (R.far.picos.length ? '<p class="suave">' + R.far.picos.map(function (p) { return p.seg + ': pico mediano ' + F(p.e.mediana, 0) + ' mmHg'; }).join(' · ') + '</p>' : '') +
      '<p class="suave">Regra: maioria das deglutições (qualquer volume) com contração AUSENTE/BAIXA em ≥ 1 segmento = hipocontratilidade (global ou fragmentada); ALTA = hipercontratilidade (geralmente compensatória).</p></div></div>' +
      (R.combinada ? '<div class="aviso">Disfunção combinada: o consenso recomenda videofluoroscopia para definir o componente predominante.</div>' : '') + '</div>';

    // 5 correlação / orientações
    h += '<div class="card"><div class="card-tit">5. Correlação clínico-manométrica e orientações</div><div class="grid2"><div><b class="sub-t">Diagnósticos diferenciais</b>' +
      (O.dd.length ? '<ul>' + O.dd.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '<p class="suave">Sem padrão manométrico alterado que oriente diferenciais.</p>') + '</div><div><b class="sub-t">Recomendações</b>' +
      (O.orient.length ? '<ul>' + O.orient.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '<p class="suave">Sem recomendações adicionais a partir dos dados informados.</p>') + '</div></div></div>';

    // 6 pendências + responsável
    h += '<div class="card"><div class="card-tit">6. Revisão e liberação</div><div class="grid2"><div>' +
      (P.length ? '<ul class="pend">' + P.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : '<div class="aviso info">Sem pendências. Laudo pronto para assinatura.</div>') +
      '</div><div class="form-grid">' + campoTxt('medico', 'nome', 'Médico responsável', av.medico.nome, '') + campoTxt('medico', 'crm', 'CRM / UF', av.medico.crm, '') + '</div>' +
      '<div>' + chk('medico', 'revisado', 'Revisei visualmente todas as deglutições, a região do ESE e as marcações automáticas', av.medico.revisado) + '</div></div></div>';

    // 7 laudo
    var gerado = laudoTexto(R, Q, O);
    h += '<div class="card"><div class="card-tit">7. Laudo estruturado <span class="acoes-mini"><button class="btn mini" id="avRegerar">Regerar do zero</button><button class="btn mini" id="avCopiar">Copiar</button><button class="btn mini primario" id="avImprimir">Imprimir laudo</button><button class="btn mini perigo" id="avLimpar" title="Remove os dados clínicos salvos neste navegador">Apagar dados salvos</button></span></div>' +
      (av.texto != null && av.texto !== gerado ? '<div class="aviso info">Texto editado manualmente. Use “Regerar do zero” para refazer com os dados atuais.</div>' : '') +
      '<textarea id="avTexto" class="laudo-txt">' + esc(av.texto != null ? av.texto : gerado) + '</textarea>' +
      '<div class="aviso-legal suave">Ferramenta de apoio à decisão. A interpretação final e a assinatura cabem ao médico responsável.</div></div>';

    // 8 referências
    h += '<div class="card"><div class="card-tit">8. Base bibliográfica</div><ol class="bib">' + REFS_BIB.map(function (r) { return '<li>' + esc(r[0]) + (r[1] ? ' <a href="' + r[1] + '" target="_blank" rel="noopener">link</a>' : '') + '</li>'; }).join('') + '</ol></div>';
    el.innerHTML = h;
    E.avUltimo = { R: R, Q: Q, O: O, P: P, gerado: gerado };
  }
  function kpi(k, v) { return '<div class="kpi"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function campoTxt(g, k, rot, val, ph) { return '<label class="campo">' + rot + '<span class="ent"><input type="text" data-g="' + g + '" data-k="' + k + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '" style="width:100%"></span></label>'; }

  function ligar(e, helpers) {
    E = e; H = helpers;
    var area = document.getElementById('avArea');
    function aplicar(t) {
      var av = E.av; if (!av) return;
      if (t.dataset.b) {
        var k = t.dataset.c, m = E.lista.filter(function (x) { return String(x.chave) === k; })[0]; if (!m) return;
        var b = av.bolus[k] = av.bolus[k] || JSON.parse(JSON.stringify(bolusDe(m))); b.auto = false;
        if (t.dataset.b === 'vol') { b.vol = t.value === '' ? null : +t.value; if (b.vol > 0 && b.cons === 'seca') b.cons = ''; }
        if (t.dataset.b === 'cons') { b.cons = t.value; if (t.value === 'seca') b.vol = 0; }
        if (t.dataset.b === 'parcial') b.parcial = t.checked;
      } else if (t.dataset.g) {
        var g = t.dataset.g, kk = t.dataset.k;
        if (g === 'eat') av.clin.eat[+kk] = t.value === '' ? null : +t.value;
        else if (g === 'clin') av.clin[kk] = t.value;
        else if (g === 'medico') av.medico[kk] = t.type === 'checkbox' ? t.checked : t.value;
        else if (g === 'tec') av.tec[kk] = t.checked;
        else if (g === 'tecv') av.tec[kk] = t.value;
        else av.clin[g][kk] = t.checked;
      } else return;
      salvar();
      var y = window.scrollY; render(E); window.scrollTo(0, y);
    }
    area.addEventListener('change', function (ev) { if (ev.target.id === 'avTexto') return; aplicar(ev.target); });
    area.addEventListener('input', function (ev) { if (ev.target.id === 'avTexto' && E.av) { E.av.texto = ev.target.value; salvar(); } });
    area.addEventListener('click', function (ev) {
      var id = ev.target.id;
      if (id === 'avRegerar') { E.av.texto = null; salvar(); render(E); }
      if (id === 'avCopiar') { var t = document.getElementById('avTexto'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (x) { document.execCommand('copy'); } H.toast('Laudo copiado.'); }
      if (id === 'avImprimir') imprimir();
      if (id === 'avLimpar' && confirm('Apagar os dados clínicos desta avaliação salvos neste navegador?')) { try { localStorage.removeItem(E.av.chave); } catch (x) {} E.av = null; render(E); }
    });
  }

  function imprimir() {
    var txt = document.getElementById('avTexto').value, w = window.open('', '_blank'), pend = (E.avUltimo && E.avUltimo.P) || [];
    if (pend.length) txt = 'RASCUNHO — ' + pend.length + ' pendência(s) para liberação: ' + pend.join('; ') + '\n\n' + txt;
    if (!w) { H.toast('Permita pop-ups para imprimir.', true); return; }
    var sel = E.lista.filter(function (m) { return m.selecionada; }), imgs = '', cv = document.createElement('canvas');
    sel.forEach(function (m) { H.desenharDetalhe(cv, m, 520, 250, false); imgs += '<figure><img src="' + cv.toDataURL('image/png') + '"><figcaption>Deglutição ' + m.num + '</figcaption></figure>'; });
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Laudo ESE — ' + esc(E.ex.paciente || '') + '</title><style>body{font:12.5px/1.5 system-ui,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:28px 34px}pre{white-space:pre-wrap;font:inherit}.f{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}img{width:100%;border:1px solid #e2e8f0}figure{margin:0}figcaption{font-size:10px;color:#64748b;text-align:center}.r{font-size:10px;color:#64748b;margin-top:18px;border-top:1px solid #e2e8f0;padding-top:6px}</style></head><body><pre>' +
      esc(txt) + '</pre><div class="f">' + imgs + '</div><div class="r">' + CONFIG.SISTEMA + ' v' + CONFIG.VERSAO + '•Desenvolvido por ' + CONFIG.DESENVOLVEDOR + '</div><script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }

  return { render: render, ligar: ligar, classificar: function (e) { E = e; garantir(); return classificar(); } };
})();
