import { RoomError } from './rooms';
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}});}
export async function body(request:Request){
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)throw new RoomError('Cross-origin room requests are not allowed.',403);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new RoomError('Expected JSON.',415);
  const text=await request.text();
  if(new TextEncoder().encode(text).length>60000)throw new RoomError('Message is too large.',413);
  try{const value=JSON.parse(text);if(value && typeof value==='object' && !Array.isArray(value))return value as {action?:string;room?:string;resumeToken?:string;data?:unknown};}catch{}
  throw new RoomError('Invalid request.');
}
export function token(request:Request){return request.headers.get('authorization')?.replace(/^Bearer /,'') || '';}
export function failure(error:unknown){
  if(error instanceof RoomError)return json({error:error.message},error.status);
  // Never serialize driver errors, connection strings, or SQL into a public response.
  return json({error:'Room service could not reach its database. Please try again shortly.'},503);
}
