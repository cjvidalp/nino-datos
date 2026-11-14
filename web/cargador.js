/* Cargador del Monitor El Niño (página 238 de cjvidal.com).
   1. Lee el respaldo interno (#nm-data).
   2. Pide a GitHub Pages el manifiesto y los 21 datasets (máximo 5 s en total).
   3. Reemplaza solo los datasets que llegan bien: lista no vacía y con las columnas del respaldo.
   4. Escribe el resultado en #nm-data y ejecuta los scripts diferidos (type="text/nm-diferido").
   Si GitHub falla, la página funciona igual con el respaldo.
   Estado visible en #dash-root[data-datos] y en window.nmCarga. */
(function () {
  var BASE = 'https://cjvidalp.github.io/nino-datos/';
  var el = document.getElementById('nm-data');
  var dec = function (s) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.trim()), function (c) { return c.charCodeAt(0); }))); };
  var enc = function (o) { var b = new TextEncoder().encode(JSON.stringify(o)), s = ''; for (var i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); };
  var respaldo = dec(el.textContent);
  var datos = Object.assign({}, respaldo);
  var info = { fuente: 'respaldo', ok: [], rechazados: [], error: null };
  var ejecutado = false;

  function columnas(lista) { var s = {}; lista.forEach(function (r) { Object.keys(r || {}).forEach(function (k) { s[k] = 1; }); }); return s; }
  function valido(nuevo, viejo) {
    if (!Array.isArray(nuevo) || !nuevo.length) return false;
    if (!Array.isArray(viejo) || !viejo.length) return true;
    var cv = columnas(viejo), cn = columnas(nuevo);
    return Object.keys(cv).every(function (k) { return cn[k] || viejo.some(function (r) { return !(k in r); }); });
  }
  function ejecutar() {
    if (ejecutado) return; ejecutado = true;
    if (info.ok.length) el.textContent = enc(datos);
    var root = document.getElementById('dash-root');
    if (root) root.setAttribute('data-datos', info.fuente);
    window.nmCarga = info;
    document.querySelectorAll('script[type="text/nm-diferido"]').forEach(function (s) {
      try { (0, eval)(s.textContent); } catch (e) { console.error('[nm] script', e); }
    });
  }

  var ctrl = window.AbortController ? new AbortController() : null;
  var reloj = setTimeout(function () { info.error = 'tiempo agotado'; if (ctrl) ctrl.abort(); ejecutar(); }, 5000);
  var pedir = function (ruta) {
    return fetch(BASE + ruta + '?t=' + Math.floor(Date.now() / 600000), { cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(ruta + ' ' + r.status); return r.json(); });
  };

  pedir('datos/manifiesto.json').then(function (man) {
    var claves = Object.keys(man.datasets || {});
    return Promise.all(claves.map(function (k) {
      return pedir(man.datasets[k].ruta).then(function (v) {
        if (valido(v, respaldo[k])) { datos[k] = v; info.ok.push(k); } else info.rechazados.push(k);
      }).catch(function () { info.rechazados.push(k); });
    }));
  }).then(function () {
    info.fuente = info.ok.length ? (info.rechazados.length ? 'github-parcial' : 'github') : 'respaldo';
  }).catch(function (e) { info.error = String(e); })
    .then(function () { clearTimeout(reloj); ejecutar(); });
})();
