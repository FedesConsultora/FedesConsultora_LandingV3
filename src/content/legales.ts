// Textos de Política de Privacidad y Términos y Condiciones.
// Base: páginas Legal de la web anterior (repo FedesConsultora_Landing, src/pages/Legal, 22/07/2026),
// adaptadas a fedesconsultora.com: sin la app de Meta, sin «agencia», con los datos que el sitio
// trata hoy (formulario, base de datos, mails, landings privadas, GA4, agenda de Google).
// BORRADOR SUJETO A REVISIÓN DE UN ABOGADO (docs/08-pendientes.md). Lo marcado con
// [TEXTO LEGAL PENDIENTE: …] falta definir y se ve resaltado en la página.

export type Bloque = string | { lista: string[] } | { subtitulo: string };
export interface Seccion {
  titulo: string;
  bloques: Bloque[];
}
export interface DocumentoLegal {
  meta: { title: string; description: string };
  titulo: string;
  actualizado: string;
  intro?: string;
  secciones: Seccion[];
  verTambien: { texto: string; label: string; href: string };
}

const MAIL = 'info@fedesconsultora.com';

export const privacidad: DocumentoLegal = {
  meta: {
    title: 'Política de Privacidad | Fedes Consultora',
    description: 'Cómo Fedes Consultora recopila, usa y protege los datos personales de quienes visitan su sitio y la contactan.',
  },
  titulo: 'Política de Privacidad',
  actualizado: '22 de octubre de 2026',
  secciones: [
    {
      titulo: '1. Introducción y alcance',
      bloques: [
        'En Fedes Consultora (en adelante, «Fedes» o «nosotros») cuidamos tu privacidad y tratamos tus datos personales de forma responsable. Esta Política explica de manera clara:',
        {
          lista: [
            'Qué datos personales recopilamos y por qué.',
            'Cómo los usamos, almacenamos y protegemos.',
            'Con quién los compartimos.',
            'Cuáles son tus derechos como titular de los datos y cómo ejercerlos.',
          ],
        },
        'Aplica a quienes visitan fedesconsultora.com y sus páginas de campaña, completan el formulario de contacto, agendan una reunión, reciben nuestros mails o acceden a una landing privada que les enviamos.',
      ],
    },
    {
      titulo: '2. Responsable del tratamiento',
      bloques: [
        'El responsable del tratamiento de tus datos personales es:',
        {
          lista: [
            'Razón social: [TEXTO LEGAL PENDIENTE: razón social y CUIT]',
            'Domicilio legal: [TEXTO LEGAL PENDIENTE: domicilio legal]',
            'Sitio web: fedesconsultora.com',
            `Correo de contacto: ${MAIL}`,
            'País: República Argentina',
          ],
        },
      ],
    },
    {
      titulo: '3. Qué datos recopilamos',
      bloques: [
        'Según cómo interactúes con nosotros, podemos recopilar las siguientes categorías de datos:',
        { subtitulo: '3.1. Datos que nos das directamente' },
        {
          lista: [
            'En el formulario de contacto: nombre y apellido, empresa, correo electrónico, tamaño de la empresa y qué querés resolver.',
            'Al agendar una reunión en nuestra agenda de Google: los datos que cargues en la reserva.',
            'Cualquier otra información que nos envíes voluntariamente por correo electrónico, WhatsApp, teléfono o en una reunión.',
          ],
        },
        { subtitulo: '3.2. Datos de uso de nuestras landings privadas y mails' },
        'Si avanzamos con una propuesta, podemos enviarte por mail un link a una landing privada preparada para tu empresa. Para dar seguimiento a la propuesta registramos:',
        {
          lista: [
            'En la landing privada: visitas, etapas abiertas, tiempo de lectura, descargas y clics en los botones para agendar o escribir por WhatsApp.',
            'En los mails que te enviamos: si se abrieron (dato aproximado), los clics en sus links y las bajas.',
          ],
        },
        'Las visitas se registran con un código derivado de la IP y el navegador que no permite recuperar la IP.',
        { subtitulo: '3.3. Datos de navegación' },
        {
          lista: [
            'Páginas visitadas, origen de la visita (por ejemplo, un buscador, un anuncio o un código QR), tipo de dispositivo y ubicación aproximada, mediante Google Analytics.',
            'Clics en los botones para agendar, escribir por WhatsApp o enviar el formulario.',
            'Por seguridad, los intentos fallidos de acceso se registran con un código derivado de la IP, nunca con la IP en claro.',
          ],
        },
        'A Google Analytics no le enviamos datos que te identifiquen, como tu nombre o tu correo electrónico.',
      ],
    },
    {
      titulo: '4. Para qué usamos tus datos',
      bloques: [
        'Usamos los datos exclusivamente para:',
        {
          lista: [
            'Responder tu consulta y coordinar la sesión de diagnóstico o la primera reunión, sin cargo.',
            'Preparar una propuesta para tu empresa y, si corresponde, tu landing privada.',
            'Enviarte mails relacionados con esa propuesta. Cada mail incluye un link para darte de baja.',
            'Medir el funcionamiento del sitio y de nuestras campañas, de forma agregada.',
            'Proteger el sitio y el panel interno frente a accesos no autorizados.',
            'Cumplir obligaciones legales o requerimientos de autoridades competentes.',
          ],
        },
        'Nunca vendemos, alquilamos ni cedemos tus datos personales a terceros para fines de marketing o publicidad.',
      ],
    },
    {
      titulo: '5. Con quién compartimos tus datos',
      bloques: [
        'Solo compartimos tu información en estos casos:',
        {
          lista: [
            'Proveedores que nos prestan servicios técnicos necesarios, que tratan los datos por cuenta nuestra: el servidor donde funciona el sitio ([TEXTO LEGAL PENDIENTE: proveedor y país del servidor]), Neon (base de datos), Resend (envío de mails) y Google (Analytics y agenda).',
            'Obligación legal: cuando lo exija una ley, una orden judicial o una autoridad competente.',
            'Consentimiento: cuando nos autorices expresamente a compartir información con un tercero determinado.',
            'Protección de derechos: para proteger los derechos, la seguridad o los bienes de Fedes, de quienes nos contactan o de terceros.',
          ],
        },
        'Si nos escribís por WhatsApp o nos seguís en Instagram o LinkedIn, esas plataformas tratan tus datos según sus propias políticas.',
      ],
    },
    {
      titulo: '6. Almacenamiento y seguridad',
      bloques: [
        'Aplicamos medidas técnicas y organizativas para proteger tus datos frente a accesos no autorizados, alteración, divulgación o destrucción. Entre ellas:',
        {
          lista: [
            'Conexiones cifradas (HTTPS) en todo el sitio.',
            'Acceso a los datos restringido a personas del equipo de Fedes autorizadas, con usuario y contraseña propios.',
            'Links de las landings privadas aleatorios, que se guardan cifrados y no se indexan en buscadores.',
          ],
        },
        'Ningún método de transmisión por Internet o de almacenamiento electrónico es completamente seguro. Si ocurriera un incidente de seguridad que afecte tus datos, te lo informaremos según la normativa aplicable.',
      ],
    },
    {
      titulo: '7. Cookies y tecnologías similares',
      bloques: [
        'El sitio usa cookies y tecnologías similares con estos fines:',
        {
          lista: [
            'Cookies analíticas: Google Analytics nos permite entender cómo se usa el sitio, con datos agregados.',
            'Cookies de terceros: la agenda de Google integrada en Contacto puede usar sus propias cookies.',
            'Cookies esenciales: solo en el panel interno del equipo, para mantener la sesión iniciada.',
          ],
        },
        'Podés bloquear o borrar las cookies desde la configuración de tu navegador. Algunas funciones del sitio podrían dejar de funcionar correctamente.',
      ],
    },
    {
      titulo: '8. Cuánto tiempo conservamos tus datos',
      bloques: [
        'Conservamos tus datos solo durante el tiempo necesario para las finalidades de esta Política o el que exijan las obligaciones legales aplicables. [TEXTO LEGAL PENDIENTE: plazo concreto de conservación de los datos de contacto y de seguimiento]. Para definirlo tenemos en cuenta:',
        {
          lista: [
            'La duración de la relación comercial con tu empresa.',
            'Las obligaciones legales de conservación de registros contables y fiscales.',
            'La necesidad de ejercer o defender derechos.',
          ],
        },
        'Cuando los datos dejan de ser necesarios, los eliminamos o los anonimizamos de forma segura.',
      ],
    },
    {
      titulo: '9. Tus derechos',
      bloques: [
        'De acuerdo con la Ley 25.326 de Protección de los Datos Personales y su normativa complementaria, tenés derecho a:',
        {
          lista: [
            'Acceso: saber qué datos personales tuyos tenemos.',
            'Rectificación: pedir que corrijamos datos inexactos o incompletos.',
            'Supresión: pedir que eliminemos tus datos cuando ya no sean necesarios.',
            'Oposición: oponerte al tratamiento de tus datos en determinadas circunstancias.',
            'Revocación: retirar tu consentimiento en cualquier momento, sin afectar el tratamiento anterior.',
          ],
        },
        `Para ejercerlos, escribinos a ${MAIL} indicando tu pedido. Podemos pedirte que acredites tu identidad. Para dejar de recibir nuestros mails, también podés usar el link de baja que incluye cada uno.`,
        'El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.',
        '[TEXTO LEGAL PENDIENTE: inscripción de la base de datos ante la Agencia de Acceso a la Información Pública]',
      ],
    },
    {
      titulo: '10. Menores de edad',
      bloques: [
        `Nuestros servicios están dirigidos a empresas y no a menores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que lo hicimos, los eliminaremos de inmediato. Si sos madre, padre o tutor y creés que un menor nos envió datos, escribinos a ${MAIL}.`,
      ],
    },
    {
      titulo: '11. Transferencias internacionales',
      bloques: [
        'Algunos de nuestros proveedores (por ejemplo, la base de datos, el envío de mails y Google) almacenan o procesan datos en servidores ubicados fuera de la República Argentina, como en Estados Unidos. En esos casos procuramos que ofrezcan un nivel de protección adecuado conforme a la normativa argentina y a estándares internacionales de seguridad de la información.',
      ],
    },
    {
      titulo: '12. Cambios en esta Política',
      bloques: [
        'Podemos modificar esta Política para reflejar cambios en cómo tratamos los datos o en la normativa. La versión vigente estará siempre en fedesconsultora.com/privacidad, con su fecha de última actualización. Si los cambios son significativos, lo informaremos con un aviso visible en el sitio o por correo electrónico.',
      ],
    },
    {
      titulo: '13. Contacto',
      bloques: [`Para consultas, pedidos o reclamos sobre esta Política o sobre el tratamiento de tus datos, escribinos a ${MAIL}.`],
    },
  ],
  verTambien: {
    texto: 'Consultá también nuestros',
    label: 'Términos y Condiciones',
    href: '/terminos-y-condiciones',
  },
};

export const terminos: DocumentoLegal = {
  meta: {
    title: 'Términos y Condiciones | Fedes Consultora',
    description: 'Condiciones de uso del sitio fedesconsultora.com y de las landings privadas de Fedes Consultora.',
  },
  titulo: 'Términos y Condiciones',
  actualizado: '22 de octubre de 2026',
  secciones: [
    {
      titulo: '1. Aceptación',
      bloques: [
        'Al acceder y usar fedesconsultora.com, sus páginas de campaña y las landings privadas que te enviemos (en adelante, «el Sitio»), aceptás estos Términos y Condiciones. Si no estás de acuerdo con alguna de sus disposiciones, te pedimos que no uses el Sitio.',
      ],
    },
    {
      titulo: '2. Quiénes somos y qué ofrecemos',
      bloques: [
        'Fedes Consultora es una consultora de negocios que también ejecuta, con equipo propio. Entre otros servicios, ofrecemos:',
        {
          lista: [
            'Onboardings de 60 días, organizados en tres rutas: Mercado y marca, Oferta y comercial, y Organización y finanzas.',
            'La ejecución de la hoja de ruta que surge de cada onboarding.',
            'Desarrollo de aplicaciones, sitios web y landings a medida.',
          ],
        },
        'La información del Sitio es general y orientativa, y no constituye una oferta ni un asesoramiento para un caso concreto. El alcance, los plazos y las condiciones de cada servicio se acuerdan por escrito con cada empresa, en una propuesta o contrato aparte. La sesión de diagnóstico o primera reunión es sin cargo y no genera obligación de contratar.',
      ],
    },
    {
      titulo: '3. Casos y resultados',
      bloques: [
        'Los casos publicados son reales y se presentan de forma anónima por confidencialidad. Cada cifra corresponde a un proyecto y un plazo determinados. Los resultados de otras empresas no garantizan resultados iguales en la tuya.',
      ],
    },
    {
      titulo: '4. Landings privadas',
      bloques: [
        'Si te enviamos un link a una landing privada, es personal y de uso exclusivo de tu empresa:',
        {
          lista: [
            'No lo compartas con personas ajenas a tu empresa.',
            'Su contenido es confidencial y fue preparado para tu empresa. No lo reproduzcas ni lo distribuyas sin nuestra autorización.',
            'Podemos desactivarlo o modificar su contenido en cualquier momento.',
          ],
        },
      ],
    },
    {
      titulo: '5. Uso aceptable',
      bloques: [
        'Te comprometés a usar el Sitio de forma lícita y conforme a estos Términos. Está prohibido:',
        {
          lista: [
            'Usar el Sitio con fines ilegales, fraudulentos o no autorizados.',
            'Intentar acceder a datos de terceros o a áreas restringidas, como el panel interno, sin autorización.',
            'Enviar información falsa o de otra persona en los formularios.',
            'Introducir software malicioso, hacer ingeniería inversa o interferir con el funcionamiento del Sitio o de sus servidores.',
            'Usar bots, scrapers u otros sistemas automatizados para acceder al Sitio de forma masiva o no autorizada.',
          ],
        },
      ],
    },
    {
      titulo: '6. Propiedad intelectual',
      bloques: [
        'El diseño, la estructura, el código, los textos, los gráficos, las imágenes, los logotipos, las marcas y demás contenidos del Sitio son propiedad de Fedes Consultora o de sus licenciantes, y están protegidos por las leyes de propiedad intelectual e industrial de la República Argentina y los tratados internacionales aplicables.',
        'Está prohibida su reproducción, distribución, comunicación pública o transformación, total o parcial, sin autorización previa y por escrito de Fedes Consultora.',
      ],
    },
    {
      titulo: '7. Limitación de responsabilidad',
      bloques: [
        'Trabajamos para que el Sitio esté disponible, actualizado y seguro. Sin embargo, no garantizamos que funcione de forma ininterrumpida o libre de errores.',
        'Fedes Consultora no será responsable por daños derivados del uso o de la imposibilidad de uso del Sitio, ni por decisiones tomadas solo a partir de la información general publicada en él. [TEXTO LEGAL PENDIENTE: alcance de la limitación de responsabilidad conforme a la Ley 24.240 y al Código Civil y Comercial]',
      ],
    },
    {
      titulo: '8. Enlaces y servicios de terceros',
      bloques: [
        'El Sitio incluye enlaces o integraciones con servicios de terceros, como Google (agenda), WhatsApp, LinkedIn e Instagram. Se ofrecen para tu comodidad y no implican responsabilidad de Fedes sobre su contenido, sus políticas de privacidad o sus prácticas. Te recomendamos revisar los términos y políticas de cada uno.',
      ],
    },
    {
      titulo: '9. Indemnidad',
      bloques: [
        'Te comprometés a mantener indemne a Fedes Consultora, sus directores, integrantes del equipo y socios frente a reclamos, daños y gastos (incluidos honorarios legales razonables) que surjan del incumplimiento de estos Términos o del uso indebido del Sitio por tu parte.',
      ],
    },
    {
      titulo: '10. Cambios en estos Términos',
      bloques: [
        'Podemos actualizar estos Términos en cualquier momento. Los cambios rigen desde su publicación en fedesconsultora.com/terminos-y-condiciones, con su fecha de última actualización. Si los cambios afectan de forma significativa tus derechos, lo informaremos con un aviso visible en el Sitio o por correo electrónico.',
      ],
    },
    {
      titulo: '11. Ley aplicable y jurisdicción',
      bloques: [
        'Estos Términos se rigen por las leyes de la República Argentina. [TEXTO LEGAL PENDIENTE: tribunales competentes; la versión anterior indicaba los Tribunales Ordinarios de Rosario, Santa Fe, y el contacto publicado hoy es Buenos Aires]',
      ],
    },
    {
      titulo: '12. Contacto',
      bloques: [`Si tenés preguntas sobre estos Términos, escribinos a ${MAIL}.`],
    },
  ],
  verTambien: {
    texto: 'Consultá también nuestra',
    label: 'Política de Privacidad',
    href: '/privacidad',
  },
};
