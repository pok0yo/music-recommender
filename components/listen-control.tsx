'use client';

import type {Meta,Track} from '../lib/contracts';
import {listeningDestinations} from '../lib/listening';

export function ListenControl({track,mode}:{track:Track;mode:Meta['data_mode']}){
  if(mode==='demo')return <span className="rack-listen-demo">Listening destinations are available in real mode.</span>;
  return <details className="rack-listen" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
    <summary>Listen<span className="sr-only"> to {track.title}</span></summary>
    <nav aria-label="Listening destinations">{listeningDestinations(track).map(link=><a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${link.label} (opens a new tab)`}>{link.label}<small>{link.verified?'Recording link · opens a new tab':'Search results · choose the matching version'}</small></a>)}</nav>
  </details>;
}
