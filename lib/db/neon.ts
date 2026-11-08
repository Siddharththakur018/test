import { neon } from '@neondatabase/serverless';
export function database(){
  const connection=process.env.DATABASE_URL;
  if(!connection)throw new Error('DATABASE_URL is not configured.');
  return neon(connection,{fetchOptions:{signal:AbortSignal.timeout(10000)}});
}
