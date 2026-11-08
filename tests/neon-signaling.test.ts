import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRoom,joinRoom,pollRoom,roomAction,RoomError} from '../lib/db/rooms';
import {database} from '../lib/db/neon';
const enabled=process.env.NEON_INTEGRATION_TEST==='1' && !!process.env.DATABASE_URL;
test('Neon coordinates separate clients, atomically admits one guest and preserves room privacy',{skip:!enabled},async()=>{
  const host=await createRoom(`test-${randomUUID()}`),sql=database();
  try{
    assert.match(host.id,/^[\w-]{32}$/);assert.match(host.token,/^[\w-]{43}$/);
    const attempts=await Promise.allSettled([joinRoom(host.id),joinRoom(host.id)]);
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
    const guest=attempts.find(r=>r.status==='fulfilled')!;
    assert.equal(guest.status,'fulfilled');if(guest.status!=='fulfilled')return;
    const g=guest.value;
    let h=await pollRoom(host.id,host.token,0);
    assert.equal(h.events[0].event,'partner-ready');
    await assert.rejects(()=>pollRoom(host.id,'a'.repeat(43),0),RoomError);
    const settings={layout:'couple',filter:4,effect:'pearl',intensity:.5,connection:true,pose:2};
    await assert.rejects(()=>roomAction(host.id,g.token,'settings',settings),RoomError);
    await roomAction(host.id,host.token,'settings',settings);
    const incoming=await pollRoom(host.id,g.token,g.cursor);
    assert.deepEqual(incoming.events.find((e:any)=>e.event==='settings').data,settings);
    assert.equal(incoming.events.some((e:any)=>e.event==='partner-ready'),false);
    const before=Date.now();
    const capture=await roomAction(host.id,host.token,'capture',{seconds:3,slot:1}) as {at:number;slot:number};
    assert.ok(capture.at>=before+4500);assert.equal(capture.slot,1);
    const [hostEvents,guestEvents]=await Promise.all([pollRoom(host.id,host.token,h.cursor),pollRoom(host.id,g.token,incoming.cursor)]);
    assert.deepEqual(hostEvents.events.find((e:any)=>e.event==='capture').data,capture);
    assert.deepEqual(guestEvents.events.find((e:any)=>e.event==='capture').data,capture);
    const offer={type:'offer',sdp:{type:'offer',sdp:'test-offer'}};
    await roomAction(host.id,host.token,'signal',offer);
    const exchange=await pollRoom(host.id,g.token,guestEvents.cursor);
    assert.deepEqual(exchange.events.find((e:any)=>e.event==='signal').data,offer);
    await roomAction(host.id,g.token,'leave',null);
    h=await pollRoom(host.id,host.token,hostEvents.cursor);
    assert.ok(h.events.some((e:any)=>e.event==='partner-left'));
    await assert.rejects(()=>pollRoom(host.id,g.token,0),RoomError);
    const nextGuest=await joinRoom(host.id);
    assert.equal((await pollRoom(host.id,nextGuest.token,nextGuest.cursor)).events.length,0);
    await roomAction(host.id,host.token,'remove',null);
    const ended=await pollRoom(host.id,nextGuest.token,nextGuest.cursor);
    assert.equal(ended.closed,true);assert.ok(ended.events.some((e:any)=>e.event==='closed'));
    await assert.rejects(()=>joinRoom(host.id),RoomError);
  }finally{await sql.query('DELETE FROM lovebooth_signaling_rooms WHERE id=$1',[host.id]);}
});
test('Neon expires abandoned guests and rejects expired rooms',{skip:!enabled},async()=>{
  const host=await createRoom(`test-${randomUUID()}`),sql=database();
  try{
    await joinRoom(host.id);
    await sql.query('UPDATE lovebooth_signaling_rooms SET guest_seen_ms=$2 WHERE id=$1',[host.id,Date.now()-61000]);
    const events=await pollRoom(host.id,host.token,0);
    assert.ok(events.events.some((e:any)=>e.event==='partner-left'));
    await joinRoom(host.id);
    await sql.query('UPDATE lovebooth_signaling_rooms SET expires_ms=$2 WHERE id=$1',[host.id,Date.now()-1000]);
    await assert.rejects(()=>pollRoom(host.id,host.token,0),RoomError);
  }finally{await sql.query('DELETE FROM lovebooth_signaling_rooms WHERE id=$1',[host.id]);}
});
test('guest resumes without taking a third place; stale leave cannot evict resumed guest',{skip:!enabled},async()=>{
  const host=await createRoom(`test-${randomUUID()}`),sql=database();
  try{
    const first=await joinRoom(host.id),resumed=await joinRoom(host.id,first.token);
    assert.notEqual(first.token,resumed.token);
    await roomAction(host.id,first.token,'leave',null);
    assert.equal((await pollRoom(host.id,resumed.token,resumed.cursor)).closed,false);
    await assert.rejects(()=>joinRoom(host.id),/Both places/);
    await sql.query('UPDATE lovebooth_signaling_rooms SET guest_seen_ms=$2 WHERE id=$1',[host.id,Date.now()-61000]);
    await joinRoom(host.id); // Reclaim without waiting for a host poll.
    await sql.query('UPDATE lovebooth_signaling_rooms SET closed=true WHERE id=$1',[host.id]);
    await assert.rejects(()=>joinRoom(host.id),(error:unknown)=>error instanceof RoomError && error.status===410);
  }finally{await sql.query('DELETE FROM lovebooth_signaling_rooms WHERE id=$1',[host.id]);}
});
