// ─────────────────────────────────────────────────────────────────────────────
// EL DOCUMENTO DE LA CRÓNICA
//
// La crónica de un partido y el archivo del día son el mismo tipo de página:
// uno o varios `<article>` autocontenidos, con la barra de "Copiar el código
// para la web" e "Imprimir". Vivía escrito dentro de `openMatchReport`; aquí
// queda una sola vez para los dos.
//
// Puro y sin imports: sólo arma texto. Lo prueba `tests/historial`.
// ─────────────────────────────────────────────────────────────────────────────

export const escHtml = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/**
 * Página completa. Con varios artículos, al imprimir cada uno empieza en su
 * propia hoja (carta, la definen los estilos del artículo).
 */
export function documentoCronica(titulo: string, descripcion: string, articulos: string[]): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(titulo)}</title>
<meta name="description" content="${escHtml(descripcion)}">
<style>body{margin:0;padding:20px;background:#0b0d11}
.ardi-rep+.ardi-rep{margin-top:32px}
@media print{body{padding:0;background:#fff}.ardi-rep+.ardi-rep{margin-top:0;break-before:page;page-break-before:always}}</style>
</head>
<body>
${articulos.join('\n')}
</body>
</html>`
}

/**
 * La barra de abajo: copiar el código de los artículos (lo que se pega en la
 * web del club) e imprimir. Al imprimir no aparece.
 */
export function conBarraCronica(doc: string, codigo: string): string {
  return doc.replace('</body>', `
<div style="max-width:860px;margin:16px auto 40px;display:flex;gap:8px;flex-wrap:wrap;
  font-family:system-ui,sans-serif">
  <button id="ardi-copiar" style="flex:1;min-width:200px;padding:12px;border:0;border-radius:10px;
    background:#047857;color:#fff;font-weight:800;font-size:14px;cursor:pointer">
    Copiar el código para la web
  </button>
  <button onclick="window.print()" style="flex:1;min-width:140px;padding:12px;border:1px solid #374151;
    border-radius:10px;background:#111827;color:#e5e7eb;font-weight:700;font-size:14px;cursor:pointer">
    Imprimir
  </button>
</div>
<textarea id="ardi-src" style="position:absolute;left:-9999px" aria-hidden="true">${
  codigo.replace(/<\/textarea>/gi, '&lt;/textarea&gt;')}</textarea>
<style>@media print{#ardi-copiar,#ardi-src,button{display:none !important}}</style>
<script>
document.getElementById('ardi-copiar').onclick = function () {
  var t = document.getElementById('ardi-src');
  t.style.position='static'; t.select(); t.setSelectionRange(0, 999999);
  try { document.execCommand('copy'); this.textContent = 'Copiado'; }
  catch (e) { this.textContent = 'Selecciona el texto de abajo y copia'; t.style.height='120px'; }
  t.style.position = this.textContent === 'Copiado' ? 'absolute' : 'static';
  var b = this; setTimeout(function(){ b.textContent = 'Copiar el código para la web' }, 2500);
};
</script>
</body>`)
}
