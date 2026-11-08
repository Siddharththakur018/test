/** The in-memory room store requires one persistent signaling process. */
export function signalingConfig(env: { SIGNALING_SERVER_URL?:string; NEXT_PUBLIC_SIGNALING_URL?:string; VERCEL?:string; DATABASE_URL?:string }) {
  const value=(env.SIGNALING_SERVER_URL || env.NEXT_PUBLIC_SIGNALING_URL || '').trim();
  if(value){
    try{
      const url=new URL(value);
      if(!['https:','http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname!=='/' || (env.VERCEL==='1' && url.protocol!=='https:'))throw new Error();
      return {url:url.origin};
    }catch{return {error:'SIGNALING_SERVER_URL must be an HTTPS server origin, without a path or credentials.'};}
  }
  if(env.DATABASE_URL)return {transport:'http' as const,url:null};
  if(env.VERCEL==='1')return {error:'Set DATABASE_URL in Vercel to your Neon PostgreSQL connection string, then redeploy to enable couple rooms.'};
  return {url:null}; // Local/custom Node server handles /socket.io on this origin.
}
