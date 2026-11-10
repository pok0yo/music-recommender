import {test,expect} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {realAPI} from '../../lib/api';
import {demoMeta} from '../../lib/fixtures';

test('deployment builds reject missing, local, credential-bearing and non-HTTPS API origins',()=>{
  for(const url of ['', 'http://127.0.0.1:8000','https://127.0.0.1','http://music-api.onrender.com',
    'https://private:secret@music-api.onrender.com','https://api.example.com','https://music-api.onrender.com/v1']){
    const result=spawnSync(process.execPath,['-e',"import('./next.config.ts')"],{env:{...process.env,APP_ENV:'production',NEXT_PUBLIC_API_URL:url},encoding:'utf8'});
    expect(result.status).not.toBe(0);expect(result.stderr).toContain('approved public HTTPS API origin');
    expect(result.stderr).not.toContain('private:secret');
  }
});

test('deployment builds accept an HTTPS API while local development keeps its local default',()=>{
  for(const env of [{APP_ENV:'production',NEXT_PUBLIC_API_URL:'https://music-api.onrender.com'},{APP_ENV:'development',VERCEL:'',NEXT_PUBLIC_API_URL:''}]){
    const result=spawnSync(process.execPath,['-e',"import('./next.config.ts')"],{env:{...process.env,...env},encoding:'utf8'});
    expect(result.status,result.stderr).toBe(0);
  }
});

test('a copied API origin with surrounding space and a slash still requests the correct endpoint',async()=>{
  const original=globalThis.fetch,windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window'),urls:string[]=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:globalThis});
  globalThis.fetch=async url=>{urls.push(String(url));return Response.json({results:[],meta:{...demoMeta,data_mode:'real'}});};
  try{
    await realAPI(' https://music-api.onrender.com/ ').starters(new AbortController().signal);
    expect(urls).toEqual(['https://music-api.onrender.com/v1/catalog/starters']);
  }finally{
    globalThis.fetch=original;
    if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else Reflect.deleteProperty(globalThis,'window');
  }
});
