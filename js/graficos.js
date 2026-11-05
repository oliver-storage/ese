/* Gráficos: mapa de cores (topografia de pressão), contorno isobárico, sobreposições e curvas */
var Graficos = (function () {

  var PARADAS = [[-10, [10, 15, 92]], [0, [21, 48, 200]], [15, [30, 144, 255]], [30, [0, 208, 192]], [45, [48, 208, 64]],
    [70, [240, 224, 32]], [100, [255, 106, 0]], [130, [224, 0, 16]], [150, [160, 0, 122]]];
  var LUT = null, LUT_MIN = -10, LUT_MAX = 150;

  function montarLUT(min, max) {
    LUT_MIN = min; LUT_MAX = max; LUT = new Uint8ClampedArray(256 * 3);
    var esc = (max - min) / 160; // reescala as paradas para a escala escolhida
    for (var i = 0; i < 256; i++) {
      var v = min + (max - min) * i / 255, vv = (v - min) / esc - 10, a = PARADAS[0], b = PARADAS[PARADAS.length - 1];
      for (var k = 0; k < PARADAS.length - 1; k++) if (vv >= PARADAS[k][0] && vv <= PARADAS[k + 1][0]) { a = PARADAS[k]; b = PARADAS[k + 1]; break; }
      if (vv < PARADAS[0][0]) b = a; if (vv > PARADAS[PARADAS.length - 1][0]) a = b;
      var w = a === b ? 0 : (vv - a[0]) / (b[0] - a[0]);
      for (var c = 0; c < 3; c++) LUT[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * w;
    }
  }
  function cor(v) { var i = Math.round((v - LUT_MIN) / (LUT_MAX - LUT_MIN) * 255); i = i < 0 ? 0 : i > 255 ? 255 : i; return [LUT[i * 3], LUT[i * 3 + 1], LUT[i * 3 + 2]]; }

  function prepararCanvas(cv, w, h) {
    var dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* Mapa a partir dos canais (interpolação por linha de pixel). área = {x,y,w,h} */
  function mapaCanais(ctx, canais, zTop, zBot, a, b, area, escala) {
    if (!LUT || escala.min !== LUT_MIN || escala.max !== LUT_MAX) montarLUT(escala.min, escala.max);
    var cs = canais.slice().sort(function (p, q) { return q.pos - p.pos; });
    var dpr = window.devicePixelRatio || 1;
    var W = Math.max(1, Math.round(area.w * dpr)), H = Math.max(1, Math.round(area.h * dpr));
    var img = ctx.createImageData(W, H), px = img.data, n = b - a;
    // linhas -> par de canais e peso
    var ia = new Int16Array(H), ib = new Int16Array(H), wv = new Float32Array(H);
    for (var y = 0; y < H; y++) {
      var z = zTop - (zTop - zBot) * (y + 0.5) / H, k = 0;
      while (k < cs.length - 2 && cs[k + 1].pos > z) k++;
      var A = cs[k], B = cs[Math.min(k + 1, cs.length - 1)];
      ia[y] = k; ib[y] = Math.min(k + 1, cs.length - 1);
      var w = A.pos === B.pos ? 0 : (A.pos - z) / (A.pos - B.pos); wv[y] = Math.max(0, Math.min(1, w));
    }
    var porPx = n / W;
    for (var x = 0; x < W; x++) {
      var t0 = a + x * porPx, t1 = a + (x + 1) * porPx;
      for (var y2 = 0; y2 < H; y2++) {
        var da = cs[ia[y2]].dados, db = cs[ib[y2]].dados, w2 = wv[y2], v;
        if (porPx > 1) {
          v = -1e9;
          for (var t = Math.floor(t0); t < Math.min(b, Math.ceil(t1)); t++) { var q = da[t] * (1 - w2) + db[t] * w2; if (q > v) v = q; }
        } else {
          var tf = t0, ti = Math.floor(tf), fr = tf - ti, tj = Math.min(b - 1, ti + 1);
          v = (da[ti] * (1 - fr) + da[tj] * fr) * (1 - w2) + (db[ti] * (1 - fr) + db[tj] * fr) * w2;
        }
        var c = cor(v), o = (y2 * W + x) * 4;
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    }
    // desenha em canvas temporário para respeitar o transform
    var tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.drawImage(tmp, area.x, area.y, area.w, area.h);
  }

  /* Contorno isobárico (marching squares) sobre a grade g, janela [a,b) */
  function contorno(ctx, g, a, b, nivel, area, zTop, zBot, cor2) {
    var L = g.linhas, nR = L.length, passoT = Math.max(1, Math.floor((b - a) / 600));
    var sx = area.w / (b - a), sy = area.h / (zTop - zBot);
    function X(t) { return area.x + (t - a) * sx; }
    function Y(r) { return area.y + (zTop - (g.zTop - r * Analise.DZ)) * sy; }
    ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
    ctx.strokeStyle = cor2 || '#000'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (var r = 0; r < nR - 1; r++) {
      var L0 = L[r], L1 = L[r + 1];
      for (var t = a; t < b - passoT; t += passoT) {
        var v0 = L0[t], v1 = L0[t + passoT], v2 = L1[t + passoT], v3 = L1[t];
        var c = (v0 >= nivel ? 8 : 0) | (v1 >= nivel ? 4 : 0) | (v2 >= nivel ? 2 : 0) | (v3 >= nivel ? 1 : 0);
        if (c === 0 || c === 15) continue;
        var tA = t, tB = t + passoT;
        function it(p, q) { return (nivel - p) / (q - p); }
        var top = [X(tA + it(v0, v1) * passoT), Y(r)], dir = [X(tB), Y(r + it(v1, v2))],
          bai = [X(tA + it(v3, v2) * passoT), Y(r + 1)], esq = [X(tA), Y(r + it(v0, v3))];
        var segs = { 1: [esq, bai], 2: [bai, dir], 3: [esq, dir], 4: [top, dir], 5: [esq, top, bai, dir], 6: [top, bai], 7: [esq, top],
          8: [esq, top], 9: [top, bai], 10: [esq, bai, top, dir], 11: [top, dir], 12: [esq, dir], 13: [bai, dir], 14: [esq, bai] }[c];
        for (var s = 0; s < segs.length; s += 2) { ctx.moveTo(segs[s][0], segs[s][1]); ctx.lineTo(segs[s + 1][0], segs[s + 1][1]); }
      }
    }
    ctx.stroke(); ctx.restore();
  }

  function eixoZ(ctx, area, zTop, zBot, passo) {
    ctx.save(); ctx.fillStyle = getCss('--texto-suave'); ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var z = Math.ceil(zBot / passo) * passo; z <= zTop + 1e-6; z += passo) {
      var y = area.y + (zTop - z) / (zTop - zBot) * area.h;
      ctx.fillText(Diagnostico.fmt(z, passo < 1 ? 1 : 0), area.x - 4, y);
      ctx.fillRect(area.x - 2, y, 2, 1);
    }
    ctx.restore();
  }
  function eixoT(ctx, area, a, b, fs, rel) {
    ctx.save(); ctx.fillStyle = getCss('--texto-suave'); ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var dur = (b - a) / fs, alvo = dur / 10, passos = [0.5, 1, 2, 5, 10, 20, 30, 60, 120, 300], p = passos[0];
    for (var i = 0; i < passos.length; i++) if (passos[i] >= alvo) { p = passos[i]; break; }
    var base = rel != null ? rel : 0;
    var ini = Math.ceil(((a - base) / fs) / p) * p;
    for (var s = ini; s <= (b - base) / fs; s += p) {
      var x = area.x + ((s * fs + base) - a) / (b - a) * area.w;
      ctx.fillText(rel != null ? (s > 0 ? '+' : '') + Diagnostico.fmt(s, p < 1 ? 1 : 0) : rotTempo(s), x, area.y + area.h + 3);
      ctx.fillRect(x, area.y + area.h, 1, 3);
    }
    ctx.restore();
  }
  function rotTempo(s) { s = Math.round(s); var m = Math.floor(s / 60), ss = s - m * 60; return m + ':' + (ss < 10 ? '0' : '') + ss; }

  function barraCores(ctx, x, y, w, h, escala) {
    if (!LUT) montarLUT(escala.min, escala.max);
    for (var i = 0; i < h; i++) { var v = escala.max - (escala.max - escala.min) * i / h, c = cor(v); ctx.fillStyle = 'rgb(' + c.join(',') + ')'; ctx.fillRect(x, y + i, w, 1); }
    ctx.fillStyle = getCss('--texto-suave'); ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    [escala.max, 100, 30, 0].forEach(function (v) { if (v <= escala.max && v >= escala.min) ctx.fillText(v, x + w + 3, y + (escala.max - v) / (escala.max - escala.min) * h); });
  }

  /* Curvas: séries [{v:Float32Array, cor, nome}] alinhadas em [a,b) */
  function curvas(ctx, area, series, a, b, fs, opts) {
    var vmax = opts.vmax || 50, vmin = opts.vmin != null ? opts.vmin : -10;
    series.forEach(function (s) { for (var i = 0; i < s.v.length; i++) if (s.v[i] > vmax) vmax = s.v[i]; });
    vmax = Math.ceil(vmax / 20) * 20;
    function Y(v) { return area.y + area.h - (v - vmin) / (vmax - vmin) * area.h; }
    function X(t) { return area.x + (t - a) / (b - a) * area.w; }
    ctx.save();
    ctx.fillStyle = getCss('--fundo-card'); ctx.fillRect(area.x, area.y, area.w, area.h);
    if (opts.faixa) { ctx.fillStyle = 'rgba(37,99,235,.12)'; ctx.fillRect(X(opts.faixa[0]), area.y, X(opts.faixa[1]) - X(opts.faixa[0]), area.h); }
    ctx.strokeStyle = getCss('--borda'); ctx.lineWidth = 1;
    ctx.font = '10px system-ui'; ctx.fillStyle = getCss('--texto-suave'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var v = 0; v <= vmax; v += vmax > 150 ? 50 : 20) { ctx.beginPath(); ctx.moveTo(area.x, Y(v)); ctx.lineTo(area.x + area.w, Y(v)); ctx.stroke(); ctx.fillText(v, area.x - 4, Y(v)); }
    if (opts.nivel != null) { ctx.setLineDash([5, 4]); ctx.strokeStyle = getCss('--texto-suave'); ctx.beginPath(); ctx.moveTo(area.x, Y(opts.nivel)); ctx.lineTo(area.x + area.w, Y(opts.nivel)); ctx.stroke(); ctx.setLineDash([]); }
    series.forEach(function (s) {
      ctx.strokeStyle = s.cor; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i < s.v.length; i++) { var x = X(a + i), y = Y(s.v[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
    (opts.pontos || []).forEach(function (p) {
      ctx.fillStyle = p.cor; ctx.beginPath(); ctx.arc(X(p.t), Y(p.v), 4.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.restore();
    eixoT(ctx, area, a, b, fs, opts.rel);
  }

  function getCss(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#666'; }

  return { prepararCanvas: prepararCanvas, mapaCanais: mapaCanais, contorno: contorno, eixoZ: eixoZ, eixoT: eixoT,
    barraCores: barraCores, curvas: curvas, montarLUT: montarLUT, cor: cor, getCss: getCss, rotTempo: rotTempo };
})();
