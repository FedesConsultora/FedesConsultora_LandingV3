import { describe, expect, it } from 'vitest';
import { crearClienteResend } from './resend-client';

describe('cliente de Resend de integración', () => {
  it('usa el endpoint local de mock solicitado', () => {
    expect(crearClienteResend('re_ci_fake', 'http://127.0.0.1:4455').baseUrl).toBe('http://127.0.0.1:4455');
  });

  it.each(['https://api.resend.com', 'http://example.test', 'http://localhost:4455', 'http://127.0.0.1.evil.test', 'http://127.0.0.1:4455/path', 'not-a-url'])('rechaza endpoints externos o inválidos: %s', (url) => {
    expect(() => crearClienteResend('re_ci_fake', url)).toThrow();
  });
});
