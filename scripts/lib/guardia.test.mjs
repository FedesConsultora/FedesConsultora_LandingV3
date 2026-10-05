import { describe, expect, it } from 'vitest';
import { validarConfiguracionCI } from './guardia.mjs';

const config = {
  DATABASE_ENV: 'ci',
  CI_NEON_BRANCH_ID: 'br_release_candidate_123',
  POSTGRES_URL: 'postgresql://ci:fake@ep-ci.example.neon.tech/fedes?sslmode=require',
};

describe('guardia de integración Neon', () => {
  it('acepta únicamente una configuración marcada como CI', () => {
    expect(validarConfiguracionCI(config).branchId).toBe(config.CI_NEON_BRANCH_ID);
  });

  it.each([
    [{ ...config, DATABASE_ENV: 'production' }],
    [{ ...config, CI_NEON_BRANCH_ID: '' }],
    [{ ...config, CI_NEON_BRANCH_ID: 'main' }],
    [{ ...config, POSTGRES_URL: 'not-a-url' }],
    [{ ...config, RESEND_API_KEY: 'fake-key' }],
  ])('falla cerrado ante configuración insegura', (env) => {
    expect(() => validarConfiguracionCI(env)).toThrow();
  });
});
