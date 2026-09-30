// Núcleo de los mails, sin acceso a la base (se prueba aislado): variables de las plantillas,
// armado del texto y del HTML, firma de los links y reglas de envío.
// El cuerpo se escribe como texto; el HTML se arma acá con todo escapado (nunca HTML libre).
import { hmac, safeEqual } from './seguridad';

export const VARIABLES = ['nombre', 'empresa', 'etapas', 'link_landing', 'link_agendar'] as const;
type Variable = (typeof VARIABLES)[number];
const PATRON_VARIABLE = /\{\{\s*([a-z_]+)\s*\}\}/g;

export type ContextoMail = {
  nombre: string;
  empresa: string;
  etapas?: string; // títulos de las etapas nuevas, para los mails automáticos
  links: { landing?: string; agendar: string };
};

// Variables que usa un texto, y las que no existen (para avisar al guardar una plantilla).
export function variablesDe(texto: string) {
  const usadas = [...texto.matchAll(PATRON_VARIABLE)].map((m) => m[1]);
  return {
    usadas: [...new Set(usadas)],
    desconocidas: [...new Set(usadas.filter((v) => !VARIABLES.includes(v as Variable)))],
  };
}

export const usaLanding = (texto: string) => variablesDe(texto).usadas.includes('link_landing');

// El primer nombre para el saludo ("Hola, Ana:"), si el nombre completo tiene varias palabras.
export const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? nombre;

function valor(v: string, c: ContextoMail): string {
  switch (v) {
    case 'nombre':
      return primerNombre(c.nombre);
    case 'empresa':
      return c.empresa;
    case 'etapas':
      return c.etapas ?? '';
    case 'link_landing':
      return c.links.landing ?? '';
    case 'link_agendar':
      return c.links.agendar;
    default:
      return `{{${v}}}`;
  }
}

// Versión en texto plano (la que se guarda en el historial y la alternativa del HTML).
export const renderTexto = (texto: string, c: ContextoMail) => texto.replace(PATRON_VARIABLE, (_, v) => valor(v, c));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const boton = (href: string, texto: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#44718D;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">${esc(texto)}</a>`;

// HTML del mail. Un párrafo que es solo {{link_landing}} o {{link_agendar}} se muestra como botón;
// dentro de una frase, como enlace. El resto del texto va escapado.
export function renderHtml(
  texto: string,
  c: ContextoMail,
  marco: { botonLanding: string; botonAgendar: string; pie: string; bajaTexto: string; bajaUrl: string; pixelUrl?: string },
) {
  const parrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const solo = /^\{\{\s*(link_landing|link_agendar)\s*\}\}$/.exec(p)?.[1];
      if (solo) {
        const href = valor(solo, c);
        return href ? `<p style="margin:24px 0">${boton(href, solo === 'link_landing' ? marco.botonLanding : marco.botonAgendar)}</p>` : '';
      }
      const partes = p.split(PATRON_VARIABLE);
      // split con un grupo de captura intercala texto y nombres de variable.
      const html = partes
        .map((parte, i) => {
          if (i % 2 === 0) return esc(parte);
          const v = valor(parte, c);
          return parte.startsWith('link_') && v ? `<a href="${esc(v)}" style="color:#44718D">${esc(v)}</a>` : esc(v);
        })
        .join('')
        .replace(/\n/g, '<br>');
      return `<p style="margin:0 0 16px">${html}</p>`;
    })
    .join('');

  return `<!doctype html><html lang="es"><body style="margin:0;background:#F4F6F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px">
<tr><td style="padding:28px 32px 8px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.18em;color:#1D1D1B">FEDES CONSULTORA</td></tr>
<tr><td style="padding:16px 32px 24px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1D1D1B">${parrafos}</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #E6E9EB;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B6F72">${esc(marco.pie)}<br><a href="${esc(marco.bajaUrl)}" style="color:#6B6F72">${esc(marco.bajaTexto)}</a></td></tr>
</table></td></tr></table>${marco.pixelUrl ? `<img src="${esc(marco.pixelUrl)}" width="1" height="1" alt="" style="display:block;border:0">` : ''}
</body></html>`;
}

// Marcadores de texto pendiente ("[PENDIENTE]", "[TEXTO LEGAL PENDIENTE]", "[CONFIRMAR]").
export const tienePendientes = (...textos: string[]) => textos.some((t) => /\[[^\]\n]*(PENDIENTE|CONFIRMAR)\]/i.test(t));

// Token de los links de un envío: "id.firma". La firma (HMAC) impide adivinar o alterar el id.
export const tokenEnvio = (id: number) => `${id}.${hmac(`mail:${id}`).slice(0, 32)}`;

export function envioDesdeToken(token: string | undefined) {
  const m = /^(\d{1,10})\.([0-9a-f]{32})$/.exec(token ?? '');
  if (!m) return null;
  const id = Number(m[1]);
  return safeEqual(tokenEnvio(id), token!) ? id : null;
}

// ¿Se le puede escribir a este lead? Devuelve el motivo si no.
export function motivoNoEnviable(lead: { email: string | null; consentimiento_el: Date | null; baja_el: Date | null; rebote_el: Date | null }) {
  if (!lead.email) return 'El lead no tiene email.';
  if (lead.baja_el) return 'El lead pidió no recibir más comunicaciones.';
  if (lead.rebote_el) return 'El email del lead rebotó: no se le envían más mails.';
  if (!lead.consentimiento_el) return 'El lead no tiene consentimiento registrado.';
  return null;
}
