import { type MusicAPI, validCatalog, validRecommendations } from './contracts';

export class APIError extends Error {
  constructor(public code: string, message: string, public retryAfter?: number) { super(message); }
}
export function realAPI(base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000', onWake?: () => void): MusicAPI {
  base = base.trim().replace(/\/+$/, '');
  async function request(path: string, parent: AbortSignal, timeoutMs = 8000): Promise<unknown> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (parent.aborted) controller.abort();
    parent.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetch(base + path, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        // The local API's CORS policy does not expose Retry-After; its window is 60 seconds.
        const wait = Number(response.headers.get('Retry-After') || (response.status === 429 ? '60' : '0'));
        const messages: Record<number, string> = {
          404: 'This song is outside the supported catalog. Choose another starting point.',
          422: 'This request is not valid. Check the song or search again.',
          429: 'Too many requests. Wait a little, then try again.',
          503: 'The music catalog is temporarily unavailable. Please try again.',
        };
        throw new APIError(String(response.status), messages[response.status] || 'The request could not be completed. Please try again.',
          Number.isFinite(wait) && wait > 0 ? Math.min(wait, 3600) : undefined);
      }
      return await response.json();
    } catch (error) {
      if (parent.aborted) throw new DOMException('Request cancelled', 'AbortError');
      if (timedOut) throw new APIError('timeout', 'The request took too long. Your input is saved; please try again.');
      if (error instanceof APIError) throw error;
      if (error instanceof SyntaxError) throw new APIError('invalid_data', 'The catalog returned unexpected data. Please try again.');
      throw new APIError('unavailable', 'We could not reach the music catalog. Check your connection and try again.');
    } finally {
      window.clearTimeout(timeout);
      parent.removeEventListener('abort', abort);
    }
  }
  return {
    async starters(signal) {
      const deadline = Date.now() + 120_000;
      for (;;) {
        signal.throwIfAborted();
        try {
          const result = await request('/v1/catalog/starters', signal, Math.min(8000, Math.max(1, deadline - Date.now())));
          if (!validCatalog(result, 'real')) throw new APIError('invalid_data', 'The catalog returned unexpected data. Please try again.');
          return result;
        } catch (error) {
          signal.throwIfAborted();
          if (!(error instanceof APIError) || !['timeout', 'unavailable', '502', '503', '504'].includes(error.code)) throw error;
          if (Date.now() >= deadline) throw new APIError('timeout', 'The music catalog is still unavailable after two minutes. Please try again.');
          onWake?.();
          await new Promise<void>((resolve, reject) => {
            const abort = () => { window.clearTimeout(timer); reject(new DOMException('Request cancelled', 'AbortError')); };
            const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, Math.min(10_000, deadline - Date.now()));
            signal.addEventListener('abort', abort, { once: true });
          });
          if (Date.now() >= deadline) throw new APIError('timeout', 'The music catalog is still unavailable after two minutes. Please try again.');
        }
      }
    },
    async search(query, signal) {
      const result = await request('/v1/catalog/search?' + new URLSearchParams({ q: query, limit: '10' }), signal);
      if (!validCatalog(result, 'real') || result.results.length > 10) throw new APIError('invalid_data', 'The search returned unexpected data. Please try again.');
      return result;
    },
    async recommend(id, signal) {
      const result = await request('/v1/recommendations/' + encodeURIComponent(id), signal);
      if (!validRecommendations(result, 'real') || result.seed.recording_id !== id) throw new APIError('invalid_data', 'The recommendations returned unexpected data. Please try again.');
      return result;
    },
  };
}
