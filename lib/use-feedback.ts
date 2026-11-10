'use client';

import {useEffect,useState} from 'react';
import {uuid} from './contracts';

export function parseDismissals(raw:string|null):string[]{
  if(!raw||raw.length>65536)return [];
  try{const value=JSON.parse(raw);return value?.version===1&&Array.isArray(value.ids)&&value.ids.length<=1000&&value.ids.every((id:unknown)=>typeof id==='string'&&uuid(id))?[...new Set<string>(value.ids)]:[];}catch{return [];}
}

export function useFeedback(mode:'real'|'demo'){
  const key=`music-feedback-${mode}-v1`;
  const [ids,setIds]=useState<string[]>([]),[ready,setReady]=useState(false),[persistent,setPersistent]=useState(true),[undoId,setUndoId]=useState<string|null>(null);
  useEffect(()=>{try{setIds(parseDismissals(localStorage.getItem(key)));setPersistent(true);}catch{setIds([]);setPersistent(false);}setReady(true);setUndoId(null);},[key]);
  function save(next:string[]){setIds(next);try{localStorage.setItem(key,JSON.stringify({version:1,ids:next}));setPersistent(true);}catch{setPersistent(false);}}
  return {ids,ready,persistent,undoId,
    dismiss(id:string){if(!ready||!uuid(id))return;save([...ids.filter(value=>value!==id),id].slice(-1000));setUndoId(id);},
    undo(){if(undoId)save(ids.filter(id=>id!==undoId));setUndoId(null);return undoId;},
    reset(){save([]);setUndoId(null);}};
}
