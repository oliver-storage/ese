/* Interpretação: compara as médias das deglutições selecionadas com as referências e redige o laudo sugerido */
var Diagnostico = (function () {

  function fmt(v, d) { return v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  function classificar(valor, min, max) {
    if (valor == null || !isFinite(valor)) return 'sem dado';
    if (min == null && max == null) return 'sem ref';
    if (min != null && valor < min) return 'baixo';
    if (max != null && valor > max) return 'alto';
    return 'normal';
  }

  function textoRef(min, max, un, d) {
    if (min == null && max == null) return 'sem referência definida';
    if (min != null && max != null) return fmt(min, d) + ' – ' + fmt(max, d) + ' ' + un;
    if (min != null) return '≥ ' + fmt(min, d) + ' ' + un;
    return '≤ ' + fmt(max, d) + ' ' + un;
  }

  function avaliar(sel, todas, refs) {
    var itens = [], achados = [], alertas = [];
    Analise.METRICAS.forEach(function (m) {
      var e = Analise.estat(sel.map(function (s) { return s[m.k]; }));
      var min = m.ref && m.ref[0] ? refs[m.ref[0]] : null, max = m.ref && m.ref[1] ? refs[m.ref[1]] : null;
      var cls = m.ref ? classificar(e.media, min, max) : 'sem ref';
      itens.push({ m: m, e: e, min: min, max: max, cls: cls, refTxt: m.ref ? textoRef(min, max, m.un, m.dec) : '—' });
    });
    function it(k) { return itens.filter(function (i) { return i.m.k === k; })[0]; }

    var n = sel.length;
    if (!n) return { itens: itens, achados: ['Nenhuma deglutição selecionada para análise.'], conclusao: '', alertas: alertas, coord: null };

    // Repouso
    var rep = it('pRepousoMax');
    var tRep = rep.cls === 'baixo' ? 'ESE hipotônico (pressão basal de ' + fmt(rep.e.media, 1) + ' mmHg, abaixo da referência)'
      : rep.cls === 'alto' ? 'ESE hipertônico (pressão basal de ' + fmt(rep.e.media, 1) + ' mmHg, acima da referência)'
      : rep.cls === 'normal' ? 'pressão basal do ESE normal (' + fmt(rep.e.media, 1) + ' mmHg)' : 'pressão basal do ESE de ' + fmt(rep.e.media, 1) + ' mmHg (sem referência)';
    achados.push(cap(tRep) + '.');

    var ext = it('ext');
    if (ext.cls === 'baixo') achados.push('ESE curto (extensão de ' + fmt(ext.e.media, 1) + ' cm).');
    else if (ext.cls === 'alto') achados.push('ESE longo (extensão de ' + fmt(ext.e.media, 1) + ' cm).');

    // Relaxamento
    var semAb = sel.filter(function (s) { return s.semAbertura; }).length;
    var ab = it('tAbertura'), irpLv = Analise.estat(sel.map(function (s) { return s.leuven ? s.leuven.irp : null; })), irp = { cls: 'normal' }; // classificação do relaxamento pelos critérios de Leuven fica na aba Avaliação ESE
    var relax;
    if (semAb === n) relax = 'ausência de relaxamento do ESE nas deglutições analisadas';
    else if (irp.cls === 'alto') relax = 'pressão de relaxamento do ESE elevada (UES IRP mediana ' + fmt(irpLv.mediana, 1) + ' mmHg; ver Avaliação especializada para os critérios de Leuven)';
    else relax = 'relaxamento do ESE presente às deglutições (UES IRP mediana ' + fmt(irpLv.mediana, 1) + ' mmHg; classificação pelos critérios de Leuven na aba Avaliação ESE)';
    if (semAb && semAb < n) relax += ' (' + semAb + ' de ' + n + ' sem abertura identificada)';
    achados.push(cap(relax) + '.');
    if (ab.cls === 'baixo') achados.push('Tempo de abertura do ESE reduzido (' + fmt(ab.e.media, 2) + ' s).');
    if (ab.cls === 'alto') achados.push('Tempo de abertura do ESE prolongado (' + fmt(ab.e.media, 2) + ' s).');

    // Faringe
    var far = it('picoFar');
    if (far.e.n) {
      if (far.cls === 'baixo') achados.push('Contração faríngea fraca (pico médio de ' + fmt(far.e.media, 1) + ' mmHg).');
      else if (far.cls === 'alto') achados.push('Contração faríngea aumentada (pico médio de ' + fmt(far.e.media, 1) + ' mmHg).');
    } else alertas.push('Faringe não captada na região analisada — coordenação e contração faríngea não avaliadas.');

    // Coordenação
    var comCoord = sel.filter(function (s) { return s.coord != null; });
    var inc = comCoord.filter(function (s) { return !s.coord; }).length;
    var coord = null;
    if (comCoord.length) {
      coord = inc === 0 ? 'boa' : inc * 2 > comCoord.length ? 'incoordenação' : 'parcial';
      if (coord === 'boa') achados.push('Boa coordenação faringoesofágica (pico faríngeo durante a abertura do ESE em ' + comCoord.length + ' de ' + comCoord.length + ').');
      else if (coord === 'incoordenação') achados.push('Incoordenação faringoesofágica (pico faríngeo fora da abertura do ESE em ' + inc + ' de ' + comCoord.length + ' deglutições).');
      else achados.push('Coordenação faringoesofágica parcial (pico faríngeo fora da abertura em ' + inc + ' de ' + comCoord.length + ').');
    }

    var pos = it('picoPos');
    if (pos.cls === 'baixo') achados.push('Contração pós-deglutição do esôfago superior reduzida.');
    if (pos.cls === 'alto') achados.push('Contração pós-deglutição do esôfago superior aumentada.');

    // Alertas de qualidade
    var semRef = itens.filter(function (i) { return i.m.ref && i.cls === 'sem ref'; }).map(function (i) { return i.m.nome; });
    if (semRef.length) alertas.push('Sem valor de referência para: ' + semRef.join('; ') + '. Defina em Referências para classificar.');
    if (sel.some(function (s) { return s.limiarRelativo; })) alertas.push('Em alguma deglutição o repouso ficou abaixo do contorno; foi usado limiar relativo.');
    var cv = rep.e.media ? rep.e.dp / rep.e.media : 0;
    if (cv > 0.4) alertas.push('Grande variação da pressão basal entre as deglutições (CV ' + fmt(cv * 100, 0) + '%) — avalie relaxamento do paciente/tempo de sonda.');
    if (n < 3) alertas.push('Menos de 3 deglutições selecionadas.');

    // Impressão diagnóstica
    var alterado = rep.cls === 'baixo' || rep.cls === 'alto' || irp.cls === 'alto' || semAb === n || coord === 'incoordenação' || far.cls === 'baixo';
    var conc;
    if (!alterado) {
      conc = 'O esfíncter superior do esôfago (ESE) apresenta ' + (rep.cls === 'normal' ? 'pressão basal normal' : 'pressão basal de ' + fmt(rep.e.media, 1) + ' mmHg') +
        (ext.e.n ? ', com extensão manométrica de ' + fmt(ext.e.media, 1) + ' cm' : '') +
        ', relaxando-se às deglutições' + (ab.e.n ? ' (tempo médio de abertura de ' + fmt(ab.e.media, 2) + ' s)' : '') +
        (coord === 'boa' ? ', sendo demonstrada boa coordenação faringoesofágica.' : coord ? ', com coordenação faringoesofágica parcial.' : '.');
    } else {
      var partes = [];
      if (rep.cls === 'baixo') partes.push('ESE hipotônico');
      if (rep.cls === 'alto') partes.push('ESE hipertônico');
      if (semAb === n) partes.push('ausência de relaxamento do ESE');
      else if (irp.cls === 'alto') partes.push('pressão de relaxamento do ESE elevada');
      if (coord === 'incoordenação') partes.push('incoordenação faringoesofágica');
      if (far.cls === 'baixo') partes.push('contração faríngea fraca');
      conc = 'Estudo manométrico do ESE com ' + juntar(partes) + '. Sugere-se correlação clínica e, se indicado, avaliação fonoaudiológica complementar (FEES ou videofluoroscopia da deglutição).';
    }
    return { itens: itens, achados: achados, conclusao: conc, alertas: alertas, coord: coord, alterado: alterado };
  }

  function juntar(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { avaliar: avaliar, fmt: fmt, classificar: classificar };
})();
