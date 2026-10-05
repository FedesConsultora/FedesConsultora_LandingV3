// Vitest-only stand-in for Astro's server env module. Production builds use the adapter's
// runtime implementation; tests read the same process environment values without Astro Vite.
export function getSecret(key: string): string | undefined {
  return process.env[key];
}
