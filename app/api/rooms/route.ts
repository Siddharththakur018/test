import {createRoom,joinRoom,RoomError} from '../../../lib/db/rooms';
import {body,json,failure} from '../../../lib/db/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  try{
    const input=await body(request);
    if(input.action==='clock')return json({time:Date.now()});
    if(input.action==='create'){
      const ip=(request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
      return json(await createRoom(ip));
    }
    if(input.action==='join' && typeof input.room==='string')return json(await joinRoom(input.room,typeof input.resumeToken==='string'?input.resumeToken:undefined));
    throw new RoomError('Unknown room action.');
  }catch(error){return failure(error);}
}
