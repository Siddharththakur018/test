import type { FaceAnchors } from './ar-effects';
export const filters = [
  ['Original','none'], ['Love Letter','sepia(.24) contrast(.92) saturate(.82) brightness(1.06)'], ['Midnight Kiss','grayscale(1) contrast(1.08) brightness(1.05)'],
  ['Golden Hour','sepia(.22) saturate(1.24) brightness(1.06)'], ['Rosewater','sepia(.2) hue-rotate(320deg) saturate(1.22) brightness(1.07)'],
  ['Cloud Nine','brightness(1.12) contrast(.86) saturate(.88)'], ['Moonlit Date','sepia(.13) hue-rotate(175deg) saturate(.75) brightness(1.03)'],
  ['Cherry Crush','sepia(.12) hue-rotate(330deg) saturate(1.45) contrast(1.03)'], ['Our Polaroid','contrast(.9) sepia(.2) brightness(1.08)'],
  ['Candlelight','sepia(.42) saturate(.85) brightness(1.04)'], ['Lavender Haze','sepia(.2) hue-rotate(235deg) saturate(.8) brightness(1.07)'], ['Peach Blush','sepia(.2) saturate(1.18) brightness(1.09) contrast(.94)'],
] as const;
export const frames = [
  {name:'Pink Romance',bg:'#f8dde5',ink:'#693b4d',mark:'♡'}, {name:'Minimal Ivory',bg:'#fff9f5',ink:'#693b4d',mark:'·'},
  {name:'Cherry Blossom',bg:'#fff0f0',ink:'#9b596a',mark:'✿'}, {name:'Vintage Film',bg:'#352d29',ink:'#e9d7b9',mark:'✦'},
  {name:'Love Letters',bg:'#f5eddf',ink:'#815256',mark:'♡'}, {name:'Midnight Romance',bg:'#302d43',ink:'#eee2fb',mark:'☾'},
  {name:'Birthday Princess',bg:'#ffe5d9',ink:'#8a485e',mark:'✧'}, {name:'Ribbon & Bows',bg:'#f5d7df',ink:'#953e5c',mark:'୨୧'},
  {name:'Heart Confetti',bg:'#fff0f3',ink:'#c45e79',mark:'♥'}, {name:'Lavender Dreams',bg:'#e9ddf6',ink:'#6c5085',mark:'✦'},
  {name:'Classic Korean Booth',bg:'#ffffff',ink:'#292525',mark:'·'}, {name:'Long Distance Love',bg:'#e4ece7',ink:'#426352',mark:'♡'},
];
export type Layout = {id:string;name:string;count:number;cols:number;aspect:number};
export const layouts:Layout[] = [
  {id:'classic',name:'Classic four',count:4,cols:1,aspect:1.5}, {id:'three',name:'Three little moments',count:3,cols:1,aspect:1.5},
  {id:'two',name:'Just the two',count:2,cols:1,aspect:1.35}, {id:'grid',name:'Four-square',count:4,cols:2,aspect:1},
  {id:'polaroid',name:'The Polaroid',count:1,cols:1,aspect:1}, {id:'double',name:'Double Polaroid',count:2,cols:2,aspect:.85},
  {id:'couple',name:'Side by side',count:4,cols:1,aspect:1.5}, {id:'heart',name:'Split heart',count:2,cols:1,aspect:1.2},
  {id:'alternating',name:'Alternating us',count:4,cols:1,aspect:1.5}, {id:'birthday',name:'Birthday special',count:3,cols:1,aspect:1.3},
  {id:'custom',name:'Custom collage',count:6,cols:2,aspect:1},
];
export type Photo = {id:string;src:string;partner?:string;partnerFaces?:FaceAnchors[];zoom:number;x:number;y:number;landmarks?:FaceAnchors|null;faces?:FaceAnchors[]};
export type Sticker = {id:string;text:string;x:number;y:number;size:number;rotation:number};
export type Adjustments = {brightness:number;contrast:number;saturation:number;warmth:number};
export const neutral:Adjustments={brightness:100,contrast:100,saturation:100,warmth:0};
export const filterCSS=(index:number,a:Adjustments)=>`${filters[index][1]} brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) sepia(${Math.max(0,a.warmth)/150}) hue-rotate(${Math.min(0,a.warmth)}deg)`;
export function cover(sw:number,sh:number,dw:number,dh:number,zoom=1,x=0,y=0){const scale=Math.max(dw/sw,dh/sh)*zoom;return {w:sw*scale,h:sh*scale,x:(dw-sw*scale)/2+x*dw/100,y:(dh-sh*scale)/2+y*dh/100};}
export const mmToPx=(mm:number,dpi=300)=>Math.round(mm/25.4*dpi);
export function replaceSlot(photos:Photo[],index:number,photo:Photo){const result=[...photos];result[index]=photo;return result;}
