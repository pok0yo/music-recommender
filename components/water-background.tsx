'use client';

import { useEffect, useRef } from 'react';
import type { createWaterScene } from './water-scene';

export function WaterBackground({ enabled, finish }: { enabled: boolean; finish: 'hazy' | 'crisp' }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current!;
    const preferences = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(forced-colors: active)'].map(query => matchMedia(query));
    let generation = 0, scene: ReturnType<typeof createWaterScene> | undefined;
    const update = () => {
      const current = ++generation;
      scene?.dispose(); scene = undefined;
      element.dataset.waterState = 'still';
      if (!enabled || preferences.some(media => media.matches)) return;
      element.dataset.waterState = 'loading';
      void import('./water-scene').then(({ createWaterScene }) => {
        if (current !== generation) return;
        try { scene = createWaterScene(element, element.parentElement!); }
        catch { element.dataset.waterState = 'fallback'; }
      }).catch(() => { if (current === generation) element.dataset.waterState = 'fallback'; });
    };
    update(); preferences.forEach(media => media.addEventListener('change', update));
    return () => { ++generation; preferences.forEach(media => media.removeEventListener('change', update)); scene?.dispose(); };
  }, [enabled, finish]);
  return <div ref={host} className="water-layer" aria-hidden="true" data-water-state="still" />;
}
