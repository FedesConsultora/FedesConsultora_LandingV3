// Genera las credenciales del panel de administración.
// Corré esto en tu propia terminal (no lo pegues en el chat): la contraseña que tipeás acá
// nunca se guarda en texto plano, ni en el código ni en ningún lado. Solo se guarda su hash.
//
// Uso: node scripts/create-admin.mjs
// Al final te muestra dos líneas para cargar como variables de entorno en Vercel:
//   ADMIN_USER=...
//   ADMIN_PASSWORD_HASH=...
// Esas dos SÍ se pueden compartir (el hash no se puede revertir a la contraseña original).

import { createInterface } from 'node:readline';
import { scryptSync, randomBytes } from 'node:crypto';

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

const username = await ask('Usuario del panel (ej. admin): ');
const password = await ask('Contraseña (no se va a ver en pantalla): ', { hidden: true });
const confirm = await ask('Repetí la contraseña: ', { hidden: true });

if (!username || !password) {
  console.error('\nUsuario y contraseña son obligatorios.');
  process.exit(1);
}
if (password !== confirm) {
  console.error('\nLas contraseñas no coinciden. Corré el script de nuevo.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('\nUsá una contraseña de al menos 10 caracteres.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');

console.log('\nListo. Cargá estas dos variables en Vercel (Settings → Environment Variables):\n');
console.log(`ADMIN_USER=${username}`);
console.log(`ADMIN_PASSWORD_HASH=${salt}:${hash}`);
console.log('\nLa contraseña en sí no se muestra ni se guarda: guardala vos en un lugar seguro.');
