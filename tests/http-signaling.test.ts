import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HttpSignaling} from '../lib/http-signaling';
test('HTTPS signaling joins, polls and authorizes actions without putting session tokens in URLs',async()=>{
  const original=globalThis.fetch,originalDocument=globalThis.document;
  const calls:{path:string;options:RequestInit}[]=[];
  const id='a'.repeat(32),token='b'.repeat(43);
  globalThis.document={hidden:false} as Document;
  globalThis.fetch=async(input,options={})=>{
    const path=String(input);calls.push({path,options});
    const body=options.body?JSON.parse(String(options.body)):null;
    if(body?.action==='clock')return Response.json({time:1234});
    if(body?.action==='create')return Response.json({id,token,cursor:0});
    if(options.method==='GET')return Response.json({cursor:1,closed:false,events:[{id:1,event:'partner-ready',data:null}]});
    return Response.json({ok:true});
  };
  const connection=new HttpSignaling();
  try{
    await new Promise<void>(r=>{connection.on('connect',r);});
    assert.equal(await connection.timeout(200).emitWithAck('clock'),1234);
    const ready=new Promise<void>(r=>{connection.on('partner-ready',r);});
    const created=await new Promise<any>(r=>connection.emit('create',r));
    assert.deepEqual(created,{id});await ready;
    const settings={layout:'couple',filter:4};
    await new Promise<any>(r=>connection.emit('settings',settings,r));
    const action=calls.find(c=>c.options.body && JSON.parse(String(c.options.body)).action==='settings')!;
    assert.equal((action.options.headers as Record<string,string>).Authorization,`Bearer ${token}`);
    assert.ok(calls.every(c=>!c.path.includes(token)));
    connection.disconnect();
    assert.ok(calls.some(c=>c.options.keepalive && JSON.parse(String(c.options.body)).action==='leave'));
  }finally{connection.disconnect();globalThis.fetch=original;globalThis.document=originalDocument;}
});
