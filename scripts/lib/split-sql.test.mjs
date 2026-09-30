import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { splitSql } from './split-sql.mjs';

describe('splitSql', () => {
  it('separa sentencias simples', () => {
    expect(splitSql('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('acepta la última sentencia sin punto y coma', () => {
    expect(splitSql('SELECT 1;\nSELECT 2')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('no corta dentro de textos, incluidas las comillas escapadas', () => {
    const sql = "INSERT INTO t VALUES ('a;b', 'it''s; ok'); SELECT 1;";
    expect(splitSql(sql)).toEqual(["INSERT INTO t VALUES ('a;b', 'it''s; ok')", 'SELECT 1']);
  });

  it('no corta dentro de identificadores entre comillas dobles', () => {
    expect(splitSql('SELECT "a;b" FROM t; SELECT 2;')).toEqual(['SELECT "a;b" FROM t', 'SELECT 2']);
  });

  it('no corta dentro de comentarios', () => {
    const sql = '-- comentario; con punto y coma\nSELECT 1; /* otro; comentario */ SELECT 2;';
    expect(splitSql(sql)).toEqual(['-- comentario; con punto y coma\nSELECT 1', '/* otro; comentario */ SELECT 2']);
  });

  it('no corta dentro de bloques con dollar quoting', () => {
    const fn = 'CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; PERFORM 2; END; $$ LANGUAGE plpgsql';
    const tagged = 'DO $body$ BEGIN PERFORM 1; END $body$';
    expect(splitSql(`${fn};\n${tagged};`)).toEqual([fn, tagged]);
  });

  it('descarta fragmentos que solo tienen comentarios o espacios', () => {
    expect(splitSql('SELECT 1;\n\n-- fin del archivo\n')).toEqual(['SELECT 1']);
  });

  it('avisa si un texto o bloque queda sin cerrar', () => {
    expect(() => splitSql("SELECT 'sin cerrar")).toThrow();
    expect(() => splitSql('DO $$ BEGIN')).toThrow();
    expect(() => splitSql('/* sin cerrar')).toThrow();
  });

  it('separa cada migración del repo sin errores', () => {
    const dir = new URL('../../db/migrations/', import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
      const statements = splitSql(readFileSync(new URL(file, dir), 'utf8'));
      expect(statements.length, file).toBeGreaterThan(0);
    }
  });
});
