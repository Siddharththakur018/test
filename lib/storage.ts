import {get,set,del} from 'idb-keyval';
export type Memory={id:string;image:string;caption:string;date:string};
export const loadMemories=async()=>(await get<Memory[]>('lovebooth-memories'))||[];
export async function saveMemory(memory:Memory){const all=await loadMemories();await set('lovebooth-memories',[memory,...all]);}
export async function removeMemory(id:string){await set('lovebooth-memories',(await loadMemories()).filter(m=>m.id!==id));}
export {get,set,del};
