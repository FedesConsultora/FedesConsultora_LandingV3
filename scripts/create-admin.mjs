// Crea un usuario del panel de administración, o le cambia la contraseña si ya existe.
// Corré esto en tu propia terminal (no lo pegues en el chat): la contraseña que tipeás acá
// no se muestra, no se guarda en texto plano y no pasa por ningún otro lado. En la base
// queda solo su hash (scrypt, mismo formato que src/lib/seguridad.ts).
//
// Uso: npm run admin:crear
// Usa la base de POSTGRES_URL del .env. Fijate en la línea "Base:" que sea la que querés.

import { createInterface } from 'node:readline';
import { scryptSync, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

if (!process.env.POSTGRES_URL) {
  console.error('Falta POSTGRES_URL en el .env.');
  process.exit(1);
}
const sql = neon(process.env.POSTGRES_URL);

const ask = (question, { hidden = false } = {}) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      // Oculta lo que se tipea (no aparece en pantalla ni queda en el historial de la terminal).
      rl._writeToOutput = (s) => {
        if (s.includes('\n') || s === question) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });

console.log(`Base: ${new URL(process.env.POSTGRES_URL).hostname}\n`);

const usuario = (await ask('Usuario (ej. federico): ')).toLowerCase();
if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
  console.error('El usuario debe tener entre 3 y 40 caracteres: letras, números, punto, guion o guion bajo.');
  process.exit(1);
}
const nombre = await ask('Nombre para mostrar (ej. Federico Chironi): ');
const password = await ask('Contraseña (no se va a ver en pantalla): ', { hidden: true });
const confirm = await ask('Repetí la contraseña: ', { hidden: true });

if (!nombre || !password) {
  console.error('\nNombre y contraseña son obligatorios.');
  process.exit(1);
}
if (password !== confirm) {
  console.error('\nLas contraseñas no coinciden. Corré el script de nuevo.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('\nUsá una contraseña de al menos 12 caracteres.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;

// Si el usuario ya existía, se actualiza la contraseña, se reactiva y se cierran sus sesiones abiertas.
const [row] = await sql`
  INSERT INTO admins (usuario, nombre, password_hash)
  VALUES (${usuario}, ${nombre}, ${passwordHash})
  ON CONFLICT (usuario) DO UPDATE
    SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, activo = true
  RETURNING id, (xmax = 0) AS nuevo
`;
if (!row.nuevo) {
  await sql`UPDATE sesiones_admin SET revocada_el = now() WHERE admin_id = ${row.id} AND revocada_el IS NULL`;
}

console.log(
  row.nuevo
    ? `\nListo: se creó el usuario "${usuario}".`
    : `\nListo: se actualizó la contraseña de "${usuario}" y se cerraron sus sesiones abiertas.`,
);
console.log('La contraseña no se muestra ni se guarda: guardala vos en un lugar seguro.');
