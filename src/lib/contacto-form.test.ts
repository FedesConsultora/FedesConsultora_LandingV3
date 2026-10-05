import { describe, expect, it } from 'vitest';
import { honeypotCompleto, parseContactoForm } from './contacto-form';

const valido = () => {
  const form = new FormData();
  form.set('nombre', 'Ana Pérez');
  form.set('empresa', 'Empresa SA');
  form.set('email', 'ANA@EXAMPLE.COM');
  form.set('tamano', 'Hasta 10 empleados');
  form.set('resolver', 'Tecnología');
  form.set('privacidad', 'on');
  return form;
};

describe('parseContactoForm', () => {
  it('normaliza un envío válido y no acepta campos retirados del formulario', () => {
    const form = valido();
    form.set('cargo', 'No debe persistirse');
    form.set('comentarios', 'No debe persistirse');
    const r = parseContactoForm(form);
    expect(r).toEqual({
      ok: true,
      fields: {
        nombre: 'Ana Pérez',
        empresa: 'Empresa SA',
        email: 'ana@example.com',
        cargo: null,
        whatsapp: null,
        tamano: 'Hasta 10 empleados',
        resolver: 'Tecnología',
        ruta_referido: null,
        comentarios: null,
      },
    });
  });

  it('exige consentimiento exacto y único', () => {
    for (const valor of ['', 'off', 'false', '1']) {
      const form = valido();
      if (valor) form.set('privacidad', valor);
      else form.delete('privacidad');
      expect(parseContactoForm(form)).toEqual({ ok: false, error: 'privacy' });
    }
    const repetido = valido();
    repetido.append('privacidad', 'on');
    expect(parseContactoForm(repetido)).toEqual({ ok: false, error: 'privacy' });
  });

  it('rechaza valores fuera de las listas controladas', () => {
    const tamano = valido();
    tamano.set('tamano', '999 empleados');
    expect(parseContactoForm(tamano)).toEqual({ ok: false, error: 'invalid_tamano' });

    const resolver = valido();
    resolver.set('resolver', 'Otra cosa');
    expect(parseContactoForm(resolver)).toEqual({ ok: false, error: 'invalid_resolver' });

    const ruta = valido();
    ruta.set('ruta_referido', 'ruta-inventada');
    expect(parseContactoForm(ruta)).toEqual({ ok: false, error: 'invalid_ruta_referido' });
  });

  it('rechaza campos repetidos, archivos, controles y longitudes excesivas', () => {
    const repetido = valido();
    repetido.append('email', 'otro@example.com');
    expect(parseContactoForm(repetido)).toEqual({ ok: false, error: 'invalid_email' });

    const archivo = valido();
    archivo.set('nombre', new File(['x'], 'x.txt'));
    expect(parseContactoForm(archivo)).toEqual({ ok: false, error: 'invalid_nombre' });

    const control = valido();
    control.set('empresa', 'Empresa\ninyectada');
    expect(parseContactoForm(control)).toEqual({ ok: false, error: 'invalid_empresa' });

    const largo = valido();
    largo.set('email', `${'a'.repeat(310)}@example.com`);
    expect(parseContactoForm(largo)).toEqual({ ok: false, error: 'invalid_email' });
  });

  it('detecta el honeypot sin confiar en el tipo del campo', () => {
    const vacio = valido();
    expect(honeypotCompleto(vacio)).toBe(false);
    vacio.set('web', 'bot');
    expect(honeypotCompleto(vacio)).toBe(true);

    const archivo = valido();
    archivo.set('web', new File(['x'], 'bot.txt'));
    expect(honeypotCompleto(archivo)).toBe(true);
  });
});
