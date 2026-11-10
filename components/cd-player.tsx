'use client';

import { useEffect, useRef, useState } from 'react';
import type { createPlayerScene } from './player-scene';

export function CDPlayerHousing({ active, open, motion }: { active: boolean; open: boolean; motion: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createPlayerScene> | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void import('./player-scene').then(({ createPlayerScene }) => {
      if (cancelled || !host.current) return;
      try { scene.current = createPlayerScene(host.current, () => { if (!cancelled) setReady(false); }); setReady(true); }
      catch { setReady(false); }
    }).catch(() => {});
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.setState(active, open, motion); }, [active, open, motion, ready]);
  return <div className="cd-player-housing" data-ready={ready || undefined} data-open={open || undefined} aria-hidden="true">
    <div className="player-well" />
    <div className="player-case-fallback"><span className="player-lid-fallback" /></div>
    <div ref={host} className="player-model" />
  </div>;
}
