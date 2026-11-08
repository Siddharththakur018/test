export function allowedSignalingOrigin(origin:string|undefined,host:string|undefined,configured:string|undefined){
  if(!origin)return true; // Non-browser health checks and server-side clients.
  try{
    const url=new URL(origin);
    if(!['http:','https:'].includes(url.protocol) || url.origin!==origin)return false;
    return url.host===host || (configured || '').split(',').some(value=>value.trim()===url.origin);
  }catch{return false;}
}
