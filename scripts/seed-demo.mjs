// Carga datos de prueba FICTICIOS en la base de desarrollo: leads en cada estado del pipeline
// y una landing entregada. Todos los emails terminan en @ejemplo.test (dominio reservado, no existe).
// Se puede correr varias veces: antes de cargar, borra lo que cargó la vez anterior.
// Solo corre sobre la rama de desarrollo (ver scripts/lib/guardia.mjs).
//
// Uso: npm run db:seed-demo
import { baseDeDesarrollo } from './lib/guardia.mjs';
import { claveDesde, cifrar, hashToken, tokenAlAzar } from '../src/lib/tokens-core.mjs';

const sql = await baseDeDesarrollo();
const clave = claveDesde(process.env.LANDING_TOKEN_KEY);
const BASE = process.env.PUBLIC_SITE_URL_DEV || 'http://localhost:4321';

const { length: borrados } = await sql`DELETE FROM leads WHERE email LIKE '%@ejemplo.test' RETURNING id`;
const sectores = Object.fromEntries((await sql`SELECT id, nombre FROM sectores`).map((s) => [s.nombre, s.id]));

const leads = [
  { nombre: 'Laura Ejemplo', empresa: 'Distribuidora Ejemplo SA', cargo: 'Directora general', email: 'laura@ejemplo.test', tamano: '51-200', sector: 'Distribución mayorista', fuente: 'linkedin', estado: 'identificado', proximo_paso: 'Primer mensaje por LinkedIn', dias_paso: 2 },
  { nombre: 'Martín Ejemplo', empresa: 'Laboratorio Ejemplo SRL', cargo: 'Gerente general', email: 'martin@ejemplo.test', tamano: '201-500', sector: 'Laboratorios y farma', fuente: 'recomendacion', estado: 'contactado', proximo_paso: 'Seguimiento del primer contacto', dias_paso: -1 },
  { nombre: 'Sofía Ejemplo', empresa: 'Alimentos Ejemplo SA', cargo: null, email: 'sofia@ejemplo.test', tamano: '11-50', sector: null, fuente: 'web', estado: 'respondio', resolver: 'Mercado y marca', web: true },
  { nombre: 'Tomás Ejemplo', empresa: 'Logística Ejemplo SA', cargo: 'Presidente', email: 'tomas@ejemplo.test', tamano: '51-200', sector: 'Comercio exterior y logística', fuente: 'evento', estado: 'agendo', dias_sesion: 3 },
  { nombre: 'Valeria Ejemplo', empresa: 'Industrias Ejemplo SA', cargo: 'Dueña', email: 'valeria@ejemplo.test', tamano: '201-500', sector: 'Industria y manufactura', fuente: 'linkedin', estado: 'sesion_realizada', dias_sesion: -2, landing: true },
  { nombre: 'Diego Ejemplo', empresa: 'Retail Ejemplo SRL', cargo: 'Gerente comercial', email: 'diego@ejemplo.test', tamano: '1-10', sector: 'Retail', fuente: 'contenido_entrante', estado: 'perdido', motivo: 'no_es_perfil' },
];

const dias = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
let link = null;

for (const l of leads) {
  const [{ id }] = await sql`
    INSERT INTO leads (nombre, empresa, cargo, email, tamano, sector_id, fuente, estado, motivo_perdido, resolver, pais,
                       fecha_sesion, proximo_paso, fecha_proximo_paso, consentimiento_el, consentimiento_origen, consentimiento_texto)
    VALUES (${l.nombre}, ${l.empresa}, ${l.cargo}, ${l.email}, ${l.tamano}, ${l.sector ? sectores[l.sector] : null}, ${l.fuente},
            ${l.estado}, ${l.motivo ?? null}, ${l.resolver ?? null}, 'Argentina',
            ${l.dias_sesion ? dias(l.dias_sesion) : null}, ${l.proximo_paso ?? null},
            ${l.dias_paso ? dias(l.dias_paso).toISOString().slice(0, 10) : null},
            ${l.web ? new Date() : null}, ${l.web ? 'Formulario de Contacto de la web' : null},
            ${l.web ? 'Acepto la Política de Privacidad' : null})
    RETURNING id
  `;
  await sql`INSERT INTO historial_estados (lead_id, estado_nuevo, motivo_perdido, origen)
            VALUES (${id}, ${l.estado}, ${l.motivo ?? null}, ${l.web ? 'formulario web' : 'panel'})`;
  if (l.web) {
    await sql`INSERT INTO formularios (lead_id, nombre, empresa, email, tamano, resolver, resend_status)
              VALUES (${id}, ${l.nombre}, ${l.empresa}, ${l.email}, '11 a 50 empleados', ${l.resolver}, 'skipped')`;
  }

  if (l.landing) {
    const token = tokenAlAzar();
    const [{ id: landingId }] = await sql`
      INSERT INTO landings (lead_id, titulo, token_hash, token_cifrado, estado, entregada_el)
      VALUES (${id}, ${'Diagnóstico de ' + l.empresa}, ${hashToken(token)}, ${cifrar(token, clave)}, 'activa', now())
      RETURNING id
    `;
    const etapas = [
      {
        titulo: 'Resultados del diagnóstico', modo: 'al_entregar', desbloqueada: true, aprobada: true,
        contenido: [
          { tipo: 'parrafo', texto: 'Ejemplo: resumen de lo conversado en la sesión de diagnóstico. Los datos son ficticios.' },
          { tipo: 'titulo', texto: 'Prioridades' },
          { tipo: 'lista', items: ['Ejemplo de primera prioridad.', 'Ejemplo de segunda prioridad.', 'Ejemplo de tercera prioridad.'] },
          { tipo: 'destacado', texto: 'Ejemplo de conclusión principal.' },
        ],
      },
      {
        titulo: 'Ruta y onboardings sugeridos', modo: 'al_entregar', desbloqueada: true, aprobada: true,
        contenido: [
          { tipo: 'ruta', ruta: 'Organización y finanzas', onboardings: ['Onboarding Organizacional'], porque: 'Ejemplo: por qué sugerimos esta ruta para esta empresa ficticia.' },
          { tipo: 'cta', texto: 'Agendar la reunión de propuesta', destino: 'agendar' },
        ],
      },
      {
        titulo: 'Caso anónimo del sector', modo: 'manual', desbloqueada: false, aprobada: true,
        contenido: [{ tipo: 'caso', sector: 'Ejemplo de sector', situacion: 'Ejemplo de situación.', camino: 'Ejemplo de camino.', resultado: 'Ejemplo de resultado en 60 días.' }],
      },
      { titulo: 'Hoja de ruta y próximos pasos', modo: 'manual', desbloqueada: false, aprobada: false, contenido: [] },
    ];
    for (const [i, e] of etapas.entries()) {
      await sql`
        INSERT INTO etapas (landing_id, orden, titulo, contenido, estado, modo_desbloqueo, desbloqueada_el, aprobada, aprobada_el)
        VALUES (${landingId}, ${i + 1}, ${e.titulo}, ${JSON.stringify(e.contenido)}::jsonb,
                ${e.desbloqueada ? 'desbloqueada' : 'bloqueada'}, ${e.modo}, ${e.desbloqueada ? new Date() : null},
                ${e.aprobada}, ${e.aprobada ? new Date() : null})
      `;
    }
    link = `${BASE}/diagnostico/${token}`;
  }
}

console.log(`Datos de prueba cargados: ${leads.length} leads ficticios${borrados ? ` (se reemplazaron ${borrados} anteriores)` : ''}.`);
if (link) console.log(`Landing de prueba entregada: ${link}`);
