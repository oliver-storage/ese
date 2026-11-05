/* Exportação: planilha Excel (SheetJS) ou CSV */
var Exportar = (function () {

  function r(v, d) { return v == null || !isFinite(v) ? '' : Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }

  function linhasDeg(E) {
    var fs = E.ex.fs;
    var cab = ['#', 'Tempo (s)', 'Origem', 'Em uso', 'Excluída', 'Centro ESE (cm)', 'Extensão (cm)', 'Repouso médio (mmHg)', 'Repouso máximo (mmHg)',
      'Tempo de abertura (s)', 'Residual médio (mmHg)', 'Residual 0,2 s (mmHg)', 'Nadir (mmHg)', 'Pico faríngeo (mmHg)', 'Pico pós-deglutição (mmHg)',
      'Integral contrátil faríngea (mmHg·cm·s)', 'Integral contrátil pós (mmHg·cm·s)', 'Coordenada', 'Pico faríngeo − início abertura (s)', 'Observações'];
    var rows = E.lista.map(function (m) {
      return [m.num, r(m.abIni / fs, 2), m.origem, m.selecionada ? 'sim' : '', m.excluida ? 'sim' : '', r(m.centro, 1), r(m.ext, 2), r(m.pRepouso, 1), r(m.pRepousoMax, 1),
        m.semAbertura ? '' : r(m.tAbertura, 2), r(m.residual, 1), r(m.irp02, 1), r(m.nadir, 1), r(m.picoFar, 1), r(m.picoPos, 1), r(m.phci, 0), r(m.uesci, 0),
        m.coord == null ? '' : m.coord ? 'sim' : 'não', r(m.dtCoord, 2), m.flags.join('; ')];
    });
    return [cab].concat(rows);
  }

  function linhasResumo(E) {
    var ex = E.ex, av = E.aval;
    var L = [['Análise manométrica do ESE'], [], ['Paciente', ex.paciente], ['Médico', ex.medico], ['Indicação', ex.indicacao], ['Arquivo', ex.arquivo],
      ['Região', E.cfg.regiaoModo], ['Compensação', E.cfg.comp.modo + (E.cfg.comp.modo === 'hidrostatica' ? ' ' + E.cfg.comp.angulo + '°' : '')], ['Contorno (mmHg)', E.cfg.contorno], [],
      ['Parâmetro', 'Unidade', 'N', 'Média', 'Mediana', 'DP', 'Mínimo', 'Máximo', 'Referência', 'Situação']];
    av.itens.forEach(function (i) { L.push([i.m.nome, i.m.un, i.e.n, r(i.e.media, i.m.dec + 1), r(i.e.mediana, i.m.dec + 1), r(i.e.dp, i.m.dec + 1), r(i.e.min, i.m.dec), r(i.e.max, i.m.dec), i.refTxt, i.cls]); });
    L.push([]); L.push(['Impressão diagnóstica sugerida']); L.push([E.conclusaoEditada || av.conclusao]);
    L.push([]); L.push(['Achados']); av.achados.forEach(function (a) { L.push([a]); });
    if (av.alertas.length) { L.push([]); L.push(['Alertas']); av.alertas.forEach(function (a) { L.push([a]); }); }
    L.push([]); L.push([CONFIG.SISTEMA + ' v' + CONFIG.VERSAO + ' — ' + new Date().toLocaleString('pt-BR')]);
    return L;
  }

  function linhasCfg(E) {
    var L = [['Parâmetro', 'Valor']];
    Object.keys(E.cfg).forEach(function (k) { var v = E.cfg[k]; if (typeof v !== 'object') L.push([k, v]); });
    Object.keys(E.cfg.comp).forEach(function (k) { L.push(['comp.' + k, E.cfg.comp[k]]); });
    Object.keys(E.cfg.refs).forEach(function (k) { L.push(['ref.' + k, E.cfg.refs[k]]); });
    L.push([]); L.push(['Canal', 'Posição (cm)', 'Na região']);
    E.canaisCfg.forEach(function (c) { L.push([c.nome, c.pos, c.regiao ? 'sim' : '']); });
    return L;
  }

  function nomeBase(E) { return 'ESE_' + (E.ex.paciente || E.ex.arquivo || 'exame').replace(/[^\wÀ-ÿ]+/g, '_').replace(/_+$/, ''); }

  function excel(E) {
    if (typeof XLSX === 'undefined') { alert('Biblioteca de Excel indisponível (sem internet). Exportando CSV.'); return csv(E); }
    var wb = XLSX.utils.book_new();
    var s1 = XLSX.utils.aoa_to_sheet(linhasResumo(E)); s1['!cols'] = [{ wch: 52 }, { wch: 12 }, { wch: 5 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 26 }, { wch: 10 }];
    var s2 = XLSX.utils.aoa_to_sheet(linhasDeg(E)); s2['!cols'] = linhasDeg(E)[0].map(function (c) { return { wch: Math.max(9, Math.min(28, c.length)) }; });
    var s3 = XLSX.utils.aoa_to_sheet(linhasCfg(E)); s3['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, s1, 'Resumo');
    XLSX.utils.book_append_sheet(wb, s2, 'Deglutições');
    XLSX.utils.book_append_sheet(wb, s3, 'Configuração');
    var t = document.getElementById('avTexto'), txt = t ? t.value : (E.av && E.av.texto) || (E.avUltimo && E.avUltimo.gerado) || '';
    if (txt) { var s4 = XLSX.utils.aoa_to_sheet(txt.split('\n').map(function (l) { return [l]; })); s4['!cols'] = [{ wch: 140 }]; XLSX.utils.book_append_sheet(wb, s4, 'Laudo especializado'); }
    XLSX.writeFile(wb, nomeBase(E) + '.xlsx');
  }

  function csv(E) {
    var L = linhasDeg(E).map(function (row) {
      return row.map(function (v) { var s = typeof v === 'number' ? String(v).replace('.', ',') : String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
    }).join('\r\n');
    var blob = new Blob(['﻿' + L], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nomeBase(E) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  return { excel: excel, csv: csv };
})();
