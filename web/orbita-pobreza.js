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
  var pal = [['#fde68a', '#f59e0b', '#b45309'], ['#fdba74', '#f97316', '#c2410c'], ['#fbcfe8', '#ec4899', '#9d174d']];
  var cx = 210, cy = 200, R = 150, vmax = filas[0].valor;
  var radios = filas.map(function (f) { return R * Math.sqrt(f.valor / vmax); });
  var s = '';
  /* estrellas: posiciones fijas, decorativas */
  var semilla = 7, azar = function () { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
  for (var i = 0; i < 70; i++) {
    var x = azar() * 420, y = azar() * 400, r = azar() < .85 ? .7 : 1.4;
    if (Math.hypot(x - cx, y - cy) < R + 6) continue;
    s += '<circle class="nmo-st" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" style="animation-delay:' + (azar() * 4).toFixed(2) + 's"/>';
  }
  var defs = '<filter id="nmo-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>';
  filas.forEach(function (f, k) {
    var p = pal[Math.min(k, 2)];
    defs += '<radialGradient id="nmo-g' + k + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="' + p[0] + '"/><stop offset=".55" stop-color="' + p[1] + '"/><stop offset="1" stop-color="' + p[2] + '"/></radialGradient>';
  });
  /* órbita decorativa con satélite */
  var ex = R + 42, ey = R * .42;
  var elip = 'M' + (cx - ex) + ' ' + cy + ' a' + ex + ' ' + ey + ' 0 1 0 ' + (2 * ex) + ' 0 a' + ex + ' ' + ey + ' 0 1 0 ' + (-2 * ex) + ' 0';
  s += '<g class="nmo-orb" transform="rotate(-18 ' + cx + ' ' + cy + ')"><path d="' + elip + '"/><circle class="nmo-sat" r="4.5"><animateMotion dur="16s" repeatCount="indefinite" path="' + elip + '"/></circle></g>';
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 4) + '" fill="#f59e0b" opacity=".35" filter="url(#nmo-glow)"/>';
  filas.forEach(function (f, k) {
    var r = radios[k];
    s += '<circle class="nmo-capa" cx="' + cx + '" cy="' + cy + '" r="' + r.toFixed(1) + '" fill="url(#nmo-g' + k + ')" style="animation-delay:' + (k * .15) + 's"/>';
  });
  /* rótulos en arco para las capas externas, número al centro para el núcleo */
  filas.forEach(function (f, k) {
    var ultimo = k === filas.length - 1;
    if (ultimo) return;
    var rm = (radios[k] + radios[k + 1]) / 2 - 4, a0 = 200 * Math.PI / 180, a1 = 340 * Math.PI / 180;
    var d = 'M' + (cx + rm * Math.cos(a0)).toFixed(1) + ' ' + (cy + rm * Math.sin(a0)).toFixed(1) + ' A' + rm.toFixed(1) + ' ' + rm.toFixed(1) + ' 0 0 1 ' + (cx + rm * Math.cos(a1)).toFixed(1) + ' ' + (cy + rm * Math.sin(a1)).toFixed(1);
    defs += '<path id="nmo-p' + k + '" d="' + d + '"/>';
    s += '<text class="nmo-arc"><textPath href="#nmo-p' + k + '" startOffset="50%" text-anchor="middle">' + esc(f.grupo.toUpperCase()) + ' · ' + M(f.valor) + '</textPath></text>';
  });
  var nucleo = filas[filas.length - 1];
  s += '<text class="nmo-num" x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle">' + M(nucleo.valor) + '</text>';
  s += '<text class="nmo-sub" x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle">' + esc(nucleo.grupo.toUpperCase()) + '</text>';
  var etiqueta = filas.map(function (f) { return f.grupo + ': ' + M(f.valor) + ' personas'; }).join('; ');
  var f0 = filas[0];
  var fecha = f0.fecha ? new Date(f0.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  host.innerHTML =
    '<div class="nmo-top"><span class="nmo-tag">' + esc(f0.calidad || 'Estimación') + '</span><span class="nmo-kicker">Capas de población expuesta</span></div>' +
    '<svg viewBox="0 0 420 400" role="img" aria-label="' + esc('Población expuesta por nivel de pobreza. ' + etiqueta) + '"><defs>' + defs + '</defs>' + s + '</svg>' +
    '<p class="nmo-pie">Cada capa contiene a la siguiente. El área es proporcional a las personas. Fuente: ' + esc(String(f0.fuente || '').split(',')[0]) + (fecha ? ', ' + fecha : '') + '.</p>';
})();
