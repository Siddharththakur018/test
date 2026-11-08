import {pollRoom,roomAction,RoomError} from '../../../../lib/db/rooms';
import {body,json,failure,token} from '../../../../lib/db/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){
  try{const {id}=await context.params;const after=Number(new URL(request.url).searchParams.get('after') || 0);return json(await pollRoom(id,token(request),after));}
  catch(error){return failure(error);}
}
export async function POST(request:Request,context:Context){
  try{const {id}=await context.params;const input=await body(request);if(typeof input.action!=='string')throw new RoomError('Missing room action.');return json(await roomAction(id,token(request),input.action,input.data));}
  catch(error){return failure(error);}
}
