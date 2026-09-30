// Separa un archivo .sql en sentencias. El cliente HTTP de Neon ejecuta una sola sentencia por
// consulta, así que cada migración se corta acá. A diferencia de un split(';') simple, respeta
// los ';' dentro de textos ('...'), identificadores ("..."), comentarios (-- y /* */) y cuerpos
// de funciones con dollar quoting ($$ ... $$ o $etiqueta$ ... $etiqueta$).

export function splitSql(source) {
  const statements = [];
  let current = '';
  let i = 0;

  const push = () => {
    const stmt = stripComments(current).trim();
    if (stmt) statements.push(current.trim());
    current = '';
  };

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    // Comentario de línea
    if (ch === '-' && next === '-') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      current += source.slice(i, stop);
      i = stop;
      continue;
    }

    // Comentario de bloque
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) throw new Error('Comentario /* sin cerrar');
      current += source.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // Texto o identificador entre comillas ('' y "" escapan la comilla)
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === ch) {
          if (source[j + 1] === ch) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      if (j >= source.length) throw new Error(`Comilla ${ch} sin cerrar`);
      current += source.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    // Dollar quoting: $$ o $etiqueta$
    if (ch === '$') {
      const tag = /^\$[A-Za-z_]*\$/.exec(source.slice(i))?.[0];
      if (tag) {
        const end = source.indexOf(tag, i + tag.length);
        if (end === -1) throw new Error(`Bloque ${tag} sin cerrar`);
        current += source.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }

    if (ch === ';') {
      push();
      i++;
      continue;
    }

    current += ch;
    i++;
  }
  push();
  return statements;
}

// Solo para decidir si un fragmento es vacío (por ejemplo, un comentario suelto al final del archivo).
function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}
