# Item 1: the screen recording (physical device)

## Status: take 1 (IMG_6736 / ScreenRecording 09-07 02-03) needs a re-shoot

The take is technically perfect — iPhone 16 Pro at native 1206×2622, 58s,
starts from the home screen. Gameplay, the menu, mode switching and game-over
all read clearly.

But an OCR pass over all 59 seconds found **zero frames** containing the three
screens Apple's letter explicitly asks for:

| Required by Apple | In take 1? |
|---|---|
| User-generated content entry (the display-name box + "Go Global") | **No** |
| Content reporting mechanism ("Report a name" on the leaderboard) | **No** |
| The leaderboard itself (Global / My Runs) | **No** — the drawer scrolled past "View Leaderboard" without tapping it |
| Chrono-Surge rewind ("CRASH IMMINENT" → "REVERSE TIME") | **No** |
| Launch from home screen, gameplay, menu, game over | Yes |

The first two are the ones that matter: Apple asked to see UGC flows *and*
their reporting/blocking mechanisms, and the app has both.

### Why the name box never appeared

Your phone already has a saved display name from earlier testing, so scores
auto-submit silently (that's the "GLOBAL #1" badge on the game-over card) and
the input is skipped by design. **Delete the app and reinstall it from
TestFlight before recording** — that clears the app container's local storage
and restores the first-run name prompt.

> Deliberately *not* adding an in-app "change name" button for this round:
> that would require uploading build 2, and the recording must show the
> binary actually under review (1.0 build 1). Worth adding afterwards.

---

## Take 2 — the short version (~60s)

Delete + reinstall from TestFlight first. Stay in **Merge & Surge** the whole
time (Classic has no surge and no rewind by design, so neither beat can happen
there — that's why take 1 couldn't show them after the mode switch).

1. **Launch from the home screen.** Let the start screen appear.
2. **PLAY NOW**, let the 3-2-1 run.
3. **Steer with a few taps, then one swipe.** Eat 4–6 food items so the score
   and the SURGE POWER meter climb.
4. **Trigger a surge** once the meter is full: tap the ⚡ button, bottom-right.
5. **THE REWIND — the important one.** Keep eating until the surge meter is at
   least half full, then **crash into a wall on purpose**. The cyan
   "CRASH IMMINENT!" prompt appears → **tap REVERSE TIME** and keep playing.
6. **Crash again and let it end.**
7. **THE UGC FLOW — the other important one.** On the game-over card, the
   "Your name" box is now there (post-reinstall). **Type a name and tap
   "Go Global".** Let the 🌍 GLOBAL badge appear.
8. **Open the menu** (☰ top-right), scroll to **View Leaderboard**, and
   **tap it**. Show the Global / My Runs tabs and — do not skip this —
   the **"Report a name"** line at the bottom of the modal.
9. Optional if there's room: the 📖 book icon opens the in-app rules.

Steps 5, 7 and 8 are the whole reason for a second take. Everything else was
already fine in take 1.

## Attach and reply

1. App Store Connect → Snake Surge → **App Review → Messages**. Paste
   `REVIEW-REPLY.md` and attach the video.
2. Paste `REVIEW-NOTES.txt` into **App Review Information → Notes**.
3. Submit for review again.

Take 1 was 73 MB for 58s (HEVC). If take 2 lands much larger, say so and it
can be transcoded to H.264 in a few seconds — smaller and maximally
compatible with whatever the reviewer opens it in.
