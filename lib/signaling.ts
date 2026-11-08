import {validSettings} from './session-settings.ts';
import type {Server} from 'socket.io';
import {RoomStore} from './rooms.ts';
export function attachSignaling(io:Server,store=new RoomStore()){
const expiration=setInterval(()=>{for(const [id,r]of store.rooms)if(r.expires<Date.now()){io.to(id).emit('closed','Your private room has expired. Create a fresh invitation.');io.in(id).socketsLeave(id);store.rooms.delete(id);}},30000).unref();
io.on('connection',socket=>{let roomId:string|undefined;let hits=0;const interval=setInterval(()=>hits=0,10000);const limited=()=>++hits>80;
 socket.on('clock',(cb)=>{if(typeof cb==='function')cb(Date.now());});
 socket.on('create',(cb)=>{if(limited()||roomId||typeof cb!=='function')return;if(store.rooms.size>=10000){cb({error:'The studio is full. Please try again shortly.'});return;}const room=store.create(socket.id);roomId=room.id;socket.join(room.id);cb({id:room.id});});
 socket.on('join',(id,cb)=>{if(limited()||roomId||typeof cb!=='function')return;if(typeof id!=='string'||!/^[\w-]{32}$/.test(id)){cb({error:'That invitation is not valid.'});return;}try{const r=store.join(id,socket.id);roomId=id;socket.join(id);cb({id});io.to(r.host).emit('partner-ready');}catch(e){cb({error:(e as Error).message});}});
 socket.on('signal',payload=>{if(limited()||!roomId||!store.member(roomId,socket.id))return;if(!payload||!['offer','answer','ice'].includes(payload.type)||JSON.stringify(payload).length>50000)return;socket.to(roomId).emit('signal',payload);});
 socket.on('settings',data=>{const r=roomId&&store.member(roomId,socket.id);if(limited()||!r||r.host!==socket.id)return;if(validSettings(data))socket.to(roomId!).emit('settings',{layout:data.layout,filter:data.filter,...(data.effect!==undefined?{effect:data.effect}:{}),...(data.intensity!==undefined?{intensity:data.intensity}:{}),...(data.connection!==undefined?{connection:data.connection}:{}),...(data.pose!==undefined?{pose:data.pose}:{})});});
 socket.on('capture',(data,cb)=>{const r=roomId&&store.member(roomId,socket.id);if(limited()||!r||r.host!==socket.id||!r.guest){if(typeof cb==='function')cb({error:'Wait for your partner to connect.'});return;}const seconds=[3,5,10].includes(data?.seconds)?data.seconds:3;const at=Date.now()+seconds*1000+700;io.to(roomId!).emit('capture',{at,slot:Number.isInteger(data?.slot)?Math.max(0,Math.min(data.slot,5)):0});if(typeof cb==='function')cb({at});});
 socket.on('remove',()=>{const r=roomId&&store.member(roomId,socket.id);if(r&&r.host===socket.id){io.to(roomId!).emit('closed','The host ended this session.');io.in(roomId!).socketsLeave(roomId!);store.rooms.delete(roomId!);roomId=undefined;}});
 socket.on('disconnect',()=>{clearInterval(interval);if(roomId){socket.to(roomId).emit('partner-left');const r=store.get(roomId);if(r?.host===socket.id){io.to(roomId).emit('closed','The host disconnected. Please create a new invitation.');io.in(roomId).socketsLeave(roomId);}}store.leave(socket.id);});
});
return {store,close:()=>clearInterval(expiration)};
}
