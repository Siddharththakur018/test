import {type Photo,type Sticker,type Adjustments,type Layout,frames,filterCSS,cover} from './design';
import {drawFaceEffect,drawHeartConnection,type EffectId,type Point} from './ar-effects';
export type Composition={photos:Photo[];layout:Layout;frame:number;filter:number;adjustments:Adjustments;caption:string;names:string;date:string;stickers:Sticker[];background:string;border:string;effect:EffectId;intensity?:number;connection?:boolean};
const images=new Map<string,Promise<HTMLImageElement>>();
function load(src:string):Promise<HTMLImageElement>{
 const existing=images.get(src);if(existing){images.delete(src);images.set(src,existing);return existing;}
 const promise=new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>{images.delete(src);reject(new Error('This photo could not be read. Please upload it again.'));};img.src=src;});
 images.set(src,promise);if(images.size>12)images.delete(images.keys().next().value!);return promise;
}
export function dimensions(layout:Layout,width=1200){const margin=width*.065,gap=width*.03,cellW=(width-2*margin-(layout.cols-1)*gap)/layout.cols,cellH=cellW/layout.aspect;return {width,height:Math.round(margin*2+Math.ceil(layout.count/layout.cols)*(cellH+gap)+width*.25),margin,gap,cellW,cellH};}
export async function compose(c:Composition,width=1200){const d=dimensions(c.layout,width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=d.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is not supported in this browser.');const frame=frames[c.frame];ctx.fillStyle=c.background||frame.bg;ctx.fillRect(0,0,width,d.height);ctx.strokeStyle=c.border||frame.ink;ctx.lineWidth=2;ctx.strokeRect(12,12,width-24,d.height-24);
 const draw=async(src:string,x:number,y:number,w:number,h:number,p:Photo,partner=false)=>{
  const img=await load(src),r=cover(img.width,img.height,w,h,p.zoom,p.x,p.y);
  const faces=partner ? p.partnerFaces || [] : p.faces || (p.landmarks?[p.landmarks]:[]);
  const map=(pt:Point)=>({x:x+r.x+pt.x*r.w,y:y+r.y+pt.y*r.h});
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.filter=filterCSS(c.filter,c.adjustments);ctx.drawImage(img,x+r.x,y+r.y,r.w,r.h);ctx.filter='none';
  for(const face of faces)drawFaceEffect(ctx,c.effect,face,map,{intensity:c.intensity});
  const centers=faces.map(face=>map(face.cheekR));
  if(c.connection && c.effect!=='none' && centers.length>1)drawHeartConnection(ctx,centers[0],centers[1],{intensity:c.intensity});
  ctx.restore();return centers;
 };
 for(let i=0;i<c.layout.count;i++){
  const x=d.margin+(i%c.layout.cols)*(d.cellW+d.gap),y=d.margin+Math.floor(i/c.layout.cols)*(d.cellH+d.gap),p=c.photos[i];
  ctx.fillStyle='#eadfda';ctx.fillRect(x,y,d.cellW,d.cellH);if(!p)continue;
  if(p.partner && c.layout.id!=='alternating'){
   const left=await draw(p.src,x,y,d.cellW/2,d.cellH,p),right=await draw(p.partner,x+d.cellW/2,y,d.cellW/2,d.cellH,p,true);
   if(c.connection && c.effect!=='none' && left[0] && right[0]){
    ctx.save();ctx.beginPath();ctx.rect(x,y,d.cellW,d.cellH);ctx.clip();drawHeartConnection(ctx,left[0],right[0],{intensity:c.intensity});ctx.restore();
   }
   if(c.layout.id==='heart'){ctx.fillStyle=frame.bg;ctx.font=`${width*.1}px serif`;ctx.textAlign='center';ctx.fillText('♡',width/2,y+d.cellH*.6);}
  }else{const partner=!!(c.layout.id==='alternating'&&i%2&&p.partner);await draw(partner?p.partner!:p.src,x,y,d.cellW,d.cellH,p,partner);}
 }
 ctx.fillStyle=frame.ink;ctx.textAlign='center';ctx.font=`${width*.055}px Georgia`;ctx.fillText(c.caption||'Miles apart, memories together.',width/2,d.height-width*.22,width*.86);ctx.font=`${width*.028}px sans-serif`;ctx.fillText([c.names,c.date].filter(Boolean).join('  ·  '),width/2,d.height-width*.15,width*.85);ctx.font=`${width*.035}px Georgia`;ctx.fillText(`${frame.mark}  L O V E B O O T H  ${frame.mark}`,width/2,d.height-width*.075);
 ctx.font=`${width*.04}px Georgia`;for(let i=0;i<4;i++){ctx.fillText(frame.mark,i%2?width-28:28,d.height*.18+i*d.height*.18);}
 for(const s of c.stickers){ctx.save();ctx.translate(s.x/100*width,s.y/100*d.height);ctx.rotate(s.rotation*Math.PI/180);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${s.size/100*width}px sans-serif`;ctx.fillText(s.text,0,0);ctx.restore();}return canvas;
}
export function download(data:string,name:string){const a=document.createElement('a');a.href=data;a.download=name;a.click();}
export async function printFile(canvas:HTMLCanvasElement,paper:'a4'|'photo'|'strip',copies:number,guides:boolean,pdf:boolean){const {jsPDF}=await import('jspdf');const sizes={a4:[210,297],photo:[101.6,152.4],strip:[50.8,152.4]};const [w,h]=sizes[paper];const doc=new jsPDF({unit:'mm',format:[w,h]});const gap=4,margin=paper==='strip'?2:6,available=(w-margin*2-gap*(copies-1))/copies;const pw=Math.min(available,(h-margin*2)*canvas.width/canvas.height),ph=pw*canvas.height/canvas.width;for(let i=0;i<copies;i++){const x=margin+i*(available+gap)+(available-pw)/2,y=(h-ph)/2;doc.addImage(canvas.toDataURL('image/png'),'PNG',x,y,pw,ph);if(guides){doc.setDrawColor(180);doc.setLineDashPattern([1,2],0);doc.rect(x,y,pw,ph);}}if(pdf){doc.save('lovebooth-print.pdf');return;}const url=URL.createObjectURL(doc.output('blob'));const win=window.open(url,'_blank');if(!win){URL.revokeObjectURL(url);throw new Error('Allow pop-ups to open your print preview, or download the PDF.');}setTimeout(()=>URL.revokeObjectURL(url),120000);}
