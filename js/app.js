/* Interface — Análise ESE */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var F = Diagnostico.fmt;

  var E = {
    ex: null, cfg: null, canaisCfg: null, canais: null, g: null, trechos: [], lista: [], atual: -1,
    manuais: [], ajustes: {}, selManual: {}, modoAjuste: null, ajusteTmp: null, pagina: 'exame', aval: null
  };

  /* ---------- configuração persistente ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function carregarCfg() {
    var c = clone(CFG_PADRAO);
    try { var s = localStorage.getItem(CONFIG.CHAVE_LOCAL); if (s) { var o = JSON.parse(s); for (var k in o) if (k in c) c[k] = o[k]; } } catch (e) {}
    if (!c.refs) c.refs = clone(PRESETS_REF[c.refPreset] || PRESETS_REF.estudo);
    else { var pr = PRESETS_REF[c.refPreset] || PRESETS_REF.estudo; for (var q in pr) if (!(q in c.refs)) c.refs[q] = pr[q]; }
    c.trechoModo = c.trechoModo === 'manual' ? 'auto' : c.trechoModo;
    return c;
  }
  function salvarCfg() { try { localStorage.setItem(CONFIG.CHAVE_LOCAL, JSON.stringify(E.cfg)); } catch (e) {} }

  function toast(msg, erro) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast vis' + (erro ? ' erro' : '');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast'; }, 3800);
  }

  /* ---------- navegação ---------- */
  var TITULOS = { exame: 'Exame', sonda: 'Sonda e região de análise', comp: 'Compensação postural', analise: 'Análise das deglutições', laudo: 'Laudo e planilha', refs: 'Valores de referência', ajuda: 'Como usar' };
  function irPara(pg) {
    E.pagina = pg;
    $$('.menu nav a').forEach(function (a) { a.classList.toggle('ativo', a.dataset.pg === pg); });
    $$('.pg').forEach(function (s) { s.classList.toggle('ativa', s.id === 'pg-' + pg); });
    $('#tituloPg').textContent = TITULOS[pg];
    renderPagina();
  }
  function renderPagina() {
    var p = E.pagina;
    if (p === 'exame') renderExame();
    if (p === 'sonda') renderSonda();
    if (p === 'comp') renderComp();
    if (p === 'analise') renderAnalise();
    if (p === 'laudo') renderLaudo();
    if (p === 'refs') renderRefs();
    if (p === 'ajuda') renderAjuda();
  }

  /* ---------- abrir exame ---------- */
  function abrir(arq) {
    if (!arq) return;
    $('#subTopo').textContent = 'Lendo ' + arq.name + '…';
    Leitores.ler(arq).then(function (ex) {
      E.ex = ex; E.manuais = []; E.ajustes = {}; E.selManual = {}; E.atual = -1;
      montarCanaisCfg();
      processar();
      ex.avisos.forEach(function (a) { toast(a); });
      irPara('exame');
    }).catch(function (e) { $('#subTopo').textContent = 'Erro ao abrir'; toast(e.message, true); console.error(e); });
  }

  function montarCanaisCfg() {
    var ex = E.ex, sd = SONDAS[E.cfg.sonda];
    var regiao = regiaoPadrao();
    E.canaisCfg = ex.canais.map(function (c, i) {
      var pos = c.pos != null ? c.pos : (sd && sd.canais[i] ? sd.canais[i].pos : (ex.canais.length - 1 - i));
      return { nome: c.nome, pos: pos, regiao: regiao.indexOf(i) >= 0 };
    });
    if (E.cfg.regiaoModo === 'custom' && E.cfg.regiaoCustom.length) E.canaisCfg.forEach(function (c, i) { c.regiao = E.cfg.regiaoCustom.indexOf(i) >= 0; });
  }
  function regiaoPadrao() {
    var sd = SONDAS[E.cfg.sonda], n = E.ex ? E.ex.canais.length : 0;
    if (sd && sd.canais.length === n) return E.cfg.regiaoModo === 'esleeve' ? sd.esleeve : sd.proximal;
    // genérico: 10 canais mais proximais
    var idx = []; for (var i = 0; i < Math.min(10, n); i++) idx.push(i); return idx;
  }

  /* ---------- processamento ---------- */
  function processar() {
    if (!E.ex) return;
    var ex = E.ex, cfg = E.cfg;
    var base = { canais: ex.canais.map(function (c, i) { return { nome: c.nome, pos: E.canaisCfg[i].pos, dados: c.dados }; }), fs: ex.fs };
    var comp = cfg.comp.modo === 'arquivo' ? { modo: 'nenhuma' } : cfg.comp;
    E.canais = Analise.compensar(base, comp);
    var idx = E.canaisCfg.map(function (c, i) { return c.regiao ? i : -1; }).filter(function (i) { return i >= 0; });
    if (idx.length < 3) { toast('Selecione pelo menos 3 canais na região de análise.', true); return; }
    E.g = Analise.grade(E.canais, idx);
    var fs = ex.fs, N = E.g.N;
    if (cfg.trechoModo === 'tudo') E.trechos = [[0, N]];
    else if (cfg.trechoModo === 'manual' && cfg.trechoFim > cfg.trechoIni) E.trechos = [[Math.round(cfg.trechoIni * fs), Math.round(cfg.trechoFim * fs)]];
    else E.trechos = Analise.trechosAuto(E.g, cfg, fs);
    if (!E.trechos.length) E.trechos = [[0, N]];

    var ancoras;
    if (cfg.fonteDeg === 'marcadores') {
      ancoras = ex.eventos.filter(function (e) { return e.tipo === 'deg'; }).map(function (e) { return { t: e.ini, origem: 'Marcador ' + e.cod }; });
      if (!ancoras.length) toast('O arquivo não tem marcadores de deglutição — use Automática ou Manual.');
    } else if (cfg.fonteDeg === 'manual') ancoras = E.manuais.map(function (t) { return { t: t, origem: 'Manual' }; });
    else ancoras = Analise.detectar(E.g, cfg, fs, E.trechos).map(function (t) { return { t: t, origem: 'Automática' }; });
    if (cfg.fonteDeg !== 'auto') ancoras = ancoras.filter(function (a) { return E.trechos.some(function (tr) { return a.t >= tr[0] && a.t < tr[1]; }) || cfg.fonteDeg === 'manual'; });

    E.lista = ancoras.map(function (a) {
      var aj = E.ajustes[a.t] || {};
      var m = Analise.medir(E.g, { ancora: a.t, abIni: aj.abIni, abFim: aj.abFim, centro: aj.centro }, cfg, fs, E.canais);
      m.chave = a.t; m.origem = a.origem; m.excluida = !!aj.excluida; m.ajustada = aj.abIni != null || aj.centro != null;
      return m;
    }).sort(function (x, y) { return x.abIni - y.abIni; });
    Analise.marcarSequenciais(E.lista, cfg, fs);
    if (cfg.selecaoModo === 'auto') Analise.selecionarAuto(E.lista, cfg.nSelecao);
    else {
      E.lista.forEach(function (m) { m.selecionada = !!E.selManual[m.chave] && !m.excluida; });
      if (!E.lista.some(function (m) { return m.selecionada; })) { Analise.selecionarAuto(E.lista, cfg.nSelecao); E.lista.forEach(function (m) { if (m.selecionada) E.selManual[m.chave] = true; }); }
    }
    E.lista.forEach(function (m, i) { m.num = i + 1; });
    if (E.atual >= E.lista.length) E.atual = E.lista.length - 1;
    if (E.atual < 0 && E.lista.length) { var s = E.lista.findIndex(function (m) { return m.selecionada; }); E.atual = s >= 0 ? s : 0; }
    var sel = E.lista.filter(function (m) { return m.selecionada; });
    E.aval = Diagnostico.avaliar(sel, E.lista, E.cfg.refs);
    var nome = ex.paciente || ex.arquivo;
    $('#subTopo').textContent = nome + ' — ' + E.lista.length + ' deglutições, ' + sel.length + ' selecionadas';
  }
  var _deb;
  function reprocessar(render) { clearTimeout(_deb); _deb = setTimeout(function () { processar(); salvarCfg(); if (render !== false) renderPagina(); }, 120); }

  /* ---------- página Exame ---------- */
  function renderExame() {
    var ex = E.ex;
    $('#exameVazio').hidden = !!ex; $('#exameInfo').hidden = !ex;
    if (!ex) return;
    var dur = ex.nAmostras / ex.fs, nDeg = ex.eventos.filter(function (e) { return e.tipo === 'deg'; }).length;
    var ese = ex.eventos.filter(function (e) { return e.tipo === 'ese'; })[0];
    var kp = [['Paciente', ex.paciente || '—'], ['Médico', ex.medico || '—'], ['Indicação', ex.indicacao || '—'], ['Arquivo', ex.arquivo],
      ['Canais / amostragem', ex.canais.length + ' canais · ' + F(ex.fs, 0) + ' Hz'], ['Duração', Graficos.rotTempo(dur) + ' min'],
      ['Deglutições marcadas', nDeg], ['ESE marcado no Multiplex', ese && ese.posSup ? F(ese.posInf, 1) + ' – ' + F(ese.posSup, 1) + ' cm' : '—']];
    $('#cardsExame').innerHTML = kp.map(function (k) { return '<div class="kpi"><div class="k">' + k[0] + '</div><div class="v">' + esc(String(k[1])) + '</div></div>'; }).join('');
    $('#listaEventos').innerHTML = ex.eventos.length ? ex.eventos.map(function (e) {
      return '<div><span class="t">' + Graficos.rotTempo(e.ini / ex.fs) + '</span><span>' + esc(e.rotulo) + (e.posSup ? ' (' + F(e.posInf, 1) + '–' + F(e.posSup, 1) + ' cm)' : '') + '</span></div>';
    }).join('') : '<div class="suave">Sem eventos no arquivo.</div>';
    $('#laudoOriginal').textContent = ex.laudo || 'Sem laudo gravado no arquivo.';
    desenharGeral();
  }
  function desenharGeral() {
    var cv = $('#cvGeral'), W = cv.parentNode.clientWidth, H = 320, ctx = Graficos.prepararCanvas(cv, W, H);
    var area = { x: 42, y: 14, w: W - 80, h: H - 34 }, cs = E.canais;
    var zTop = Math.max.apply(null, cs.map(function (c) { return c.pos; })), zBot = Math.min.apply(null, cs.map(function (c) { return c.pos; }));
    Graficos.mapaCanais(ctx, cs, zTop, zBot, 0, E.g.N, area, { min: E.cfg.escalaMin, max: E.cfg.escalaMax });
    Graficos.eixoZ(ctx, area, zTop, zBot, 5); Graficos.eixoT(ctx, area, 0, E.g.N, E.ex.fs);
    Graficos.barraCores(ctx, area.x + area.w + 8, area.y, 10, area.h, { min: E.cfg.escalaMin, max: E.cfg.escalaMax });
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.2;
    [E.g.zTop, E.g.zBot].forEach(function (z) { var y = area.y + (zTop - z) / (zTop - zBot) * area.h; ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    E.ex.eventos.forEach(function (e) {
      if (e.tipo !== 'deg') return; var x = area.x + e.ini / E.g.N * area.w;
      ctx.beginPath(); ctx.moveTo(x - 4, area.y - 9); ctx.lineTo(x + 4, area.y - 9); ctx.lineTo(x, area.y - 2); ctx.fillStyle = Graficos.getCss('--azul'); ctx.fill();
    });
    ctx.fillStyle = Graficos.getCss('--texto-suave'); ctx.font = '11px system-ui'; ctx.save(); ctx.translate(11, area.y + area.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('posição (cm da ponta)', 0, 0); ctx.restore();
  }

  /* ---------- página Sonda ---------- */
  var PARAMS = [
    ['contorno', 'Contorno isobárico', 'mmHg', 1, 'Base de todas as medidas (o estudo usa 30 mmHg).'],
    ['bandaAcima', 'Banda do ESE acima do centro', 'cm', 0.1, 'Acompanha a elevação laríngea durante a deglutição.'],
    ['bandaAbaixo', 'Banda do ESE abaixo do centro', 'cm', 0.1, ''],
    ['farAfast', 'Afastamento faringe–ESE', 'cm', 0.1, 'Distância entre a banda do ESE e o início da zona faríngea.'],
    ['faringeAltura', 'Altura da zona faríngea', 'cm', 0.5, ''],
    ['posAbaixo', 'Esôfago superior abaixo do centro', 'cm', 0.5, 'Zona da contração pós-deglutição.'],
    ['repIni', 'Repouso: início da janela', 's', 0.1, 'Relativo ao início da abertura.'],
    ['repFim', 'Repouso: fim da janela', 's', 0.1, ''],
    ['farIni', 'Faringe: início da janela', 's', 0.1, 'Relativo ao início da abertura.'],
    ['farFim', 'Faringe: fim da janela', 's', 0.1, 'Relativo ao fim da abertura.'],
    ['posJanela', 'Janela pós-deglutição', 's', 0.1, 'Após o fechamento do ESE.'],
    ['limiarIntegral', 'Limiar das integrais contráteis', 'mmHg', 1, 'Pressões abaixo disso não entram na soma.'],
    ['tolCoord', 'Tolerância da coordenação', 's', 0.05, ''],
    ['durMin', 'Duração mínima da abertura', 's', 0.05, ''],
    ['durMax', 'Duração máxima da abertura (detecção)', 's', 0.1, 'Relaxamentos mais longos (ex.: EIE) são ignorados.'],
    ['limiarRelPct', 'Limiar relativo (repouso < contorno)', '%', 5, 'Usado quando o ESE não atinge o contorno.'],
    ['intervaloMin', 'Intervalo mínimo entre deglutições', 's', 0.5, ''],
    ['intervaloSeq', 'Marcar como sequencial abaixo de', 's', 0.5, 'O protocolo pede ≥ 10 s entre deglutições.'],
    ['nSelecao', 'Deglutições na seleção automática', '', 1, ''],
    ['escalaMin', 'Escala de cores: mínimo', 'mmHg', 5, ''],
    ['escalaMax', 'Escala de cores: máximo', 'mmHg', 10, '']
  ];
  function campoNum(id, rot, un, step, val, ajuda) {
    return '<label class="campo" title="' + esc(ajuda || '') + '">' + rot + '<span class="ent"><input type="number" step="' + step + '" data-k="' + id + '" value="' + (val == null ? '' : val) + '"> ' + un + '</span></label>';
  }
  function renderSonda() {
    var cfg = E.cfg;
    $$('#optRegiao input').forEach(function (r) { r.checked = r.value === cfg.regiaoModo; });
    $('#selSonda').innerHTML = Object.keys(SONDAS).map(function (k) { return '<option value="' + k + '"' + (k === cfg.sonda ? ' selected' : '') + '>' + SONDAS[k].nome + '</option>'; }).join('');
    $('#inpFs').value = E.ex ? E.ex.fs : '';
    $('#formParam').innerHTML = PARAMS.map(function (p) { return campoNum(p[0], p[1], p[2], p[3], cfg[p[0]], p[4]); }).join('');
    var tb = $('#tabCanais tbody');
    if (!E.ex) { tb.innerHTML = '<tr><td colspan="3" class="suave">Abra um exame.</td></tr>'; return; }
    tb.innerHTML = E.canaisCfg.map(function (c, i) {
      return '<tr><td>' + esc(c.nome) + '</td><td><input type="number" step="0.1" data-pos="' + i + '" value="' + c.pos + '"></td><td><input type="checkbox" data-reg="' + i + '"' + (c.regiao ? ' checked' : '') + '></td></tr>';
    }).join('');
  }

  /* ---------- página Compensação ---------- */
  function renderComp() {
    var c = E.cfg.comp;
    $$('#optComp input').forEach(function (r) { r.checked = r.value === c.modo; });
    var ref = c.refPos == null ? (E.canaisCfg ? Math.min.apply(null, E.canaisCfg.map(function (k) { return k.pos; })) : 0) : c.refPos;
    var h = '';
    if (c.modo === 'hidrostatica') {
      h += '<label class="campo">Ângulo do paciente<span class="ent"><input type="range" min="0" max="90" step="5" data-c="angulo" value="' + c.angulo + '"> <b id="angVal">' + c.angulo + '°</b></span></label>';
      h += '<label class="campo" title="Posição do zero (intragástrico = canal mais distal)">Posição do zero<span class="ent"><input type="number" step="0.5" data-c="refPos" value="' + ref + '"> cm</span></label>';
      h += '<label class="campo" title="0,7356 mmHg por cm de coluna d\'água">Coeficiente<span class="ent"><input type="number" step="0.01" data-c="coef" value="' + c.coef + '"> mmHg/cm</span></label>';
      h += '<label class="campo">Sinal da correção<span class="ent"><select data-c="sinal"><option value="-1"' + (c.sinal < 0 ? ' selected' : '') + '>Subtrair (canal acima do transdutor lê a mais)</option><option value="1"' + (c.sinal > 0 ? ' selected' : '') + '>Somar</option></select></span></label>';
    } else if (c.modo === 'janela') {
      h += '<label class="campo">Início da janela<span class="ent"><input type="number" step="1" data-c="zIni" value="' + c.zIni + '"> s</span></label>';
      h += '<label class="campo">Fim da janela<span class="ent"><input type="number" step="1" data-c="zFim" value="' + c.zFim + '"> s</span></label>';
    }
    $('#formComp').innerHTML = h;
    var av = $('#avisoComp');
    if (c.modo === 'hidrostatica') { av.hidden = false; av.className = 'aviso'; av.textContent = 'A fórmula do trabalho do Daniel não foi informada. Este modo usa a correção física da coluna d\'água; confira o sinal pela verificação abaixo antes de laudar.'; }
    else if (c.modo === 'arquivo') { av.hidden = false; av.className = 'aviso info'; av.textContent = 'Os valores do arquivo serão usados sem alteração.'; }
    else av.hidden = true;
    renderVerif();
  }
  function renderVerif() {
    var v = $('#verifComp');
    if (!E.ex || !E.canais) { v.innerHTML = '<div class="suave">Abra um exame.</div>'; return; }
    var tr = E.trechos[0] || [0, E.g.N], m = E.lista.filter(function (x) { return x.selecionada; })[0] || E.lista[0];
    var linhas = E.canais.map(function (c, i) {
      if (!E.canaisCfg[i].regiao) return '';
      var a = tr[0], b = tr[1], arr = Array.prototype.slice.call(c.dados, a, b).sort(function (x, y) { return x - y; });
      var med = arr[arr.length >> 1];
      var papel = m ? (c.pos > m.zFarBot - 0.01 ? 'faringe' : c.pos >= m.eseInf - 0.6 && c.pos <= m.eseSup + 0.6 ? 'ESE' : c.pos < m.eseInf ? 'esôfago' : 'transição') : '';
      return '<tr><td>' + c.nome + '</td><td>' + F(c.pos, 1) + '</td><td>' + papel + '</td><td>' + F(c.off || 0, 1) + '</td><td>' + F(med, 1) + '</td></tr>';
    }).join('');
    v.innerHTML = '<div class="tabela-rol"><table class="tab"><thead><tr><th>Canal</th><th>Posição (cm)</th><th>Papel</th><th>Correção aplicada (mmHg)</th><th>Mediana no trecho (mmHg)</th></tr></thead><tbody>' + linhas + '</tbody></table></div>';
  }

  /* ---------- página Análise ---------- */
  function renderAnalise() {
    $$('#segFonte button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === E.cfg.fonteDeg); });
    $$('#segSel button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === E.cfg.selecaoModo); });
    $$('#segTrecho button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === E.cfg.trechoModo); });
    if (!E.ex) { $('#tabDeg tbody').innerHTML = '<tr><td colspan="9" class="suave">Abra um exame.</td></tr>'; return; }
    var dica = E.cfg.fonteDeg === 'manual' ? 'Clique no mapa no momento de cada deglutição para adicioná-la (clique com Shift remove).' :
      E.cfg.trechoModo === 'manual' ? 'Arraste no mapa para definir o trecho analisado.' : 'Clique numa deglutição para ver os detalhes.';
    $('#dicaVisao').textContent = dica;
    var ese = E.ex.eventos.filter(function (e) { return e.tipo === 'ese' && e.posSup; })[0], msg = '';
    if (ese && (ese.posSup < E.g.zBot || ese.posInf > E.g.zTop)) msg = 'O ESE marcado no Multiplex (' + F(ese.posInf, 1) + '–' + F(ese.posSup, 1) + ' cm) está fora da região analisada (' + F(E.g.zBot, 1) + '–' + F(E.g.zTop, 1) + ' cm). Confira a região em Sonda.';
    if (E.cfg.regiaoModo === 'esleeve') msg = (msg ? msg + ' ' : '') + 'Modo E-sleeve: use só o trecho da retirada com o E-sleeve no cricofaríngeo (Trecho → Arrastar no mapa). No restante do exame o E-sleeve fica na junção esofagogástrica.';
    var av = $('#avisoRegiao'); av.hidden = !msg; av.textContent = msg;
    desenharVisao(); renderTabDeg(); renderDetalhe();
  }

  var V = { area: null, a: 0, b: 0 };
  function desenharVisao() {
    var cv = $('#cvVisao'), W = cv.parentNode.clientWidth, H = 200, ctx = Graficos.prepararCanvas(cv, W, H), g = E.g;
    var area = { x: 42, y: 12, w: W - 80, h: H - 32 }; V.area = area; V.a = 0; V.b = g.N;
    Graficos.mapaCanais(ctx, g.canais, g.zTop, g.zBot, 0, g.N, area, { min: E.cfg.escalaMin, max: E.cfg.escalaMax });
    Graficos.eixoZ(ctx, area, g.zTop, g.zBot, g.zTop - g.zBot > 12 ? 4 : 2); Graficos.eixoT(ctx, area, 0, g.N, E.ex.fs);
    Graficos.barraCores(ctx, area.x + area.w + 8, area.y, 10, area.h, { min: E.cfg.escalaMin, max: E.cfg.escalaMax });
    // fora do trecho: escurece
    ctx.fillStyle = 'rgba(15,23,42,.55)';
    var ini = 0;
    E.trechos.slice().sort(function (p, q) { return p[0] - q[0]; }).forEach(function (t) { ctx.fillRect(xDe(ini), area.y, xDe(t[0]) - xDe(ini), area.h); ini = t[1]; });
    ctx.fillRect(xDe(ini), area.y, xDe(g.N) - xDe(ini), area.h);
    if (V.arrasto) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(Math.min(V.arrasto[0], V.arrasto[1]), area.y, Math.abs(V.arrasto[1] - V.arrasto[0]), area.h); }
    E.lista.forEach(function (m, i) {
      var x = xDe(m.abIni);
      ctx.fillStyle = m.excluida ? '#ef4444' : m.selecionada ? '#ffffff' : 'rgba(255,255,255,.45)';
      ctx.fillRect(x - (i === E.atual ? 1.5 : 0.5), area.y, i === E.atual ? 3 : 1, area.h);
      ctx.beginPath(); ctx.moveTo(x - 5, area.y - 10); ctx.lineTo(x + 5, area.y - 10); ctx.lineTo(x, area.y - 2);
      ctx.fillStyle = m.excluida ? '#ef4444' : m.selecionada ? Graficos.getCss('--azul') : '#94a3b8'; ctx.fill();
    });
  }
  function xDe(t) { return V.area.x + (t - V.a) / (V.b - V.a) * V.area.w; }
  function tDe(x) { return V.a + (x - V.area.x) / V.area.w * (V.b - V.a); }

  function renderTabDeg() {
    var tb = $('#tabDeg tbody'), fs = E.ex.fs;
    $('#contDeg').textContent = E.lista.length + ' encontradas · ' + E.lista.filter(function (m) { return m.selecionada; }).length + ' em uso';
    if (!E.lista.length) { tb.innerHTML = '<tr><td colspan="9" class="suave">' + (E.cfg.fonteDeg === 'manual' ? 'Clique no mapa acima para marcar deglutições.' : 'Nenhuma deglutição encontrada no trecho. Confira a região (Sonda) e o trecho.') + '</td></tr>'; return; }
    tb.innerHTML = E.lista.map(function (m, i) {
      var cls = (i === E.atual ? 'atual ' : '') + (m.excluida ? 'excl' : '');
      var obs = (m.ajustada ? '<span class="tag">ajustada</span>' : '') + m.flags.map(function (f) { return '<span class="tag al" title="' + esc(f) + '">' + esc(abrev(f)) + '</span>'; }).join('');
      var coord = m.coord == null ? '—' : m.coord ? '<span class="tag ok">sim</span>' : '<span class="tag err">não</span>';
      return '<tr class="' + cls + '" data-i="' + i + '"><td><input type="checkbox" data-sel="' + i + '"' + (m.selecionada ? ' checked' : '') + (E.cfg.selecaoModo === 'auto' || m.excluida ? ' disabled' : '') + '></td><td>' + m.num + '</td><td>' + Graficos.rotTempo(m.abIni / fs) + '</td><td>' + F(m.pRepouso, 1) + '</td><td>' + (m.semAbertura ? '—' : F(m.tAbertura, 2) + ' s') + '</td><td>' + F(m.irp02, 1) + '</td><td>' + F(m.picoFar, 1) + '</td><td>' + coord + '</td><td>' + obs + '</td></tr>';
    }).join('');
  }
  function abrev(f) { return f.replace('Repouso abaixo do contorno de', 'repouso <').replace(' mmHg', '').replace('Abertura não identificada', 'sem abertura').replace('Deglutição sequencial', 'sequencial').replace('Possível artefato (tosse/esforço)', 'artefato').replace('ESE na borda da região — confira o posicionamento', 'borda').replace('Sem canais de faringe acima do ESE', 'sem faringe'); }

  var D = {};
  function janelaDet(m) {
    var fs = E.ex.fs;
    return [Math.max(0, Math.round(m.abIni - 4 * fs)), Math.min(E.g.N, Math.round(m.abFim + 5 * fs))];
  }
  function renderDetalhe() {
    var m = E.lista[E.atual], cv = $('#cvDet'), cc = $('#cvCurva');
    if (!m) { $('#titDet').textContent = 'Deglutição'; Graficos.prepararCanvas(cv, 10, 10); Graficos.prepararCanvas(cc, 10, 10); $('#metDet').innerHTML = ''; $('#legDet').innerHTML = ''; return; }
    var fs = E.ex.fs, g = E.g;
    $('#titDet').textContent = 'Deglutição ' + m.num + ' · ' + Graficos.rotTempo(m.abIni / fs) + ' · ' + m.origem + (m.selecionada ? ' · em uso' : '');
    $('#btnExcluir').textContent = m.excluida ? 'Reincluir' : 'Excluir';
    var W = cv.parentNode.clientWidth, H = 330;
    desenharDetalhe(cv, m, W, H, true);
    // curvas
    var j = janelaDet(m), ctx2 = Graficos.prepararCanvas(cc, W, 150), area2 = { x: 42, y: 8, w: W - 80, h: 120 };
    var sl = Analise.sleeve(g, m.centro, E.cfg, j[0], j[1]);
    var r0 = Analise.rowDe(g, m.zFarTop), r1 = Analise.rowDe(g, m.zFarBot), far = new Float32Array(j[1] - j[0]);
    for (var t = j[0]; t < j[1]; t++) { var mx = -1e9; for (var r = r0; r <= r1; r++) if (g.linhas[r][t] > mx) mx = g.linhas[r][t]; far[t - j[0]] = mx; }
    var series = [{ v: sl, cor: '#1d4ed8' }]; if (m.picoFar != null) series.push({ v: far, cor: '#ea580c' });
    var pts = []; if (m.picoFar != null) pts.push({ t: m.tPicoFar, v: m.picoFar, cor: '#ea580c' });
    Graficos.curvas(ctx2, area2, series, j[0], j[1], fs, { nivel: m.limiar, faixa: m.semAbertura ? null : [m.abIni, m.abFim], pontos: pts, rel: m.abIni });
    $('#legDet').innerHTML = '<span><i style="background:#000"></i>contorno ' + F(m.limiar, 0) + ' mmHg' + (m.limiarRelativo ? ' (relativo)' : '') + '</span>' +
      '<span><i style="background:#fff;outline:1px solid #94a3b8"></i>limites do ESE em repouso</span><span><i style="background:#22d3ee"></i>abertura (hiato)</span>' +
      '<span><i style="background:#f97316"></i>zona/pico faríngeo</span><span><i style="background:#a855f7"></i>zona/pico pós-deglutição</span>' +
      '<span><i style="background:#1d4ed8"></i>curva: pressão do ESE (máx. da banda)</span><span><i style="background:#ea580c"></i>curva: pressão faríngea máx.</span>';
    renderMetricas(m);
  }

  function desenharDetalhe(cv, m, W, H, interativo) {
    var fs = E.ex.fs, g = E.g, j = janelaDet(m);
    var ctx = Graficos.prepararCanvas(cv, W, H), area = { x: 42, y: 10, w: W - 80, h: H - 30 };
    var zTop = g.zTop, zBot = g.zBot, esc2 = { min: E.cfg.escalaMin, max: E.cfg.escalaMax };
    Graficos.mapaCanais(ctx, g.canais, zTop, zBot, j[0], j[1], area, esc2);
    Graficos.contorno(ctx, g, j[0], j[1], m.limiar, area, zTop, zBot, '#000');
    Graficos.eixoZ(ctx, area, zTop, zBot, zTop - zBot > 12 ? 2 : 1);
    Graficos.eixoT(ctx, area, j[0], j[1], fs, m.abIni);
    Graficos.barraCores(ctx, area.x + area.w + 8, area.y, 10, area.h, esc2);
    var X = function (t) { return area.x + (t - j[0]) / (j[1] - j[0]) * area.w; }, Y = function (z) { return area.y + (zTop - z) / (zTop - zBot) * area.h; };
    ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
    // repouso: janela e bordas
    var ra = m.abIni + E.cfg.repIni * fs, rb = m.abIni + E.cfg.repFim * fs;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    if (m.ext > 0) { ctx.strokeRect(X(ra), Y(m.eseSup), X(rb) - X(ra), Y(m.eseInf) - Y(m.eseSup)); }
    ctx.setLineDash([]);
    // banda do ESE e hiato
    if (!m.semAbertura) {
      ctx.fillStyle = 'rgba(34,211,238,.28)'; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
      ctx.fillRect(X(m.abIni), Y(m.zBandaTop), X(m.abFim) - X(m.abIni), Y(m.zBandaBot) - Y(m.zBandaTop));
      ctx.strokeRect(X(m.abIni), Y(m.zBandaTop), X(m.abFim) - X(m.abIni), Y(m.zBandaBot) - Y(m.zBandaTop));
    }
    // zona faríngea
    if (m.picoFar != null) {
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]);
      ctx.strokeRect(X(m.farJan[0]), Y(m.zFarTop), X(m.farJan[1]) - X(m.farJan[0]), Y(m.zFarBot) - Y(m.zFarTop)); ctx.setLineDash([]);
      marcador(ctx, X(m.tPicoFar), Y(m.zPicoFar), '#f97316');
    }
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]);
    ctx.strokeRect(X(m.posJan[0]), Y(m.zPosTop), X(m.posJan[1]) - X(m.posJan[0]), Y(m.zPosBot) - Y(m.zPosTop)); ctx.setLineDash([]);
    marcador(ctx, X(m.tPicoPos), Y(m.zPicoPos), '#a855f7');
    // centro
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(area.x, Y(m.centro)); ctx.lineTo(area.x + area.w, Y(m.centro)); ctx.stroke(); ctx.setLineDash([]);
    // marcadores do arquivo
    E.ex.eventos.forEach(function (e) { if (e.tipo === 'deg' && e.ini >= j[0] && e.ini < j[1]) { ctx.fillStyle = '#fff'; ctx.font = '10px system-ui'; ctx.fillText('▼ ' + e.cod, X(e.ini) - 4, area.y + 10); } });
    if (interativo && E.ajusteTmp != null) { ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(E.ajusteTmp), area.y); ctx.lineTo(X(E.ajusteTmp), area.y + area.h); ctx.stroke(); }
    ctx.restore();
    if (interativo) { D = { area: area, j: j, zTop: zTop, zBot: zBot }; }
  }
  function marcador(ctx, x, y, cor) { ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fillStyle = cor; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }

  function renderMetricas(m) {
    var refs = E.cfg.refs;
    $('#metDet').innerHTML = Analise.METRICAS.map(function (d) {
      var v = m[d.k], min = d.ref && d.ref[0] ? refs[d.ref[0]] : null, max = d.ref && d.ref[1] ? refs[d.ref[1]] : null;
      var cls = d.ref ? Diagnostico.classificar(v, min, max) : '';
      if (d.k === 'tAbertura' && m.semAbertura) { v = null; cls = 'alterado'; }
      var rt = d.ref ? (min == null && max == null ? 'sem referência' : 'ref. ' + (min != null ? F(min, d.dec) : '') + (min != null && max != null ? '–' : max != null ? '≤ ' : '+') + (max != null ? F(max, d.dec) : '')) : '';
      return '<div class="met ' + cls + '"><span class="ajuda-i" title="' + esc(d.ajuda) + '">?</span><div class="n">' + d.nome + '</div><div class="v">' + F(v, d.dec) + ' <small>' + d.un + '</small></div><div class="r">' + rt + '</div></div>';
    }).join('') + '<div class="met ' + (m.coord == null ? '' : m.coord ? 'normal' : 'alterado') + '"><span class="ajuda-i" title="Coordenação faringoesofágica: o pico de contração faríngea deve coincidir com a abertura completa do ESE.">?</span><div class="n">Coordenação faringoesofágica</div><div class="v">' + (m.coord == null ? '—' : m.coord ? 'Coordenada' : 'Incoordenada') + '</div><div class="r">pico faríngeo ' + (m.dtCoord == null ? '—' : F(m.dtCoord, 2) + ' s após o início da abertura') + '</div></div>' +
      (m.flags.length ? '<div class="met alterado" style="grid-column:1/-1"><div class="n">Observações</div><div>' + m.flags.map(esc).join(' · ') + '</div></div>' : '');
  }

  /* ---------- página Laudo ---------- */
  function renderLaudo() {
    var el = $('#laudoArea');
    if (!E.ex) { el.innerHTML = '<div class="card suave">Abra um exame.</div>'; return; }
    var ex = E.ex, av = E.aval, sel = E.lista.filter(function (m) { return m.selecionada; }), fs = ex.fs;
    var h = '<div class="laudo"><h2>Análise manométrica do esfíncter superior do esôfago</h2>';
    h += '<div class="cab"><div><b>Paciente:</b> ' + esc(ex.paciente || '—') + '</div><div><b>Médico:</b> ' + esc(ex.medico || '—') + '</div><div><b>Indicação:</b> ' + esc(ex.indicacao || '—') + '</div><div><b>Arquivo:</b> ' + esc(ex.arquivo) + '</div>' +
      '<div><b>Região:</b> ' + ({ proximal: 'cluster proximal', esleeve: 'E-sleeve distal (retirada)', custom: 'personalizada' })[E.cfg.regiaoModo] + ' (' + F(E.g.zBot, 1) + '–' + F(E.g.zTop, 1) + ' cm)</div>' +
      '<div><b>Compensação:</b> ' + ({ nenhuma: 'nenhuma', arquivo: 'aplicada no Multiplex', hidrostatica: 'hidrostática ' + E.cfg.comp.angulo + '°', janela: 'zero por janela' })[E.cfg.comp.modo] + '</div>' +
      '<div><b>Contorno isobárico:</b> ' + E.cfg.contorno + ' mmHg</div><div><b>Deglutições:</b> ' + sel.length + ' analisadas de ' + E.lista.length + ' (' + (E.cfg.selecaoModo === 'auto' ? 'seleção automática' : 'seleção manual') + ')</div></div>';
    h += '<h3>Impressão diagnóstica sugerida</h3><div class="conc" contenteditable="true" id="concEdit">' + esc(E.conclusaoEditada || av.conclusao) + '</div>';
    h += '<div class="suave nao-imprimir">O texto acima é editável antes de imprimir.</div>';
    h += '<h3>Achados</h3><ul>' + av.achados.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    if (av.alertas.length) h += '<div class="aviso">' + av.alertas.map(esc).join('<br>') + '</div>';
    h += '<h3>Parâmetros (deglutições selecionadas)</h3><div class="tabela-rol" style="max-height:none"><table class="tab"><thead><tr><th>Parâmetro</th><th>Média</th><th>Mediana</th><th>DP</th><th>Mín–Máx</th><th>Referência</th><th>Situação</th></tr></thead><tbody>';
    av.itens.forEach(function (i) {
      var st = { normal: ['Normal', 'st-normal'], baixo: ['Abaixo', 'st-baixo'], alto: ['Acima', 'st-alto'], 'sem ref': ['—', 'st-semref'], 'sem dado': ['—', 'st-semref'] }[i.cls];
      h += '<tr><td title="' + esc(i.m.ajuda) + '">' + i.m.nome + ' <span class="suave">(' + i.m.un + ')</span></td><td>' + F(i.e.media, i.m.dec) + '</td><td>' + F(i.e.mediana, i.m.dec) + '</td><td>' + F(i.e.dp, i.m.dec) + '</td><td>' + (i.e.n ? F(i.e.min, i.m.dec) + ' – ' + F(i.e.max, i.m.dec) : '—') + '</td><td>' + i.refTxt + '</td><td class="' + st[1] + '">' + st[0] + '</td></tr>';
    });
    var nc = sel.filter(function (s) { return s.coord != null; }), okc = nc.filter(function (s) { return s.coord; }).length;
    h += '<tr><td>Coordenação faringoesofágica</td><td colspan="5">' + (nc.length ? okc + ' de ' + nc.length + ' coordenadas' : '—') + '</td><td class="' + (av.coord === 'boa' ? 'st-normal' : av.coord ? 'st-alto' : 'st-semref') + '">' + (av.coord === 'boa' ? 'Normal' : av.coord === 'incoordenação' ? 'Alterada' : av.coord === 'parcial' ? 'Parcial' : '—') + '</td></tr>';
    h += '</tbody></table></div>';
    h += '<h3>Deglutições analisadas</h3><div class="miniaturas" id="minis"></div>';
    h += '<h3>Todas as deglutições</h3><div class="tabela-rol" style="max-height:none"><table class="tab"><thead><tr><th>#</th><th>Tempo</th><th>Uso</th><th>Ext. (cm)</th><th>Repouso</th><th>Abertura (s)</th><th>Residual 0,2 s</th><th>Faringe</th><th>Pós</th><th>Coord.</th><th>Obs.</th></tr></thead><tbody>' +
      E.lista.map(function (m) { return '<tr' + (m.excluida ? ' class="excl"' : '') + '><td>' + m.num + '</td><td>' + Graficos.rotTempo(m.abIni / fs) + '</td><td>' + (m.selecionada ? '✔' : '') + '</td><td>' + F(m.ext, 1) + '</td><td>' + F(m.pRepouso, 1) + '</td><td>' + (m.semAbertura ? '—' : F(m.tAbertura, 2)) + '</td><td>' + F(m.irp02, 1) + '</td><td>' + F(m.picoFar, 1) + '</td><td>' + F(m.picoPos, 1) + '</td><td>' + (m.coord == null ? '—' : m.coord ? 'sim' : 'não') + '</td><td class="suave">' + esc(m.flags.join('; ')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (ex.laudo) h += '<h3>Laudo gravado no Multiplex (comparação)</h3><div class="laudo-orig" style="max-height:none">' + esc(ex.laudo) + '</div>';
    h += '<div class="aviso-legal">Sugestão gerada automaticamente a partir do traçado manométrico, para apoio à decisão. Não substitui a interpretação do médico responsável, que deve revisar as deglutições e os limites marcados. ' + CONFIG.SISTEMA + ' v' + CONFIG.VERSAO + ' — ' + new Date().toLocaleString('pt-BR') + '</div></div>';
    el.innerHTML = h;
    $('#concEdit').addEventListener('input', function () { E.conclusaoEditada = this.textContent; });
    var minis = $('#minis'), cvt = document.createElement('canvas');
    sel.forEach(function (m) {
      desenharDetalhe(cvt, m, 520, 260, false);
      var fig = document.createElement('figure');
      fig.innerHTML = '<img src="' + cvt.toDataURL('image/png') + '" alt="Deglutição ' + m.num + '"><figcaption>Deglutição ' + m.num + ' · ' + Graficos.rotTempo(m.abIni / fs) + ' · abertura ' + F(m.tAbertura, 2) + ' s · ' + (m.coord ? 'coordenada' : m.coord == null ? '' : 'incoordenada') + '</figcaption>';
      minis.appendChild(fig);
    });
    if (!sel.length) minis.innerHTML = '<div class="suave">Nenhuma deglutição selecionada.</div>';
  }

  /* ---------- página Referências ---------- */
  var CAMPOS_REF = [['repousoMin', 'Pressão basal (máx. repouso) — mínimo', 'mmHg'], ['repousoMax', 'Pressão basal (máx. repouso) — máximo', 'mmHg'], ['repMedMin', 'Pressão de repouso média — mínimo', 'mmHg'], ['repMedMax', 'Pressão de repouso média — máximo', 'mmHg'], ['residualMax', 'Pressão residual (0,2 s) — máximo', 'mmHg'],
    ['aberturaMin', 'Tempo de abertura — mínimo', 's'], ['aberturaMax', 'Tempo de abertura — máximo', 's'], ['extMin', 'Extensão — mínimo', 'cm'], ['extMax', 'Extensão — máximo', 'cm'],
    ['faringeMin', 'Contração faríngea — mínimo', 'mmHg'], ['faringeMax', 'Contração faríngea — máximo', 'mmHg'], ['posMin', 'Contração pós-deglutição — mínimo', 'mmHg'], ['posMax', 'Contração pós-deglutição — máximo', 'mmHg'],
    ['phciMin', 'Integral contrátil faríngea — mínimo', 'mmHg·cm·s'], ['phciMax', 'Integral contrátil faríngea — máximo', 'mmHg·cm·s']];
  function renderRefs() {
    var r = E.cfg.refs;
    $('#selPreset').innerHTML = Object.keys(PRESETS_REF).map(function (k) { return '<option value="' + k + '"' + (k === E.cfg.refPreset ? ' selected' : '') + '>' + PRESETS_REF[k].nome + '</option>'; }).join('');
    $('#fontePreset').textContent = 'Fonte da base selecionada: ' + (PRESETS_REF[$('#selPreset').value] || {}).fonte;
    $('#formRefs').innerHTML = CAMPOS_REF.map(function (c) { return '<label class="campo">' + c[1] + '<span class="ent"><input type="number" step="0.01" data-r="' + c[0] + '" value="' + (r[c[0]] == null ? '' : r[c[0]]) + '"> ' + c[2] + '</span></label>'; }).join('');
  }

  /* ---------- Ajuda ---------- */
  function renderAjuda() {
    if ($('#ajudaTxt').innerHTML) return;
    var h = '<h3>Fluxo de uso</h3><ol>' +
      '<li><b>Abrir exame</b> — .mpx do Multiplex (lido direto) ou .txt/.csv exportado. Nada sai do computador.</li>' +
      '<li><b>Sonda e região</b> — escolha onde está o ESE: <i>cluster proximal</i> (exame padrão) ou <i>E-sleeve distal</i> (protocolo do estudo, retirada da sonda com paciente sentado). Ajuste posições dos canais se a sonda for outra.</li>' +
      '<li><b>Compensação postural</b> — informe se o paciente estava deitado, se o Multiplex já compensou, ou aplique a correção hidrostática pelo ângulo.</li>' +
      '<li><b>Análise</b> — deglutições encontradas de forma automática, pelos marcadores do Multiplex ou clicando no mapa. Escolha as 3 mais representativas automaticamente ou marque à mão. Ajuste abertura e centro do ESE quando necessário; exclua tosse, deglutições sequenciais e artefatos.</li>' +
      '<li><b>Laudo e planilha</b> — impressão diagnóstica sugerida (editável), tabela de médias/medianas/DP e exportação para Excel.</li></ol>' +
      '<h3>Como ler o mapa</h3><p>Eixo vertical: posição na sonda (cm a partir da ponta; para cima = faringe). Eixo horizontal: tempo (zero = início da abertura do ESE). Cores: pressão (azul baixa, vermelho/roxo alta). A linha preta é o contorno isobárico de 30 mmHg; o ESE em repouso aparece como faixa quente horizontal e “some” (hiato) durante a abertura.</p>' +
      '<h3>Parâmetros</h3><ul>' + Analise.METRICAS.map(function (m) { return '<li><b>' + m.nome + '</b> (' + m.un + '): ' + m.ajuda + '</li>'; }).join('') +
      '<li><b>Coordenação faringoesofágica</b>: pico da contração faríngea coincidente com o hiato da abertura completa do ESE.</li></ul>' +
      '<h3>Método</h3><p>As linhas de pressão são interpoladas a cada 1 mm entre canais. O centro do ESE é o meio da zona acima do contorno no repouso pré-deglutição. A pressão do ESE durante a deglutição é o máximo de uma banda que acompanha a elevação laríngea (por padrão até 2 cm acima do centro). A abertura é o intervalo em que essa pressão fica abaixo do contorno; quando o ESE em repouso não atinge o contorno, usa-se limiar relativo (% do repouso). Todos os parâmetros são configuráveis em Sonda e região.</p>' +
      '<h3>Limitações</h3><p>O laudo é uma sugestão para o médico. Referências diferem entre sistemas (solid state × perfusão) e devem ser substituídas pelos valores da casuística do estudo assim que disponíveis.</p>';
    $('#ajudaTxt').innerHTML = h;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- eventos ---------- */
  function ligar() {
    $('#menuToggle').onclick = function () { $('#app').classList.toggle('recolhido'); try { localStorage.setItem('ese-menu', $('#app').classList.contains('recolhido') ? '1' : '0'); } catch (e) {} setTimeout(renderPagina, 220); };
    try { if (localStorage.getItem('ese-menu') === '1') $('#app').classList.add('recolhido'); } catch (e) {}
    $$('.menu nav a').forEach(function (a) { a.onclick = function () { irPara(a.dataset.pg); }; });
    $('#arquivo').onchange = function () { abrir(this.files[0]); this.value = ''; };
    var dr = $('#drop');
    ['dragover', 'dragenter'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); dr.classList.add('sobre'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); dr.classList.remove('sobre'); }); });
    document.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) abrir(e.dataTransfer.files[0]); });
    dr.onclick = function () { $('#arquivo').click(); };

    // Sonda
    $('#optRegiao').onchange = function (e) { E.cfg.regiaoModo = e.target.value; if (E.ex && e.target.value !== 'custom') montarCanaisCfg(); E.ajustes = {}; E.atual = -1; reprocessar(); };
    $('#selSonda').onchange = function () { E.cfg.sonda = this.value; if (E.ex) montarCanaisCfg(); reprocessar(); };
    $('#inpFs').onchange = function () { if (E.ex && +this.value > 0) { E.ex.fs = +this.value; reprocessar(); } };
    $('#btnPosArquivo').onclick = function () { if (!E.ex) return; E.ex.canais.forEach(function (c, i) { if (c.pos != null) E.canaisCfg[i].pos = c.pos; }); reprocessar(); };
    $('#tabCanais').onchange = function (e) {
      var t = e.target;
      if (t.dataset.pos != null) E.canaisCfg[+t.dataset.pos].pos = +t.value;
      if (t.dataset.reg != null) {
        E.canaisCfg[+t.dataset.reg].regiao = t.checked; E.cfg.regiaoModo = 'custom';
        E.cfg.regiaoCustom = E.canaisCfg.map(function (c, i) { return c.regiao ? i : -1; }).filter(function (i) { return i >= 0; });
        $$('#optRegiao input').forEach(function (r) { r.checked = r.value === 'custom'; });
      }
      reprocessar(false);
    };
    $('#formParam').onchange = function (e) { var k = e.target.dataset.k; if (!k) return; var v = parseFloat(e.target.value); if (isFinite(v)) { E.cfg[k] = v; reprocessar(false); } };
    $('#btnParamPadrao').onclick = function () { PARAMS.forEach(function (p) { E.cfg[p[0]] = CFG_PADRAO[p[0]]; }); reprocessar(); };

    // Compensação
    $('#optComp').onchange = function (e) { E.cfg.comp.modo = e.target.value; reprocessar(); };
    $('#formComp').oninput = function (e) {
      var k = e.target.dataset.c; if (!k) return; var v = parseFloat(e.target.value);
      if (k === 'angulo') $('#angVal').textContent = v + '°';
      E.cfg.comp[k] = isFinite(v) ? v : null;
      clearTimeout(_deb); _deb = setTimeout(function () { processar(); salvarCfg(); renderVerif(); }, 250);
    };

    // Análise
    $('#segFonte').onclick = function (e) { var v = e.target.dataset.v; if (!v) return; E.cfg.fonteDeg = v; E.atual = -1; reprocessar(); };
    $('#segSel').onclick = function (e) { var v = e.target.dataset.v; if (!v) return; if (v === 'manual' && E.cfg.selecaoModo === 'auto') E.lista.forEach(function (m) { if (m.selecionada) E.selManual[m.chave] = true; }); E.cfg.selecaoModo = v; reprocessar(); };
    $('#segTrecho').onclick = function (e) { var v = e.target.dataset.v; if (!v) return; E.cfg.trechoModo = v; if (v === 'manual') { toast('Arraste no mapa para definir o trecho.'); } reprocessar(); };
    $('#tabDeg').onclick = function (e) {
      if (e.target.dataset.sel != null) { var m = E.lista[+e.target.dataset.sel]; if (e.target.checked) E.selManual[m.chave] = true; else delete E.selManual[m.chave]; reprocessar(); return; }
      var tr = e.target.closest('tr[data-i]'); if (!tr) return; E.atual = +tr.dataset.i; desenharVisao(); renderTabDeg(); renderDetalhe();
    };
    $('#btnAnt').onclick = function () { if (E.atual > 0) { E.atual--; desenharVisao(); renderTabDeg(); renderDetalhe(); } };
    $('#btnProx').onclick = function () { if (E.atual < E.lista.length - 1) { E.atual++; desenharVisao(); renderTabDeg(); renderDetalhe(); } };
    $('#btnAjAb').onclick = function () { if (!E.lista[E.atual]) return; E.modoAjuste = 'ab1'; E.ajusteTmp = null; aviso('Clique no INÍCIO da abertura (hiato) no mapa da deglutição.'); };
    $('#btnAjCentro').onclick = function () { if (!E.lista[E.atual]) return; E.modoAjuste = 'centro'; aviso('Clique na altura do centro do ESE no mapa da deglutição.'); };
    $('#btnRestaurar').onclick = function () { var m = E.lista[E.atual]; if (!m) return; var ex = E.ajustes[m.chave] && E.ajustes[m.chave].excluida; delete E.ajustes[m.chave]; if (ex) E.ajustes[m.chave] = { excluida: true }; reprocessar(); };
    $('#btnExcluir').onclick = function () { var m = E.lista[E.atual]; if (!m) return; var a = E.ajustes[m.chave] = E.ajustes[m.chave] || {}; a.excluida = !a.excluida; if (a.excluida) delete E.selManual[m.chave]; reprocessar(); };

    var cvV = $('#cvVisao');
    cvV.onmousedown = function (e) {
      if (!E.ex || !V.area) return;
      var x = e.offsetX;
      if (E.cfg.trechoModo === 'manual') { V.arrasto = [x, x]; return; }
      var t = Math.round(tDe(x));
      if (E.cfg.fonteDeg === 'manual') {
        if (e.shiftKey) { var k = maisProx(t); if (k >= 0 && Math.abs(E.lista[k].abIni - t) < 3 * E.ex.fs) { var ch = E.lista[k].chave; E.manuais = E.manuais.filter(function (q) { return q !== ch; }); } }
        else { E.manuais.push(Math.round(t - 0.5 * E.ex.fs)); }
        E.atual = -1; reprocessar(); return;
      }
      var i = maisProx(t); if (i >= 0) { E.atual = i; desenharVisao(); renderTabDeg(); renderDetalhe(); }
    };
    cvV.onmousemove = function (e) { if (V.arrasto) { V.arrasto[1] = e.offsetX; desenharVisao(); } };
    window.addEventListener('mouseup', function () {
      if (!V.arrasto) return;
      var a = tDe(Math.min(V.arrasto[0], V.arrasto[1])), b = tDe(Math.max(V.arrasto[0], V.arrasto[1])); V.arrasto = null;
      if (b - a > 5 * E.ex.fs) { E.cfg.trechoIni = Math.max(0, a / E.ex.fs); E.cfg.trechoFim = b / E.ex.fs; E.atual = -1; reprocessar(); } else desenharVisao();
    });
    $('#cvDet').onclick = function (e) {
      if (!E.modoAjuste || !D.area) return;
      var m = E.lista[E.atual], t = D.j[0] + (e.offsetX - D.area.x) / D.area.w * (D.j[1] - D.j[0]), z = D.zTop - (e.offsetY - D.area.y) / D.area.h * (D.zTop - D.zBot);
      var a = E.ajustes[m.chave] = E.ajustes[m.chave] || {};
      if (E.modoAjuste === 'ab1') { E.ajusteTmp = t; E.modoAjuste = 'ab2'; aviso('Agora clique no FIM da abertura.'); renderDetalhe(); return; }
      if (E.modoAjuste === 'ab2') { a.abIni = Math.min(E.ajusteTmp, t); a.abFim = Math.max(E.ajusteTmp, t); }
      if (E.modoAjuste === 'centro') a.centro = z;
      E.modoAjuste = null; E.ajusteTmp = null; aviso(null); reprocessar();
    };

    // Laudo
    $('#btnExcel').onclick = function () { if (E.ex) Exportar.excel(E); };
    $('#btnCsv').onclick = function () { if (E.ex) Exportar.csv(E); };
    $('#btnImprimir').onclick = function () { window.print(); };

    // Referências
    $('#selPreset').onchange = function () { $('#fontePreset').textContent = 'Fonte da base selecionada: ' + PRESETS_REF[this.value].fonte; };
    $('#btnAplicarPreset').onclick = function () { var k = $('#selPreset').value; E.cfg.refPreset = k; E.cfg.refs = clone(PRESETS_REF[k]); reprocessar(); toast('Base de referência carregada.'); };
    $('#formRefs').onchange = function (e) { var k = e.target.dataset.r; if (!k) return; var v = e.target.value === '' ? null : parseFloat(e.target.value); E.cfg.refs[k] = isFinite(v) ? v : null; reprocessar(false); };

    window.addEventListener('resize', function () { clearTimeout(ligar._r); ligar._r = setTimeout(renderPagina, 200); });
    document.addEventListener('keydown', function (e) { if (E.pagina !== 'analise' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') $('#btnProx').click(); if (e.key === 'ArrowLeft') $('#btnAnt').click(); if (e.key === 'Escape') { E.modoAjuste = null; E.ajusteTmp = null; aviso(null); } });
  }
  function maisProx(t) { var b = -1, d = 1e12; E.lista.forEach(function (m, i) { var x = Math.abs(m.abIni - t); if (x < d) { d = x; b = i; } }); return b; }
  function aviso(txt) { var a = $('#avisoAjuste'); a.hidden = !txt; a.className = 'aviso info'; a.textContent = txt || ''; }

  /* ---------- início ---------- */
  E.cfg = carregarCfg();
  $('#rodape').textContent = CONFIG.SISTEMA + ' v' + CONFIG.VERSAO + '•Desenvolvido por ' + CONFIG.DESENVOLVEDOR;
  document.title = CONFIG.SISTEMA + ' v' + CONFIG.VERSAO;
  ligar();
  irPara('exame');
  window.__ESE = E; // depuração
})();
