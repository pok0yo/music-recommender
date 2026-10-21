export type Track = {
  recording_id: string;
  canonical_recording_id: string;
  title: string;
  artist_credits: { name: string; artist_id: string; joinphrase: string }[];
  disambiguation: string | null;
  external_link: null;
};
export type Meta = {
  model_version: string; catalog_version: string; artifact_schema_version: number;
  training_cutoff: '2026-08-01T00:00:00Z';
  method: 'item_cosine_shared_listener_shrinkage'; data_mode: 'real' | 'demo';
};
export type RelatedTrack = Track & {
  rank: number; reason_code: 'shared_listeners'; explanation: string;
  shared_training_listeners: number; seed_training_listeners: number; candidate_training_listeners: number;
};
export type CatalogResponse = { results: Track[]; meta: Meta };
export type RecommendationResponse = {
  seed: Track; results: RelatedTrack[]; alternatives: Track[];
  status: 'ok' | 'limited' | 'no_connections'; omitted_metadata_count: number;
  model_result_count: number; requested_limit: number; meta: Meta;
};
export type MusicAPI = {
  starters(signal: AbortSignal): Promise<CatalogResponse>;
  search(query: string, signal: AbortSignal): Promise<CatalogResponse>;
  recommend(id: string, signal: AbortSignal): Promise<RecommendationResponse>;
};
export const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const artists = (track: Track) => track.artist_credits.map(c => c.name + c.joinphrase).join('');
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const integer = (v: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): v is number =>
  Number.isSafeInteger(v) && Number(v) >= minimum && Number(v) <= maximum;
export function validTrack(v: unknown): v is Track {
  return object(v) && typeof v.recording_id === 'string' && uuid(v.recording_id)
    && typeof v.canonical_recording_id === 'string' && uuid(v.canonical_recording_id)
    && typeof v.title === 'string' && !!v.title.trim() && Array.isArray(v.artist_credits)
    && v.artist_credits.length > 0 && v.artist_credits.every(c => object(c) && typeof c.name === 'string'
      && !!c.name.trim() && typeof c.artist_id === 'string' && uuid(c.artist_id) && typeof c.joinphrase === 'string')
    && (v.disambiguation === null || typeof v.disambiguation === 'string') && v.external_link === null;
}
function validMeta(v: unknown, mode: Meta['data_mode']): v is Meta {
  return object(v) && v.data_mode === mode && typeof v.model_version === 'string' && !!v.model_version.trim()
    && typeof v.catalog_version === 'string' && !!v.catalog_version.trim() && v.artifact_schema_version === 1
    && v.training_cutoff === '2026-08-01T00:00:00Z' && v.method === 'item_cosine_shared_listener_shrinkage';
}
export function validCatalog(v: unknown, mode: Meta['data_mode']): v is CatalogResponse {
  return object(v) && validMeta(v.meta, mode) && Array.isArray(v.results)
    && v.results.length <= 32 && v.results.every(validTrack)
    && new Set(v.results.map(t => t.recording_id)).size === v.results.length;
}
export function validRecommendations(v: unknown, mode: Meta['data_mode']): v is RecommendationResponse {
  if (!object(v) || !validMeta(v.meta, mode) || !validTrack(v.seed) || !Array.isArray(v.results)
      || !Array.isArray(v.alternatives) || !v.alternatives.every(validTrack)
      || !integer(v.requested_limit, 1, 10) || !integer(v.model_result_count, 0, v.requested_limit)
      || !integer(v.omitted_metadata_count, 0, 10) || v.results.length + v.omitted_metadata_count !== v.model_result_count
      || !['ok', 'limited', 'no_connections'].includes(String(v.status))) return false;
  const seed = v.seed;
  const results = v.results;
  if (!results.every(object) || new Set(results.map(r => r.recording_id)).size !== results.length) return false;
  if (v.status === 'ok' && (results.length !== v.requested_limit || v.omitted_metadata_count !== 0)) return false;
  if (v.status === 'no_connections' && v.model_result_count !== 0) return false;
  return results.every((r, i) => object(r) && integer(r.rank, 1, Number(v.requested_limit)) && (!i || r.rank > (results[i - 1].rank as number))
    && r.reason_code === 'shared_listeners' && typeof r.explanation === 'string'
    && integer(r.seed_training_listeners, 5) && integer(r.candidate_training_listeners, 5)
    && integer(r.shared_training_listeners, 3, Math.min(r.seed_training_listeners, r.candidate_training_listeners))
    && validTrack(r) && r.recording_id !== seed.recording_id);
}
