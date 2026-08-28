# Shipping Snake Surge to the App Store

The `native/` directory wraps the exact web bundle in Capacitor (SPM, no
CocoaPods — CocoaPods is broken on this Mac and unnecessary). The web app and
PWA are untouched: every native behavior is gated behind `js/native.js`,
which is inert in a browser.

## Why this passes review (Guideline 4.2, "not just a website")

- **Fully offline** — the entire game ships inside the binary (`www/`, copied
  by `build-www.sh`). No remote code (also satisfies 2.5.2).
- **Real haptics** — `js/native.js` maps the game's `navigator.vibrate`
  patterns onto the Taptic Engine via `@capacitor/haptics`. Safari on iOS has
  no vibration API at all, so this is a genuinely native capability.
- **Native share sheet** — the score card exports through
  `@capacitor/share` + `@capacitor/filesystem` (`<a download>` is inert in
  WKWebView).
- **Silent-switch-correct audio** — a silent looping `<audio>` element
  upgrades the WebKit audio session so the synth soundtrack behaves like a
  game, not a web page.
- **HTML5 game content bundled in-binary** is explicitly fine (4.7 covers
  *unbundled third-party* games; this is first-party and packaged).

## Every release

```bash
cd native
npm run sync     # build-www.sh (copies the web bundle) + cap sync ios
```

Then either open Xcode (`npm run open`, Product → Archive → Distribute) or
do it headlessly the way build 1 was actually shipped:

```bash
cd native/ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/SnakeSurge.xcarchive archive -allowProvisioningUpdates

xcodebuild -exportArchive -archivePath /tmp/SnakeSurge.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath /tmp/SnakeSurgeExport -allowProvisioningUpdates
```

`exportOptions.plist` (method `app-store-connect`, destination `upload`)
lives next to the project. Signing and upload ride Xcode's signed-in Apple
ID session (cloud-managed distribution cert; nothing in the local keychain
but a development cert). Remember to bump `CURRENT_PROJECT_VERSION` for
each new upload.

## Gotchas already handled

- **The AuthKey p8 in ~/.secrets is an APNs push key (Team Locker), NOT an
  App Store Connect API key.** Nothing on this machine can mint ASC API
  tokens; uploads go through Xcode's account session, and ASC metadata is
  edited in the web UI.
- Service worker: never registered in the shell (`js/native.js` sets
  `NATIVE_SHELL`; index.html gates registration). The bundle IS the cache.
- Leaderboard: `API_BASE` in native.js points the shell at
  https://snake.lukewade.net (the shell origin is local).
- App icon source has no alpha (`native/assets/icon-only.png`); full set +
  splash generated with `npx @capacitor/assets generate --ios --assetPath
  assets --iosProject ios/App --splashBackgroundColor '#0a0c16'
  --splashBackgroundColorDark '#0a0c16'`.
- `ITSAppUsesNonExemptEncryption = false` in Info.plist (standard HTTPS
  only) — no export-compliance question per build.
- Deployment target 15.0 (Apple requires ≥15 for uploads from Spring 2027).
- Store screenshots regenerate with `node /tmp/gen-shots.js` — actually
  scripted staging of live gameplay via puppeteer at exact store sizes
  (1290×2796 and 2064×2752); outputs in `native/store/`.

## Verified in simulator (iPhone 17 Pro, iOS 26)

Boot → start overlay (touch-aware controls hint) → tap-to-steer → swipe
chaining → eating/buff pills/live-best HUD → edge wrap in surge mode. Safe
areas respected around the Dynamic Island and home indicator.
