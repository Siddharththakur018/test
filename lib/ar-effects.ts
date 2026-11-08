export type Point = { x: number; y: number };
export type FaceAnchors = {
  eyeL: Point; eyeR: Point; foreheadTop: Point; chin: Point; noseTip: Point;
  mouthL: Point; mouthR: Point; cheekL: Point; cheekR: Point;
};

export const effects = [
  { id: 'none', name: 'No effect', icon: '✕' },
  { id: 'heart-freckles', name: 'Love freckles', icon: '💕' },
  { id: 'kiss', name: 'Kissed by you', icon: '💋' },
  { id: 'ribbon', name: 'Sweet ribbon', icon: '🎀' },
  { id: 'pearl', name: 'Pearl romance', icon: '🤍' },
  { id: 'halo', name: 'In love', icon: '💗' },
  { id: 'dog', name: 'Puppy', icon: '🐶' },
  { id: 'bunny', name: 'Bunny', icon: '🐰' },
  { id: 'crown', name: 'Royal crown', icon: '👑' },
  { id: 'flower', name: 'Flower crown', icon: '🌸' },
  { id: 'glasses', name: 'Cool shades', icon: '😎' },
  { id: 'heart-eyes', name: 'Heart eyes', icon: '😍' },
  { id: 'blush', name: 'Rosy cheeks', icon: '🌷' },
  { id: 'mustache', name: 'Mustache', icon: '🥸' },
] as const;
export type EffectId = (typeof effects)[number]['id'];

type Mapped = Record<keyof FaceAnchors, Point>;
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angleOf = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x);
const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function mapAnchors(anchors: FaceAnchors, toPoint: (p: Point) => Point): Mapped {
  const out: Partial<Mapped> = {};
  for (const key of Object.keys(anchors) as (keyof FaceAnchors)[]) out[key] = toPoint(anchors[key]);
  return out as Mapped;
}

function ear(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number, fill: string, inner: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.42, size, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, size * 0.1, size * 0.22, size * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();
}

function emoji(ctx: CanvasRenderingContext2D, glyph: string, x: number, y: number, size: number, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

function drawDog(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  const top = m.foreheadTop, span = scale * 0.95;
  const left = { x: top.x - Math.cos(angle) * span + Math.sin(angle) * scale * 0.5, y: top.y - Math.sin(angle) * span - Math.cos(angle) * scale * 0.5 };
  const right = { x: top.x + Math.cos(angle) * span + Math.sin(angle) * scale * 0.5, y: top.y + Math.sin(angle) * span - Math.cos(angle) * scale * 0.5 };
  ear(ctx, left.x, left.y, scale * 0.85, angle - 0.5, '#8a5a34', '#dba26b');
  ear(ctx, right.x, right.y, scale * 0.85, angle + 0.5, '#8a5a34', '#dba26b');
  ctx.save();
  ctx.translate(m.noseTip.x, m.noseTip.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 0.24, scale * 0.17, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2b2320';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-scale * 0.07, -scale * 0.05, scale * 0.05, scale * 0.03, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5c4f49';
  ctx.fill();
  ctx.restore();
}

function drawBunny(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  const top = m.foreheadTop;
  const offset = scale * 0.55;
  const left = { x: top.x - Math.cos(angle) * offset, y: top.y - Math.sin(angle) * offset };
  const right = { x: top.x + Math.cos(angle) * offset, y: top.y + Math.sin(angle) * offset };
  const lift = scale * 1.5;
  ear(ctx, left.x + Math.sin(angle) * lift, left.y + Math.cos(angle) * -lift, scale * 1.35, angle - 0.12, '#fbeef0', '#e79aad');
  ear(ctx, right.x + Math.sin(angle) * lift, right.y + Math.cos(angle) * -lift, scale * 1.35, angle + 0.12, '#fbeef0', '#e79aad');
}

function drawCrown(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  const top = { x: m.foreheadTop.x + Math.sin(angle) * scale * 0.75, y: m.foreheadTop.y + Math.cos(angle) * -scale * 0.75 };
  emoji(ctx, '👑', top.x, top.y, scale * 2.1, angle);
}

function drawFlowerCrown(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  ctx.save();
  ctx.translate(m.foreheadTop.x, m.foreheadTop.y);
  ctx.rotate(angle);
  ['🌸', '🌷', '🌸', '🌷', '🌸'].forEach((glyph, i) => {
    const t = (i - 2) / 2;
    emoji(ctx, glyph, t * scale * .83, -scale * (.12 + (1 - t * t) * .27), scale * .5, t * .25);
  });
  ctx.restore();
}

function drawGlasses(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  const center = mid(m.eyeL, m.eyeR);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  const lensW = scale * 0.62, lensH = scale * 0.5, gap = scale * 0.22, lensX = scale * 0.58;
  ctx.fillStyle = 'rgba(15,15,18,0.88)';
  ctx.strokeStyle = 'rgba(15,15,18,0.88)';
  ctx.lineWidth = scale * 0.08;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(side * lensX - lensW / 2, -lensH / 2, lensW, lensH, lensH * 0.4);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-gap / 2, 0);
  ctx.lineTo(gap / 2, 0);
  ctx.stroke();
  ctx.restore();
}

function drawHeartEyes(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  emoji(ctx, '❤️', m.eyeL.x, m.eyeL.y, scale * 0.85, angle);
  emoji(ctx, '❤️', m.eyeR.x, m.eyeR.y, scale * 0.85, angle);
}

function drawBlush(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  ctx.save();
  for (const c of [m.cheekL, m.cheekR]) {
    ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(angle); ctx.scale(1,.62);
    const glow=ctx.createRadialGradient(0,0,0,0,0,scale*.34);
    glow.addColorStop(0,'rgba(240,119,155,.48)'); glow.addColorStop(.55,'rgba(242,148,175,.24)'); glow.addColorStop(1,'rgba(244,164,184,0)');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(0,0,scale*.34,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = 'rgba(165,96,110,0.55)';
  const freckleSpots = [
    { dx: -0.55, dy: 0.1 }, { dx: -0.3, dy: 0.28 }, { dx: 0.3, dy: 0.28 }, { dx: 0.55, dy: 0.1 },
  ];
  for (const f of freckleSpots) {
    const x = m.noseTip.x + (f.dx*Math.cos(angle)-f.dy*Math.sin(angle))*scale, y = m.noseTip.y + (f.dx*Math.sin(angle)+f.dy*Math.cos(angle))*scale;
    ctx.beginPath();
    ctx.ellipse(x, y, scale * 0.035, scale * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMustache(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  const mouthMid = mid(m.mouthL, m.mouthR);
  const y = (m.noseTip.y + mouthMid.y) / 2;
  const x = (m.noseTip.x + mouthMid.x) / 2;
  const width = Math.max(dist(m.mouthL, m.mouthR), scale * 0.8);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#2b2320';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (const side of [-1, 1]) {
    ctx.moveTo(0, -scale * 0.05);
    ctx.quadraticCurveTo(side * width * 0.28, -scale * 0.3, side * width * 0.52, -scale * 0.02);
    ctx.quadraticCurveTo(side * width * 0.58, scale * 0.14, side * width * 0.4, scale * 0.12);
    ctx.quadraticCurveTo(side * width * 0.22, scale * 0.02, 0, scale * 0.05);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  ctx.beginPath(); ctx.moveTo(0, .5);
  ctx.bezierCurveTo(-1, -.1, -.55, -.85, 0, -.35);
  ctx.bezierCurveTo(.55, -.85, 1, -.1, 0, .5);
  ctx.fillStyle = '#e95383'; ctx.fill(); ctx.restore();
}

export type EffectOptions = { intensity?: number; time?: number };
export function drawFaceEffect(ctx: CanvasRenderingContext2D, effectId: EffectId, anchors: FaceAnchors | null, toPoint: (p: Point) => Point, options: EffectOptions = {}) {
  if (effectId === 'none' || !anchors) return;
  const m = mapAnchors(anchors, toPoint);
  const scale = dist(m.eyeL, m.eyeR);
  const angle = angleOf(m.eyeL, m.eyeR);
  if (!Number.isFinite(scale) || scale <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0,Math.min(1,options.intensity ?? .75));
  const time = options.time ?? 0;
  switch (effectId) {
    case 'dog': drawDog(ctx, m, scale, angle); break;
    case 'bunny': drawBunny(ctx, m, scale, angle); break;
    case 'crown': drawCrown(ctx, m, scale, angle); break;
    case 'flower': drawFlowerCrown(ctx, m, scale, angle); break;
    case 'glasses': drawGlasses(ctx, m, scale, angle); break;
    case 'heart-eyes': drawHeartEyes(ctx, m, scale, angle); break;
    case 'blush': drawBlush(ctx, m, scale, angle); break;
    case 'heart-freckles':
      drawBlush(ctx, m, scale, angle);
      ctx.globalAlpha *= .62;
      for (const cheek of [m.cheekL, m.cheekR]) {
        ctx.save(); ctx.translate(cheek.x, cheek.y); ctx.rotate(angle);
        for (let i = -1; i <= 1; i++) heart(ctx, i * scale * .17, Math.abs(i) * scale * .045, scale * .12);
        ctx.restore();
      }
      break;
    case 'kiss':
      drawBlush(ctx, m, scale, angle);
      drawKiss(ctx, m.cheekR, scale*.42*(1+.04*Math.sin(time*3)), angle-.25);
      ctx.save(); ctx.translate(m.cheekR.x,m.cheekR.y); ctx.rotate(angle);
      for(let i=0;i<3;i++){const phase=(time*.45+i/3)%1; ctx.globalAlpha=(options.intensity ?? .75)*(1-phase)*.65; heart(ctx,scale*(.12+phase*.25),-scale*(.12+phase*.65),scale*.15);}
      ctx.restore();
      break;
    case 'ribbon':
      drawSatinBow(ctx,m.foreheadTop,scale,angle,Math.min(1,Math.max(.5,scale/dist(m.foreheadTop,m.chin)*1.8)));
      drawBlush(ctx, m, scale, angle); break;
    case 'pearl': drawPearls(ctx,m,scale,angle); drawBlush(ctx,m,scale,angle); break;
    case 'halo':
      drawBlush(ctx, m, scale, angle);
      ctx.save(); ctx.translate(m.foreheadTop.x, m.foreheadTop.y); ctx.rotate(angle);
      for (let i = -2; i <= 2; i++) heart(ctx, i * scale * .43, -scale * (.3 + (1 - i * i / 4) * .4 + .035*Math.sin(time*2+i)), scale * (i % 2 ? .22 : .3));
      ctx.restore(); break;
    case 'mustache': drawMustache(ctx, m, scale, angle); break;
  }
  ctx.restore();
}

function drawSatinBow(ctx: CanvasRenderingContext2D, p: Point, size: number, angle: number, yaw: number) {
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(angle-.1); ctx.scale(size*yaw,size);
  const satin=ctx.createLinearGradient(0,-.3,0,.3);
  satin.addColorStop(0,'#a72f59'); satin.addColorStop(.3,'#f7b3cb'); satin.addColorStop(.48,'#ffe2ec'); satin.addColorStop(.7,'#dc739e'); satin.addColorStop(1,'#a63860');
  ctx.fillStyle=satin; ctx.strokeStyle='rgba(135,38,75,.3)'; ctx.lineWidth=.012;
  for(const side of [-1,1]) {
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(side*.19,-.26,side*.6,-.35,side*.53,-.04); ctx.bezierCurveTo(side*.6,.19,side*.2,.19,0,0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side*.04,.03); ctx.bezierCurveTo(side*.12,.18,side*.18,.33,side*.37,.39); ctx.lineTo(side*.27,.22); ctx.lineTo(side*.45,.23); ctx.bezierCurveTo(side*.22,.1,side*.22,-.01,side*.04,.03); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0,0,.075,.115,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawKiss(ctx: CanvasRenderingContext2D, p: Point, size: number, angle: number) {
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(angle); ctx.scale(size,size);
  ctx.fillStyle='rgba(187,39,85,.8)'; ctx.beginPath(); ctx.moveTo(-.5,0);
  ctx.bezierCurveTo(-.25,-.05,-.2,-.45,0,-.21); ctx.bezierCurveTo(.22,-.44,.25,-.05,.5,0);
  ctx.bezierCurveTo(.15,.04,.19,.4,0,.28); ctx.bezierCurveTo(-.2,.4,-.22,.05,-.5,0); ctx.fill();
  ctx.strokeStyle='rgba(255,220,231,.7)'; ctx.lineWidth=.025; ctx.beginPath(); ctx.moveTo(-.32,0); ctx.quadraticCurveTo(0,.07,.32,0); ctx.stroke(); ctx.restore();
}
function drawPearls(ctx: CanvasRenderingContext2D, m: Mapped, scale: number, angle: number) {
  ctx.save(); ctx.translate(m.foreheadTop.x,m.foreheadTop.y); ctx.rotate(angle);
  ctx.strokeStyle='rgba(204,171,122,.8)'; ctx.lineWidth=scale*.018;
  ctx.beginPath(); ctx.moveTo(-scale*.8,scale*.02); ctx.quadraticCurveTo(0,-scale*.7,scale*.8,scale*.02); ctx.stroke();
  for(let i=-4;i<=4;i++) {
    const t=i/4,x=t*scale*.8,y=-scale*.34*(1-t*t),r=scale*(i===0?.09:.066);
    const pearl=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r);
    pearl.addColorStop(0,'#fffdf4'); pearl.addColorStop(.5,'#fff5e6'); pearl.addColorStop(1,'#bfa6a3');
    ctx.fillStyle=pearl; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  heart(ctx,0,-scale*.52,scale*.16); ctx.restore();
}
export function drawHeartConnection(ctx: CanvasRenderingContext2D, a: Point, b: Point, options: EffectOptions = {}) {
  const span=dist(a,b); if(span < 1 || !Number.isFinite(span)) return;
  ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,options.intensity ?? .75))*.65;
  const bend=Math.min(55,span*.15),time=options.time ?? 0;
  ctx.strokeStyle='#ed9cba'; ctx.lineWidth=Math.max(1,span*.004); ctx.setLineDash([3,7]);
  ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-bend,b.x,b.y); ctx.stroke(); ctx.setLineDash([]);
  for(let i=1;i<6;i++){const t=i/6;heart(ctx,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-2*(1-t)*t*bend+Math.sin(time*2+i)*3,Math.min(18,span*.055)*(i===3?1.3:1));}
  ctx.restore();
}
