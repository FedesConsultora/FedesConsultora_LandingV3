import { describe, expect, it } from 'vitest';
import { seguimiento, type ResumenLanding } from './proceso';

const ahora = new Date('2026-10-01T12:00:00-03:00');
const antes = new Date('2026-09-30T10:00:00-03:00');
const despues = new Date('2026-10-03T10:00:00-03:00');

const landing = (extra: Partial<ResumenLanding> = {}): ResumenLanding => ({
  id: 7,
  estado: 'borrador',
  vencida: false,
  entregada_el: null,
  etapas: 4,
  aprobadas: 0,
  al_entregar: 2,
  al_entregar_sin_aprobar: 2,
  visitas: 0,
  ultima_visita: null,
  ...extra,
});
const actual = (s: ReturnType<typeof seguimiento>) => s.pasos.find((p) => p.estado === 'actual')?.clave;

describe('seguimiento guiado', () => {
  it('contacto: identificado → marcar contactado → marcar que respondió', () => {
    let s = seguimiento({ estado: 'identificado', fecha_sesion: null }, null, ahora);
    expect(actual(s)).toBe('contacto');
    expect(s.accion).toMatchObject({ tipo: 'estado', estado: 'contactado' });
    s = seguimiento({ estado: 'contactado', fecha_sesion: null }, null, ahora);
    expect(s.accion).toMatchObject({ tipo: 'estado', estado: 'respondio' });
  });

  it('respondió: cargar la fecha de la sesión', () => {
    const s = seguimiento({ estado: 'respondio', fecha_sesion: null }, null, ahora);
    expect(s.accion.tipo).toBe('agendar');
  });

  it('agendó con fecha futura: esperar, con opción de reprogramar', () => {
    const s = seguimiento({ estado: 'agendo', fecha_sesion: despues }, null, ahora);
    expect(actual(s)).toBe('sesion_agendada');
    expect(s.accion.tipo).toBe('ninguna');
    expect(s.secundaria?.tipo).toBe('agendar');
  });

  it('agendó con la fecha pasada: marcar la sesión realizada', () => {
    const s = seguimiento({ estado: 'agendo', fecha_sesion: antes }, null, ahora);
    expect(s.accion).toMatchObject({ tipo: 'estado', estado: 'sesion_realizada', titulo: '¿Se hizo la sesión?' });
  });

  it('sesión realizada sin landing: crearla', () => {
    const s = seguimiento({ estado: 'sesion_realizada', fecha_sesion: antes }, null, ahora);
    expect(actual(s)).toBe('landing_armado');
    expect(s.accion.tipo).toBe('crear_landing');
    expect(s.pasos.filter((p) => p.estado === 'hecho').map((p) => p.clave)).toEqual(['contacto', 'sesion_agendada', 'sesion_realizada']);
  });

  it('landing en armado: completar etapas, con el avance', () => {
    const s = seguimiento({ estado: 'sesion_realizada', fecha_sesion: antes }, landing({ aprobadas: 1, al_entregar_sin_aprobar: 1 }), ahora);
    expect(s.accion).toMatchObject({ tipo: 'editar_landing', detalle: '1 de 4 etapas aprobadas.' });
  });

  it('etapas "al entregar" aprobadas: entregar', () => {
    const s = seguimiento({ estado: 'sesion_realizada', fecha_sesion: antes }, landing({ aprobadas: 2, al_entregar_sin_aprobar: 0 }), ahora);
    expect(s.accion).toMatchObject({ tipo: 'entregar_landing', landingId: 7 });
  });

  it('no ofrece entregar si ninguna etapa se desbloquea al entregar', () => {
    const s = seguimiento({ estado: 'sesion_realizada', fecha_sesion: antes }, landing({ al_entregar: 0, al_entregar_sin_aprobar: 0 }), ahora);
    expect(s.accion.tipo).toBe('editar_landing');
  });

  it('landing entregada: visitas y pasar a Propuesta', () => {
    const l = landing({ estado: 'activa', entregada_el: antes, visitas: 3 });
    const s = seguimiento({ estado: 'sesion_realizada', fecha_sesion: antes }, l, ahora);
    expect(actual(s)).toBe('landing_entregada');
    expect(s.accion).toMatchObject({ tipo: 'estado', estado: 'propuesta', detalle: '3 visitas.' });
  });

  it('landing revocada o vencida: avisa que el lead no la puede abrir', () => {
    for (const l of [landing({ estado: 'revocada', entregada_el: antes }), landing({ estado: 'activa', vencida: true, entregada_el: antes })]) {
      expect(seguimiento({ estado: 'sesion_realizada', fecha_sesion: antes }, l, ahora).accion.tipo).toBe('editar_landing');
    }
  });

  it('propuesta sin landing entregada: esos pasos quedan omitidos', () => {
    const s = seguimiento({ estado: 'propuesta', fecha_sesion: antes }, null, ahora);
    expect(actual(s)).toBe('propuesta');
    expect(s.pasos.find((p) => p.clave === 'landing_entregada')?.estado).toBe('omitido');
    expect(s.accion).toMatchObject({ estado: 'onboarding' });
  });

  it('onboarding: proceso completo, sin paso actual', () => {
    const l = landing({ estado: 'activa', entregada_el: antes });
    const s = seguimiento({ estado: 'onboarding', fecha_sesion: antes }, l, ahora);
    expect(actual(s)).toBeUndefined();
    expect(s.pasos.every((p) => p.estado === 'hecho')).toBe(true);
  });

  it('perdido: queda donde llegó, sin acción', () => {
    const s = seguimiento({ estado: 'perdido', fecha_sesion: antes }, null, ahora);
    expect(actual(s)).toBe('sesion_agendada');
    expect(s.accion.tipo).toBe('ninguna');
  });
});
