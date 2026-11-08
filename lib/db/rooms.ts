import { createHash, randomBytes } from 'node:crypto';
import { database } from './neon';
import { validSettings } from '../session-settings';
export class RoomError extends Error { constructor(message:string,public status=400){super(message);} }
const roomPattern=/^[\w-]{32}$/;
const tokenPattern=/^[\w-]{43}$/;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');
const eventList=(event:string)=>`(SELECT COALESCE(jsonb_agg(value ORDER BY ord),'[]'::jsonb) FROM jsonb_array_elements(events || jsonb_build_array(${event})) WITH ORDINALITY AS e(value,ord) WHERE ord > GREATEST(jsonb_array_length(events)-399,0))`;
const emit=(audience:string,event:string,data:string)=>eventList(`jsonb_build_object('id',revision+1,'to',${audience},'event',${event},'data',${data})`);
export function credentials(id:string,token:string){
  if(!roomPattern.test(id) || !tokenPattern.test(token))throw new RoomError('This room session is not valid.',401);
  return hash(token);
}
export async function createRoom(ip:string){
  const sql=database(),now=Date.now(),id=randomBytes(24).toString('base64url'),token=secret();
  const key=hash(`${Math.floor(now/86400000)}:${ip}`);
  const allowed=await sql.query(`INSERT INTO lovebooth_signaling_limits(key,reset_ms,hits) VALUES($1,$2,1)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN lovebooth_signaling_limits.reset_ms<$3 THEN 1 ELSE lovebooth_signaling_limits.hits+1 END,
    reset_ms=CASE WHEN lovebooth_signaling_limits.reset_ms<$3 THEN $2 ELSE lovebooth_signaling_limits.reset_ms END
    WHERE lovebooth_signaling_limits.reset_ms<$3 OR lovebooth_signaling_limits.hits<10 RETURNING key`,[key,now+60000,now]);
  if(!allowed.length)throw new RoomError('Please wait a minute before creating another room.',429);
  await sql.transaction([
    sql.query('DELETE FROM lovebooth_signaling_rooms WHERE expires_ms<$1',[now]),
    sql.query('DELETE FROM lovebooth_signaling_limits WHERE reset_ms<$1',[now-60000]),
    sql.query('INSERT INTO lovebooth_signaling_rooms(id,host_token,expires_ms,host_seen_ms,window_ms) VALUES($1,$2,$3,$4,$4)',[id,hash(token),now+3600000,now]),
  ]);
  return {id,token,role:'host',cursor:0};
}
export async function joinRoom(id:string,resumeToken?:string){
  if(!roomPattern.test(id))throw new RoomError('That invitation is not valid.');
  const sql=database(),now=Date.now(),token=secret();
  const resume=resumeToken && tokenPattern.test(resumeToken)?hash(resumeToken):'';
  // Rotate credentials on resume so an old tab cannot release the new session.
  // The conditional UPDATE locks the row: simultaneous guests cannot claim the same place.
  const rows=await sql.query(`UPDATE lovebooth_signaling_rooms SET guest_token=$2,guest_seen_ms=$3,revision=revision+1,
    events=${emit('host_token',"'partner-ready'","'null'::jsonb")}
    WHERE id=$1 AND NOT closed AND expires_ms>$3 AND host_seen_ms>$3-300000 AND (guest_token IS NULL OR guest_seen_ms<$3-60000 OR guest_token=$4) RETURNING revision`,[id,hash(token),now,resume]);
  if(!rows.length){
    const state=await sql.query('SELECT closed,expires_ms,host_seen_ms FROM lovebooth_signaling_rooms WHERE id=$1',[id]);
    if(!state.length || state[0].closed || Number(state[0].expires_ms)<=now)throw new RoomError('This invitation has ended. Ask the host to create a new room and share its new link.',410);
    if(Number(state[0].host_seen_ms)<=now-300000)throw new RoomError('The host is offline. Ask them to reopen the booth and try joining again.',409);
    throw new RoomError('Both places are occupied. Leave the room on the other guest device before joining here.',409);
  }
  return {id,token,role:'guest',cursor:Number(rows[0].revision)};
}
export async function pollRoom(id:string,token:string,after:number){
  const member=credentials(id,token),sql=database(),now=Date.now();
  if(!Number.isSafeInteger(after) || after<0)throw new RoomError('Invalid event cursor.');
  // A suspended/closed tab must not reserve the second place indefinitely.
  await sql.query(`UPDATE lovebooth_signaling_rooms SET
    closed=CASE WHEN host_seen_ms<$3-300000 THEN true ELSE closed END,
    guest_token=CASE WHEN guest_seen_ms<$3-60000 THEN NULL ELSE guest_token END,
    revision=revision+1,events=${emit("CASE WHEN host_seen_ms<$3-300000 THEN 'all' ELSE host_token END","CASE WHEN host_seen_ms<$3-300000 THEN 'closed' ELSE 'partner-left' END","CASE WHEN host_seen_ms<$3-300000 THEN to_jsonb('Your partner disconnected. Create a new invitation.'::text) ELSE 'null'::jsonb END")}
    WHERE id=$1 AND (host_token=$2 OR guest_token=$2) AND NOT closed AND expires_ms>$3
      AND (host_seen_ms<$3-300000 OR (guest_token IS NOT NULL AND guest_seen_ms<$3-60000))`,[id,member,now]);
  const rows=await sql.query(`UPDATE lovebooth_signaling_rooms SET
    host_seen_ms=CASE WHEN host_token=$2 THEN $3 ELSE host_seen_ms END,
    guest_seen_ms=CASE WHEN guest_token=$2 THEN $3 ELSE guest_seen_ms END
    WHERE id=$1 AND (host_token=$2 OR guest_token=$2) AND expires_ms>$3
    RETURNING revision,closed,(SELECT COALESCE(jsonb_agg(value ORDER BY ord),'[]'::jsonb)
      FROM jsonb_array_elements(events) WITH ORDINALITY AS e(value,ord)
      WHERE (value->>'id')::integer>$4 AND (value->>'to'=$2 OR value->>'to'='all')) AS events`,[id,member,now,after]);
  if(!rows.length)throw new RoomError('Your room session has ended. Rejoin with a new invitation.',401);
  return {cursor:Number(rows[0].revision),closed:rows[0].closed,events:rows[0].events};
}
export async function roomAction(id:string,token:string,action:string,value:unknown){
  const member=credentials(id,token),sql=database(),now=Date.now();
  let audience="CASE WHEN host_token=$2 THEN guest_token ELSE host_token END",event=action,data=value,hostOnly=false,needsGuest=false;
  let change='';
  if(action==='signal'){
    if(!value || typeof value!=='object' || !['offer','answer','ice'].includes((value as {type:string}).type) || JSON.stringify(value).length>50000)throw new RoomError('Invalid connection message.');
    needsGuest=true;
  }else if(action==='settings'){
    if(!validSettings(value))throw new RoomError('Invalid booth settings.');hostOnly=true;
  }else if(action==='capture'){
    const input=value as {seconds?:number;slot?:number}|null;
    const seconds=[3,5,10].includes(input?.seconds ?? 0)?input!.seconds!:3;
    data={at:now+seconds*1000+1500,slot:Number.isInteger(input?.slot)?Math.max(0,Math.min(input!.slot!,5)):0};
    audience="'all'";hostOnly=true;needsGuest=true;
  }else if(action==='remove'){
    hostOnly=true;event='closed';data='The host ended this session.';audience="'all'";change='closed=true,';
  }else if(action==='leave'){
    // Host departure closes the room; guest departure releases only their place.
    const rows=await sql.query(`UPDATE lovebooth_signaling_rooms SET
      closed=CASE WHEN host_token=$2 THEN true ELSE closed END,
      guest_token=CASE WHEN guest_token=$2 THEN NULL ELSE guest_token END,
      revision=revision+1,events=${emit("'all'","CASE WHEN host_token=$2 THEN 'closed' ELSE 'partner-left' END","CASE WHEN host_token=$2 THEN to_jsonb('The host left this session.'::text) ELSE 'null'::jsonb END")}
      WHERE id=$1 AND (host_token=$2 OR guest_token=$2) AND NOT closed RETURNING id`,[id,member]);
    return {ok:!!rows.length};
  }else throw new RoomError('Unknown room action.');
  const rows=await sql.query(`UPDATE lovebooth_signaling_rooms SET ${change}
    revision=revision+1,events=${emit(audience,'$4::text','$5::jsonb')},
    host_hits=CASE WHEN window_ms<$3-10000 THEN CASE WHEN host_token=$2 THEN 1 ELSE 0 END WHEN host_token=$2 THEN host_hits+1 ELSE host_hits END,
    guest_hits=CASE WHEN window_ms<$3-10000 THEN CASE WHEN guest_token=$2 THEN 1 ELSE 0 END WHEN guest_token=$2 THEN guest_hits+1 ELSE guest_hits END,
    window_ms=CASE WHEN window_ms<$3-10000 THEN $3 ELSE window_ms END
    WHERE id=$1 AND (host_token=$2 OR guest_token=$2) AND NOT closed AND expires_ms>$3
      ${hostOnly?'AND host_token=$2':''} ${needsGuest?'AND guest_token IS NOT NULL':''}
      AND (window_ms<$3-10000 OR CASE WHEN host_token=$2 THEN host_hits ELSE guest_hits END<80)
    RETURNING id`,[id,member,now,event,JSON.stringify(data ?? null)]);
  if(!rows.length)throw new RoomError('Room unavailable, permission denied, or too many requests. Reconnect and try again.',409);
  return action==='capture'?data:{ok:true};
}
