import { Resend } from 'resend';

// Solo se usa durante integración: limitar el endpoint de prueba a loopback evita que una
// configuración accidental redirija credenciales del proveedor a un host externo.
export function crearClienteResend(apiKey: string, testBaseUrl?: string): Resend {
  if (!testBaseUrl) return new Resend(apiKey);

  let url: URL;
  try {
    url = new URL(testBaseUrl);
  } catch {
    throw new Error('La URL de mock de Resend no es válida.');
  }
  const loopback = url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'http:' || !loopback || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('El mock de Resend sólo puede usar HTTP en loopback.');
  }
  return new Resend(apiKey, { baseUrl: url.origin });
}
