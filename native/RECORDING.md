# Item 1: the screen recording (physical device — Luke must capture this)

Apple requires a recording **from a real iPhone**, not the simulator. Build
1.0 (1) is already uploaded, so the fastest route onto your iPhone 16 Pro is
TestFlight.

## Get the build on your phone

1. App Store Connect → Snake Surge → **TestFlight**.
2. If build 1.0 (1) shows "Missing Compliance", click it and answer the
   encryption question — it should not appear, because Info.plist already
   sets `ITSAppUsesNonExemptEncryption = false`.
3. **Internal Testing** → create a group (e.g. "Me") → add yourself
   (lukeswade@gmail.com) → add build 1.0 (1).
4. Install TestFlight on the iPhone, accept the invite email, install
   Snake Surge.

## Record it

Add the Screen Recording button to Control Centre if it isn't there
(Settings → Control Centre → Screen Recording). Then swipe down, tap the
record button, wait for the 3-2-1, and **launch the app from the home
screen** — Apple asks that the recording begin with the launch.

Target length: **60–90 seconds**. Keep it continuous; don't edit it.

## Shot list — hit these in order

1. **Launch from the home screen.** Let the splash and start screen appear.
   (The start screen shows the world-record line — nice to have on camera.)
2. **Tap PLAY NOW** and let the 3-2-1 countdown run.
3. **Steer with taps** — tap either side of the snake's path a few times so
   the reviewer sees the touch control working. Then **swipe** once or twice.
4. **Eat several food items** so the score, combo and surge meter visibly
   climb. Grab a power-up if one appears (the buff pill shows in the HUD).
5. **Trigger a SURGE** — when the meter hits 100%, tap the lightning button
   bottom-right. The snake glows and phases.
6. **Crash on purpose while holding 50%+ surge** so the "CRASH IMMINENT"
   prompt appears, then **tap REVERSE TIME**. This is the app's signature
   mechanic and the single most important thing to show.
7. **Crash again and let it end.** On the game-over card, **type a display
   name and tap "Go Global"** — this is the app's only user-generated
   content, and Apple asked to see UGC flows. Show the global rank badge
   that appears.
8. **Open the menu** (hamburger, top-right) and **tap View Leaderboard**.
   Show the Global / My Runs tabs and — importantly — the **"Report a name"**
   link at the bottom, which answers Apple's content-reporting question.
9. **Tap the book icon** (Snake Whispering) and scroll the rules briefly.
10. Optional if you still have room: switch the theme with the palette icon.

Stop the recording. Trim only the dead air at the very start/end if needed.

## What NOT to worry about showing

There is nothing else to demonstrate: no login, no purchase, no subscription,
no permission prompt. If a reviewer expects one of those, its absence is the
answer — which is exactly what the written reply says.

## Attach and reply

1. App Store Connect → Snake Surge → **App Review → Messages** (Resolution
   Centre). Paste the reply from `REVIEW-REPLY.md` and attach the video.
2. Also paste `REVIEW-NOTES.txt` into **App Review Information → Notes** on
   the version page — Apple explicitly asked for this "for future
   submissions". (The full reply is 6.5k characters; Notes caps at 4000,
   which is why REVIEW-NOTES.txt is the condensed version.)
3. Submit for review again.

If the video is over ~500 MB, upload it to a private link (e.g. a Cloudflare
Pages or iCloud share) and put the URL in the message instead — Apple accepts
a link.
