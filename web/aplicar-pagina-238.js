/* Aplica el cargador a la página 238 de cjvidal.com.
   Se ejecuta en una pestaña de /wp-admin/edit.php?post_type=page con sesión iniciada.
   No usar con el editor de bloques abierto (puede re-guardar el contenido viejo; bitácora, 2 nov).
   Pasos: nonce → contenido raw → transformar → guardar por REST → verificar a los 8 s.
   El respaldo es la revisión anterior de WordPress (se informa su id). */
(async function () {
  var BASE = 'https://cjvidalp.github.io/nino-datos/web/';
  var sha = async function (s) { var h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); };
  var txt = function (u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); }); };
  var nonce = await txt('/wp-admin/admin-ajax.php?action=rest-nonce');
  var H = { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' };
  var get = function () { return fetch('/wp-json/wp/v2/pages/238?context=edit&_=' + Date.now(), { headers: H, cache: 'no-store' }).then(function (r) { return r.json(); }); };
  var antes = await get();
  var raw = antes.content.raw;
  var transformar = new Function(await txt(BASE + 'transformar.js') + '; return transformar;')();
  var cargador = await txt(BASE + 'cargador.js');
  var r = transformar(raw, cargador);
  if (r.yaAplicado) return { estado: 'ya aplicado', sha: await sha(raw) };
  if (r.html.length < raw.length || r.html.indexOf('id="nm-data"') === -1) throw new Error('Resultado sospechoso; no se guarda.');
  var revs = await fetch('/wp-json/wp/v2/pages/238/revisions?per_page=1', { headers: H }).then(function (x) { return x.json(); });
  var guardado = await fetch('/wp-json/wp/v2/pages/238', { method: 'POST', headers: H, body: JSON.stringify({ content: r.html }) }).then(function (x) { return x.json(); });
  await new Promise(function (ok) { setTimeout(ok, 8000); });
  var despues = await get();
  return {
    estado: despues.content.raw === r.html ? 'guardado y verificado' : 'ATENCIÓN: el contenido no coincide a los 8 s',
    diferidos: r.diferidos,
    sha_antes: await sha(raw), sha_despues: await sha(despues.content.raw),
    revision_respaldo: revs[0] && revs[0].id, modificado: guardado.modified
  };
})();
