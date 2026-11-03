'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { APIError } from '../lib/api';
import { artists, recommendationHint, type Meta, type RelatedTrack } from '../lib/contracts';
import type { useDiscovery } from '../lib/use-discovery';
import { LiquidMetalButton } from './ui/liquid-metal-button';
import type { RackInteraction } from './music-rack-scene';

export function PlayerConsole({ discovery: d, mode, renderProblem, renderDetails, heading: openingHeading, search, starters, pickerOpen, renderHero }: {
  discovery: ReturnType<typeof useDiscovery>; mode: Meta['data_mode'];
  renderProblem: (error: APIError, retry: () => void) => ReactNode;
  renderDetails: (track: RelatedTrack) => ReactNode;
  heading: ReactNode; search: ReactNode; starters: ReactNode; pickerOpen: boolean;
  renderHero: (paused: boolean, rack?: RackInteraction) => ReactNode;
}) {
  const [position, setPosition] = useState(0);
  const [details, setDetails] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [browsing, setBrowsing] = useState(true);
  const [operation, setOperation] = useState(0);
  const focusResult = useRef(false);
  const collection = d.matches?.results ?? (d.attempted ? d.recommendations?.results : d.starters?.results) ?? [];
  const index = Math.min(position, Math.max(0, collection.length - 1));
  const current = collection[index];
  const busy = d.searchBusy || (!d.matches && (d.pending || (!d.attempted && !d.starters && !d.starterError)));
  const error = d.searchError || (!d.matches && (d.attempted ? d.recommendError : d.starterError));
  const heading = d.matches ? (collection.length ? 'Search matches' : 'No matching tracks') : d.attempted
    ? d.pending ? 'Finding connections' : d.recommendError ? 'Connections unavailable' : `${collection.length} connections to explore`
    : 'Choose your starting song';

  useEffect(() => { setPosition(0); setDetails(false); }, [d.matches, d.recommendations, d.attempted]);
  useEffect(() => { if (!d.attempted) { setSearchOpen(false); setPaused(false); setBrowsing(true); } }, [d.attempted]);
  useEffect(() => {
    if (focusResult.current && !d.pending && (d.recommendations || d.recommendError)) {
      d.resultHeading.current?.focus({ preventScroll: true }); focusResult.current = false;
    }
  }, [d.pending, d.recommendations, d.recommendError]);
  useEffect(() => {
    if (!searchOpen) return;
    const frame = requestAnimationFrame(() => d.searchInput.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [searchOpen]);

  const browse = (direction: number) => {
    if (busy || collection.length < 2) return;
    setPosition((index + direction + collection.length) % collection.length); setDetails(false); setBrowsing(true);
  };
  const choose = () => {
    if (!current || busy || current.available_recommendations===0) return;
    focusResult.current = true; setSearchOpen(false); setDetails(false);
    setBrowsing(false); setOperation(value=>value+1);
    void d.choose(current, true, false);
  };
  const eject = () => { focusResult.current = false; setSearchOpen(false); setDetails(false); d.clear(); };
  const select = (next: number) => { if(!busy && next>=0 && next<collection.length){setPosition(next);setDetails(false);setBrowsing(true);} };
  const rack: RackInteraction | undefined=d.attempted?{tracks:collection,index,browsing,operation,busy,
    onSelect:select,onAction:action=>{if(action==='confirm')choose();else if(action==='previous')browse(-1);else if(action==='next')browse(1);else if(action==='eject')setBrowsing(true);}}:undefined;
  const windowStart=Math.floor(index/8)*8;

  return <section className={d.attempted ? 'full-player rack-scene' : `disc-study disc-tray is-opening has-disc-dock${pickerOpen ? ' is-picking' : ''}`} data-layout={d.attempted ? 'player' : 'disc-tray'} aria-label={d.attempted ? 'Orbital music discovery player' : 'Choose a starting song'}>
    <div className={d.attempted ? 'rack-stage-shell' : 'glass-shell'}><div className={d.attempted ? 'rack-stage-body' : 'shell-body tray-upper'}>
      <div className="tray-command" hidden={d.attempted}>{!d.attempted && <>{openingHeading}{search}</>}</div>
      <div className={d.attempted ? 'player-disc-window rack-stage' : 'player-hero-mount'}>
        {d.attempted && <div className="player-window-print" aria-hidden="true"><span>ORBITAL / DISC STUDY</span><span>OPTICAL CONNECTION SYSTEM</span></div>}
        {renderHero(d.attempted && paused,rack)}
        {d.attempted && <div className="player-window-status"><span className="player-led" aria-hidden="true" /><span>{d.selection ? `Starting song · ${d.selection.title}` : 'No song loaded'}</span></div>}
      </div>
    </div>
    {d.attempted && !!collection.length && <nav className="rack-track-strip" aria-label="Song sleeves"><p>Sleeves {windowStart+1}–{Math.min(windowStart+8,collection.length)} of {collection.length} · select to inspect</p>
      <ol start={windowStart+1}>{collection.slice(windowStart,windowStart+8).map((track,i)=><li key={track.recording_id}><LiquidMetalButton type="button" disabled={busy} aria-pressed={index===windowStart+i}
        onFocus={()=>select(windowStart+i)} onClick={()=>select(windowStart+i)}><span className="rack-sleeve-number" aria-hidden="true">{String(windowStart+i+1).padStart(2,'0')}</span><span className="rack-sleeve-label"><strong dir="auto">{track.title}</strong><span dir="auto">{artists(track)}</span></span></LiquidMetalButton></li>)}</ol></nav>}
    </div>
    <div className={d.attempted ? 'player-control-deck rack-console' : 'glass-shell tray-drawer'}>
      {d.attempted ? <>
      <div className="player-screen" aria-busy={busy}>
        <div className="player-screen-top"><span>{d.matches ? 'SEARCH' : d.attempted ? 'CONNECTIONS' : 'STARTING POINTS'}</span>
          <span className="player-counter" aria-label={`${collection.length ? index + 1 : 0} of ${collection.length} songs`}>{String(collection.length ? index + 1 : 0).padStart(2, '0')} / {String(collection.length).padStart(2, '0')}</span></div>
        <h1 ref={d.resultHeading} tabIndex={-1}>{heading}</h1>
        {d.selection && <p className="player-seed">Starting song: <strong dir="auto">{d.selection.title}</strong> · <span dir="auto">{artists(d.selection)}</span></p>}
        <div className="player-search-panel player-expandable" data-open={searchOpen || undefined} inert={!searchOpen} aria-hidden={!searchOpen}>
          <form noValidate onSubmit={event => { event.preventDefault(); focusResult.current = false; void d.search(d.query); }}>
            <label htmlFor="player-search">Song or artist</label><div className="search-controls">
              <input id="player-search" ref={d.searchInput} value={d.query} onChange={event => d.setQuery(event.target.value)} type="search" maxLength={200} autoComplete="off" enterKeyHint="search" placeholder="For example, Daniel Caesar" aria-describedby="player-search-help" />
              <LiquidMetalButton className="primary-button" type="submit" disabled={d.searchBusy}>{d.searchBusy ? 'Searching…' : 'Search'}</LiquidMetalButton></div>
            <p id="player-search-help">Search the supported catalog. Some songs may be unavailable.</p>
          </form>
        </div>
        {busy && <p role="status">{d.searchBusy ? 'Finding matching tracks…' : d.pending ? 'Looking for supported connections…' : 'Loading starting points…'}</p>}
        {error && renderProblem(error, () => { if (d.searchError) void d.search(d.query); else if (d.attempted) void d.retry(); else void d.loadStarters(); })}
        {!busy && current && <div className="player-track-display" key={current.recording_id}>
          <div className="player-track-number" aria-hidden="true">{String('rank' in current ? current.rank : index + 1).padStart(2, '0')}</div>
          <div className="player-track-name"><h2 dir="auto">{current.title}</h2><p dir="auto">{artists(current)}</p>{current.disambiguation && <p dir="auto">{current.disambiguation}</p>}
            {recommendationHint(current)&&<p>{recommendationHint(current)}</p>}
            {'rank' in current && <p className="player-track-reason">Rank {String(current.rank)} · Connected through shared listening</p>}</div>
        </div>}
        {!busy && !error && !collection.length && <p>{d.matches ? 'Try another title or artist, or press Eject / choose song to return to starting points.' : d.attempted ? 'No supported connections for this song yet. Choose another starting song.' : 'No starting points are available. Open search to find a song.'}</p>}
        <section id="player-details" className="player-detail-panel player-expandable" data-open={details || undefined} inert={!details} aria-hidden={!details} aria-label="Song details">
          {current && ('rank' in current ? renderDetails(current as RelatedTrack) : <><p>Choose this song as your starting point to explore connections through shared listening.</p><p>Listening link unavailable.</p></>)}
        </section>
        {d.recommendations?.status === 'limited' && !d.matches && <p className="player-limits">{d.recommendations.omitted_metadata_count ? `${d.recommendations.omitted_metadata_count} model results have no verified display metadata. Original ranks are preserved.` : 'Fewer than ten supported connections. This is the complete available selection.'}</p>}
        <p className="player-screen-note">{mode === 'demo' ? 'Demonstration ordering and counts — not measured recommendations.' : 'Training cutoff: August 1, 2026. No personal listening history required.'}</p>
        <span className="sr-only" role="status">{!busy ? `${heading}. ${current ? `${current.title} by ${artists(current)}. Song ${index + 1} of ${collection.length}.` : ''}` : ''}</span>
      </div>
      <div className="player-hardware" aria-label="Player controls" onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); browse(event.key === 'ArrowLeft' ? -1 : 1); }
      }}>
        <div className="player-transport">
          <LiquidMetalButton className="player-hardware-button" type="button" aria-label="Previous song" disabled={busy || collection.length < 2} onClick={() => browse(-1)}><svg className="player-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h2v14H5zm14 0v14L8 12z" /></svg><span>Previous</span></LiquidMetalButton>
          <LiquidMetalButton className="primary-button player-seed-button" type="button" disabled={!current || busy || current.available_recommendations===0} onClick={choose}><span className="player-symbol" aria-hidden="true">▶</span><span>Use as seed</span></LiquidMetalButton>
          <LiquidMetalButton className="player-hardware-button" type="button" aria-label="Next song" disabled={busy || collection.length < 2} onClick={() => browse(1)}><svg className="player-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5h2v14h-2zM5 5l11 7-11 7z" /></svg><span>Next</span></LiquidMetalButton>
        </div>
        <div className="player-utility">
          <LiquidMetalButton type="button" aria-pressed={browsing} onClick={()=>setBrowsing(true)}>Lift disc / browse</LiquidMetalButton>
          <LiquidMetalButton type="button" aria-controls="player-details" aria-expanded={details} disabled={!current || busy} onClick={() => setDetails(!details)}><span aria-hidden="true">ⓘ</span><span>Details</span></LiquidMetalButton>
          <LiquidMetalButton type="button" aria-expanded={searchOpen} aria-controls="player-search" onClick={() => { focusResult.current = false; setSearchOpen(!searchOpen); }}><span aria-hidden="true">⌕</span><span>Find a song</span></LiquidMetalButton>
          <LiquidMetalButton type="button" onClick={eject}><svg className="player-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 5 8 10H4zm-8 12h16v3H4z" /></svg><span>Eject / choose song</span></LiquidMetalButton>
          <LiquidMetalButton type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}><span aria-hidden="true">Ⅱ</span><span>{paused ? 'Resume disc motion' : 'Pause disc motion'}</span></LiquidMetalButton>
        </div>
      </div>
      </> : <div className="shell-body">{starters}</div>}
    </div>
    {d.attempted && <p className="player-device-caption">MUSIC DISCOVERY SYSTEM <span>Browse → inspect → choose a starting song. Audio playback is unavailable.</span></p>}
  </section>;
}
