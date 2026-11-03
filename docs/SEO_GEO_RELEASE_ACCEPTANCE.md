# Cierre SEO/GEO Fedes Consultora — smoke HTTP sin escrituras

Complementa la entrega de Juan en PR #8 y #9, y el fix de auditoría #10.
NO sustituye aprobación de marca/legales, evidencia de GA4, Search Console ni despliegue autorizado.

## Ejecución sobre host HTTPS ya aprobado

    SEO_SMOKE_ORIGIN=https://fedesconsultora.com SEO_EXPECT_INDEXABLE=true npm run smoke:seo

Opcional: definir SEO_EXPECT_BUILD_SHA con el SHA esperado del servicio; de omitirse no se acredita digest.
Origen e indexabilidad deben declararse explícitamente para no confundir staging con producción.

Solo GET: robots para bots generales y de IA, cinco páginas públicas con H1/canonical/noindex,
landing /campo, QR La Rural/Angus con 302 y UTM, legales noindex, sitemap, llms.txt
y headers privados. Nunca envía datos por formularios ni invoca webhooks.

## Evidencias necesarias para informe final

- Autoría: PR #8 y #9 de jperozo97, PR #10 de auditoría (no atribuir a Juan).
- Código vs release: main SHA, digest publicado y SHA de /api/health; son estados distintos.
- SEO/GEO: salida del smoke, estado de Search Console y Bing; medir presencia real, no inferirla.
- Medición: GTM/GA4 DebugView, eventos de lead con consentimiento y pruebas de QA sin datos privados.
- Campaña: QR impresos en celulares y definición de indexabilidad de /campo; no figurar en sitemap no implica noindex.
- Legal: revisión jurídica, migración 009 y backup/PITR Neon, cron de depuración y rollback.

No cerrar el informe como publicado hasta verificar el host y la aprobación comercial y legal.
