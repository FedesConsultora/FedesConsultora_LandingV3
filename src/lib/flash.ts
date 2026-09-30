// Aviso de un solo uso entre una acción (POST) y la página a la que redirige, en una cookie corta.
// Se usa para contar el resultado del mail automático al entregar o desbloquear.
import type { AstroCookies } from 'astro';

const NOMBRE = 'aviso_panel';

export function dejarAviso(cookies: AstroCookies, texto: string, error = false) {
  cookies.set(NOMBRE, JSON.stringify({ texto: texto.slice(0, 300), error }), {
    path: '/admin',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60,
  });
}

export function tomarAviso(cookies: AstroCookies): { texto: string; error: boolean } | null {
  const valor = cookies.get(NOMBRE)?.value;
  if (!valor) return null;
  cookies.delete(NOMBRE, { path: '/admin' });
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

// Resultado del mail automático, como aviso.
export function avisoDeMail(cookies: AstroCookies, r: { enviado: boolean; motivo?: string } | null | undefined) {
  if (!r) return;
  dejarAviso(cookies, r.enviado ? 'Se envió el mail al lead.' : (r.motivo ?? 'No se envió el mail.'), !r.enviado);
}
