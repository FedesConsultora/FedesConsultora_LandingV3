import { contacto } from '../content/contacto';

export type CamposContacto = {
  nombre: string;
  empresa: string;
  email: string;
  cargo: null;
  whatsapp: null;
  tamano: string;
  resolver: string;
  ruta_referido: string | null;
  comentarios: null;
};

export type ResultadoContacto =
  | { ok: true; fields: CamposContacto }
  | { ok: false; error: string };

const CONTROL = /[\u0000-\u001F\u007F]/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITES = {
  nombre: 200,
  empresa: 200,
  email: 320,
  tamano: 80,
  resolver: 120,
  ruta_referido: 120,
} as const;

type Campo = keyof typeof LIMITES;

function leerUnico(form: FormData, campo: Campo): { value?: string; error?: string } {
  const valores = form.getAll(campo);
  if (valores.length > 1) return { error: `invalid_${campo}` };
  if (valores.length === 0) return { value: '' };
  const valor = valores[0];
  if (typeof valor !== 'string') return { error: `invalid_${campo}` };
  const limpio = valor.trim();
  if (limpio.length > LIMITES[campo] || CONTROL.test(limpio)) return { error: `invalid_${campo}` };
  return { value: limpio };
}

export function honeypotCompleto(form: FormData) {
  const valores = form.getAll('web');
  if (valores.length === 0) return false;
  if (valores.length > 1) return true;
  const valor = valores[0];
  return typeof valor !== 'string' || valor.trim().length > 0;
}

export function parseContactoForm(form: FormData): ResultadoContacto {
  const leidos = Object.fromEntries(
    (Object.keys(LIMITES) as Campo[]).map((campo) => {
      const r = leerUnico(form, campo);
      return [campo, r];
    }),
  ) as Record<Campo, { value?: string; error?: string }>;

  for (const campo of Object.keys(leidos) as Campo[]) {
    if (leidos[campo].error) return { ok: false, error: leidos[campo].error! };
  }

  for (const campo of ['nombre', 'empresa', 'email', 'tamano', 'resolver'] as const) {
    if (!leidos[campo].value) return { ok: false, error: `missing_${campo}` };
  }

  const email = leidos.email.value!.toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: 'invalid_email' };

  const tamano = leidos.tamano.value!;
  if (!(contacto.form.tamanoOptions as readonly string[]).includes(tamano)) {
    return { ok: false, error: 'invalid_tamano' };
  }

  const resolver = leidos.resolver.value!;
  if (!(contacto.form.resolverOptions as readonly string[]).includes(resolver)) {
    return { ok: false, error: 'invalid_resolver' };
  }

  const ruta = leidos.ruta_referido.value || null;
  if (ruta && !(contacto.form.resolverOptions as readonly string[]).includes(ruta)) {
    return { ok: false, error: 'invalid_ruta_referido' };
  }

  const privacidad = form.getAll('privacidad');
  if (privacidad.length !== 1 || privacidad[0] !== 'on') {
    return { ok: false, error: 'privacy' };
  }

  return {
    ok: true,
    fields: {
      nombre: leidos.nombre.value!,
      empresa: leidos.empresa.value!,
      email,
      cargo: null,
      whatsapp: null,
      tamano,
      resolver,
      ruta_referido: ruta,
      comentarios: null,
    },
  };
}
