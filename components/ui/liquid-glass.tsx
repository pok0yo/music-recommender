'use client';

import { useEffect } from 'react';

// The supplied layers stay decorative; the existing native element owns the action.
export function GlassEffect() {
  return <span className="glass-effect" aria-hidden="true"><span className="glass-distortion" /><span className="glass-tint" /><span className="glass-shine" /></span>;
}

export function LiquidGlass() {
  useEffect(() => {
    const preferences=['(prefers-reduced-motion: reduce)','(prefers-reduced-transparency: reduce)','(forced-colors: active)'].map(q=>matchMedia(q));
    let active: HTMLElement | null=null, frame=0;
    const clear=()=>{ cancelAnimationFrame(frame); frame=0; if(active){delete active.dataset.glassActive;active.style.removeProperty('--glass-x');active.style.removeProperty('--glass-y');active=null;} };
    const move=(event: PointerEvent)=>{
      if(event.pointerType!=='mouse' || preferences.some(q=>q.matches)) return;
      const target=event.target instanceof Element ? event.target.closest<HTMLElement>('.app-surface :is(button,a,input,select,summary)') : null;
      if(!target || target.matches(':disabled')) {clear();return;}
      if(active!==target) clear(); active=target;
      const rect=target.getBoundingClientRect(), x=event.clientX-rect.left, y=event.clientY-rect.top;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{target.style.setProperty('--glass-x',x+'px');target.style.setProperty('--glass-y',y+'px');target.dataset.glassActive='true';frame=0;});
    };
    const leave=(event: PointerEvent)=>{if(active && !(event.relatedTarget instanceof Node && active.contains(event.relatedTarget))) clear();};
    document.addEventListener('pointermove',move,{passive:true}); document.addEventListener('pointerout',leave,{passive:true});
    document.addEventListener('visibilitychange',clear); window.addEventListener('blur',clear);
    preferences.forEach(q=>q.addEventListener('change',clear));
    return ()=>{clear();document.removeEventListener('pointermove',move);document.removeEventListener('pointerout',leave);document.removeEventListener('visibilitychange',clear);window.removeEventListener('blur',clear);preferences.forEach(q=>q.removeEventListener('change',clear));};
  },[]);
  return <svg className="glass-filter" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <filter id="liquid-glass-distortion" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="16" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs></svg>;
}
