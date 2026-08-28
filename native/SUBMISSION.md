# Snake Surge — App Store submission (paste-ready)

Final copy for every App Store Connect field. All fields are inside Apple's
character limits. App record: **Snake Surge** · bundle `net.lukewade.snakesurge`
· SKU `snakesurge-ios-001` · Team GA7UDAPX8G.

---

## App Information

**Name (30):**
```
Snake Surge
```

**Subtitle (30):**
```
Merge, surge & rewind death
```

**Category:** **Games** with subcategories **Action + Casual** (ASC has no "Arcade" subgenre)

**Content rights:** Contains no third-party content.

**Age rating:** everything **None / No** (no violence beyond abstract neon
shapes, no gambling of any kind, no contests — the leaderboard is a plain
high-score table, not a prize contest). Expected result: **4+**.

---

## Version 1.0

**Build:** attach **1.0 (1)**.

**Promotional text (170):**
```
A snake that fuses its own body. Chain combos, bank the surge meter, and when you finally crash — spend it to rewind time and undo your death.
```

**Description (4000):**
```
Snake, rebuilt around one question: what if you could take death back?

MERGE & SURGE
Eat tiered food and line up three matching segments — they fuse into one segment of a higher tier, worth more points and a shorter, safer snake. Every bite charges the surge meter. At 100%, unleash a Hyper-Surge: brief invincibility, wall-phasing, and slow motion while everything glows.

CHEAT DEATH
Crash with 50% surge banked and time freezes. Spend it to rewind the last few seconds and keep the run alive — or accept your fate. The rewind is the run you didn't lose.

THREE MODES
- Merge & Surge: the full modern game — combos, fever mode, power-ups, rewinds
- Classic Survival: pure retro snake. One food, no safety nets, no excuses
- PvP Blitz: 60 seconds against two AI snakes. Knock them out or out-score them

A LIVING BOARD
Runner food flees when you get close. Magnets pull dinner toward you. Ghost mode phases you through your own tail. A procedural synth soundtrack shifts mood as danger closes in, and real haptics punch on every crash, surge and rewind.

MADE FOR PHONES
Tap either side of your snake to turn, or swipe anywhere — tuned so fast taps chain corners like an arcade stick. Five visual themes, from neon glass to a pitch-perfect Nokia LCD tribute. A global leaderboard with one best entry per name, plus your local top-10.

- Free. No ads, no in-app purchases, nothing to unlock with money
- Plays fully offline — the whole game ships in the app
- No account, no sign-up, no tracking
- Global leaderboard is optional: just a nickname you type and your score
```

**Keywords (100 char hard limit — this is 97):**
```
snake,arcade,retro,merge,combo,rewind,leaderboard,offline,neon,classic,nokia,casual,reflex,glow
```

**Support URL:** `https://snake.lukewade.net`
**Marketing URL:** `https://snake.lukewade.net`
**Privacy Policy URL:** `https://snake.lukewade.net/privacy`

**Version release:** **Manually release this version**.

---

## App Review Information — notes (paste verbatim)

```
Snake Surge is an offline arcade snake game with a twist: merging body
segments and rewinding your own death.

- No account, no login, no in-app purchases, no ads.
- The entire game is bundled in the binary and plays with the device in
  airplane mode. Please feel free to test it offline.
- Native integrations: Taptic Engine haptics tiered to game events, native
  share sheet for the score card, and an audio session so the synth
  soundtrack plays correctly with the ring/silent switch.
- The only network request is an optional global leaderboard: it sends a
  nickname the player types and their score. No personal data, no
  third-party SDKs, no analytics.
- The web version at snake.lukewade.net is the same first-party game; the
  app is fully self-contained and adds native haptics/share/audio.
```

**Sign-in required:** No (UNCHECK it — defaults on) · **Demo account:** n/a
**Contact:** Luke Wade · lukeswade@gmail.com · 2146420265 (as entered for the other apps)

---

## App Privacy (questionnaire answers)

Matches privacy.html:
- **Data collected:** User Content → **Other User Content** (the leaderboard
  nickname) — *not linked to identity, not used for tracking, purpose: App
  Functionality*. Nothing else.
- **Tracking:** No.

(No identifiers are collected — unlike SweeperCreeper there is no
self-generated player ID; the nickname + score is everything.)

---

## Screenshots

iPhone 6.5"/6.9" (1284×2778): `native/store/shot-1.png … shot-5.png`
iPad 13" (2064×2752): `native/store/ipad-shot-1.png … ipad-shot-5.png`

Order: 3 (CRASH IMMINENT — the hook) → 2 (live gameplay) → 4 (surge/fever)
→ 1 (start screen) → 5 (Nokia theme).
iPhone shots are 1284×2778 — the size the ASC drop zone actually accepts
(it rejected 1290×2796 for this app record).

---

## Pre-submit checklist

- [x] Bundle ID registered (net.lukewade.snakesurge)
- [x] App record created (SKU snakesurge-ios-001, Full Access, en-US)
- [x] Build 1.0 (1) uploaded via xcodebuild (ITSAppUsesNonExemptEncryption=false, so no compliance prompt)
- [x] Build 1.0 (1) attached to version 1.0
- [x] Listing copy + screenshots entered (5 iPhone + 5 iPad)
- [x] Age rating questionnaire saved — calculated 4+
- [x] Privacy label PUBLISHED (Gameplay Content + Other User Content; App Functionality; not linked; no tracking) · policy URL set
- [x] "Sign-in required" UNCHECKED · review notes + contact info saved
- [x] Manual release selected · price Free (175 regions) · availability all countries · Apple Silicon ON
- [x] Subtitle, category (Games → Action + Casual), content rights set on App Information
- [ ] DO NOT press "Submit to App Review" — Luke does that
- [ ] Trader status (EU / DSA) — required for EU availability (same open item as the other two apps)

## Known-good facts from the SweeperCreeper/Team Locker submissions

- Individual-enrolled account: never declare Simulated Gambling (N/A here anyway).
- Apple Silicon Mac availability: leave ON.
- Deployment target bumped to iOS 15 in-repo (Apple requires 15+ for uploads from Spring 2027; build 1 was uploaded at 14.0 with a warning, which is fine).
