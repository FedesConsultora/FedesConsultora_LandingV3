// Contenido de la página Casos. Fuente literal: docs/05-casos.md
// Reglas: casos anónimos, sin tamaño de empresa; toda cifra con su plazo; no agregar casos ni cifras.

import type { ImageMetadata } from 'astro';
import { photos } from './photos';

export interface Caso {
  sector: string;
  image: ImageMetadata;
  imageAlt: string;
  onboarding: string;
  prefix: string; // "Cerca del", "Hasta"
  figure: string;
  measures: string; // rótulo de lo que mide la cifra
  headline: string;
  body: string;
  plazo: string;
  pendiente?: string; // marcador visible
}

const plazo = '60 días, la duración del onboarding.';

export const casos = {
  // [PENDIENTE] Meta descripción de Casos: propuesta armada con textos del doc, a validar.
  meta: {
    title: 'Casos de éxito | Fedes Consultora',
    description:
      'Resultados por industria de nuestros onboardings de 60 días. Trabajamos con confidencialidad corporativa: los casos se presentan de forma anónima.',
  },

  hero: {
    eyebrow: 'Casos',
    title: 'Resultados por industria.',
    body: 'Trabajamos con confidencialidad corporativa: los casos se presentan de forma anónima.',
  },

  plazoLabel: 'Plazo',

  items: [
    {
      sector: 'Distribución mayorista',
      image: photos.casoDistribucion,
      imageAlt: 'Almacén con estanterías metálicas azules',
      onboarding: 'Onboarding Mercado',
      prefix: 'Cerca del',
      figure: '16%',
      measures: 'de la facturación a través de su app',
      headline: 'Expansión territorial y cerca del 16% de la facturación a través de su app.',
      body: 'Una distribuidora mayorista venía creciendo sin un orden sólido. Alineamos su identidad, su ecosistema digital y su estrategia comercial. El resultado: expansión territorial, más clientes activos, mayor adopción de su app propia (cerca del 16% de la facturación) y una comunicación coherente que fortaleció su posicionamiento.',
      plazo,
    },
    {
      sector: 'Comercio exterior y logística',
      image: photos.casoLogistica,
      imageAlt: 'Puerto de contenedores con grúas al atardecer',
      onboarding: 'Onboarding Mercado',
      prefix: 'Hasta',
      figure: '50%',
      measures: 'menos de procesos y tiempo',
      headline: 'Toda su infraestructura digitalizada: hasta un 50% menos de procesos y tiempo.',
      body: 'Una empresa de comercio exterior y logística digitalizó toda su infraestructura, dentro de un ecosistema tecnológico comercial integrado. El resultado: una reducción de hasta el 50% en procesos y tiempo.',
      plazo,
      pendiente: '[PENDIENTE] Desafío de partida y base de cálculo del «hasta 50%». Se muestra siempre como «hasta», nunca como una promesa.',
    },
    {
      sector: 'Agromarketing y sanidad animal',
      image: photos.casoAgro,
      imageAlt: 'Vacas pastando en un campo abierto',
      onboarding: 'Onboarding Digital',
      prefix: '',
      figure: '+297,3%',
      measures: 'de crecimiento en visualizaciones',
      headline: '+297,3% de crecimiento en visualizaciones.',
      body: 'Una empresa de sanidad animal tenía una comunicación fragmentada y un crecimiento frenado. Redefinimos su presencia online, su narrativa y su estrategia de mercado. El resultado: un crecimiento del 297,3% en visualizaciones y una marca con voz, coherencia y lugar dentro de su industria. El Onboarding Digital trabaja la presencia digital de la marca, por eso su resultado se mide en visualizaciones.',
      plazo,
      pendiente: '[PENDIENTE] Un dato de leads o ventas que acompañe la cifra, porque las visualizaciones son una métrica de alcance.',
    },
  ] as Caso[],

  // El doc de Casos no define un cierre: se reutiliza el de Inicio.
  cierre: {
    title: 'Empecemos por un diagnóstico.',
    body: 'Una sesión ejecutiva para analizar el estado de tu negocio y definir por dónde empezar. Sin cargo.',
    cta: { label: 'Agendar sesión de diagnóstico', href: '/contacto' },
  },
};
