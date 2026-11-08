'use client';
import { memo, useEffect, useRef, type RefObject } from 'react';
import { drawFaceEffect, drawHeartConnection, effects, type EffectId, type FaceAnchors, type Point } from '../lib/ar-effects';
import { useFaceEffects } from '../lib/use-face-effects';
import { freshFaces, type TrackingSnapshot } from '../lib/tracking';
import { cover } from '../lib/design';

type Props = {
  video: RefObject<HTMLVideoElement|null>; remoteVideo: RefObject<HTMLVideoElement|null>;
  local: RefObject<TrackingSnapshot>; remote: RefObject<TrackingSnapshot>;
  enabled: boolean; together: boolean; effect: EffectId; intensity: number; connection: boolean;
  onFaces: (faces: FaceAnchors[]) => void;
};
export default memo(function LiveEffects({ video,remoteVideo,local,remote,enabled,together,effect,intensity,connection,onFaces }: Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const status=useFaceEffects(video,enabled,local,onFaces);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d'); if(!ctx) return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0;
    // Cache layout reads until a resize, rather than forcing layout every frame.
    let views: {video:HTMLVideoElement;rect:DOMRect;mirror:boolean;snapshot:RefObject<TrackingSnapshot>}[]=[];
    const measure=()=>{
      const area=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1);
      canvas.width=Math.round(area.width*ratio); canvas.height=Math.round(area.height*ratio);
      ctx.setTransform(ratio,0,0,ratio,0,0);
      views=[];
      for(const [ref,snapshot,mirror] of [[video,local,true],[remoteVideo,remote,false]] as const){
        const v=ref.current; if(!v) continue;
        const rect=v.getBoundingClientRect();
        views.push({video:v,rect:new DOMRect(rect.x-area.x,rect.y-area.y,rect.width,rect.height),mirror,snapshot});
      }
    };
    const observer=new ResizeObserver(measure); observer.observe(canvas); if(video.current)observer.observe(video.current); if(remoteVideo.current)observer.observe(remoteVideo.current);
    measure();
    const render=(now:number)=>{
      frame=requestAnimationFrame(render);
      if(now-last<32) return; last=now;
      const ratio=Math.min(2,devicePixelRatio||1);ctx.clearRect(0,0,canvas.width/ratio,canvas.height/ratio);
      if(document.hidden || !enabled) return;
      const centers:Point[]=[];
      for(const view of views){
        const {video:v,rect:r,mirror,snapshot}=view;
        if(!v.videoWidth || !r.width || v.paused)continue;
        const faces=freshFaces(snapshot.current,now),crop=cover(v.videoWidth,v.videoHeight,r.width,r.height);
        const map=(p:Point)=>({x:r.x+(mirror?r.width-(crop.x+p.x*crop.w):crop.x+p.x*crop.w),y:r.y+crop.y+p.y*crop.h});
        ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.width,r.height);ctx.clip();
        // Mirror the complete local effect, so bows and kiss marks match the photo.
        if(mirror){ctx.translate(r.x+r.width,r.y);ctx.scale(-1,1);}else ctx.translate(r.x,r.y);
        for(const face of faces){
          drawFaceEffect(ctx,effect,face,p=>({x:crop.x+p.x*crop.w,y:crop.y+p.y*crop.h}),{intensity,time:reduced.matches?0:now/1000});
          centers.push(map(face.cheekR));
        }
        ctx.restore();
      }
      if(connection && centers.length>=2)drawHeartConnection(ctx,centers[0],centers[1],{intensity,time:reduced.matches?0:now/1000});
    };
    frame=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[video,remoteVideo,local,remote,enabled,together,effect,intensity,connection]);
  return <><canvas ref={canvasRef} className="face-overlay couple-effects" aria-hidden="true"/><span className="tracking-pill" role="status">{status.error || (!status.ready?'Preparing your love filter…':status.count?`♡ ${effects.find(e=>e.id===effect)?.name} · following ${status.count===2?'both of you':'you'}`:'♡ Looking for your face — come into the light')}</span></>;
});
