import { APIError } from './api';
import { type Meta, type MusicAPI, type Track, type RecommendationResponse, artists } from './contracts';

export const scenarios = {
  entry: 'Starting point', search: 'Search matches', 'no-match': 'No search match', loading: 'Recommendations loading',
  zero: 'No connections', one: 'One recommendation', ten: 'Ten recommendations', long: 'Long and Unicode text',
  missing: 'Missing metadata and links', error: 'Request error', timeout: 'Timeout', outage: 'Catalog outage',
  'rate-limit': 'Rate limited', unknown: 'Unknown song', invalid: 'Invalid song link',
} as const;
export type Scenario = keyof typeof scenarios;
export const scenarioName = (value: string): Scenario => Object.hasOwn(scenarios, value) ? value as Scenario : 'entry';
export const demoID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const names = [
  ['typical', 'nate sib'], ['CLOUDS', 'Tiffany Day'], ['Always', 'Daniel Caesar'],
  ['Glue Song', 'beabadoobee'], ['Dark Red', 'Steve Lacy'], ['Heartbreak Anniversary', 'GIVĒON'],
  ['Leave the Door Open', 'Silk Sonic'], ['Miley Cyrus', 'che'], ['jeans', '2hollis'],
  ['go', 'nate sib'], ['SAN FRANCISCO SIDEWALK', 'Tiffany Day'], ['only1', 'nate sib'],
];
export const demoTracks: Track[] = names.map(([title, artist], i) => ({
  recording_id: demoID(i + 1), canonical_recording_id: demoID(i + 1), title,
  artist_credits: [{ name: artist, artist_id: demoID(i + 100), joinphrase: '' }],
  disambiguation: null, external_link: null,
}));
export const demoMeta: Meta = {
  model_version: 'demonstration-only', catalog_version: 'shared-fixtures-v1', artifact_schema_version: 1,
  training_cutoff: '2026-08-01T00:00:00Z', method: 'item_cosine_shared_listener_shrinkage', data_mode: 'demo',
};
function delay(signal: AbortSignal, milliseconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => { window.clearTimeout(timer); reject(new DOMException('Request cancelled', 'AbortError')); };
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, milliseconds);
    if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true });
  });
}
export function demonstrationAPI(scenario: Scenario, starterCatalog?: Track[]): MusicAPI {
  const catalog=starterCatalog??demoTracks;
  return {
    async starters(signal) { await delay(signal, 100); return { results: starterCatalog??demoTracks.slice(0, 4), meta: demoMeta }; },
    async search(query, signal) {
      await delay(signal, 180);
      return { results: scenario === 'no-match' ? [] : catalog.filter(t => (t.title + artists(t)).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 10), meta: demoMeta };
    },
    async recommend(id, signal) {
      await delay(signal, scenario === 'loading' ? 86_400_000 : 200);
      const failures: Partial<Record<Scenario, [string, string]>> = {
        error: ['500', 'We could not load recommendations. Your starting song is saved; please try again.'],
        timeout: ['timeout', 'The request took too long. Your input is saved; please try again.'],
        outage: ['503', 'The music catalog is temporarily unavailable. Please try again.'],
        'rate-limit': ['429', 'Too many requests. Wait a little, then try again.'],
        unknown: ['404', 'This song is outside the supported catalog. Choose another starting point.'],
      };
      if (failures[scenario]) throw new APIError(...failures[scenario]!, scenario === 'rate-limit' ? 2 : undefined);
      const seed = catalog.find(t => t.recording_id === id);
      if (!seed) throw new APIError('404', 'This song is outside the supported catalog. Choose another starting point.');
      let results = catalog.filter(t => t.recording_id !== id).slice(0, scenario === 'zero' ? 0 : scenario === 'one' ? 1 : 10)
        .map((track, i) => ({ ...track, rank: i + 1, reason_code: 'shared_listeners' as const,
          explanation: 'Connected through shared listening in this dataset.',
          shared_training_listeners: 8, seed_training_listeners: 24, candidate_training_listeners: 18 + i }));
      if (scenario === 'long') results = results.map((track, i) => ({ ...track,
        title: i === 0 ? 'A quiet place between the last train home and the first light of morning (extended live arrangement with strings and piano)' : i === 1 ? '夜明けの海と遠い記憶' : i === 2 ? 'رسالة إلى ضوء الصباح' : track.title,
        artist_credits: i === 0 ? [
          { name: 'Aleksandra Wiśniewska-Kowalczyk', artist_id: demoID(200), joinphrase: ', ' },
          { name: 'Đặng Thị Ngọc Hân', artist_id: demoID(201), joinphrase: ' & ' },
          { name: '王秀英', artist_id: demoID(202), joinphrase: '' },
        ] : track.artist_credits,
      }));
      if (scenario === 'missing') results = results.filter(t => [1, 3, 6].includes(t.rank));
      return { seed, results, alternatives: [], requested_limit: 10,
        model_result_count: scenario === 'missing' ? 10 : results.length,
        omitted_metadata_count: scenario === 'missing' ? 7 : 0,
        status: scenario === 'zero' ? 'no_connections' : results.length === 10 ? 'ok' : 'limited',
        meta: demoMeta } satisfies RecommendationResponse;
    },
  };
}
