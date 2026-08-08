/* ==========================================================================
   GLOBAL LEADERBOARD — Cloudflare Pages Function
   GET  /api/leaderboard?mode=surge          -> { entries: [{name, score, date}] }
   POST /api/leaderboard {mode, score, name} -> { rank, entries } or error

   Storage: one KV key per mode holding the top entries as a JSON array.
   One entry per player name (their best), capped at MAX_ENTRIES.
   ========================================================================== */

const MODES = ['surge', 'classic', 'pvp'];
const MAX_ENTRIES = 100;
const TOP_RETURNED = 25;
// Generous ceiling: legit runs are typically < 100k. Anything above this is
// someone poking the API, not someone playing the game.
const MAX_SCORE = 500000;
const RATE_LIMIT_PER_MIN = 6;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });

const keyFor = mode => `lb:${mode}`;

function sanitizeName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/[^A-Za-z0-9 _\-.]/g, '').slice(0, 16);
  return name.length >= 1 ? name : null;
}

export async function onRequestGet({ request, env }) {
  const mode = new URL(request.url).searchParams.get('mode');
  if (!MODES.includes(mode)) return json({ error: 'invalid mode' }, 400);

  const list = (await env.SNAKE_LB.get(keyFor(mode), 'json')) || [];
  return json({ entries: list.slice(0, TOP_RETURNED) });
}

export async function onRequestPost({ request, env }) {
  // Per-IP rate limit so a script can't spam-fill the board
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = `rl:${ip}`;
  const count = parseInt((await env.SNAKE_LB.get(rlKey)) || '0', 10);
  if (count >= RATE_LIMIT_PER_MIN) return json({ error: 'slow down' }, 429);
  await env.SNAKE_LB.put(rlKey, String(count + 1), { expirationTtl: 60 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const mode = body.mode;
  const name = sanitizeName(body.name);
  const score = body.score;

  if (!MODES.includes(mode)) return json({ error: 'invalid mode' }, 400);
  if (!name) return json({ error: 'invalid name' }, 400);
  if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE) {
    return json({ error: 'invalid score' }, 400);
  }

  const key = keyFor(mode);
  const list = (await env.SNAKE_LB.get(key, 'json')) || [];

  // One slot per name: only their best run stays on the board
  const existing = list.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
  if (existing !== -1) {
    if (list[existing].score >= score) {
      const rank = existing + 1;
      return json({ rank, improved: false, entries: list.slice(0, TOP_RETURNED) });
    }
    list.splice(existing, 1);
  }

  const d = new Date();
  const stamp = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  list.push({ name, score, date: stamp });
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_ENTRIES);
  await env.SNAKE_LB.put(key, JSON.stringify(trimmed));

  const rank = trimmed.findIndex(e => e.name.toLowerCase() === name.toLowerCase()) + 1;
  return json({
    rank: rank || null,
    improved: true,
    entries: trimmed.slice(0, TOP_RETURNED)
  });
}
