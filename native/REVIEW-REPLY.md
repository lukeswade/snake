# Guideline 2.1 reply — Snake Surge (paste into App Store Connect)

Apple's 2.1 letter of 2026-08-28 asks for seven items. Items 2–7 are text
and are answered verbatim below. **Item 1 is a screen recording that must be
captured on a physical device — see RECORDING.md.**

Post this in **App Store Connect → Snake Surge → App Review → Messages**
(Resolution Center), attach the video, then Submit again. Also paste the same
block into **App Review Information → Notes** so future submissions carry it.

---

## Paste-ready reply

```
Thanks for the review. Answers to all seven items below; the screen
recording is attached.

1. SCREEN RECORDING
Attached: a recording from a physical iPhone 16 Pro running iOS 26,
starting from app launch and covering the full typical flow — launch,
start a run, touch steering, scoring and power-ups, the Chrono-Surge
death-rewind, game over, optional leaderboard name entry and submission,
the leaderboard, and the in-app how-to guide.

Regarding the specific flows listed:
- Account registration / login / deletion: NONE. The app has no accounts
  and no sign-in of any kind. Nothing is gated.
- Paid content, purchases, subscriptions: NONE. The app is free with no
  in-app purchases, no ads, and nothing to unlock with money.
- User-generated content: the ONLY user-generated content is an optional
  16-character display name a player may type after a run in order to post
  a score to the global leaderboard. It is shown in the recording. See
  item 5 for the moderation, reporting and removal mechanisms.
- Prompts for sensitive data or device capabilities: NONE. The app
  requests no permissions at all — no location, contacts, camera,
  microphone, photos, notifications, or App Tracking Transparency. There
  is no IDFA access and no tracking.

2. DEVICES AND OPERATING SYSTEMS TESTED
- iPhone 16 Pro (physical device), iOS 26 — primary test device
- iPhone 17 Pro Simulator, iOS 26.5 — full gameplay pass
- iPad 13" Simulator, iPadOS 26.5 — layout and gameplay
Tested in both portrait and landscape, and with the device in airplane
mode to confirm full offline play.

3. FUNCTION AND TARGET AUDIENCE
Snake Surge is a single-player arcade game — a modern take on classic
snake. The player steers a snake to eat food and avoid crashing into
walls, obstacles or itself. Two mechanics distinguish it: (a) MERGE —
three matching body segments fuse into one higher-tier segment, which
scores more and shortens the snake, and (b) CHRONO-SURGE — when the
player crashes with at least 50% of the surge meter banked, they may
spend it to rewind the last few seconds and continue the run instead of
dying.

There are three modes: Merge & Surge (the full game), Classic Survival
(pure retro snake with no assists), and PvP Blitz (60 seconds against two
computer-controlled snakes).

Target audience: general audiences, all ages (rated 4+). It is a pick-up-
and-play game for anyone who wants a short, skill-based arcade session.
The "problem it solves" is straightforward for its category: it provides
a few minutes of free, offline, ad-free entertainment, and the rewind
mechanic removes the main frustration of the genre — losing a long run to
a single mistake.

4. SETUP AND ACCESS INSTRUCTIONS
No setup, no credentials, no sample files are required. There is nothing
to configure and nothing is gated.

- Launch the app and tap PLAY NOW. A 3-2-1 countdown starts the run.
- Steering on a touch device: tap the screen on either side of the
  snake's path to turn toward that side, or swipe in any direction. On a
  connected keyboard, WASD or the arrow keys also work.
- SURGE: when the surge meter reaches 100%, tap the lightning button in
  the lower-right corner (or press Space) for temporary invincibility.
- CHRONO-SURGE: crash while holding at least 50% surge and a "CRASH
  IMMINENT" prompt appears; tap REVERSE TIME to rewind and keep playing.
- Modes, difficulty, snake skins and volume: tap the menu (hamburger)
  icon in the top-right on iPhone, or use the sidebar on iPad.
- The full rules are in the app: tap the book icon ("Snake Whispering")
  in the top navigation bar.
- Leaderboard: after a run, optionally type a display name and tap "Go
  Global" to post the score. Tap "View Leaderboard" in the menu to see
  the global board and your own local top-10.

5. EXTERNAL SERVICES AND PLATFORMS
The game itself is entirely self-contained in the binary and requires no
external service to run. There are no third-party SDKs, no analytics, no
advertising networks, no authentication providers, no payment processors
and no AI services.

The single external dependency is a global high-score leaderboard hosted
on our own Cloudflare infrastructure (Cloudflare Pages Functions with a
Workers KV store) at https://snake.lukewade.net/api/leaderboard. It is
first-party, operated by the developer. It is used only when a player
chooses to post a score. The request contains exactly three things: the
display name the player typed, the numeric score, and the date. No device
identifiers, no account, no personal data.

Moderation of that display name (the app's only user-generated content):
- Names are limited to 16 characters and to letters, digits, spaces and
  the characters _ - . before any other processing.
- A server-side blocklist rejects profanity, slurs, hate terms and
  self-harm references at submission time, so an objectionable name is
  never stored or shown to anyone. The check normalises case, separators
  and leetspeak substitutions to catch evasion attempts. A rejected name
  returns an error and the player is asked to choose another.
- The leaderboard screen carries a "Report a name" link that opens a
  prefilled email to the developer.
- Any leaderboard entry is removed on request; this is stated in the
  privacy policy at https://snake.lukewade.net/privacy.
- There is no user-to-user interaction of any kind in the app — no
  messaging, no chat, no profiles, no follows, no comments — so there is
  no other user to block. A display name on a high-score table is the
  entire surface.

6. REGIONAL DIFFERENCES
There are none. The app functions identically in all regions. There is no
region-gated content, no region-specific pricing (it is free
everywhere), no geolocation, and the app is English-only. The global
leaderboard is a single worldwide board shared by all players.

7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable. The app is not in a regulated industry. All content is
original and first-party: the code, artwork, icon, and the procedurally
generated audio (synthesised at runtime with the Web Audio API — there
are no audio files and no licensed music). The three typefaces used
(Outfit, Press Start 2P, Space Grotesk) are licensed under the SIL Open
Font License and are bundled in the app. The icon set (Lucide) is MIT
licensed. There is no third-party content requiring authorisation.

Additional note: the entire game is bundled in the binary. It plays fully
offline — please feel free to test it in airplane mode.
```
