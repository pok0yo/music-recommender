'use client';

import { useEffect, useRef, useState } from 'react';
import { APIError } from '../lib/api';
import { artists, type Meta, type Track, type RelatedTrack } from '../lib/contracts';
import { type Scenario } from '../lib/fixtures';
import { useDiscovery } from '../lib/use-discovery';
import BlueHorizon from '../v1';
import DiscStudy from '../v2';
import PearlOrbit from '../v3';
import CapsuleCurrent from '../v4';
import CobaltSignal from '../v5';

export const variantNames = ['Blue Horizon', 'Disc Study', 'Pearl Orbit', 'Capsule Current', 'Cobalt Signal'];
export const variantStructures = ['Split console', 'Guided sequence', 'Catalog workbench', 'Track ledger', 'List + inspector'];
const presentations = [BlueHorizon, DiscStudy, PearlOrbit, CapsuleCurrent, CobaltSignal];

function Problem({ error, retry }: { error: APIError; retry: () => void }) {
  const [waiting, setWaiting] = useState(error.retryAfter || 0);
  useEffect(() => {
    setWaiting(error.retryAfter || 0);
    if (!error.retryAfter) return;
    const deadline = Date.now() + error.retryAfter * 1000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setWaiting(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [error]);
  return <div className="problem"><p role="alert">{error.message}</p>
    {error.code !== 'input' && <button type="button" className="text-button" onClick={retry} disabled={waiting > 0}>
      {waiting ? `Try again in ${waiting}s` : 'Try again'}</button>}</div>;
}
function TrackName({ track }: { track: Track }) {
  return <><span className="track-title" dir="auto">{track.title}</span><span className="track-artist" dir="auto">{artists(track)}</span>
    {track.disambiguation && <span className="track-version">{track.disambiguation}</span>}</>;
}
function EvidenceDetails({ track }: { track: RelatedTrack }) {
  return <div className="track-details"><p>{track.explanation}</p>
    <dl><div><dt>Shared training listeners</dt><dd>{track.shared_training_listeners.toLocaleString()}</dd></div>
      <div><dt>Starting-song listeners</dt><dd>{track.seed_training_listeners.toLocaleString()}</dd></div>
      <div><dt>This song’s listeners</dt><dd>{track.candidate_training_listeners.toLocaleString()}</dd></div></dl>
    <p>Aggregate evidence from the training period ending August 1, 2026. These counts do not predict enjoyment.</p>
    <p className="unavailable-link">Listening link unavailable.</p>
    {track.canonical_recording_id !== track.recording_id && <p>MusicBrainz identifies a newer canonical recording ID. The model’s original ID is retained for these connections.</p>}
  </div>;
}

export function Discovery({ variant, mode, fixture }: { variant: number; mode: Meta['data_mode']; fixture: Scenario }) {
  const d = useDiscovery(mode, fixture);
  const [inspectedID, setInspectedID] = useState<string | null>(null);
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const inspected = d.recommendations?.results.find(track => track.recording_id === inspectedID) || d.recommendations?.results[0];
  const Presentation = presentations[variant - 1];
  const resultCount = d.recommendations?.results.length ?? 0;
  const meta = d.recommendations?.meta || d.starters?.meta;
  const heading = <div className="task-heading"><h1>{d.opening ? <>Start with<br className="opening-break" /> one song.</> : 'Find your next connection.'}</h1>
    <p>{d.opening ? 'Choose a track. Explore connections in listening data.' : 'Search again, or follow a track somewhere new.'}</p></div>;
  const search = <section className="search-area" aria-label="Find a song"><form noValidate onSubmit={event => { event.preventDefault(); void d.search(d.query); }}>
    <label htmlFor="music-search">Song or artist</label><div className="search-controls"><input id="music-search" ref={d.searchInput}
      value={d.query} onChange={event => d.setQuery(event.target.value)} type="search" enterKeyHint="search"
      maxLength={200} autoComplete="off" placeholder="For example, Daniel Caesar" aria-describedby="search-help" />
      <button className="primary-button" type="submit" aria-busy={d.searchBusy}>{d.searchBusy ? 'Searching…' : 'Search'}</button></div>
    <p id="search-help" className="field-help">Search the supported catalog. Some songs may be unavailable.</p></form>
    {d.searchBusy && <p role="status" className="search-status">Finding matching tracks…</p>}
    {d.searchError && <Problem error={d.searchError} retry={() => void d.search(d.query)} />}
    {d.matches && <div className="search-matches"><h2 className="small-heading">{d.matches.results.length ? 'Choose your starting song' : 'No matching tracks'}</h2>
      <p className="sr-only" role="status">{d.matches.results.length} matching {d.matches.results.length === 1 ? 'song' : 'songs'} found.</p>
      {!d.matches.results.length && <p>Try another title or artist, or choose a starting point below.</p>}
      <ul>{d.matches.results.map(track => <li key={track.recording_id}><button type="button" className="match-button" onClick={() => void d.choose(track)}><TrackName track={track} />
        <span className="match-action">Use this song</span></button></li>)}</ul>
      {!d.matches.results.length && <button type="button" className="text-button" onClick={() => d.clear()}>Show starting points</button>}
    </div>}
  </section>;
  const starters = <section className="starting-points" aria-labelledby="starting-heading"><div className="section-line"><h2 id="starting-heading">Starting points</h2><span>Choose one to explore</span></div>
    {d.starterError ? <Problem error={d.starterError} retry={() => void d.loadStarters()} /> : !d.starters ? <p role="status">Loading starting points…</p>
      : !d.starters.results.length ? <p>No starting points are available right now. Try a search.</p>
        : <ul>{d.starters.results.slice(0, 4).map(track => <li key={track.recording_id}><button className="starter-button" type="button" onClick={() => void d.choose(track)}>
          <TrackName track={track} /><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </button></li>)}</ul>}
  </section>;
  const seed = d.attempted ? <section className="seed-summary" aria-labelledby="seed-heading"><p id="seed-heading" className="context-label">Your starting song</p>
    {d.selection ? <div className="selected-track"><TrackName track={d.selection} /></div> : <p>{d.pending ? 'Finding this song…' : 'Song unavailable'}</p>}
    <button type="button" className="text-button" onClick={() => d.clear()}>Change song</button>
    <p className="seed-caption">Connections reflect shared listening, not audio analysis or a personal profile.</p></section> : null;
  const results = d.attempted ? <section className="recommendations" aria-labelledby="results-heading" aria-busy={d.pending}>
    <div className="section-line"><h2 id="results-heading" tabIndex={-1} ref={d.resultHeading}>
      {d.pending ? 'Finding connections' : d.recommendError ? 'Connections unavailable' : `${resultCount} ${resultCount === 1 ? 'connection' : 'connections'} to explore`}</h2>
      {d.recommendations && <span>Related through listening</span>}</div>
    <p className="sr-only" role="status">{d.pending ? 'Loading recommendations.' : d.recommendations ? `${resultCount} recommendations loaded.` : ''}</p>
    {d.pending && <div className="loading-list"><p>Looking for supported connections in the catalog…</p>{[0, 1, 2].map(n => <div key={n} className="loading-row" aria-hidden="true"><span /><span /></div>)}</div>}
    {d.recommendError && <Problem error={d.recommendError} retry={() => void d.retry()} />}
    {d.recommendations?.status === 'limited' && <p className="notice">{d.recommendations.omitted_metadata_count ? `${d.recommendations.omitted_metadata_count} model ${d.recommendations.omitted_metadata_count === 1 ? 'result has' : 'results have'} no verified display metadata in this small catalog. Original rank positions are preserved.` : 'This song has fewer than ten supported connections. This is the complete available list.'}</p>}
    {d.recommendations?.status === 'no_connections' && <div className="empty-connections"><p>No supported connections for this song yet.</p><p>Try a different starting point. We won’t fill the list with unrelated tracks.</p><button className="secondary-button" type="button" onClick={() => d.clear()}>Choose another song</button></div>}
    {!!resultCount && <><p className="result-explanation">Connected through shared listening in this dataset.</p><ol className="track-list" role="list">
      {d.recommendations!.results.map(track => <li value={track.rank} key={track.recording_id} className="track-row">
        <span className="track-rank" aria-hidden="true">{String(track.rank).padStart(2, '0')}</span>
        <span className="sr-only">Rank {track.rank}.</span>
        <div className="track-content"><div className="track-identity"><TrackName track={track} /></div>
          <div className="track-actions">{variant === 5 ? <button type="button" className="text-button inspect-button" aria-controls="track-inspector" aria-pressed={inspected?.recording_id === track.recording_id}
            onClick={event => { detailTrigger.current = event.currentTarget; setInspectedID(track.recording_id); requestAnimationFrame(() => inspectorHeading.current?.focus()); }}>Details<span className="sr-only"> for {track.title}</span></button>
            : <details><summary>Details<span className="sr-only"> for {track.title}</span></summary><EvidenceDetails track={track} /></details>}
            <button type="button" className="reseed-button" onClick={() => void d.choose(track)}>Use as seed<span className="sr-only">: {track.title}</span></button></div>
        </div></li>)}
    </ol></>}
    {d.recommendations && <p className="model-note">{mode === 'demo' ? 'Demonstration ordering and counts — not measured recommendations.' : 'Training cutoff: August 1, 2026. A limited catalog; no personal listening history required.'}</p>}
  </section> : null;

  const inspector = variant === 5 && inspected ? <aside id="track-inspector" className="glass-shell track-inspector" aria-labelledby="inspector-heading"><div className="shell-body">
    <h3 id="inspector-heading" ref={inspectorHeading} tabIndex={-1}>Connection details</h3><TrackName track={inspected} /><EvidenceDetails track={inspected} />
    <button type="button" className="text-button" onClick={() => {
      const trigger = detailTrigger.current?.isConnected ? detailTrigger.current : document.querySelector<HTMLButtonElement>('.inspect-button');
      trigger?.focus();
    }}>Back to track list</button>
  </div></aside> : null;
  return <><Presentation opening={d.opening} heading={heading} search={search} starters={starters}
    hero={<div className="hero-slot" aria-hidden="true"><div className="hero-fill" /></div>} seed={seed} results={results} inspector={inspector} />
    {meta && <div className="release-context"><span>{mode === 'demo' ? 'Demonstration data' : 'Real catalog'}</span><span>{mode === 'demo' ? 'Shared comparison fixtures' : '215 recordings · MusicBrainz + ListenBrainz'}</span></div>}</>;
}
