import { neon } from '@neondatabase/serverless';

let sql;

export function getDb() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL non configurata');
    }
    sql = neon(databaseUrl);
  }
  return sql;
}

export async function query(text, params) {
  const sql = getDb();
  return await sql(text, params);
}
