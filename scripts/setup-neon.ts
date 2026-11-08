import {readFile} from 'node:fs/promises';
import {database} from '../lib/db/neon.ts';
try{
  const sql=database();
  const source=await readFile(new URL('../migrations/001-neon-signaling.sql',import.meta.url),'utf8');
  for(const statement of source.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement);
  console.log('Neon signaling tables are ready.');
}catch(error){
  const code=error && typeof error==='object' && 'code' in error?String(error.code):'connection_failed';
  console.error(`Neon setup failed (${code}). Check DATABASE_URL and network access.`);process.exitCode=1;
}
