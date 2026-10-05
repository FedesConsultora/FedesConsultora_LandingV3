import { describe, expect, it } from 'vitest';
import { clientIp } from './limite';

describe('clientIp', () => {
  it('uses only the adapter-validated clientAddress', () => {
    expect(clientIp({ clientAddress: '203.0.113.7' })).toBe('203.0.113.7');
  });

  it('does not trust a forwarded header as a fallback', () => {
    const request = new Request('https://fedesconsultora.com/admin', {
      headers: { 'x-forwarded-for': '198.51.100.99' },
    });
    expect(clientIp({ clientAddress: 'desconocida', request })).toBe('desconocida');
  });
});
