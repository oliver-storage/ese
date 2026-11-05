/* Núcleo de análise do ESE: grade espacial, compensação, detecção, métricas, seleção, estatística */
var Analise = (function () {

  var DZ = 0.1; // resolução da grade (cm)

  /* Compensação postural / zero. Retorna novo array de canais (dados corrigidos). */
  function compensar(ex, comp) {
    var fs = ex.fs;
    return ex.canais.map(function (c) {
      var d = c.dados, off = 0;
      if (comp.modo === 'hidrostatica') {
        var ref = comp.refPos == null ? Math.min.apply(null, ex.canais.map(function (k) { return k.pos; })) : comp.refPos;
        off = comp.sinal * comp.coef * (c.pos - ref) * Math.sin(comp.angulo * Math.PI / 180);
      } else if (comp.modo === 'janela') {
        var a = Math.max(0, Math.round(comp.zIni * fs)), b = Math.min(d.length, Math.round(comp.zFim * fs));
        if (b > a) { var v = Array.prototype.slice.call(d, a, b).sort(function (x, y) { return x - y; }); off = -v[v.length >> 1]; }
      }
      if (!off) return { nome: c.nome, pos: c.pos, dados: d, off: 0 };
      var n = new Float32Array(d.length);
      for (var i = 0; i < d.length; i++) n[i] = d[i] + off;
      return { nome: c.nome, pos: c.pos, dados: n, off: off };
    });
  }

  /* Grade espacial (interpolação linear entre canais), z do proximal (topo) ao distal */
  function grade(canais, idx) {
    var cs = idx.map(function (i) { return canais[i]; }).filter(Boolean).sort(function (a, b) { return b.pos - a.pos; });
    var zTop = cs[0].pos, zBot = cs[cs.length - 1].pos;
    var nR = Math.round((zTop - zBot) / DZ) + 1, N = cs[0].dados.length;
    var z = new Float32Array(nR), linhas = [];
    var k = 0;
    for (var r = 0; r < nR; r++) {
      var zz = zTop - r * DZ; z[r] = zz;
      while (k < cs.length - 2 && cs[k + 1].pos > zz + 1e-6) k++;
      var a = cs[k], b = cs[Math.min(k + 1, cs.length - 1)];
      var w = a.pos === b.pos ? 0 : (a.pos - zz) / (a.pos - b.pos);
      w = Math.max(0, Math.min(1, w));
      var L = new Float32Array(N), da = a.dados, db = b.dados;
      if (w < 1e-6) L.set(da); else if (w > 1 - 1e-6) L.set(db);
      else for (var t = 0; t < N; t++) L[t] = da[t] * (1 - w) + db[t] * w;
      linhas.push(L);
    }
    return { z: z, linhas: linhas, N: N, zTop: zTop, zBot: zBot, canais: cs };
  }

  function rowDe(g, zz) { var r = Math.round((g.zTop - zz) / DZ); return Math.max(0, Math.min(g.linhas.length - 1, r)); }

  /* Perfil médio (repouso) entre amostras a..b */
  function perfil(g, a, b) {
    a = Math.max(0, a); b = Math.min(g.N, b);
    var p = new Float32Array(g.linhas.length);
    for (var r = 0; r < p.length; r++) { var s = 0, L = g.linhas[r]; for (var t = a; t < b; t++) s += L[t]; p[r] = s / Math.max(1, b - a); }
    return p;
  }

  /* Analisa o perfil de repouso: centro, bordas no contorno, extensão, pressões */
  function repouso(g, p, contorno) {
    var rMax = 0;
    for (var r = 1; r < p.length; r++) if (p[r] > p[rMax]) rMax = r;
    var res = { centro: g.z[rMax], max: p[rMax], rCentro: rMax };
    if (p[rMax] < contorno) { res.ext = 0; res.media = p[rMax]; res.sup = res.inf = g.z[rMax]; res.abaixoContorno = true; return res; }
    var a = rMax, b = rMax;
    while (a > 0 && p[a - 1] >= contorno) a--;
    while (b < p.length - 1 && p[b + 1] >= contorno) b++;
    // bordas interpoladas
    var zs = a > 0 ? g.z[a] + DZ * (p[a] - contorno) / (p[a] - p[a - 1]) : g.z[a];
    var zi = b < p.length - 1 ? g.z[b] - DZ * (p[b] - contorno) / (p[b] - p[b + 1]) : g.z[b];
    var s = 0; for (var k = a; k <= b; k++) s += p[k];
    res.sup = zs; res.inf = zi; res.ext = zs - zi; res.media = s / (b - a + 1);
    res.bordaSup = a === 0; res.bordaInf = b === p.length - 1;
    // centro = ponto médio da zona de alta pressão (mais estável que o pico)
    res.centro = (zs + zi) / 2;
    return res;
  }

  /* Série "sleeve": máximo da banda [c-abaixo, c+acima] */
  function sleeve(g, c, cfg, a, b) {
    var r0 = rowDe(g, c + cfg.bandaAcima), r1 = rowDe(g, c - cfg.bandaAbaixo);
    a = Math.max(0, a); b = Math.min(g.N, b);
    var s = new Float32Array(b - a);
    for (var t = a; t < b; t++) { var m = -1e9; for (var r = r0; r <= r1; r++) { var v = g.linhas[r][t]; if (v > m) m = v; } s[t - a] = m; }
    return s;
  }

  function pico(g, z0, z1, a, b) { // z0>z1 (z0 proximal)
    var r0 = rowDe(g, z0), r1 = rowDe(g, z1);
    a = Math.max(0, a); b = Math.min(g.N, b);
    var best = { v: -1e9, t: a, z: g.z[r0] };
    for (var r = r0; r <= r1; r++) { var L = g.linhas[r]; for (var t = a; t < b; t++) if (L[t] > best.v) { best.v = L[t]; best.t = t; best.z = g.z[r]; } }
    return best;
  }

  function integral(g, z0, z1, a, b, lim, fs) {
    var r0 = rowDe(g, z0), r1 = rowDe(g, z1), s = 0;
    a = Math.max(0, a); b = Math.min(g.N, b);
    for (var r = r0; r <= r1; r++) { var L = g.linhas[r]; for (var t = a; t < b; t++) if (L[t] >= lim) s += L[t]; }
    return s * (1 / fs) * DZ;
  }

  /* Encontra a abertura (hiato) do ESE em [a,b]: maior trecho com sleeve < limiar */
  function acharAbertura(s, a0, lim, durMinAm) {
    var runs = [], i = 0;
    while (i < s.length) {
      if (s[i] < lim) { var j = i; while (j + 1 < s.length && s[j + 1] < lim) j++; runs.push([i, j]); i = j + 1; } else i++;
    }
    // une trechos separados por <= 2 amostras
    var u = [];
    runs.forEach(function (r) { if (u.length && r[0] - u[u.length - 1][1] <= 2) u[u.length - 1][1] = r[1]; else u.push(r.slice()); });
    u = u.filter(function (r) { return r[1] - r[0] + 1 >= durMinAm; });
    if (!u.length) return null;
    u.sort(function (x, y) { return (y[1] - y[0]) - (x[1] - x[0]); });
    var r = u[0];
    // instantes interpolados de cruzamento
    var ti = r[0] > 0 ? r[0] - (lim - s[r[0]]) / (s[r[0] - 1] - s[r[0]]) : r[0];
    var tf = r[1] < s.length - 1 ? r[1] + (lim - s[r[1]]) / (s[r[1] + 1] - s[r[1]]) : r[1];
    return { i: r[0] + a0, f: r[1] + a0, ti: ti + a0, tf: tf + a0 };
  }

  /* Mede uma deglutição. sw: {ancora (amostra), abIni?, abFim? (manuais), centro? (manual)} */
  function medir(g, sw, cfg, fs, todosCanais) {
    var out = { ancora: sw.ancora, flags: [] };
    var abIni = sw.ancora, abertura = null, rep, lim, s0;
    for (var passo = 0; passo < 2; passo++) {
      var ra = Math.round(abIni + cfg.repIni * fs), rb = Math.round(abIni + cfg.repFim * fs);
      var p = perfil(g, ra, rb);
      rep = repouso(g, p, cfg.contorno);
      if (sw.centro != null) rep.centro = sw.centro;
      lim = rep.max >= cfg.contorno ? cfg.contorno : rep.max * cfg.limiarRelPct / 100;
      if (sw.abIni != null && sw.abFim != null) { abertura = { i: Math.round(sw.abIni), f: Math.max(Math.round(sw.abIni), Math.round(sw.abFim)), ti: sw.abIni, tf: sw.abFim, manual: true }; break; }
      var a = Math.round(sw.ancora - (passo ? 0.3 : 0.8) * fs), b = Math.round(sw.ancora + (passo ? 1.5 : 3.0) * fs);
      if (passo) { a = Math.round(abertura ? abertura.i - 0.3 * fs : a); b = Math.round(abertura ? abertura.f + 0.6 * fs : b); }
      s0 = sleeve(g, rep.centro, cfg, a, b);
      var ab = acharAbertura(s0, Math.max(0, a), lim, Math.max(1, Math.round(cfg.durMin * fs)));
      if (!ab) { if (!passo) break; else break; }
      abertura = ab; abIni = ab.i;
    }
    out.repouso = rep; out.limiar = lim; out.limiarRelativo = lim !== cfg.contorno;
    out.ext = rep.ext; out.pRepouso = rep.media; out.pRepousoMax = rep.max; out.centro = rep.centro;
    out.eseSup = rep.sup; out.eseInf = rep.inf;
    if (rep.abaixoContorno) out.flags.push('Repouso abaixo do contorno de ' + cfg.contorno + ' mmHg');
    if (rep.bordaSup || rep.bordaInf) out.flags.push('ESE na borda da região — confira o posicionamento');

    var c = rep.centro;
    var zBandaTop = c + cfg.bandaAcima, zBandaBot = c - cfg.bandaAbaixo;
    out.zBandaTop = zBandaTop; out.zBandaBot = zBandaBot;

    if (!abertura) {
      out.semAbertura = true; out.flags.push('Abertura não identificada');
      abertura = { i: sw.ancora, f: sw.ancora, ti: sw.ancora, tf: sw.ancora };
    }
    out.abIni = abertura.ti; out.abFim = abertura.tf; out.abManual = !!abertura.manual;
    out.tAbertura = out.semAbertura ? 0 : (abertura.tf - abertura.ti) / fs;

    // residual
    var sa = sleeve(g, c, cfg, abertura.i, abertura.f + 1), soma = 0, nad = 1e9;
    for (var k = 0; k < sa.length; k++) { soma += sa[k]; if (sa[k] < nad) nad = sa[k]; }
    out.residual = soma / sa.length; out.nadir = nad;
    var w = Math.max(1, Math.round(0.2 * fs)), irp = 1e9;
    var sw2 = sleeve(g, c, cfg, abertura.i - w, abertura.f + w);
    for (var k2 = 0; k2 + w <= sw2.length; k2++) { var m = 0; for (var q = 0; q < w; q++) m += sw2[k2 + q]; m /= w; if (m < irp) irp = m; }
    out.irp02 = irp < 1e8 ? irp : out.residual;

    // faringe
    var zFarBot = Math.min(g.zTop, zBandaTop + (cfg.farAfast || 0) + DZ), zFarTop = Math.min(g.zTop, zFarBot + cfg.faringeAltura);
    out.zFarTop = zFarTop; out.zFarBot = zFarBot;
    var fa = Math.round(abertura.i + cfg.farIni * fs), fb = Math.round(abertura.f + cfg.farFim * fs);
    out.farJan = [fa, fb];
    if (zFarBot >= g.zTop - 1e-6) { out.flags.push('Sem canais de faringe acima do ESE'); out.picoFar = null; }
    else {
      var pf = pico(g, zFarTop, zFarBot, fa, fb);
      out.picoFar = pf.v; out.tPicoFar = pf.t; out.zPicoFar = pf.z;
      out.phci = integral(g, zFarTop, zFarBot, fa, fb, cfg.limiarIntegral, fs);
      out.coord = !out.semAbertura && pf.t >= abertura.ti - cfg.tolCoord * fs && pf.t <= abertura.tf + cfg.tolCoord * fs;
      out.dtCoord = (pf.t - abertura.ti) / fs;
    }
    // pós-deglutição (esôfago superior)
    var pa = Math.round(abertura.f), pb = Math.round(abertura.f + cfg.posJanela * fs);
    var zPosTop = zBandaTop, zPosBot = Math.max(g.zBot, c - cfg.posAbaixo);
    out.zPosTop = zPosTop; out.zPosBot = zPosBot; out.posJan = [pa, pb];
    var pp = pico(g, zPosTop, zPosBot, pa, pb);
    out.picoPos = pp.v; out.tPicoPos = pp.t; out.zPicoPos = pp.z;
    out.uesci = integral(g, zPosTop, zPosBot, pa, pb, cfg.limiarIntegral, fs);

    leuven(g, out, abertura, cfg, fs);

    // artefato: pressão alta simultânea em >= 70% dos canais (tosse/esforço)
    if (todosCanais) {
      var a3 = Math.round(abertura.i - 1 * fs), b3 = Math.round(abertura.f + 2 * fs), cont = 0;
      todosCanais.forEach(function (ch) { var mx = -1e9; for (var t = Math.max(0, a3); t < Math.min(ch.dados.length, b3); t++) if (ch.dados[t] > mx) mx = ch.dados[t]; if (mx > 80) cont++; });
      if (cont >= todosCanais.length * 0.7) { out.artefato = true; out.flags.push('Possível artefato (tosse/esforço)'); }
    }
    return out;
  }

  /* Métricas no padrão do Consenso de Leuven (2025/2026), adaptadas a manometria sem impedância */
  function mediana(v) { var s = Array.prototype.slice.call(v).filter(isFinite).sort(function (a, b) { return a - b; }); if (!s.length) return null; var n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  function leuven(g, out, ab, cfg, fs) {
    var L = out.leuven = {};
    var c = out.centro;
    // linha de base do e-sleeve (repouso pré-deglutição)
    var ra = Math.round(ab.i + cfg.repIni * fs), rb = Math.round(ab.i + cfg.repFim * fs);
    var base = mediana(sleeve(g, c, cfg, ra, rb)) || 0;
    L.base = base;
    // UES RT: intervalo com e-sleeve abaixo de 50% da linha de base ou 35 mmHg (o que for menor)
    var thr = Math.min(0.5 * base, 35); L.limiarRT = thr;
    var wa = Math.round(ab.i - 1.0 * fs), wb = Math.round(ab.f + 1.0 * fs);
    var s = sleeve(g, c, cfg, wa, wb), a0 = Math.max(0, wa);
    var kMin = 0; for (var k = 0; k < s.length; k++) if (s[k] < s[kMin]) kMin = k;
    // nadir deve cair dentro (ou perto) da abertura
    var kAb = Math.round((ab.ti + ab.tf) / 2) - a0; if (kAb >= 0 && kAb < s.length && Math.abs(kAb - kMin) > 0.8 * fs) kMin = Math.max(0, Math.min(s.length - 1, kAb));
    if (s[kMin] < thr) {
      var gap = Math.max(1, Math.round(0.1 * fs)), i = kMin, j = kMin, q2;
      for (;;) { while (i > 0 && s[i - 1] < thr) i--; q2 = i - 1; while (q2 >= 0 && i - q2 <= gap && s[q2] >= thr) q2--; if (q2 >= 0 && i - q2 <= gap && s[q2] < thr) i = q2; else break; }
      for (;;) { while (j < s.length - 1 && s[j + 1] < thr) j++; q2 = j + 1; while (q2 < s.length && q2 - j <= gap && s[q2] >= thr) q2++; if (q2 < s.length && q2 - j <= gap && s[q2] < thr) j = q2; else break; }
      var ti = i > 0 ? i - (thr - s[i]) / (s[i - 1] - s[i]) : i, tf = j < s.length - 1 ? j + (thr - s[j]) / (s[j + 1] - s[j]) : j;
      L.rt = (tf - ti) / fs; L.rtIni = ti + a0; L.rtFim = tf + a0; L.rtI = i + a0; L.rtF = j + a0;
    } else { L.rt = 0; L.rtIni = L.rtFim = kMin + a0; L.rtI = L.rtF = kMin + a0; }
    // UES IRP: mediana das menores amostras não consecutivas que somem 0,25 s, dentro da janela de relaxamento
    var n = Math.max(1, Math.round(0.25 * fs));
    var ja = Math.max(0, L.rtI - Math.round(0.25 * fs)) - a0, jb = Math.min(s.length - 1, L.rtF + Math.round(0.25 * fs) - a0);
    var v = []; for (var q = Math.max(0, ja); q <= Math.max(ja, jb); q++) v.push(s[q]);
    v.sort(function (x, y) { return x - y; });
    L.irp = mediana(v.slice(0, n));
    // Ápice do ESE (posição mais proximal da zona de alta pressão no fechamento) ~ topo da banda
    var apice = Math.min(g.zTop, c + cfg.bandaAcima); L.apice = apice;
    // IBP estimada: 1 cm acima do ápice, mediana nos primeiros 60% do RT (antes da onda de clareamento)
    var zI = apice + 1;
    if (zI <= g.zTop + 1e-6 && L.rt > 0) {
      var r = rowDe(g, zI), lin = g.linhas[r];
      var e1 = Math.round(L.rtI + 0.6 * (L.rtF - L.rtI)); if (e1 <= L.rtI) e1 = L.rtI + 1;
      L.ibp = mediana(lin.subarray(L.rtI, e1 + 1));
      L.hipoBase = mediana(lin.subarray(Math.max(0, ra), Math.max(ra + 1, rb)));
      L.pressurizacao = L.ibp != null && L.hipoBase != null && L.ibp - L.hipoBase > 20;
      L.zIbp = zI;
    } else { L.ibp = null; L.pressurizacao = null; }
    // Segmentos faríngeos (distância acima do ápice): hipo 1–4 cm, meso 4–7 cm, velo 7–10 cm
    var segs = [['hipo', 1, cfg.segHipo || 4], ['meso', cfg.segHipo || 4, cfg.segMeso || 7], ['velo', cfg.segMeso || 7, cfg.segVelo || 10]];
    var fa = Math.round(ab.i + cfg.farIni * fs), fb = Math.round(ab.f + cfg.farFim * fs);
    L.seg = {};
    segs.forEach(function (sg) {
      var z0 = apice + sg[1], z1 = apice + sg[2];
      var cob = Math.max(0, Math.min(z1, g.zTop) - z0) / (z1 - z0);
      var o = { de: sg[1], ate: sg[2], cobertura: cob };
      if (cob >= 0.5) {
        var zt = Math.min(z1, g.zTop), r0 = rowDe(g, zt), r1 = rowDe(g, z0), picos = [], soma = 0, pmax = -1e9;
        for (var rr = r0; rr <= r1; rr++) {
          var Lr = g.linhas[rr], m = -1e9;
          for (var t = Math.max(0, fa); t < Math.min(g.N, fb); t++) { if (Lr[t] > m) m = Lr[t]; soma += Math.max(0, Lr[t]); }
          picos.push(m); if (m > pmax) pmax = m;
        }
        o.pico = pmax; o.picoMedio = picos.reduce(function (a, b) { return a + b; }, 0) / picos.length;
        o.ci = soma / fs * DZ;
      }
      L.seg[sg[0]] = o;
    });
  }

  /* Trechos com ESE presente na região (zona de alta pressão estável) */
  function trechosAuto(g, cfg, fs) {
    var bloco = Math.round(5 * fs), ok = [];
    for (var a = 0; a < g.N; a += bloco) {
      var b = Math.min(g.N, a + bloco), p = new Float32Array(g.linhas.length);
      for (var r = 0; r < p.length; r++) { var v = Array.prototype.slice.call(g.linhas[r], a, b).sort(function (x, y) { return x - y; }); p[r] = v[v.length >> 1]; }
      var mx = 0, rm = 0; for (var r2 = 0; r2 < p.length; r2++) if (p[r2] > mx) { mx = p[r2]; rm = r2; }
      // ESE: zona focal (pico bem maior que a mediana do perfil)
      var med = Array.prototype.slice.call(p).sort(function (x, y) { return x - y; })[p.length >> 1];
      ok.push(mx >= cfg.contorno * 0.6 && mx > med + 15 && rm > 0 && rm < p.length - 1);
    }
    var tr = [], i = 0;
    while (i < ok.length) { if (ok[i]) { var j = i; while (j + 1 < ok.length && (ok[j + 1] || (j + 2 < ok.length && ok[j + 2]))) j++; tr.push([i * bloco, Math.min(g.N, (j + 1) * bloco)]); i = j + 1; } else i++; }
    return tr.filter(function (t) { return t[1] - t[0] >= 20 * fs; });
  }

  /* Detecção automática de deglutições dentro dos trechos */
  function detectar(g, cfg, fs, trechos) {
    var cand = [];
    trechos.forEach(function (tr) {
      var bloco = Math.round(10 * fs);
      for (var a = tr[0]; a < tr[1]; a += bloco) {
        var b = Math.min(tr[1], a + bloco);
        var p = new Float32Array(g.linhas.length);
        for (var r = 0; r < p.length; r++) { var v = Array.prototype.slice.call(g.linhas[r], a, b).sort(function (x, y) { return x - y; }); p[r] = v[v.length >> 1]; }
        var rep = repouso(g, p, cfg.contorno);
        var lim = rep.max >= cfg.contorno ? cfg.contorno : rep.max * cfg.limiarRelPct / 100;
        var s = sleeve(g, rep.centro, cfg, a, b), i = 0;
        while (i < s.length) {
          if (s[i] < lim) {
            var j = i; while (j + 1 < s.length && s[j + 1] < lim) j++;
            var dur = (j - i + 1) / fs;
            if (dur >= cfg.durMin && dur <= (cfg.durMax || 2)) {
              var t0 = a + i;
              // repouso antes acima do limiar
              var pre = sleeve(g, rep.centro, cfg, Math.round(t0 - 2.5 * fs), Math.round(t0 - 0.7 * fs));
              var pv = Array.prototype.slice.call(pre).sort(function (x, y) { return x - y; })[pre.length >> 1] || 0;
              // contração pós-relaxamento
              var pos = pico(g, rep.centro + cfg.bandaAcima, Math.max(g.zBot, rep.centro - cfg.posAbaixo), a + j, Math.round(a + j + 2.5 * fs));
              if (pv >= lim && pos.v >= lim * 2) cand.push(t0);
            }
            i = j + 1;
          } else i++;
        }
      }
    });
    cand.sort(function (x, y) { return x - y; });
    var out = [];
    cand.forEach(function (t) { if (!out.length || t - out[out.length - 1] >= cfg.intervaloMin * fs) out.push(t); });
    return out;
  }

  function marcarSequenciais(lista, cfg, fs) {
    for (var i = 0; i < lista.length; i++) {
      var m = lista[i];
      var ant = i > 0 ? (m.abIni - lista[i - 1].abIni) / fs : 1e9, prox = i < lista.length - 1 ? (lista[i + 1].abIni - m.abIni) / fs : 1e9;
      m.sequencial = ant < cfg.intervaloSeq || prox < cfg.intervaloSeq;
      if (m.sequencial && m.flags.indexOf('Deglutição sequencial') < 0) m.flags.push('Deglutição sequencial');
    }
  }

  /* Seleção automática das N mais representativas (mais próximas da mediana) */
  function selecionarAuto(lista, n) {
    var val = lista.filter(function (m) { return !m.semAbertura && !m.artefato && !m.sequencial && !m.excluida; });
    if (val.length < n) val = lista.filter(function (m) { return !m.semAbertura && !m.artefato && !m.excluida; });
    var chaves = ['pRepouso', 'tAbertura', 'residual', 'picoFar', 'picoPos'];
    var est = chaves.map(function (k) {
      var v = val.map(function (m) { return m[k]; }).filter(function (x) { return x != null && isFinite(x); }).sort(function (a, b) { return a - b; });
      var med = v.length ? v[v.length >> 1] : 0;
      var mad = v.length ? v.map(function (x) { return Math.abs(x - med); }).sort(function (a, b) { return a - b; })[v.length >> 1] : 1;
      return { med: med, mad: mad || 1 };
    });
    val.forEach(function (m) { m.distancia = chaves.reduce(function (s, k, i) { var x = m[k]; return s + (x == null || !isFinite(x) ? 3 : Math.abs(x - est[i].med) / est[i].mad); }, 0); });
    var sel = val.slice().sort(function (a, b) { return a.distancia - b.distancia; }).slice(0, n);
    lista.forEach(function (m) { m.selecionada = sel.indexOf(m) >= 0; });
  }

  function estat(v) {
    v = v.filter(function (x) { return x != null && isFinite(x); });
    if (!v.length) return { n: 0 };
    var s = v.slice().sort(function (a, b) { return a - b; }), n = v.length;
    var media = v.reduce(function (a, b) { return a + b; }, 0) / n;
    var med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    var dp = n > 1 ? Math.sqrt(v.reduce(function (a, b) { return a + (b - media) * (b - media); }, 0) / (n - 1)) : 0;
    return { n: n, media: media, mediana: med, dp: dp, min: s[0], max: s[n - 1] };
  }

  var METRICAS = [
    { k: 'ext', nome: 'Extensão manométrica do ESE', un: 'cm', dec: 1, ref: ['extMin', 'extMax'],
      ajuda: 'Distância entre as bordas superior e inferior do ESE em repouso, delimitadas pelo contorno isobárico. ESE curto pode ocorrer na DRGE; o comprimento muda com a idade.' },
    { k: 'pRepouso', nome: 'Pressão de repouso do ESE (média)', un: 'mmHg', dec: 1, ref: ['repMedMin', 'repMedMax'],
      ajuda: 'Pressão média da área do ESE delimitada pelo contorno isobárico, antes da deglutição (definição do estudo). Por ser média dentro do contorno, fica sempre acima dele — compare apenas com a casuística do próprio estudo. Varia com ansiedade e tempo de sonda.' },
    { k: 'pRepousoMax', nome: 'Pressão basal do ESE (máxima no repouso)', un: 'mmHg', dec: 1, ref: ['repousoMin', 'repousoMax'],
      ajuda: 'Maior pressão do perfil de repouso — equivale à “pressão basal” dos sistemas convencionais e é comparada às referências publicadas (ex.: 34–104 mmHg). É a base da classificação hipotônico/hipertônico.' },
    { k: 'tAbertura', nome: 'Tempo de abertura do ESE', un: 's', dec: 2, ref: ['aberturaMin', 'aberturaMax'],
      ajuda: 'Duração do hiato pressórico (pressão do ESE abaixo do contorno) durante a deglutição. O estudo encontrou média de 0,5 s. Abertura curta ou ausente sugere relaxamento/abertura prejudicados.' },
    { k: 'residual', nome: 'Pressão residual do ESE (média na abertura)', un: 'mmHg', dec: 1, ref: null,
      ajuda: 'Pressão média do ESE durante o hiato. Deve ser menor que as pressões de repouso da faringe e do esôfago superior. Elevada = relaxamento incompleto (ex.: barra do cricofaríngeo, Zenker, fase avançada de doenças neurológicas).' },
    { k: 'irp02', nome: 'Pressão residual — menor média em 0,2 s', un: 'mmHg', dec: 1, ref: null,
      ajuda: 'Menor pressão média do ESE em uma janela contínua de 0,2 s (equivalente ao IRP 0,2 s dos sistemas solid state).' },
    { k: 'picoFar', nome: 'Pressão máxima de contração faríngea', un: 'mmHg', dec: 1, ref: ['faringeMin', 'faringeMax'],
      ajuda: 'Pico de pressão da faringe, acima da borda superior do ESE. Contração fraca é vista em síndromes neurológicas; aumentada no megaesôfago (Dantas e cols.).' },
    { k: 'picoPos', nome: 'Pressão máxima do esôfago superior pós-deglutição', un: 'mmHg', dec: 1, ref: ['posMin', 'posMax'],
      ajuda: 'Pico da contração pós-relaxamento do ESE e do esôfago superior, logo após o fechamento.' },
    { k: 'phci', nome: 'Integral contrátil faríngea', un: 'mmHg·cm·s', dec: 0, ref: ['phciMin', 'phciMax'],
      ajuda: 'Soma da pressão (acima do limiar configurado) na zona faríngea durante a deglutição — vigor contrátil da faringe.' },
    { k: 'uesci', nome: 'Integral contrátil do esôfago superior pós-deglutição', un: 'mmHg·cm·s', dec: 0, ref: null,
      ajuda: 'Soma da pressão na zona do ESE/esôfago superior após o fechamento. Descrita como aumentada na esofagite eosinofílica.' },
    { k: 'dtCoord', nome: 'Pico faríngeo − início da abertura', un: 's', dec: 2, ref: null,
      ajuda: 'Intervalo entre o início da abertura do ESE e o pico faríngeo. Coordenação normal: o pico ocorre durante a abertura.' }
  ];

  return {
    DZ: DZ, compensar: compensar, grade: grade, medir: medir, trechosAuto: trechosAuto, detectar: detectar,
    marcarSequenciais: marcarSequenciais, selecionarAuto: selecionarAuto, estat: estat, METRICAS: METRICAS,
    sleeve: sleeve, perfil: perfil, repouso: repouso, rowDe: rowDe
  };
})();
