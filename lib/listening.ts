import type {Track} from './contracts';

export const serviceNames={spotify:'Spotify',apple_music:'Apple Music',youtube_music:'YouTube Music'} as const;
export type ListeningLink={provider:keyof typeof serviceNames;url:string;verified_at:string;verification:'recording_relationship_and_destination'};

export function validListeningLink(value:unknown):value is ListeningLink {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  if(typeof v.provider!=='string'||!Object.hasOwn(serviceNames,v.provider)||typeof v.url!=='string'||v.url.length>2048||v.url.includes('\\')||typeof v.verified_at!=='string'||!Number.isFinite(Date.parse(v.verified_at))||v.verification!=='recording_relationship_and_destination')return false;
  try {
    const u=new URL(v.url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return false;
    if(v.provider==='spotify')return u.hostname==='open.spotify.com'&&/^\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]{22}$/.test(u.pathname);
    if(v.provider==='apple_music')return u.hostname==='music.apple.com'&&(/^\/[a-z]{2}\/song\/(?:[^/]+\/)?[0-9]+$/.test(u.pathname)||(/^\/[a-z]{2}\/album\/[^/]+\/[0-9]+$/.test(u.pathname)&&u.searchParams.getAll('i').length===1&&/^[0-9]+$/.test(u.searchParams.get('i')??'')));
    return u.hostname==='music.youtube.com'&&u.pathname==='/watch'&&u.searchParams.getAll('v').length===1&&/^[A-Za-z0-9_-]{11}$/.test(u.searchParams.get('v')??'');
  }catch{return false;}
}

export function listeningDestinations(track:Track){
  const query=[track.title,track.artist_credits.map(c=>c.name+c.joinphrase).join(''),track.disambiguation].filter(Boolean).join(' ');
  const searches={spotify:'https://open.spotify.com/search/'+encodeURIComponent(query),apple_music:'https://music.apple.com/us/search?'+new URLSearchParams({term:query}),youtube_music:'https://music.youtube.com/search?'+new URLSearchParams({q:query})};
  return (Object.keys(serviceNames) as (keyof typeof serviceNames)[]).map(provider=>{
    const exact=track.listening_links?.find(link=>validListeningLink(link)&&link.provider===provider);
    return {provider,url:exact?.url??searches[provider],label:exact?`Open ${serviceNames[provider]}`:`Search on ${serviceNames[provider]}`,verified:!!exact};
  });
}
