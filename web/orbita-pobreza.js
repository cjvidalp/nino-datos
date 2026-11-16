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

/* Versión 3D (three.js): esferas de vidrio con malla. Si la librería no carga, queda el SVG de arriba. */
(function () {
  var host = document.getElementById('orbita-pobreza');
  if (!host || host.dataset.tres || !window.WebGLRenderingContext) return;
  var svg = host.querySelector('svg');
  if (!svg) return;
  host.dataset.tres = '1';
  var datos;
  try { datos = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(document.getElementById('nm-data').textContent.trim()), function (c) { return c.charCodeAt(0); }))); } catch (e) { return; }
  var filas = (datos.pobreza_expuesta || []).slice().sort(function (a, b) { return b.valor - a.valor; });
  var M = function (v) { return v >= 1e6 ? (v / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' M' : Math.round(v / 1e3).toLocaleString('es-ES') + ' mil'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js').then(function (T) {
    var pal = [0x8b7fd6, 0x6d4fc7, 0x4a2a8f];
    var caja = document.createElement('div'); caja.className = 'nmo-3d';
    var lienzo = document.createElement('div'); lienzo.className = 'nmo-lienzo';
    var rot = document.createElement('div'); rot.className = 'nmo-rotulos';
    caja.appendChild(lienzo); caja.appendChild(rot);
    var ren;
    try { ren = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    ren.setClearColor(0x000000, 0);
    lienzo.appendChild(ren.domElement);
    var escena = new T.Scene();
    var cam = new T.PerspectiveCamera(30, 1, .1, 100);
    cam.position.set(0, 0, 8.2);
    escena.add(new T.HemisphereLight(0xffffff, 0xd9d4f2, 1.1));
    var luz = new T.DirectionalLight(0xffffff, 1.6); luz.position.set(-3, 4, 5); escena.add(luz);
    var grupo = new T.Group(); grupo.rotation.x = .32; escena.add(grupo);
    var R = 1.55, vmax = filas[0].valor;
    var radios = filas.map(function (f) { return R * Math.sqrt(f.valor / vmax); });
    function malla(r, color, opa) {
      var pts = [], i, j, a, b, N = 64;
      for (i = 1; i < 9; i++) { /* paralelos */
        b = -Math.PI / 2 + i * Math.PI / 9;
        for (j = 0; j < N; j++) { a = j / N * 2 * Math.PI; var a2 = (j + 1) / N * 2 * Math.PI;
          pts.push(r * Math.cos(b) * Math.cos(a), r * Math.sin(b), r * Math.cos(b) * Math.sin(a), r * Math.cos(b) * Math.cos(a2), r * Math.sin(b), r * Math.cos(b) * Math.sin(a2)); }
      }
      for (i = 0; i < 16; i++) { /* meridianos */
        a = i / 16 * 2 * Math.PI;
        for (j = 0; j < N / 2; j++) { b = -Math.PI / 2 + j / (N / 2) * Math.PI; var b2 = -Math.PI / 2 + (j + 1) / (N / 2) * Math.PI;
          pts.push(r * Math.cos(b) * Math.cos(a), r * Math.sin(b), r * Math.cos(b) * Math.sin(a), r * Math.cos(b2) * Math.cos(a), r * Math.sin(b2), r * Math.cos(b2) * Math.sin(a)); }
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      return new T.LineSegments(g, new T.LineBasicMaterial({ color: color, transparent: true, opacity: opa, depthWrite: false }));
    }
    filas.forEach(function (f, k) {
      var r = radios[k], c = pal[Math.min(k, 2)];
      var cuerpo = new T.Mesh(new T.SphereGeometry(r, 64, 48), new T.MeshPhongMaterial({ color: c, transparent: true, opacity: .14 + k * .05, shininess: 90, specular: 0xffffff, depthWrite: false, side: T.FrontSide }));
      cuerpo.renderOrder = 10 - k;
      var red = malla(r * 1.002, c, .28 + k * .1); red.renderOrder = 20 - k;
      grupo.add(cuerpo); grupo.add(red);
    });
    var sombra = new T.Mesh(new T.CircleGeometry(R * 1.05, 48), new T.MeshBasicMaterial({ color: 0x1b1f24, transparent: true, opacity: .08, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = -R - .25; sombra.scale.set(1, .35, 1); escena.add(sombra);
    var pos = function (r, angGrados, w, h) { /* punto del borde de la silueta en pantalla */
      var a = angGrados * Math.PI / 180, v = new T.Vector3(r * Math.cos(a), r * Math.sin(a), 0).project(cam);
      return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
    };
    var ancho = 0, angulos = [50, 8, -32];
    function medir() {
      var w = host.clientWidth; if (!w || w === ancho) return; ancho = w;
      var angosto = w < 520, h = angosto ? Math.round(w * .9) : 380;
      var wl = angosto ? w : Math.round(w * .62);
      ren.setSize(wl, h); cam.aspect = wl / h; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      caja.classList.toggle('nmo-angosto', angosto);
      rot.innerHTML = filas.map(function (f, k) {
        var p = pos(radios[k], angulos[k], wl, h), borde = pos(radios[0], 0, wl, h).x;
        var x0 = p.x, xL = angosto ? null : Math.max(borde + 18, wl * .92);
        return '<div class="nmo-r" style="--c:' + '#' + pal[Math.min(k, 2)].toString(16) + ';' + (angosto ? '' : 'top:' + p.y.toFixed(0) + 'px;left:' + xL + 'px') + '">' +
          (angosto ? '' : '<i style="left:' + (x0 - xL).toFixed(0) + 'px;width:' + (xL - x0).toFixed(0) + 'px"></i>') +
          '<b>' + M(f.valor) + '</b><span>' + esc(f.grupo) + '</span></div>';
      }).join('');
    }
    var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, visible = true, arrastre = null, vel = .0025;
    ren.domElement.addEventListener('pointerdown', function (e) { arrastre = e.clientX; ren.domElement.setPointerCapture(e.pointerId); });
    ren.domElement.addEventListener('pointermove', function (e) { if (arrastre === null) return; grupo.rotation.y += (e.clientX - arrastre) * .01; arrastre = e.clientX; if (quieto) ren.render(escena, cam); });
    ren.domElement.addEventListener('pointerup', function () { arrastre = null; });
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
    function cuadro() { requestAnimationFrame(cuadro); medir(); if (!visible || quieto) return; if (arrastre === null) grupo.rotation.y += vel; ren.render(escena, cam); }
    svg.replaceWith(caja); medir(); ren.render(escena, cam); cuadro();
  }).catch(function () { delete host.dataset.tres; });
})();
