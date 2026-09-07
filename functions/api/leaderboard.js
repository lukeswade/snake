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

/* ------------------------------------------------------------------
   Display-name moderation.

   The nickname on the global board is the app's only user-generated
   content: 16 characters, shown to every player. It is filtered here at
   submission time, so objectionable names never reach the board at all
   (rather than being removed after the fact). Names are also removable
   on request — see the privacy policy.
   ------------------------------------------------------------------ */

// Normalise common evasion: case, separators, and leetspeak substitutions,
// so "f_u_c_k" and "fvck" collapse onto the same blocked stem.
function normalizeForModeration(name) {
  return name
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '');
}

// Unambiguous terms only — a false positive just asks the player for a
// different name, but a false negative puts a slur on a 4+ rated board.
// Vowel-swap evasions are enumerated rather than handled by folding all
// vowels together: folding would collapse innocent words onto blocked
// stems (six/sex, space/spic) and block far more than it caught.
const BLOCKED_TERMS = [
  // profanity, with common vowel-swap and phonetic evasions
  'fuck', 'fock', 'fack', 'fick', 'fcuk', 'phuck', 'fuk', 'fuq',
  'shit', 'shyt', 'shite', 'cunt', 'kunt', 'bitch', 'biatch', 'bastard',
  'dick', 'cock', 'penis', 'vagina', 'pussy', 'pusy', 'asshole', 'azzhole',
  'whore', 'hoar', 'slut', 'wank', 'boner', 'jizz', 'cumshot', 'blowjob',
  // slurs and hate terms
  'nigger', 'nigga', 'niggr', 'faggot', 'fagot', 'phaggot', 'retard',
  'tranny', 'kike', 'chink', 'wetback', 'nazi', 'hitler', 'kkk',
  // self-harm and hard drugs
  'suicide', 'killyourself', 'kys', 'heroin', 'cocaine',
  // sexual content
  'porn', 'pron', 'rape', 'rapist', 'incest', 'pedo'
];

// Innocent words that contain a blocked substring. Checked as the whole
// normalised name, which is enough for a 16-character nickname.
const ALLOWED_NAMES = new Set([
  'scunthorpe', 'penistone', 'cockburn', 'peacock', 'hancock', 'babcock',
  'woodcock', 'dickens', 'dickinson', 'shiitake', 'cocktail', 'analysis',
  'assassin', 'classic', 'grasshopper'
]);

function isObjectionableName(name) {
  const n = normalizeForModeration(name);
  if (!n) return false;
  if (ALLOWED_NAMES.has(n)) return false;
  return BLOCKED_TERMS.some(term => n.includes(term));
}

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
  if (isObjectionableName(name)) {
    return json({ error: 'Please choose a different name.' }, 422);
  }
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
