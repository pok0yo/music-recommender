'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIError, realAPI } from './api';
import { demonstrationAPI, demoTracks, type Scenario } from './fixtures';
import { type CatalogResponse, type Meta, type RecommendationResponse, type Track, uuid } from './contracts';

const safeError = (value: unknown) => value instanceof APIError ? value : new APIError('unavailable', 'The music catalog could not be loaded. Please try again.');
export function useDiscovery(mode: Meta['data_mode'], fixture: Scenario, demoCatalog?: Track[]) {
  const api = useMemo(() => mode === 'demo' ? demonstrationAPI(fixture,demoCatalog) : realAPI(), [mode, fixture,demoCatalog]);
  const [query, setQuery] = useState('');
  const [starters, setStarters] = useState<CatalogResponse | null>(null);
  const [starterError, setStarterError] = useState<APIError | null>(null);
  const [matches, setMatches] = useState<CatalogResponse | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<APIError | null>(null);
  const [selection, setSelection] = useState<Track | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [recommendError, setRecommendError] = useState<APIError | null>(null);
  const starterRequest = useRef<AbortController | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const recommendationRequest = useRef<AbortController | null>(null);
  const searchSequence = useRef(0);
  const recommendationSequence = useRef(0);
  const chosenID = useRef('');
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const focusResults = useRef(false);
  const focusSearch = useRef(false);

  const loadStarters = useCallback(async () => {
    starterRequest.current?.abort();
    const controller = starterRequest.current = new AbortController();
    setStarterError(null);
    try { const response = await api.starters(controller.signal); if (!controller.signal.aborted) setStarters(response); }
    catch (error) { if (!controller.signal.aborted) setStarterError(safeError(error)); }
  }, [api]);

  const search = useCallback(async (value: string) => {
    searchRequest.current?.abort();
    recommendationRequest.current?.abort(); ++recommendationSequence.current;
    setPending(false);
    const sequence = ++searchSequence.current;
    const controller = searchRequest.current = new AbortController();
    setQuery(value);
    setSearchError(null);
    if (value.trim().length < 2 || value.trim().length > 200) {
      setSearchBusy(false); setMatches(null);
      setSearchError(new APIError('input', 'Enter between 2 and 200 characters to search for a song or artist.'));
      return;
    }
    setSearchBusy(true); setMatches(null);
    const url = new URL(window.location.href);
    const fromSeed = url.searchParams.has('seed');
    url.searchParams.set('q', value); url.searchParams.delete('seed');
    if (fromSeed) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    try {
      const response = await api.search(value.trim(), controller.signal);
      if (!controller.signal.aborted && sequence === searchSequence.current) setMatches(response);
    } catch (error) { if (!controller.signal.aborted && sequence === searchSequence.current) setSearchError(safeError(error)); }
    finally { if (!controller.signal.aborted && sequence === searchSequence.current) setSearchBusy(false); }
  }, [api]);

  useEffect(() => {
    if (searchBusy) searchInput.current?.focus();
  }, [searchBusy]);

  const choose = useCallback(async (track: Track | string, push = true, moveFocus = true) => {
    const id = typeof track === 'string' ? track : track.recording_id;
    searchRequest.current?.abort(); ++searchSequence.current;
    recommendationRequest.current?.abort();
    const controller = recommendationRequest.current = new AbortController();
    const sequence = ++recommendationSequence.current;
    chosenID.current = id;
    setMatches(null); setSearchBusy(false); setSearchError(null);
    setAttempted(true); setSelection(typeof track === 'string' ? null : track);
    setRecommendations(null); setRecommendError(null);
    if (!uuid(id)) { setPending(false); setRecommendError(new APIError('input', 'This song link is not valid. Search for a song or choose a starting point.')); return; }
    setPending(true); focusResults.current = moveFocus;
    try {
      const response = await api.recommend(id, controller.signal);
      if (controller.signal.aborted || sequence !== recommendationSequence.current) return;
      setSelection(response.seed); setRecommendations(response);
      if (push) {
        const url = new URL(window.location.href); url.searchParams.set('seed', id);
        window.history.pushState(null, '', url);
      }
    } catch (error) { if (!controller.signal.aborted && sequence === recommendationSequence.current) setRecommendError(safeError(error)); }
    finally { if (!controller.signal.aborted && sequence === recommendationSequence.current) setPending(false); }
  }, [api]);

  const clear = useCallback((push = true) => {
    recommendationRequest.current?.abort(); ++recommendationSequence.current;
    searchRequest.current?.abort(); ++searchSequence.current;
    setAttempted(false); setSelection(null); setPending(false); setRecommendations(null);
    setRecommendError(null); setMatches(null); setSearchBusy(false); setSearchError(null);
    if (push) {
      const url = new URL(window.location.href); url.searchParams.delete('seed'); url.searchParams.delete('q');
      window.history.pushState(null, '', url); focusSearch.current = true;
    }
  }, []);

  useEffect(() => {
    void loadStarters();
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const value = params.get('q') || '';
      clear(false); setQuery(value);
      const id = params.get('seed');
      if (id) void choose(id, false, false);
      else if (params.has('q')) void search(value);
    };
    const params = new URLSearchParams(window.location.search);
    if (params.has('seed') || params.has('q')) restore();
    else if (mode === 'demo' && fixture === 'invalid') void choose('invalid', false, false);
    else if (mode === 'demo' && !['entry', 'search', 'no-match'].includes(fixture)) void choose(demoCatalog?.[0]??demoTracks[0], false, false);
    else if (mode === 'demo' && ['search', 'no-match'].includes(fixture)) void search(fixture === 'search' ? 'Tiffany' : 'An absent song');
    window.addEventListener('popstate', restore);
    return () => {
      starterRequest.current?.abort(); searchRequest.current?.abort(); recommendationRequest.current?.abort();
      window.removeEventListener('popstate', restore);
    };
  }, [api, choose, clear, fixture, loadStarters, mode, search,demoCatalog]);

  useEffect(() => {
    if (recommendations && focusResults.current) { resultHeading.current?.focus(); focusResults.current = false; }
  }, [recommendations]);

  useEffect(() => {
    if (!attempted && focusSearch.current) { searchInput.current?.focus(); focusSearch.current = false; }
  }, [attempted, matches, searchError]);

  return { query, setQuery, starters, starterError, loadStarters, matches, searchBusy, searchError, search,
    selection, attempted, pending, recommendations, recommendError, choose, clear,
    retry: () => choose(chosenID.current), resultHeading, searchInput,
    opening: !attempted && !matches && !searchBusy && !searchError,
  };
}
