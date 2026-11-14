/* Transforma el contenido de la página 238 para que lea los datos de GitHub Pages.
   - Los scripts que usan los datos (leen #nm-data o window.dash) pasan a type="text/nm-diferido".
   - Inserta el cargador (web/cargador.js) justo después del último script diferido,
     con el mismo envoltorio base64 que ya usa la página (evita que wpautop lo altere).
   - Es idempotente: si la página ya tiene el cargador, no hace nada.
   Uso: transformar(raw, cargadorFuente) → { html, diferidos, yaAplicado } */
function transformar(raw, cargador) {
  if (raw.indexOf('text/nm-diferido') !== -1) return { html: raw, diferidos: 0, yaAplicado: true };
  var dec = function (b) { return new TextDecoder().decode(Uint8Array.from(atob(b), function (c) { return c.charCodeAt(0); })); };
  var enc = function (s) { var b = new TextEncoder().encode(s), o = ''; for (var i = 0; i < b.length; i += 32768) o += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(o); };
  var re = /<script>(new Function\(new TextDecoder\(\)\.decode\(Uint8Array\.from\(atob\("([A-Za-z0-9+\/=]+)"\)[^<]*)<\/script>/g;
  var m, ultimoFin = -1, diferidos = 0, partes = [], pos = 0;
  while ((m = re.exec(raw))) {
    var codigo = dec(m[2]);
    if (codigo.indexOf('nm-data') !== -1 || codigo.indexOf('dash.') !== -1) {
      partes.push(raw.slice(pos, m.index), '<script type="text/nm-diferido">' + m[1] + '</script>');
      pos = m.index + m[0].length;
      ultimoFin = partes.join('').length;
      diferidos++;
    }
  }
  if (diferidos !== 3) throw new Error('Se esperaban 3 scripts de datos y hay ' + diferidos + '. No se aplica.');
  partes.push(raw.slice(pos));
  var html = partes.join('');
  var envoltorio = '<script>new Function(new TextDecoder().decode(Uint8Array.from(atob("' + enc(cargador) + '"),c=>c.charCodeAt(0))))();</script>';
  html = html.slice(0, ultimoFin) + envoltorio + html.slice(ultimoFin);
  return { html: html, diferidos: diferidos, yaAplicado: false };
}
if (typeof module !== 'undefined') module.exports = transformar;
