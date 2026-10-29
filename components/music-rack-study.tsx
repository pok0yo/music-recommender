'use client';

import {useRef,useState} from 'react';
import {OrbitalHero} from './orbital-hero';
import {LiquidMetalButton} from './ui/liquid-metal-button';
import {Problem} from './discovery';
import {useDiscovery} from '../lib/use-discovery';
import {artists,type Meta,type Track} from '../lib/contracts';
import type {Scenario} from '../lib/fixtures';
import type {RackInteraction} from './music-rack-scene';
import approvedStarters from '../lib/approved-starters.json';
import {environmentControls,defaultEnvironment} from '../lib/environment-controls';
import {ListenControl} from './listen-control';
import {useFeedback} from '../lib/use-feedback';

export function MusicRackStudy({mode,fixture,developerControls=false}:{mode:Meta['data_mode'];fixture:Scenario;developerControls?:boolean}) {
  const d=useDiscovery(mode,fixture,approvedStarters.tracks);
  const [environment,setEnvironment]=useState(defaultEnvironment);
  const feedback=useFeedback(mode);
  const [submitted,setSubmitted]=useState<Track[]>([]);
  const rawTracks=d.matches?.results??d.recommendations?.results??((d.pending||d.recommendError)&&submitted.length?submitted:d.starters?.results)??[];
  const showingRecommendations=!!d.recommendations&&!d.matches&&!d.pending&&!d.searchBusy;
  const tracks=showingRecommendations?rawTracks.filter(track=>!feedback.ids.includes(track.recording_id)):rawTracks;
  const feedbackHidden=showingRecommendations?rawTracks.length-tracks.length:0;
  const [candidate,setCandidate]=useState(''),[operation,setOperation]=useState(0),[paused,setPaused]=useState(false);
  const [details,setDetails]=useState(false),[inspectSeed,setInspectSeed]=useState(false),[viewRevision,setViewRevision]=useState(0);
  const heading=useRef<HTMLHeadingElement>(null);
  const index=Math.max(0,tracks.findIndex(track=>track.recording_id===candidate));
  const active=inspectSeed&&d.selection?d.selection:tracks[index];
  const related=!d.matches?d.recommendations?.results.find(track=>track.recording_id===active?.recording_id):undefined;
  const error=d.searchError??d.recommendError??d.starterError;
  const sameSeed=!!active&&active.recording_id===d.selection?.recording_id;
  const preview=(next:number)=>{if(!tracks.length)return;setCandidate(tracks[(next+tracks.length)%tracks.length].recording_id);setInspectSeed(false);setDetails(false);};
  const discover=()=>{if(!active||(d.pending&&sameSeed))return;setSubmitted(tracks);setOperation(value=>value+1);setInspectSeed(false);setDetails(false);void d.choose(active,true,false);};
  const showSeed=()=>{if(d.selection){setInspectSeed(true);heading.current?.focus({preventScroll:true});}else d.searchInput.current?.focus();};
  const reset=()=>{d.clear();d.setQuery('');setCandidate('');setInspectSeed(false);setDetails(false);};
  const rack:RackInteraction={tracks,index,browsing:!d.selection,operation,busy:false,isolated:true,functional:true,seed:d.selection,viewRevision,environment,onSelect:preview,
    onAction:action=>{if(action.startsWith('preview:')){const next=tracks.findIndex(track=>track.recording_id===action.slice(8));if(next>=0)preview(next);}
      else if(action==='seed')showSeed();else if(action==='eject')reset();else if(action==='confirm')discover();else preview(action==='next'?index+1:index-1);}};
  const collection=d.searchBusy?'Searching the catalog':d.matches?'Search matches':d.pending?'Finding connections':d.recommendError?'Connections unavailable':d.recommendations?'Recommendations':'Starting songs';
  const retry=()=>{if(d.searchError)void d.search(d.query);else if(d.recommendError)void d.retry();else void d.loadStarters();};
  return <main className="rack-study is-functional" aria-label="Orbital music discovery">
    <h1 className="sr-only">Discover music through shared listening</h1>
    {developerControls&&<details className="rack-dev-bar"><summary>Environment controls</summary><div className="rack-dev-controls">
      {Object.entries(environmentControls).map(([name,control])=>{const key=name as keyof typeof environment;return <label key={key}>{control.label}<output>{environment[key].toFixed(2)}</output><input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={environment[key]} onChange={event=>setEnvironment(value=>({...value,[key]:Number(event.target.value)}))}/></label>;})}
      <button type="button" onClick={()=>setEnvironment(defaultEnvironment)}>Reset environment</button>
    </div></details>}
    <p id="rack-study-help" className="sr-only">Drag empty space to rotate. Scroll or pinch to zoom. Select a sleeve to preview a song, then choose Discover to find recommendations. Arrow keys rotate the focused scene, Enter confirms, and Space pauses motion. All song actions are available in the player display.</p>
    <OrbitalHero open={false} docked consoleMode rack={rack} selection={d.selection??undefined} tracks={tracks} busy={false} error={!!error} searching={d.searchBusy}
      motionPaused={paused} onOpen={showSeed} onClose={reset} onChoose={discover} onToggleMotion={()=>setPaused(value=>!value)} />
    <section className="rack-display" aria-label="Player display">
      <header className="rack-display-header"><span className="rack-wordmark">m/r</span>{mode==='demo'?<a className="rack-data-label" href="?mode=real" aria-label="Use trained recommendations">Demo · use trained model ↗</a>:<span className="rack-data-label">Trained recommendations</span>}</header>
      <form className="rack-search" role="search" onSubmit={event=>{event.preventDefault();setCandidate('');setInspectSeed(false);setDetails(false);void d.search(d.query);}}>
        <label className="sr-only" htmlFor="rack-search">Find a song or artist</label>
        <input id="rack-search" ref={d.searchInput} type="search" value={d.query} placeholder="Find a song or artist" maxLength={200} onChange={event=>d.setQuery(event.target.value)} aria-describedby="rack-catalog-note" />
        <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button>
      </form>
      <div className="rack-readout"><p className="rack-eyebrow" role="status">{inspectSeed?'Current starting song':collection}{!inspectSeed&&!d.searchBusy&&!d.pending&&tracks.length?` / ${String(index+1).padStart(2,'0')} of ${tracks.length}${related&&related.rank!==index+1?` · rank ${related.rank}`:''}`:''}<span className="sr-only">{active?`: ${active.title} by ${artists(active)}`:''}</span></p>
        <h2 ref={heading} tabIndex={-1} dir="auto">{active?.title??(d.searchBusy?'Searching…':d.matches?'No matching songs':d.recommendations?'No connections yet':'Choose your first song')}</h2>
        {active&&<p className="rack-artist" dir="auto">{artists(active)}</p>}
        {!active&&<p>{feedbackHidden?'All recommendations are hidden by your feedback. Undo or reset feedback to see them again.':d.matches?'Try another song or artist.':d.recommendations?'No supported connections. Search for another starting point.':'Search the supported catalog or choose a sleeve.'}</p>}
      </div>
      <div className="rack-transport"><button type="button" className="rack-step" aria-label="Previous song" disabled={tracks.length<2} onClick={()=>preview(index-1)}>‹</button>
        <LiquidMetalButton className="primary rack-discover" disabled={!active||(d.pending&&sameSeed)} onClick={discover}>{d.pending&&sameSeed?'Finding…':sameSeed?'Discover again':'Discover'}</LiquidMetalButton>
        <button type="button" className="rack-step" aria-label="Next song" disabled={tracks.length<2} onClick={()=>preview(index+1)}>›</button></div>
      <div className="rack-display-actions"><button type="button" aria-expanded={details} aria-controls="rack-details" onClick={()=>setDetails(value=>!value)}>Details {details?'−':'+'}</button>
        {active&&<ListenControl key={active.recording_id} track={active} mode={mode}/>}
        {d.selection&&<button type="button" onClick={reset}>Change starting song</button>}
        {d.matches&&<button type="button" onClick={()=>{d.clear();setCandidate('');setInspectSeed(false);}}>Starting songs</button>}</div>
      {related&&!inspectSeed&&showingRecommendations&&<div className="rack-feedback" aria-label="Recommendation feedback"><button type="button" onClick={discover}>More like this</button><button type="button" disabled={!feedback.ready} onClick={()=>{feedback.dismiss(active!.recording_id);setCandidate('');setInspectSeed(false);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}}>Not for me</button></div>}
      <div className="rack-feedback-status" role="status">{feedback.undoId&&<span>Song hidden on this device. <button type="button" onClick={()=>{const id=feedback.undo();if(id)setCandidate(id);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}}>Undo</button></span>}
        {feedbackHidden>0&&<span>{feedbackHidden} hidden by feedback. Original model ranks are preserved.</span>}
        {!feedback.persistent&&<span>Browser storage is unavailable. Feedback works for this visit.</span>}
        {feedback.ids.length>0&&<button type="button" onClick={feedback.reset}>Reset feedback</button>}</div>
      <div id="rack-details" className="rack-details" hidden={!details}><h3>{related?'Why this song?':'How discovery works'}</h3>
        <p>{related?.explanation??'Choose one recording to explore connections through shared listening. Discover uses the selected song as your starting point.'}</p>
        {related&&<dl><div><dt>Shared training listeners</dt><dd>{related.shared_training_listeners}</dd></div><div><dt>Starting-song listeners</dt><dd>{related.seed_training_listeners}</dd></div><div><dt>This song’s listeners</dt><dd>{related.candidate_training_listeners}</dd></div></dl>}
        {active?.disambiguation&&<p dir="auto">{active.disambiguation}</p>}
        <p>{mode==='demo'?'Tracks, ordering and counts are illustrative, not model results.':'Connections come from training data through August 1, 2026. Similarity is not a prediction of enjoyment.'}</p>
        <p>Search covers a limited, verified catalog. Some songs and versions are unavailable. Discover finds connections; Listen opens a music service.</p>
        <p>No account or personal listening history required. Listening destinations open another service; searches do not verify a recording match. Feedback stays on this device and does not retrain the model.</p>
        <div className="rack-options"><button type="button" onClick={()=>setPaused(value=>!value)}>{paused?'Resume motion':'Pause motion'}</button><button type="button" onClick={()=>setViewRevision(value=>value+1)}>Reset view</button></div></div>
      {d.selection&&<button type="button" className="rack-current" onClick={showSeed}><span>Starting song</span><strong dir="auto">{d.selection.title}</strong><small dir="auto">{artists(d.selection)}</small></button>}
      {error&&<Problem error={error} retry={retry}/>}
      {!d.matches&&d.recommendations?.status==='limited'&&<p className="rack-message">{d.recommendations.omitted_metadata_count?`${d.recommendations.omitted_metadata_count} model results have no verified display metadata. Original ranks are preserved.`:'Fewer than ten supported connections are available.'}</p>}
      <details className="rack-song-list"><summary>Browse {tracks.length} songs</summary><nav aria-label="Song sleeves">{tracks.map((track,i)=><button type="button" key={track.recording_id} aria-pressed={!inspectSeed&&i===index} onClick={()=>preview(i)}><span dir="auto">{track.title}</span><small dir="auto">{artists(track)}</small></button>)}</nav></details>
      <p id="rack-catalog-note" className="rack-catalog-note">{mode==='demo'?'Demonstration only · rankings and counts are illustrative':'Real model · shared listening · limited verified catalog'}</p>
    </section>
    <p className="rack-scene-hint" aria-hidden="true">Drag to explore · select a sleeve</p>
  </main>;
}
