import { effects, type EffectId } from './ar-effects.ts';
import { filters, layouts } from './design.ts';
export type SessionSettings = { layout:string; filter:number; effect?:EffectId; intensity?:number; connection?:boolean; pose?:number };
export function validSettings(value: unknown): value is SessionSettings {
  if(!value || typeof value!=='object')return false;
  const v=value as SessionSettings;
  return layouts.some(l=>l.id===v.layout) && Number.isInteger(v.filter) && v.filter>=0 && v.filter<filters.length
    && (v.effect===undefined || effects.some(e=>e.id===v.effect))
    && (v.intensity===undefined || Number.isFinite(v.intensity) && v.intensity>=0 && v.intensity<=1)
    && (v.connection===undefined || typeof v.connection==='boolean')
    && (v.pose===undefined || Number.isInteger(v.pose) && v.pose>=0 && v.pose<6);
}
