/** Socket.IO-shaped transport over ordinary HTTPS, backed by shared Postgres state. */
export type SignalingConnection={
  on:(event:string,callback:(...args:any[])=>void)=>unknown;
  emit:(event:string,...args:any[])=>unknown;
  disconnect:()=>unknown;
  timeout:(milliseconds:number)=>{emitWithAck:(event:string)=>Promise<any>};
};
type Event={id:number;event:string;data:unknown};
export class HttpSignaling implements SignalingConnection {
  private listeners=new Map<string,((...args:any[])=>void)[]>();
  private session:{id:string;token:string;cursor:number}|null=null;
  private stopped=false;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private controller=new AbortController();
  private writes:Promise<unknown>=Promise.resolve();
  private failures=0;
  private fastUntil=Date.now()+30000;
  constructor(){queueMicrotask(()=>{if(!this.stopped)this.fire('connect');});}
  on(event:string,callback:(...args:any[])=>void){this.listeners.set(event,[...(this.listeners.get(event)||[]),callback]);return this;}
  private fire(event:string,...args:unknown[]){for(const callback of this.listeners.get(event)||[])callback(...args);}
  private async request(path:string,body?:unknown,timeout=10000){
    const response=await fetch(path,{method:body===undefined?'GET':'POST',cache:'no-store',
      headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(this.session?{Authorization:`Bearer ${this.session.token}`}:{})},
      body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.any([this.controller.signal,AbortSignal.timeout(timeout)])});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error || 'Room connection failed.');
    return result;
  }
  timeout(milliseconds:number){return {emitWithAck:async(event:string)=>{if(event!=='clock')throw new Error('Unknown request.');return (await this.request('/api/rooms',{action:'clock'},milliseconds)).time;}};}
  emit(event:string,...args:any[]){
    if(this.stopped)return this;
    if(event==='signal')this.fastUntil=Date.now()+15000;
    const callback=typeof args.at(-1)==='function'?args.pop():undefined;
    this.writes=this.writes.then(async()=>{
      if(this.stopped)return;
      try{
        if(event==='create' || event==='join'){
          let resumeToken:string|null=null;
          if(event==='join'){try{resumeToken=sessionStorage.getItem(`lovebooth-room:${args[0]}`);}catch{}}
          const result=await this.request('/api/rooms',{action:event,...(event==='join'?{room:args[0],resumeToken}: {})});
          if(result.role==='guest'){try{sessionStorage.setItem(`lovebooth-room:${result.id}`,result.token);}catch{}}
          if(this.stopped){void this.release(result);return;}
          this.session={id:result.id,token:result.token,cursor:result.cursor};callback?.({id:result.id});this.schedule(0);
        }else{
          if(!this.session)throw new Error('Join a room first.');
          const result=await this.request(`/api/rooms/${this.session.id}`,{action:event,data:args[0]});callback?.(result);
        }
      }catch(error){
        if(this.stopped)return;
        const message=error instanceof Error?error.message:'Room connection failed.';
        if(callback)callback({error:message});else this.fire('connect_error',new Error(message));
      }
    });
    return this;
  }
  private schedule(delay:number){clearTimeout(this.timer);this.timer=setTimeout(()=>void this.poll(),delay);}
  private async poll(){
    const session=this.session;if(this.stopped || !session)return;
    try{
      const result=await this.request(`/api/rooms/${session.id}?after=${session.cursor}`);
      if(this.stopped || session!==this.session)return;
      this.failures=0;
      for(const event of result.events as Event[]){if(event.event==='partner-ready' || event.event==='signal')this.fastUntil=Date.now()+15000;if(event.id>session.cursor)this.fire(event.event,event.data);if(this.stopped)return;}
      session.cursor=result.cursor;
      if(result.closed){this.fire('closed','This private room has ended. Create a new invitation.');this.disconnect();return;}
      const negotiating=Date.now()<this.fastUntil;
      this.schedule(document.hidden?5000:negotiating?150:1000);
    }catch{
      if(this.stopped)return;
      this.failures++;
      if(this.failures>=4){this.fire('closed','Your room connection was lost. Rejoin or create a fresh invitation.');this.disconnect();}
      else this.schedule(Math.min(8000,1000*2**this.failures));
    }
  }
  private release(session:{id:string;token:string}){
    return fetch(`/api/rooms/${session.id}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({action:'leave'}),keepalive:true}).catch(()=>{});
  }
  disconnect(){
    if(this.stopped)return;this.stopped=true;clearTimeout(this.timer);this.controller.abort();
    if(this.session)void this.release(this.session);this.session=null;this.listeners.clear();
  }
}
