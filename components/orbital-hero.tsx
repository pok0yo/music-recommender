'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { createOrbitalScene } from './orbital-scene';
import model from '../docs/art-direction/orbital-disc-model.json';

export function OrbitalHero() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createOrbitalScene> | null>(null);
  const [ready, setReady] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [hovered, setHovered] = useState(false);
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
      try { scene.current = createOrbitalScene(host.current, () => { if (!cancelled) setReady(false); }); setReady(true); }
      catch { setReady(false); }
    }).catch(() => { if (!cancelled) setReady(false); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.setMotion(motionAllowed && hovered && ready); }, [motionAllowed, hovered, ready]);
  return <figure className="hero-slot orbital-hero" data-model-ready={ready || undefined}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
    onPointerMove={event => {
      if (event.pointerType !== 'mouse' || !motionAllowed) return;
      const rect = event.currentTarget.getBoundingClientRect();
      scene.current?.setPointer((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
    }} onPointerLeave={() => setHovered(false)}>
    <div className="orbital-stage" aria-hidden="true">
      <Image className="orbital-fallback" src={model.public_url} alt="" width={2000} height={1600} sizes="(max-width:767px) 100vw, 600px" preload />
      <div ref={host} className="orbital-canvas" />
    </div>
  </figure>;
}
