import { describe, expect, it } from 'vitest';
import { contacto } from '../content/contacto';
import {
  TAMANOS,
  aInputFechaHora,
  fechaHoraArgentina,
  fechaISO,
  parseCambioEstado,
  parseLead,
  tamanoDesdeFormulario,
} from './pipeline';

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};
const minimo = { nombre: 'Persona Ficticia', empresa: 'Empresa Inventada SA', fuente: 'linkedin' };
const sectores = new Set([1, 2]);

describe('tamaños', () => {
  it('hay un código por cada opción del formulario web, más "Sin dato"', () => {
    expect(TAMANOS).toHaveLength(contacto.form.tamanoOptions.length + 1);
  });

  it('traduce el texto del formulario al código', () => {
    expect(tamanoDesdeFormulario('Hasta 10 empleados')).toBe('1-10');
    expect(tamanoDesdeFormulario('Más de 500 empleados')).toBe('500+');
    expect(tamanoDesdeFormulario('otra cosa')).toBe('desconocido');
    expect(tamanoDesdeFormulario(null)).toBe('desconocido');
  });
});

describe('parseLead', () => {
  it('acepta el mínimo: nombre, empresa y fuente', () => {
    const { data, errores } = parseLead(form(minimo), sectores);
    expect(errores).toEqual({});
    expect(data).toMatchObject({ ...minimo, email: null, tamano: 'desconocido', sector_id: null });
  });

  it('exige nombre, empresa y fuente', () => {
    const { data, errores } = parseLead(form({}), sectores);
    expect(data).toBeUndefined();
    expect(Object.keys(errores).sort()).toEqual(['empresa', 'fuente', 'nombre']);
  });

  it('normaliza el email a minúsculas y valida su formato', () => {
    expect(parseLead(form({ ...minimo, email: 'Alguien@Ejemplo.TEST' }), sectores).data?.email).toBe('alguien@ejemplo.test');
    expect(parseLead(form({ ...minimo, email: 'sin-arroba' }), sectores).errores.email).toBeDefined();
  });

  it('completa https:// en el sitio y solo acepta LinkedIn en el perfil', () => {
    const ok = parseLead(form({ ...minimo, sitio_web: 'empresa.com.ar', linkedin_url: 'linkedin.com/in/alguien' }), sectores);
    expect(ok.data?.sitio_web).toBe('https://empresa.com.ar/');
    expect(ok.data?.linkedin_url).toBe('https://linkedin.com/in/alguien');
    const mal = parseLead(form({ ...minimo, linkedin_url: 'https://otro-sitio.com/in/alguien' }), sectores);
    expect(mal.errores.linkedin_url).toBeDefined();
  });

  it('rechaza valores fuera de las listas controladas', () => {
    const { errores } = parseLead(
      form({ ...minimo, fuente: 'inventada', tamano: '9999', pais: 'Atlántida', sector_id: '99', resolver: 'Otra cosa' }),
      sectores,
    );
    expect(Object.keys(errores).sort()).toEqual(['fuente', 'pais', 'resolver', 'sector_id', 'tamano']);
  });

  it('guarda la fecha de la sesión en hora de Buenos Aires', () => {
    const { data } = parseLead(form({ ...minimo, fecha_sesion: '2026-10-02T15:30' }), sectores);
    expect(data?.fecha_sesion).toBe('2026-10-02T15:30:00-03:00');
    expect(new Date(data!.fecha_sesion!).toISOString()).toBe('2026-10-02T18:30:00.000Z');
  });

  it('recorta textos demasiado largos', () => {
    const { data } = parseLead(form({ ...minimo, nombre: 'x'.repeat(500) }), sectores);
    expect(data?.nombre).toHaveLength(200);
  });
});

describe('fechas', () => {
  it('ida y vuelta entre el input y la base, en hora de Buenos Aires', () => {
    const guardada = new Date(fechaHoraArgentina('2026-10-02T09:05')!);
    expect(aInputFechaHora(guardada)).toBe('2026-10-02T09:05');
    expect(aInputFechaHora('2026-10-02T09:05')).toBe('2026-10-02T09:05');
    expect(aInputFechaHora(null)).toBe('');
  });

  it('formatea columnas DATE sin correr el día', () => {
    expect(fechaISO(new Date(2026, 9, 1))).toBe('2026-10-01');
    expect(fechaISO('2026-10-01')).toBe('2026-10-01');
    expect(fechaISO(null)).toBe('');
  });

  it('rechaza fechas con otro formato', () => {
    expect(fechaHoraArgentina('02/10/2026 15:30')).toBeNull();
  });
});

describe('parseCambioEstado', () => {
  it('acepta un estado válido y descarta el motivo si no es "Perdido"', () => {
    expect(parseCambioEstado(form({ estado: 'agendo', motivo_perdido: 'otro' }))).toEqual({ estado: 'agendo', motivo: null });
  });

  it('exige motivo para "Perdido"', () => {
    expect(parseCambioEstado(form({ estado: 'perdido' })).error).toBeDefined();
    expect(parseCambioEstado(form({ estado: 'perdido', motivo_perdido: 'sin_presupuesto' }))).toEqual({
      estado: 'perdido',
      motivo: 'sin_presupuesto',
    });
  });

  it('rechaza estados inexistentes', () => {
    expect(parseCambioEstado(form({ estado: 'ganado' })).error).toBeDefined();
  });
});
