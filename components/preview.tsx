'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Discovery, variantNames, variantStructures } from './discovery';
import { scenarios, type Scenario } from '../lib/fixtures';
import type { Meta } from '../lib/contracts';
import { About } from './about';

export function Preview({ initialVariant, initialMode, initialFixture, about = false }: {
  initialVariant: number; initialMode: Meta['data_mode']; initialFixture: Scenario; about?: boolean;
}) {
  const [variant, setVariant] = useState(initialVariant);
  const [mode, setMode] = useState(initialMode);
  const [fixture, setFixture] = useState(initialFixture);
  const picker = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const switchVariant = (next: number) => {
    setVariant(next);
    const url = new URL(window.location.href);
    url.pathname = `/variants/v${next}${about ? '/about' : ''}`;
    url.searchParams.set('v', String(next));
    window.history.replaceState(null, '', url);
  };
  useLayoutEffect(() => {
    const move = () => {
      const button = picker.current?.querySelector<HTMLElement>('[data-active]');
      if (button && highlight.current) { highlight.current.style.width = button.offsetWidth + 'px'; highlight.current.style.transform = `translateX(${button.offsetLeft}px)`; }
    };
    move(); window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [variant]);
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,button,summary,a,[contenteditable=true]') || event.ctrlKey || event.metaKey || event.altKey) return;
      let next: number | undefined;
      if (/^[1-5]$/.test(event.key)) next = Number(event.key);
      if (event.key === 'ArrowRight') next = variant % 5 + 1;
      if (event.key === 'ArrowLeft') next = (variant + 3) % 5 + 1;
      if (next) { event.preventDefault(); switchVariant(next); }
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  });
  const changeData = (nextMode: Meta['data_mode'], nextFixture: Scenario) => {
    setMode(nextMode); setFixture(nextFixture);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', nextMode); url.searchParams.set('fixture', nextFixture);
    url.searchParams.delete('seed'); url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  };
  const context = new URLSearchParams({ mode, ...(mode === 'demo' ? { fixture } : {}) });
  return <div className={`app-surface variant-${variant}`} data-variant={`v${variant}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="preview-bar" aria-label="Prototype controls"><div className="preview-bar-inner"><p><strong>Prototype preview</strong><span>{variantNames[variant - 1]} · {variantStructures[variant - 1]}</span></p>
      <div className="preview-settings"><label>Data<select aria-label="Data source" value={mode} onChange={event => changeData(event.target.value as Meta['data_mode'], 'entry')}>
        <option value="real">Real catalog</option><option value="demo">Demonstration data</option></select></label>
        {mode === 'demo' && <label>Scenario<select aria-label="Demonstration scenario" value={fixture} onChange={event => changeData('demo', event.target.value as Scenario)}>
          {Object.entries(scenarios).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}</div></div>
      <nav className="proto-picker" aria-label="Prototype variants" data-ready={ready ? '' : undefined} ref={picker}>
        <span className="proto-picker-highlight" aria-hidden="true" ref={highlight} />
        {variantNames.map((name, index) => <button key={name} type="button" className="proto-picker-item" aria-label={`Preview ${name}`} data-active={variant === index + 1 ? '' : undefined}
          aria-current={variant === index + 1 ? 'true' : undefined} onClick={() => switchVariant(index + 1)}><span className="picker-full-name">{name}</span><span className="picker-short-name" aria-hidden="true">{index + 1}</span></button>)}
      </nav>
    </aside>
    <div className="page-frame"><header className="app-header"><Link className="brand" href={`/variants/v${variant}?${context}`}>Music Recommender<span className="brand-mark" aria-hidden="true">m/r</span></Link>
      <nav aria-label="Main navigation"><Link aria-current={!about ? 'page' : undefined} href={`/variants/v${variant}?${context}`}>Discover</Link>
        <Link aria-current={about ? 'page' : undefined} aria-label="About the recommendations" href={`/variants/v${variant}/about?${context}`}>About</Link></nav></header>
      {mode === 'demo' && <p className="demo-notice" role="note"><strong>Demonstration data.</strong> Track relationships and counts are illustrative, not model results.</p>}
      <main id="main-content" tabIndex={-1} key={mode + fixture + String(about)}>{about ? <About variant={variant} /> : <Discovery mode={mode} fixture={fixture} variant={variant} />}</main>
      <footer className="app-footer"><span>Music, through a different connection.</span><Link href={`/variants/v${variant}/about?${context}`}>How these recommendations work</Link></footer>
    </div>
  </div>;
}

