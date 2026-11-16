/* Órbita de la pobreza expuesta (página 238). Lee pobreza_expuesta de #nm-data. Área de cada capa proporcional a las personas. */
(function () {
  var host = document.getElementById('orbita-pobreza');
  if (!host || host.dataset.listo) return;
  var datos;
  try {
    var el = document.getElementById('nm-data');
    datos = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(el.textContent.trim()), function (c) { return c.charCodeAt(0); })));
  } catch (e) { return; }
  var filas = (datos.pobreza_expuesta || []).slice().sort(function (a, b) { return b.valor - a.valor; });
  if (filas.length < 2) return;
  host.dataset.listo = '1';
  var M = function (v) { return v >= 1e6 ? (v / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' M' : Math.round(v / 1e3).toLocaleString('es-ES') + ' mil'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pal = ['#8b7fd6', '#6d4fc7', '#4a2a8f'];
  var cx = 210, cy = 190, R = 165, vmax = filas[0].valor;
  var radios = filas.map(function (f) { return R * Math.sqrt(f.valor / vmax); });
  var defs = '', s = '';
  filas.forEach(function (f, k) {
    var c = pal[Math.min(k, 2)];
    /* esfera de vidrio: cuerpo casi transparente, borde más denso, luz arriba a la izquierda */
    defs += '<radialGradient id="nmo-g' + k + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + c + '" stop-opacity=".05"/><stop offset=".72" stop-color="' + c + '" stop-opacity=".12"/><stop offset=".93" stop-color="' + c + '" stop-opacity=".30"/><stop offset="1" stop-color="' + c + '" stop-opacity=".45"/></radialGradient>';
    defs += '<radialGradient id="nmo-h' + k + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
  });
  defs += '<radialGradient id="nmo-sombra" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1b1f24" stop-opacity=".22"/><stop offset="1" stop-color="#1b1f24" stop-opacity="0"/></radialGradient>';
  s += '<ellipse cx="' + cx + '" cy="' + (cy + R + 4) + '" rx="' + (R * .9) + '" ry="' + (R * .09) + '" fill="url(#nmo-sombra)"/>';
  filas.forEach(function (f, k) {
    var c = pal[Math.min(k, 2)];
    s += '<circle class="nmo-capa" cx="' + cx + '" cy="' + (cy + R - radios[k]).toFixed(1) + '" r="' + radios[k].toFixed(1) + '" fill="url(#nmo-g' + k + ')" stroke="' + c + '" stroke-opacity=".5"/>';
    var r = radios[k], yk = cy + R - r;
    s += '<ellipse cx="' + (cx - r * .38).toFixed(1) + '" cy="' + (yk - r * .52).toFixed(1) + '" rx="' + (r * .26).toFixed(1) + '" ry="' + (r * .13).toFixed(1) + '" transform="rotate(-28 ' + (cx - r * .38).toFixed(1) + ' ' + (yk - r * .52).toFixed(1) + ')" fill="url(#nmo-h' + k + ')"/>';
  });
  /* rótulos en arco: cada capa externa en su franja superior; el núcleo, al centro */
  filas.forEach(function (f, k) {
    if (k === filas.length - 1) return;
    var cyk = cy + R - radios[k], rm = radios[k] - 14, a0 = 205 * Math.PI / 180, a1 = 335 * Math.PI / 180;
    var d = 'M' + (cx + rm * Math.cos(a0)).toFixed(1) + ' ' + (cyk + rm * Math.sin(a0)).toFixed(1) + ' A' + rm.toFixed(1) + ' ' + rm.toFixed(1) + ' 0 0 1 ' + (cx + rm * Math.cos(a1)).toFixed(1) + ' ' + (cyk + rm * Math.sin(a1)).toFixed(1);
    defs += '<path id="nmo-p' + k + '" d="' + d + '"/>';
    s += '<text class="nmo-arc"><textPath href="#nmo-p' + k + '" startOffset="50%" text-anchor="middle">' + esc(f.grupo.toUpperCase()) + '  <tspan>' + M(f.valor) + '</tspan></textPath></text>';
  });
  var nucleo = filas[filas.length - 1], rc = radios[radios.length - 1], cyc = cy + R - rc;
  s += '<text class="nmo-num" x="' + cx + '" y="' + (cyc + 8) + '" text-anchor="middle">' + M(nucleo.valor) + '</text>';
  s += '<text class="nmo-sub" x="' + cx + '" y="' + (cyc + 30) + '" text-anchor="middle">' + esc(nucleo.grupo.toUpperCase()) + '</text>';
  var etiqueta = filas.map(function (f) { return f.grupo + ': ' + M(f.valor) + ' personas'; }).join('; ');
  var f0 = filas[0];
  var fecha = f0.fecha ? new Date(f0.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  host.innerHTML =
    '<div class="nmo-top"><span class="nmo-tag">' + esc(f0.calidad || 'Estimación') + '</span><span class="nmo-kicker">Capas de población expuesta</span></div>' +
    '<svg viewBox="0 0 420 380" role="img" aria-label="' + esc('Población expuesta por nivel de pobreza. ' + etiqueta) + '"><defs>' + defs + '</defs>' + s + '</svg>' +
    '<p class="nmo-pie">Las capas no se suman: cada una incluye a la siguiente (los pobres están dentro de «pobres o vulnerables», y ambos dentro de las personas expuestas). El área es proporcional a las personas. Fuente: ' + esc(String(f0.fuente || '').split(',')[0]) + (fecha ? ', ' + fecha : '') + '.</p>';
})();
