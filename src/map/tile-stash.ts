import { addProtocol } from 'maplibre-gl';

const PROTOCOL = 'stash';
const bytes = new Map<string, ArrayBuffer>();

/** Serves `url` from memory once `stashTiles` has fetched it, so drawing it never waits on the network. */
export const stashed = (url: string) => url.replace(/^https:/, `${PROTOCOL}:`);

const remote = (url: string) => url.replace(new RegExp(`^${PROTOCOL}:`), 'https:');

addProtocol(PROTOCOL, async ({ url }, abort) => {
  const hit = bytes.get(remote(url));
  if (hit) return { data: hit.slice(0) };
  const res = await fetch(remote(url), { signal: abort.signal });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { data: await res.arrayBuffer() };
});

/**
 * Fetches every url into memory, a few at a time. Failures are left out: the
 * map asks for them again and shows a hole, rather than the story never starting.
 */
export async function stashTiles(urls: string[], onProgress: (done: number) => void, concurrency = 24) {
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      if (!bytes.has(url)) {
        try {
          const res = await fetch(url);
          if (res.ok) bytes.set(url, await res.arrayBuffer());
        } catch {
          // Left for the map to retry.
        }
      }
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}
