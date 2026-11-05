/* Leitores de arquivo: .mpx (Multiplex/Alacer, binário) e .txt/.csv (exportação) */
var Leitores = (function () {

  function latin1(u8, a, b) {
    var s = '';
    for (var i = a; i < b; i++) s += String.fromCharCode(u8[i]);
    return s;
  }
  function cstr(u8, o, max) {
    var s = '';
    for (var i = o; i < o + (max || 200) && i < u8.length && u8[i] !== 0; i++) s += String.fromCharCode(u8[i]);
    return s;
  }

  /* ---------- .mpx ---------- */
  function lerMPX(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(buf), L = u8.length;
    var ex = { origem: 'mpx', canais: [], eventos: [], fs: 20, paciente: '', medico: '', indicacao: '', laudo: '', avisos: [] };

    ex.tipo = cstr(u8, 1, 40);
    var fs = dv.getFloat64(0x32, true);
    if (fs > 1 && fs < 1000) ex.fs = fs; else ex.avisos.push('Frequência de amostragem não lida — usando 20 Hz.');

    // Blocos de dados: [double ganho][double 0,7356][double ganho mmHg][int32 x][int32 N][N x int16]
    var blocos = [];
    for (var o = 24; o < L - 16; o++) {
      if (u8[o] === 0x5a && u8[o + 1] === 0x64 && u8[o + 2] === 0x3b && u8[o + 3] === 0xdf &&
          u8[o + 7] === 0x3f && u8[o + 6] === 0xe7) {
        var f = dv.getFloat64(o, true);
        if (Math.abs(f - 0.7356) > 0.001) continue;
        var g1 = dv.getFloat64(o - 8, true), g3 = dv.getFloat64(o + 8, true);
        if (!(g1 > 0.001 && g1 < 100)) continue;
        if (Math.abs(g3 - g1 * f) > Math.abs(g1 * f) * 0.05) continue;
        var l = o + 16, N = dv.getInt32(l + 4, true);
        if (N <= 0 || l + 8 + N * 2 > L) continue;
        blocos.push({ off: l + 8, N: N, g: g3 });
        o = l + 8 + N * 2 - 1;
      }
    }
    if (!blocos.length) throw new Error('Não encontrei os canais de pressão neste .mpx. Exporte o exame em TXT pelo Multiplex.');
    var N = blocos[0].N;
    blocos = blocos.filter(function (b) { return b.N === N; });
    ex.nAmostras = N;

    // Posições: descritores "PSn\0" + 22 bytes
    var head = latin1(u8, 0, Math.min(L, blocos[0].off));
    for (var k = 0; k < blocos.length; k++) {
      var nome = 'PS' + (k + 1), pos = null;
      var alvo = nome + '\0';
      var i = head.indexOf(alvo, 0x100);
      if (i > 0) { var p = dv.getInt32(i + 22, true); if (p >= 0 && p < 2000) pos = p / 10; }
      var d = new Float32Array(N), b = blocos[k];
      for (var t = 0; t < N; t++) d[t] = dv.getInt16(b.off + t * 2, true) * b.g;
      ex.canais.push({ nome: 'P' + (k + 1), pos: pos, dados: d });
    }
    if (ex.canais.some(function (c) { return c.pos === null; })) {
      ex.avisos.push('Posições dos canais não encontradas no arquivo — usando a sonda padrão.');
      ex.canais.forEach(function (c, i) { c.pos = null; });
    }

    // Trailer: paciente + eventos
    var fimDados = blocos[blocos.length - 1].off + N * 2;
    var tr = latin1(u8, fimDados, L);
    // paciente: primeira string longa em maiúsculas após o fim dos dados
    var re = /([\x20-\x7e\xc0-\xff]{4,})/g, m, strs = [];
    while ((m = re.exec(tr)) && strs.length < 12) strs.push({ s: m[1], i: m.index });
    var cand = strs.filter(function (x) { return /^[A-ZÀ-Ý ]{6,}$/.test(x.s.replace(/^[^A-ZÀ-Ý]+/, '')); });
    if (cand.length) {
      ex.paciente = limparNome(cand[0].s);
      var med = strs.filter(function (x) { return /DR|DRA/.test(x.s); });
      if (med.length) ex.medico = limparNome(med[0].s.replace(/^.*?(DRA?\.)/, '$1'));
    }
    var ind = tr.match(/\x0d([A-ZÀ-Ý][A-ZÀ-Ý \/,\.]{3,80})\x01/);
    if (ind) ex.indicacao = ind[1];
    var lauIni = tr.indexOf('Manometria esof');
    if (lauIni >= 0) {
      var lauFim = tr.indexOf('.rtf', lauIni);
      var txt = tr.substring(lauIni, lauFim > 0 ? lauFim : lauIni + 3000);
      ex.laudo = txt.replace(/[\x00-\x1f]+/g, '\n').split('\n').filter(function (l) { return l.trim().length > 3; })
        .join('\n').replace(/\n?\+?Modelo[^\n]*$/, '').trim();
    }

    // Eventos: NOME\0ABREV\0[pad](ABREV2\0)? int32 ini int32 fim
    var reE = /([A-Z][A-Za-z\.]{1,3})\x00([A-Za-z]{1,3})\x00{1,3}(?:([A-Za-z]{1,3})\x00{1,2})?/g;
    var tiposDeg = { DSc: 'Deglutição seca', DUm: 'Deglutição úmida', DVi: 'Deglutição viscosa', DSo: 'Deglutição sólida' };
    while ((m = reE.exec(tr))) {
      var o2 = fimDados + m.index + m[0].length;
      if (o2 + 8 > L) break;
      var a = dv.getInt32(o2, true), z = dv.getInt32(o2 + 4, true);
      if (a < 0 || a >= N || z < a || z >= N) continue;
      var cod = m[1];
      var ev = { cod: cod, ini: a, fim: z };
      if (tiposDeg[cod]) { ev.tipo = 'deg'; ev.rotulo = tiposDeg[cod]; }
      else if (cod === 'HES') {
        ev.tipo = 'ese'; ev.rotulo = 'ESE marcado no Multiplex';
        for (var q = o2 + 8; q < o2 + 80; q++) {
          var v1 = dv.getFloat64(q, true), v2 = dv.getFloat64(q + 8, true);
          if (v1 > 50 && v1 < 1000 && v2 > 50 && v2 < 1000 && Math.round(v1) === v1 && Math.round(v2) === v2) {
            ev.posSup = Math.max(v1, v2) / 10; ev.posInf = Math.min(v1, v2) / 10; break;
          }
        }
      } else if (cod === 'HEI') { ev.tipo = 'eie'; ev.rotulo = 'EIE marcado no Multiplex'; }
      else if (cod === 'Res') { ev.tipo = 'outro'; ev.rotulo = 'Repouso'; }
      else if (cod === 'Sbe') { ev.tipo = 'outro'; ev.rotulo = 'Estação (retirada)'; }
      else continue;
      if (ev.tipo === 'deg' && ex.eventos.some(function (e) { return e.tipo === 'deg' && e.ini === a; })) continue;
      ex.eventos.push(ev);
      reE.lastIndex = m.index + m[0].length + 8;
    }
    ex.eventos.sort(function (x, y) { return x.ini - y.ini; });
    return ex;
  }

  function limparNome(s) {
    return s.replace(/^[^A-ZÀ-Ý]+/, '').replace(/[^A-Za-zÀ-ÿ \.]+.*$/, '').trim();
  }

  /* ---------- .txt / .csv ---------- */
  function lerTXT(texto) {
    var linhas = texto.split(/\r?\n/);
    var ex = { origem: 'txt', canais: [], eventos: [], fs: null, paciente: '', medico: '', indicacao: '', laudo: '', avisos: [] };
    // detectar delimitador
    var amostra = linhas.slice(0, 200).join('\n');
    var cont = { '\t': (amostra.match(/\t/g) || []).length, ';': (amostra.match(/;/g) || []).length, ',': (amostra.match(/,/g) || []).length, ' ': 0 };
    var delim = '\t';
    if (cont[';'] > cont['\t'] && cont[';'] >= cont[',']) delim = ';';
    else if (cont['\t'] === 0 && cont[';'] === 0) delim = cont[','] > 0 ? ',' : ' ';
    var vircDecimal = delim !== ',';

    var cab = null, dados = [];
    for (var i = 0; i < linhas.length; i++) {
      var ln = linhas[i].trim();
      if (!ln) continue;
      var partes = delim === ' ' ? ln.split(/\s+/) : ln.split(delim);
      var nums = partes.map(function (p) {
        p = p.trim(); if (vircDecimal) p = p.replace(',', '.');
        return p === '' ? NaN : Number(p);
      });
      var nNum = nums.filter(function (v) { return isFinite(v); }).length;
      if (nNum >= Math.max(2, partes.length * 0.8)) dados.push(nums);
      else if (!dados.length) {
        cab = partes.map(function (p) { return p.trim(); });
        var mP = ln.match(/paciente\s*[:=]\s*(.+)/i); if (mP) ex.paciente = mP[1].trim();
        var mF = ln.match(/(\d+(?:[.,]\d+)?)\s*hz/i); if (mF) ex.fs = Number(mF[1].replace(',', '.'));
      }
    }
    if (dados.length < 10) throw new Error('TXT sem dados numéricos reconhecíveis.');
    var nCol = dados[0].length;
    dados = dados.filter(function (r) { return r.length === nCol; });
    // coluna de tempo?
    var c0 = dados.map(function (r) { return r[0]; }), temTempo = true;
    for (var k = 1; k < Math.min(c0.length, 500); k++) if (!(c0[k] > c0[k - 1])) { temTempo = false; break; }
    var ini = 0;
    if (temTempo && nCol > 2) {
      ini = 1;
      var dt = (c0[Math.min(100, c0.length - 1)] - c0[0]) / Math.min(100, c0.length - 1);
      var unid = cab && cab[0] ? cab[0].toLowerCase() : '';
      if (/ms/.test(unid)) dt = dt / 1000;
      if (!ex.fs && dt > 0) ex.fs = Math.round(1 / dt * 1000) / 1000;
    }
    if (!ex.fs) { ex.fs = 20; ex.avisos.push('Frequência de amostragem não encontrada no TXT — usando 20 Hz (ajuste em Sonda).'); }
    ex.nAmostras = dados.length;
    var colsEvento = [];
    for (var c = ini; c < nCol; c++) {
      var nome = cab && cab[c] ? cab[c] : 'P' + (c - ini + 1);
      if (/evento|marc|event/i.test(nome)) { colsEvento.push(c); continue; }
      var d = new Float32Array(dados.length);
      for (var t = 0; t < dados.length; t++) d[t] = dados[t][c];
      ex.canais.push({ nome: nome, pos: null, dados: d });
    }
    return ex;
  }

  function ler(arquivo) {
    return new Promise(function (ok, erro) {
      var fr = new FileReader();
      var ehMpx = /\.mpx$/i.test(arquivo.name);
      fr.onload = function () {
        try {
          var ex;
          if (ehMpx) ex = lerMPX(fr.result);
          else {
            var txt = fr.result;
            ex = lerTXT(txt);
          }
          ex.arquivo = arquivo.name;
          ok(ex);
        } catch (e) { erro(e); }
      };
      fr.onerror = function () { erro(new Error('Falha ao ler o arquivo.')); };
      if (ehMpx) fr.readAsArrayBuffer(arquivo); else fr.readAsText(arquivo, 'ISO-8859-1');
    });
  }

  return { ler: ler, lerMPX: lerMPX, lerTXT: lerTXT };
})();
