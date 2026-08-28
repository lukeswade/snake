/* ==========================================================================
   NATIVE SHELL AWARENESS
   The iOS App Store build (native/) wraps this exact web bundle in
   Capacitor; this file is the ONLY place that knows. On the open web every
   branch here is inert: NATIVE_SHELL false, API_BASE '', no shims applied.
   Loaded before every other game script.
   ========================================================================== */

(function () {
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  window.NATIVE_SHELL = NATIVE;

  // Inside the shell the page is served from a local origin (capacitor://
  // localhost), so the leaderboard must be addressed absolutely. On the web
  // it stays same-origin — relative URLs, zero behavior change.
  window.API_BASE = NATIVE ? 'https://snake.lukewade.net' : '';

  if (!NATIVE) return;

  /* WKWebView has no navigator.vibrate, so every haptic call in the game is
     a silent no-op on iOS — unless we route it into the Taptic Engine here.
     The game calls vibrate() with ms durations / patterns; map intensity:
     short tick -> light, long or multi-part pattern -> medium/heavy. */
  const Haptics = () => window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
  navigator.vibrate = function (pattern) {
    const h = Haptics();
    if (!h) return false;
    const total = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : (pattern || 0);
    const style = total >= 100 ? 'HEAVY' : total >= 40 ? 'MEDIUM' : 'LIGHT';
    try { h.impact({ style }); } catch (_) { /* best effort */ }
    return true;
  };

  /* WebKit routes WebAudio around the ring/silent switch only when it
     believes the page is playing real media. A silent looping <audio>
     element (started on the first user gesture) upgrades the audio session
     so the synth BGM and SFX survive the silent switch. */
  const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
  let keeper = null;
  function startAudioKeeper() {
    if (!keeper) {
      keeper = document.createElement('audio');
      keeper.setAttribute('playsinline', '');
      keeper.loop = true;
      keeper.src = SILENCE;
    }
    keeper.play().catch(() => { /* retried on the next gesture */ });
  }
  window.addEventListener('pointerdown', startAudioKeeper, { once: true });
  document.addEventListener('resume', startAudioKeeper);

  /* Share a rendered stat-card image through the native share sheet.
     WKWebView has no navigator.share, and <a download> is inert there —
     without this the Download Stat Card button would do nothing in the app.
     Returns true if the shell handled it. */
  window.nativeShareImage = async function (dataUrl, filename) {
    const P = window.Capacitor.Plugins || {};
    if (!P.Filesystem || !P.Share) return false;
    try {
      const base64 = dataUrl.split(',')[1];
      const write = await P.Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: 'CACHE'
      });
      await P.Share.share({ files: [write.uri] });
      return true;
    } catch (e) {
      // User cancelling the sheet also throws — treat as handled
      return String(e).toLowerCase().includes('cancel');
    }
  };
})();
