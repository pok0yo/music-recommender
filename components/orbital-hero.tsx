'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import type { createOrbitalScene } from './orbital-scene';
import type { RackInteraction } from './music-rack-scene';
import { artists, type Track } from '../lib/contracts';
import { LiquidMetalButton } from './ui/liquid-metal-button';
import { CDPlayerHousing } from './cd-player';
import model from '../docs/art-direction/orbital-disc-model.json';
import pickerModel from '../docs/art-direction/disc-picker-model.json';

const step = Math.PI / 3;
export function OrbitalHero({ open, docked = false, selection, onOpen, onClose, tracks, busy, error, searching, onChoose, consoleMode = false, motionPaused = false, rack, onToggleMotion }: {
  open: boolean; onOpen: () => void; onClose: () => void; tracks: Track[];
  docked?: boolean; selection?: Track | null; consoleMode?: boolean; motionPaused?: boolean; rack?: RackInteraction;
  busy: boolean; error: boolean; searching: boolean; onChoose: (track: Track) => void;
  onToggleMotion?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const fallback = useRef<HTMLImageElement>(null);
  const scene = useRef<ReturnType<typeof createOrbitalScene> | null>(null);
  const [ready, setReady] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rotation = useRef(0);
  const visualRotation = useRef(0);
  const fallbackFrame = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const stageRect = useRef<DOMRect | null>(null);
  const flight = useRef<Animation | null>(null);
  const wasDocked = useRef(false);
  const [turn, setTurn] = useState(0);
  const [playerPhase, setPlayerPhase] = useState<'opening' | 'inserting' | 'closing' | 'spinning'>('spinning');
  const rackDrag=useRef<{id:number;x:number;y:number;index:number;moved:boolean} | null>(null);

  useLayoutEffect(() => {
    const element = stage.current!;
    const remember = () => { stageRect.current = element.getBoundingClientRect(); };
    const resize = new ResizeObserver(remember);
    resize.observe(element);
    window.addEventListener('scroll', remember, { passive: true });
    return () => { resize.disconnect(); window.removeEventListener('scroll', remember); flight.current?.cancel(); };
  }, []);
  useLayoutEffect(() => {
    const element = stage.current!;
    const before = stageRect.current;
    const entering = docked && !wasDocked.current;
    wasDocked.current = docked;
    flight.current?.cancel();
    const after = element.getBoundingClientRect();
    stageRect.current = after;
    if (!before || !motionAllowed || !entering || rack?.isolated) { setPlayerPhase('spinning'); return; }
    setPlayerPhase('opening');
    const scale = Math.min(before.width, before.height) / Math.min(after.width, after.height);
    const x = before.x + before.width / 2 - after.x - after.width / 2;
    const y = before.y + before.height / 2 - after.y - after.height / 2;
    flight.current = element.animate([
      { transform: `translate(${x}px, ${y}px) scale(${scale})` }, { transform: 'none' },
    ], { delay:220, duration:600, fill:'backwards', easing: 'cubic-bezier(.23,1,.32,1)' });
    const timers = [
      window.setTimeout(() => setPlayerPhase('inserting'), 220),
      window.setTimeout(() => setPlayerPhase('closing'), 820),
      window.setTimeout(() => setPlayerPhase('spinning'), 1180),
    ];
    return () => { timers.forEach(window.clearTimeout); flight.current?.cancel(); };
  }, [docked, motionAllowed]);

  // Use the renderer's actual spring angle, not its destination, for the labels.
  function paintDial(value: number) {
    visualRotation.current = value;
    fallback.current?.style.setProperty('--disc-angle', `${value}rad`);
    figure.current?.style.setProperty('--disc-angle', `${value}rad`);
    figure.current?.querySelectorAll<HTMLElement>('.disc-song').forEach(card => {
      const offset = value / step - Number(card.dataset.slot);
      const theta = -Math.PI / 2 + offset * step;
      card.style.setProperty('--song-x', String(Math.cos(theta)));
      card.style.setProperty('--song-y', String(Math.sin(theta)));
      card.style.setProperty('--song-scale', String(.8 + .2 * Math.max(0, 1 - Math.abs(offset))));
      card.style.opacity = String(Math.max(0, Math.min(1, 2 - Math.abs(offset))));
    });
  }
  useLayoutEffect(() => { paintDial(visualRotation.current); }, [turn, tracks, open, busy, error]);
  useEffect(() => () => cancelAnimationFrame(fallbackFrame.current), []);
  const drag = useRef<{ id: number; last: number; turn: number; base: number } | null>(null);
  const index = tracks.length ? (turn % tracks.length + tracks.length) % tracks.length : 0;
  const active = tracks[index];
  const available = !busy && !error && tracks.length > 0;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionAllowed(!media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void import('./orbital-scene').then(({ createOrbitalScene }) => {
      if (cancelled || !host.current) return;
      try { scene.current = createOrbitalScene(host.current, () => { if (!cancelled) setReady(false); }, paintDial); scene.current.setDial(rotation.current, true); setReady(true); }
      catch { setReady(false); }
    }).catch(() => { if (!cancelled) setReady(false); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => {
    if (ready) cancelAnimationFrame(fallbackFrame.current);
    scene.current?.setMotion(motionAllowed && ready && !motionPaused);
    scene.current?.setPicker(open || docked || consoleMode);
    if (!motionAllowed) { cancelAnimationFrame(fallbackFrame.current); paintDial(rotation.current); }
  }, [motionAllowed, ready, open, docked, consoleMode, motionPaused]);
  useEffect(() => { scene.current?.setLoaded(docked && !!selection && playerPhase === 'spinning'); }, [docked, selection, playerPhase, ready]);
  useEffect(() => {
    scene.current?.setRack(rack?{...rack,revealed:playerPhase==='closing'||playerPhase==='spinning'}:undefined);
  }, [rack,playerPhase,ready]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      figure.current?.scrollIntoView({ block: 'nearest', behavior: motionAllowed ? 'smooth' : 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  useEffect(() => {
    if (docked) return;
    drag.current = null; setDragging(false); rotation.current = 0; setTurn(0);
    cancelAnimationFrame(fallbackFrame.current);
    scene.current?.setDial(0, true);
    paintDial(0);
  }, [tracks]);
  useEffect(() => {
    if (!open) { drag.current = null; setDragging(false); }
  }, [open]);

  function rotate(angle: number, direct = false) {
    rotation.current = angle;
    cancelAnimationFrame(fallbackFrame.current);
    scene.current?.setDial(angle, direct);
    if (ready) { if (direct || !motionAllowed) paintDial(angle); return; }
    if (direct || !motionAllowed) { paintDial(angle); return; }
    const start = visualRotation.current, began = performance.now();
    const animate = (now: number) => {
      const progress = document.hidden ? 1 : Math.min(1, (now - began) / 420);
      paintDial(start + (angle - start) * (1 - (1 - progress) ** 3));
      if (progress < 1) fallbackFrame.current = requestAnimationFrame(animate);
    };
    fallbackFrame.current = requestAnimationFrame(animate);
  }
  function move(direction: number) {
    if (!available || tracks.length < 2) return;
    setTurn(value => value + direction); rotate((turn + direction) * step);
  }
  function angle(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
    return Math.hypot(x, y) < Math.min(rect.width, rect.height) * .12 ? null : Math.atan2(y, x);
  }
  function finish(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null; setDragging(false);
    if (!tracks.length) return;
    const stop = Math.round((current.base + (cancel ? 0 : current.turn)) / step);
    setTurn(stop); rotate(stop * step);
  }
  function close() {
    drag.current = null; setDragging(false); onClose();
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
  }
  function rackHit(event: PointerEvent<HTMLElement>) {
    const rect=host.current!.getBoundingClientRect();return scene.current?.pickRack((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  }
  return <figure ref={figure} className={`hero-slot orbital-hero${open ? ' is-picker' : ''}${docked ? ' is-docked' : ''}${dragging ? ' is-dragging' : ''}${rack?' has-music-rack':''}`}
    tabIndex={rack?.isolated?0:undefined} aria-describedby={rack?.isolated?'rack-study-help':undefined}
    onKeyDown={event=>{if(!rack?.isolated)return;if(event.key.startsWith('Arrow')){event.preventDefault();scene.current?.orbitRack(event.key==='ArrowLeft'?.22:event.key==='ArrowRight'?-.22:0,event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0);}else if(event.key==='Enter'){event.preventDefault();if(rack.functional)rack.onAction('confirm');else rack.onSelect(rack.index);}else if(event.key===' '){event.preventDefault();onToggleMotion?.();}}}
    data-model-ready={ready || undefined} data-motion-paused={motionPaused || undefined} data-player-state={consoleMode && !selection ? 'preview' : docked ? selection ? playerPhase : 'empty' : undefined} aria-label={open ? 'Disc song selector' : docked ? 'Starting-song CD player' : undefined}
    onPointerMove={event => {
      if(rack){
        const drag=rackDrag.current;
        if(drag && drag.id===event.pointerId && (rack.isolated?Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6:Math.abs(event.clientX-drag.x)>Math.max(12,Math.abs(event.clientY-drag.y)*1.3))){
          drag.moved=true;if(!rack.isolated)event.currentTarget.setPointerCapture(event.pointerId);
        }
        const rect=event.currentTarget.getBoundingClientRect();
        if(event.pointerType==='mouse')scene.current?.setPointer((event.clientX-rect.left)/rect.width*2-1,(event.clientY-rect.top)/rect.height*2-1);
        const hit=rackHit(event);scene.current?.hoverRack(hit?.index??-1);
        event.currentTarget.style.cursor=hit?.index!==undefined||hit?.action?'pointer':'grab';return;
      }
      if (event.pointerType !== 'mouse' || !motionAllowed || dragging) return;
      const rect = event.currentTarget.getBoundingClientRect();
      scene.current?.setPointer((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
    }} onPointerLeave={() => { scene.current?.setPointer(0, 0);scene.current?.hoverRack(-1); }}
    onPointerDown={event=>{if(rack && !rack.busy && event.button===0 && !(event.target as HTMLElement).closest('button,input,a'))rackDrag.current={id:event.pointerId,x:event.clientX,y:event.clientY,index:rack.index,moved:false};}}
    onPointerUp={event=>{
      const drag=rackDrag.current;rackDrag.current=null;if(!rack||!drag||drag.id!==event.pointerId)return;
      if(drag.moved && rack.tracks.length){if(rack.isolated)return;const delta=Math.round((drag.x-event.clientX)/75);rack.onSelect((drag.index+delta%rack.tracks.length+rack.tracks.length)%rack.tracks.length);}
      else if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<10){const hit=rackHit(event);if(rack.functional&&hit?.action)rack.onAction(hit.action);else if(hit?.index!==undefined)rack.onSelect(hit.index);else if(hit?.action)rack.onAction(hit.action);}
    }} onPointerCancel={()=>{rackDrag.current=null;}}>
    {!consoleMode && <CDPlayerHousing active={docked} open={docked && (playerPhase === 'opening' || playerPhase === 'inserting')} motion={motionAllowed} />}
    {rack && <><div className="rack-fallback-cabinet" aria-hidden="true"><span /><span /><span /></div><p className="rack-fallback-note">3D unavailable. Song controls remain available.</p></>}
    <div ref={stage} className="orbital-stage" aria-hidden="true">
      <Image ref={fallback} className="orbital-fallback" src={model.public_url} alt=""
        width={2000} height={1600} sizes="(max-width:1023px) 100vw, 900px" preload />
      <Image className="disc-focus-fallback" src={pickerModel.public_url} alt=""
        width={2000} height={1600} sizes="(max-width:1023px) 100vw, 900px" preload />
      <div ref={host} className="orbital-canvas" />
    </div>
    {docked && !consoleMode && <figcaption className="disc-carried-label"><span className="player-status">{!selection ? 'No song loaded' : playerPhase === 'opening' ? 'Opening player' : playerPhase === 'inserting' ? 'Loading disc' : playerPhase === 'closing' ? 'Closing cover' : 'Starting song loaded'}</span>
      {selection && <><strong dir="auto">{selection.title}</strong><span dir="auto">{artists(selection)}</span></>}</figcaption>}
    <button ref={opener} type="button" className="disc-open" onClick={onOpen} aria-expanded={open} inert={open || docked}>
      <span>Browse starting songs<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></span>
    </button>
    <div className="disc-selector" inert={!open} aria-hidden={!open}>
      <div className="disc-picker-toolbar"><h2 ref={heading} tabIndex={-1}>Choose your starting song</h2>
        <LiquidMetalButton type="button" className="text-button" onClick={close}>Close selector</LiquidMetalButton></div>
      <div className="disc-dial" role="slider" tabIndex={available ? 0 : -1} aria-label="Browse songs on the disc"
        aria-valuemin={1} aria-valuemax={Math.max(1, tracks.length)} aria-valuenow={index + 1}
        aria-valuetext={available ? `${active.title} by ${artists(active)}` : 'Songs unavailable'} aria-disabled={!available}
        aria-describedby="disc-instructions"
        onKeyDown={event => {
          if (['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End'].includes(event.key)) {
            event.preventDefault();
            if (event.key === 'Home') move(-index);
            else if (event.key === 'End') move(tracks.length - 1 - index);
            else move(['ArrowRight','ArrowUp'].includes(event.key) ? 1 : -1);
          }
        }}
        onPointerDown={event => {
          if (!available || tracks.length < 2 || event.button !== 0 || drag.current) return;
          const start = angle(event); if (start === null) return;
          event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { id: event.pointerId, last: start, turn: 0, base: visualRotation.current };
          setTurn(Math.round(visualRotation.current / step)); rotate(visualRotation.current, true); setDragging(true);
        }}
        onPointerMove={event => {
          const current = drag.current; if (!current || current.id !== event.pointerId) return;
          const next = angle(event); if (next === null) return;
          current.turn += Math.atan2(Math.sin(next - current.last), Math.cos(next - current.last)); current.last = next;
          setTurn(Math.round((current.base + current.turn) / step)); rotate(current.base + current.turn, true);
        }} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
        onLostPointerCapture={event => finish(event, true)} />
      <div className="disc-song-orbit" aria-hidden="true">
        {available && Array.from({ length: tracks.length > 1 ? 7 : 1 }, (_, i) => {
          const slot = turn + (tracks.length > 1 ? i - 3 : 0);
          const track = tracks[(slot % tracks.length + tracks.length) % tracks.length];
          return <div key={`${tracks[0].recording_id}:${slot}`} className="disc-song" data-slot={slot}>
            <strong dir="auto">{track.title}</strong><span dir="auto">{artists(track)}</span>
          </div>;
        })}
      </div>
      {available ? <div className="disc-choices">
        {tracks.length > 1 && <LiquidMetalButton type="button" className="disc-neighbor disc-previous" onClick={() => move(-1)} aria-label="Previous song">
          <span>Previous</span></LiquidMetalButton>}
        <div className="disc-current" aria-live="polite" aria-atomic="true"><span className="disc-position">{index + 1} / {tracks.length} · {searching ? 'Search matches' : 'Starting points'}</span>
          <div key={active.recording_id} className="disc-current-copy"><h3 dir="auto">{active.title}</h3><p dir="auto">{artists(active)}</p>
            {active.disambiguation && <p className="disc-version" dir="auto">{active.disambiguation}</p>}</div>
          <LiquidMetalButton type="button" className="primary-button" onClick={() => onChoose(active)}>Use this song</LiquidMetalButton>
        </div>
        {tracks.length > 1 && <LiquidMetalButton type="button" className="disc-neighbor disc-next" onClick={() => move(1)} aria-label="Next song">
          <span>Next</span></LiquidMetalButton>}
      </div> : <p className="disc-picker-empty" role="status">{busy ? 'Loading songs…' : error ? 'Songs could not be loaded. Use the search panel to try again.' : 'No matching songs. Try another title or artist.'}</p>}
      <p id="disc-instructions" className="disc-instructions">Turn clockwise for the next song. Or use Previous, Next, and the arrow keys.</p>
    </div>
  </figure>;
}
