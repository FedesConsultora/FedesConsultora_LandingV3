// Secrets y configuración exclusiva del servidor se resuelven al arrancar Node, no durante
// el build. `getSecret` lo provee el adapter y en Node lee el entorno del proceso.
import { getSecret } from 'astro:env/server';

export function runtimeEnv(name: string): string | undefined {
  return getSecret(name);
}
