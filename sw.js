/* ==========================================================================
   SERVICE WORKER — OFFLINE SHELL
   Every asset is same-origin (fonts and icons are self-hosted), so the whole
   game can be precached and played with no network at all.
   ========================================================================== */

/* ASSET_V must match the ?v= token on the <script>/<link> tags in index.html.
   The lukewade.net zone force-caches .css/.js in the browser for 4 hours, so
   the token — not headers — is what guarantees a returning visitor gets new
   code. Bump both together on every deploy that changes CSS or JS. */
const ASSET_V = '11';
const VERSION = `snake-surge-v4-assets${ASSET_V}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  `css/styles.css?v=${ASSET_V}`,
  `js/icons.js?v=${ASSET_V}`,
  `js/audio.js?v=${ASSET_V}`,
  `js/storage.js?v=${ASSET_V}`,
  `js/snake.js?v=${ASSET_V}`,
  `js/aiSnake.js?v=${ASSET_V}`,
  `js/game.js?v=${ASSET_V}`,
  `js/cardGenerator.js?v=${ASSET_V}`,
  `js/ui.js?v=${ASSET_V}`,
  'icon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'fonts/QGYvz_MVcBeNP4NJtEtqUYLknw.woff2',
  'fonts/QGYvz_MVcBeNP4NJuktqUYLkn8BJ.woff2',
  'fonts/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2',
  'fonts/e3t4euO8T-267oIAQAu6jDQyK3nbivNm4I81PZQ.woff2',
  'fonts/V8mDoQDjQSkFtoMM3T6r8E7mPb94C_k3HqUtEw.woff2',
  'fonts/V8mDoQDjQSkFtoMM3T6r8E7mPbF4C_k3HqU.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // addAll() is atomic — one 404 would discard the whole precache, so add
    // individually and let a single missing asset fail on its own.
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (e) {
        console.warn('[sw] precache miss:', url);
      }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Live data — never serve the leaderboard from cache
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first so a fresh deploy is picked up immediately,
  // falling back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put('index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(VERSION);
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Static assets: serve from cache instantly, refresh in the background so
  // the next load gets any new version (stale-while-revalidate).
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);

    // Revalidate against the network, not the browser HTTP cache: the
    // lukewade.net zone applies a 4-hour Browser Cache TTL to .js, which would
    // otherwise let this background refresh return the same stale copy.
    const update = fetch(new Request(req.url, { cache: 'reload' })).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (hit) {
      event.waitUntil(update);
      return hit;
    }
    return (await update) || Response.error();
  })());
});
