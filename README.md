# Snake Surge 🐍⚡

**Play it: [snake.lukewade.net](https://snake.lukewade.net)**

A snake that fuses its own body. Merge three matching segments to upgrade
them, bank the surge meter, and when you finally crash — spend it to rewind
time and undo your death.

## Features

- **Merge & Surge** — tiered food, 3-in-a-row segment fusion, a surge meter
  that buys short bursts of invincibility, and **Chrono-Surge**: rewind the
  last few seconds of your run instead of dying
- **Classic Survival** — pure Nokia-rules snake, no safety nets
- **PvP Blitz** — 60 seconds against two AI snakes; knock them out or
  out-score them
- **Global leaderboard** (per-mode top 100, one best entry per name) plus a
  local top-10, powered by Pages Functions + Workers KV
- Combo/fever scoring, fleeing "runner" food, magnet/ghost/slow-mo power-ups,
  unlockable snake skins, achievements
- 5 themes including Game Boy and Nokia 3310 LCD looks
- Installable PWA, fully playable offline, zero third-party runtime
  dependencies (fonts and icons are self-hosted)
- Touch-first controls: tap either side of the snake's path or swipe;
  procedural WebAudio synth soundtrack

## Stack

Vanilla JS + Canvas 2D + WebAudio. No framework, no build step for the
client. Cloudflare Pages hosts the static site; a single Pages Function
(`functions/api/leaderboard.js`) backed by a KV namespace serves the global
leaderboard.

## Development

```sh
./build-dist.sh          # stage the deployable site into dist/
wrangler pages dev       # serve dist/ + the API locally with a local KV
```

## Deploy

```sh
./build-dist.sh
wrangler pages deploy    # config in wrangler.toml (project: snake-surge)
```

When changing CSS or JS, bump the `?v=` token in `index.html` **and**
`ASSET_V` in `sw.js` together — asset URLs are versioned to defeat browser
caching, and the service worker precaches by exact URL.
