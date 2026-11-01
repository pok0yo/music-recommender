'use client';

import {useEffect,useState} from 'react';

export function SceneLoader({visible=true,stage='scene',onContinue}:{visible?:boolean;stage?:'scene'|'catalog';onContinue?:()=>void}) {
  const [slow,setSlow]=useState(false);
  useEffect(()=>{
    if(!visible)return;
    const timer=window.setTimeout(()=>setSlow(true),8000);
    return ()=>window.clearTimeout(timer);
  },[visible]);
  return <section className={`scene-loader${visible?'':' is-finished'}`} aria-label="Loading music discovery" aria-hidden={!visible} inert={!visible}>
    <div className="scene-loader-grid" aria-hidden="true" />
    <div className="scene-loader-window">
      <header className="scene-loader-chrome"><span>m/r</span><span>OPTICAL SYSTEM / 01</span><i aria-hidden="true" /></header>
      <div className="scene-loader-art" aria-hidden="true"><div className="scene-loader-orbit" /><div className="scene-loader-disc" /><span className="scene-loader-satellite" /></div>
      <div className="scene-loader-copy"><p className="scene-loader-label">PERSONAL MUSIC DISCOVERY</p><h1>Tuning in.</h1>
        <p className="scene-loader-status" role="status">{stage==='catalog'?'Connecting to the music catalog.':'Preparing your listening space.'}</p>
        <div className="scene-loader-track" role="progressbar" aria-label="Preparing music discovery"><span /></div>
        <div className="scene-loader-caption"><span>SHARED LISTENING</span><span>NEW CONNECTIONS</span></div>
        {slow&&onContinue&&<div className="scene-loader-slow"><p>Taking a little longer. You can use the song controls while the scene finishes.</p><button type="button" onClick={onContinue}>Use song controls <span aria-hidden="true">↗</span></button></div>}
      </div>
      <footer className="scene-loader-footer"><span className="scene-loader-led" aria-hidden="true" /> A new connection starts with one song.</footer>
    </div>
  </section>;
}
