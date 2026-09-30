// Seguimiento guiado del lead: en qué paso del proceso está y cuál es la próxima acción.
// Se deriva del estado del pipeline y de su landing más reciente; no se guarda aparte.
// Sin acceso a la base: se puede probar aislado.
import type { Estado } from './pipeline';

export type ResumenLanding = {
  id: number;
  estado: 'borrador' | 'activa' | 'revocada';
  vencida: boolean;
  entregada_el: Date | null;
  etapas: number;
  aprobadas: number;
  al_entregar: number; // etapas marcadas para desbloquearse al entregar
  al_entregar_sin_aprobar: number;
  visitas: number;
  ultima_visita: Date | null;
};

export type EstadoPaso = 'hecho' | 'actual' | 'pendiente' | 'omitido';
export type Paso = { clave: string; etiqueta: string; estado: EstadoPaso };

// Acciones que la ficha sabe ejecutar. `detalle` explica la situación; `boton` es la acción principal.
export type Accion =
  | { tipo: 'estado'; titulo: string; detalle?: string; boton: string; estado: Estado }
  | { tipo: 'agendar'; titulo: string; detalle?: string; boton: string }
  | { tipo: 'crear_landing'; titulo: string; detalle?: string; boton: string }
  | { tipo: 'editar_landing'; titulo: string; detalle?: string; boton: string; landingId: number }
  | { tipo: 'entregar_landing'; titulo: string; detalle?: string; boton: string; landingId: number }
  | { tipo: 'ninguna'; titulo: string; detalle?: string };

export type Seguimiento = { pasos: Paso[]; accion: Accion; secundaria?: Accion };

const PASOS = [
  { clave: 'contacto', etiqueta: 'Contacto' },
  { clave: 'sesion_agendada', etiqueta: 'Sesión agendada' },
  { clave: 'sesion_realizada', etiqueta: 'Sesión realizada' },
  { clave: 'landing_armado', etiqueta: 'Landing en armado' },
  { clave: 'landing_entregada', etiqueta: 'Landing entregada' },
  { clave: 'propuesta', etiqueta: 'Propuesta' },
  { clave: 'cliente', etiqueta: 'Cliente' },
] as const;
type ClavePaso = (typeof PASOS)[number]['clave'];

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function seguimiento(
  lead: { estado: Estado; fecha_sesion: Date | null },
  landing: ResumenLanding | null,
  ahora = new Date(),
): Seguimiento {
  const entregada = Boolean(landing?.entregada_el);

  // Paso actual según el estado y la landing.
  let actual: ClavePaso;
  switch (lead.estado) {
    case 'identificado':
    case 'contactado':
    case 'respondio':
      actual = 'contacto';
      break;
    case 'agendo':
      actual = 'sesion_agendada';
      break;
    case 'sesion_realizada':
      actual = !landing || !entregada ? 'landing_armado' : 'landing_entregada';
      break;
    case 'propuesta':
      actual = 'propuesta';
      break;
    case 'onboarding':
      actual = 'cliente';
      break;
    case 'perdido':
      // Un lead perdido queda donde llegó según los datos que tiene.
      actual = entregada ? 'landing_entregada' : landing ? 'landing_armado' : lead.fecha_sesion ? 'sesion_agendada' : 'contacto';
      break;
  }
  const iActual = PASOS.findIndex((p) => p.clave === actual);

  // Pasos anteriores que no ocurrieron (por ejemplo, pasar a Propuesta sin entregar landing) se marcan omitidos.
  const ocurrio: Record<ClavePaso, boolean> = {
    contacto: true,
    sesion_agendada: Boolean(lead.fecha_sesion) || iActual > 1,
    sesion_realizada: iActual > 2,
    landing_armado: Boolean(landing),
    landing_entregada: entregada,
    propuesta: iActual > 5,
    cliente: lead.estado === 'onboarding',
  };
  // Un cliente (Onboarding) completó el proceso: no hay paso "actual".
  const estadoDe = (clave: ClavePaso, i: number): EstadoPaso => {
    if (i < iActual || lead.estado === 'onboarding') return ocurrio[clave] ? 'hecho' : 'omitido';
    return i === iActual ? 'actual' : 'pendiente';
  };
  const pasos: Paso[] = PASOS.map((p, i) => ({ ...p, estado: estadoDe(p.clave, i) }));

  return { pasos, ...accionPara(lead, landing, ahora) };
}

function accionPara(
  lead: { estado: Estado; fecha_sesion: Date | null },
  landing: ResumenLanding | null,
  ahora: Date,
): { accion: Accion; secundaria?: Accion } {
  switch (lead.estado) {
    case 'identificado':
      return { accion: { tipo: 'estado', titulo: 'Hacer el primer contacto', boton: 'Marcar como contactado', estado: 'contactado' } };
    case 'contactado':
      return { accion: { tipo: 'estado', titulo: 'Esperar la respuesta', boton: 'Marcar que respondió', estado: 'respondio' } };
    case 'respondio':
      return { accion: { tipo: 'agendar', titulo: 'Agendar la sesión de diagnóstico', boton: 'Guardar fecha' } };
    case 'agendo': {
      const fecha = lead.fecha_sesion ? new Date(lead.fecha_sesion) : null;
      if (fecha && fecha > ahora) {
        return {
          accion: { tipo: 'ninguna', titulo: 'Sesión agendada', detalle: 'Cuando se haga, marcala como realizada.' },
          secundaria: { tipo: 'agendar', titulo: 'Cambiar la fecha', boton: 'Guardar fecha' },
        };
      }
      return {
        accion: {
          tipo: 'estado',
          titulo: fecha ? '¿Se hizo la sesión?' : 'Falta la fecha de la sesión',
          detalle: fecha ? 'La fecha ya pasó.' : undefined,
          boton: 'Marcar sesión realizada',
          estado: 'sesion_realizada',
        },
        secundaria: { tipo: 'agendar', titulo: fecha ? 'Se reprogramó' : 'Cargar la fecha', boton: 'Guardar fecha' },
      };
    }
    case 'sesion_realizada':
      return accionLanding(landing);
    case 'propuesta':
      return {
        accion: { tipo: 'estado', titulo: 'Propuesta enviada', detalle: 'Si acepta, pasa a Onboarding.', boton: 'Pasar a Onboarding', estado: 'onboarding' },
      };
    case 'onboarding':
      return { accion: { tipo: 'ninguna', titulo: 'Es cliente', detalle: 'El lead está en Onboarding.' } };
    case 'perdido':
      return { accion: { tipo: 'ninguna', titulo: 'Lead perdido', detalle: 'Para retomarlo, cambiá su estado.' } };
  }
}

function accionLanding(l: ResumenLanding | null): { accion: Accion; secundaria?: Accion } {
  if (!l) {
    return { accion: { tipo: 'crear_landing', titulo: 'Armar la landing del diagnóstico', detalle: 'Con los resultados y la ruta sugerida.', boton: 'Crear landing' } };
  }
  if (l.estado === 'revocada' || l.vencida) {
    return {
      accion: {
        tipo: 'editar_landing',
        titulo: l.estado === 'revocada' ? 'El link está revocado' : 'La landing venció',
        detalle: 'El lead no la puede abrir.',
        boton: 'Ir a la landing',
        landingId: l.id,
      },
    };
  }
  if (!l.entregada_el) {
    const progreso = `${l.aprobadas} de ${plural(l.etapas, 'etapa aprobada', 'etapas aprobadas')}.`;
    if (l.al_entregar > 0 && l.al_entregar_sin_aprobar === 0) {
      return {
        accion: { tipo: 'entregar_landing', titulo: 'Lista para entregar', detalle: progreso, boton: 'Entregar landing', landingId: l.id },
        secundaria: { tipo: 'editar_landing', titulo: 'Revisar antes', boton: 'Abrir el editor', landingId: l.id },
      };
    }
    return { accion: { tipo: 'editar_landing', titulo: 'Completar y aprobar las etapas', detalle: progreso, boton: 'Abrir el editor', landingId: l.id } };
  }
  const visitas = l.visitas === 0 ? 'Sin visitas todavía.' : `${plural(l.visitas, 'visita', 'visitas')}.`;
  return {
    accion: { tipo: 'estado', titulo: 'Landing entregada', detalle: visitas, boton: 'Pasar a Propuesta', estado: 'propuesta' },
    secundaria: { tipo: 'editar_landing', titulo: 'Desbloquear más etapas', boton: 'Abrir el editor', landingId: l.id },
  };
}
