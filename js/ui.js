/* ==========================================================================
   UI CONTROLLER & EVENT BINDINGS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine('game-canvas');
  window.game = game; // Expose for audio.js dynamic percussion

  // Icon refresh helper — survives the lucide CDN failing to load
  const refreshIcons = () => window.lucide?.createIcons();
  refreshIcons();

  // DOM Element References
  const scoreVal = document.getElementById('score-val');
  const highVal = document.getElementById('high-val');
  const comboVal = document.getElementById('combo-val');
  const surgeFill = document.getElementById('surge-fill');
  const pvpTimerBox = document.getElementById('pvp-timer-box');
  const pvpTimerVal = document.getElementById('pvp-timer-val');

  const startOverlay = document.getElementById('start-overlay');
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const pauseOverlay = document.getElementById('pause-overlay');
  const rewindOverlay = document.getElementById('rewind-overlay');
  const achievementsModal = document.getElementById('achievements-modal');
  const howtoModal = document.getElementById('howto-modal');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNum = document.getElementById('countdown-num');

  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnPause = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnRewind = document.getElementById('btn-rewind');
  const btnSkipRewind = document.getElementById('btn-skip-rewind');
  const btnMute = document.getElementById('btn-mute');
  const btnBgm = document.getElementById('btn-bgm');
  const btnTheme = document.getElementById('btn-theme');
  const btnHowto = document.getElementById('btn-howto');
  const btnCloseHowto = document.getElementById('btn-close-howto');
  const btnShareCard = document.getElementById('btn-share-card');
  const btnShareText = document.getElementById('btn-share-text');
  const btnSurgeTouch = document.getElementById('btn-surge-touch');
  const volumeSlider = document.getElementById('volume-slider');

  const finalScoreVal = document.getElementById('final-score-val');
  const finalHighVal = document.getElementById('final-high-val');
  const finalMergesVal = document.getElementById('final-merges-val');
  const newHighBadge = document.getElementById('new-high-badge');

  const buffBox = document.getElementById('buff-indicators');

  /* Buff pill icons must be ready-made <svg> markup: the HUD loop rewrites
     buffBox.innerHTML and compares against the previous string each tick, so
     <i data-lucide> placeholders would never be converted (createIcons isn't
     re-run there) and re-running it would break the string comparison. */
  const buffIcon = (name, color) => {
    const inner = window.lucide?.icons?.[name] || '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;vertical-align:text-bottom;">${inner}</svg>`;
  };
  const BUFF_META = {
    magnet: { icon: buffIcon('magnet', 'currentColor'), label: 'MAGNET' },
    ghost: { icon: buffIcon('ghost', '#fff'), label: 'GHOST' },
    slowmo: { icon: buffIcon('timer', '#39ff14'), label: 'SLOW-MO' }
  };

  function closeAllModals() {
    achievementsModal?.classList.remove('active');
    howtoModal?.classList.remove('active');
    leaderboardModal?.classList.remove('active');
  }

  /* Open a modal over a live game without killing the run: pause first. */
  function openModal(modal) {
    if (game.isRunning && !game.isPaused && !countdownActive) togglePause();
    closeAllModals();
    modal?.classList.add('active');
  }

  // Apply Stored Theme & Difficulty
  const currentTheme = storage.getTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Apply Persisted Audio Settings
  if (storage.getSetting('muted')) {
    btnMute.innerHTML = '<i data-lucide="volume-x"></i>';
    btnMute.classList.add('disabled-emoji');
    audio.muted = true;
  }
  if (!storage.getSetting('bgm')) {
    btnBgm?.classList.add('disabled-emoji');
  }
  if (volumeSlider) {
    const vol = storage.getSetting('volume') ?? 0.6;
    volumeSlider.value = vol;
    audio.setVolume(vol);
  }

  // Device-aware controls hint — keyboard instructions are noise on a phone
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    const hint = document.getElementById('controls-hint');
    if (hint) hint.textContent = 'Tap either side of your snake to turn, or swipe | Tap ⚡ to Surge';
  }

  // World-record teaser on the start screen — a target to chase before the
  // first key is pressed. Fails silently offline.
  fetch('/api/leaderboard?mode=surge')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const top = data?.entries?.[0];
      const line = document.getElementById('world-record-line');
      if (top && line) {
        line.textContent = `🌍 World record: ${top.score.toLocaleString()} — ${top.name}`;
        line.style.display = 'block';
      }
    })
    .catch(() => {});

  const currentDiff = storage.getDifficulty();
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-diff') === currentDiff);
    if (btn.getAttribute('data-diff') === currentDiff) {
      btn.className = 'btn-primary difficulty-btn active';
    } else {
      btn.className = 'btn-secondary difficulty-btn';
    }
  });

  // Mobile Menu Toggle Logic
  const btnMenu = document.getElementById('btn-menu');
  const sidebarPanel = document.querySelector('.sidebar-panel');
  btnMenu?.addEventListener('click', () => {
    sidebarPanel?.classList.toggle('open');
    audio.playClick();
  });

  // Update High Score Display
  const refreshScores = () => {
    highVal.textContent = storage.getHighScore(game.mode).toLocaleString();
    document.getElementById('stat-food').textContent = storage.data.stats.foodEaten;
    document.getElementById('stat-merges').textContent = storage.data.stats.totalMerges;
    document.getElementById('stat-surges').textContent = storage.data.stats.surgesActivated;
    document.getElementById('stat-wins').textContent = storage.data.stats.pvpWins;
  };
  refreshScores();

  // Achievement Toast Callback
  storage.onAchievementUnlocked = (ach) => {
    audio.playAchievement();
    showToast(`🏆 Achievement Unlocked: ${ach.name}!`);
  };

  function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    // The exit animation lives on .fade-out; remove the node once it finishes
    setTimeout(() => toast.classList.add('fade-out'), 3600);
    setTimeout(() => toast.remove(), 4000);
  }

  /* 3-2-1-GO countdown. Holds the game paused so neither a fresh start nor a
     resume drops you straight back into moving traffic. */
  let countdownActive = false;
  let countdownTimer = null;
  let finishCountdown = null; // set while a count-in is running; skips it

  /* steps = how many numbers before "GO!". A fresh game gets a full 3, but a
     resume only gets 1 — waiting three seconds every time you unpause (or
     every time you tab away and back) is friction, not drama. Any input
     skips the rest. */
  function runCountdown(steps = 3) {
    if (countdownTimer) clearTimeout(countdownTimer);
    countdownActive = true;
    game.inCountdown = true;
    game.isPaused = true;
    let n = steps;

    const finish = () => {
      if (countdownTimer) clearTimeout(countdownTimer);
      countdownTimer = null;
      countdownOverlay.classList.remove('active');
      countdownActive = false;
      game.inCountdown = false;
      game.isPaused = false;
      game.lastStepTime = performance.now();
      finishCountdown = null;
    };
    finishCountdown = finish;

    const tick = () => {
      if (!game.isRunning) { // Game ended mid-countdown — bail out
        cancelCountdown();
        return;
      }
      countdownNum.textContent = n > 0 ? n : 'GO!';
      countdownNum.style.color = n > 0 ? 'var(--accent-cyan)' : 'var(--accent-lime)';
      // Re-trigger the pop animation on each number
      countdownNum.style.animation = 'none';
      void countdownNum.offsetWidth;
      countdownNum.style.animation = '';
      countdownOverlay.classList.add('active');
      audio.playClick();

      if (n <= 0) {
        countdownTimer = setTimeout(finish, 380);
        return;
      }
      n--;
      countdownTimer = setTimeout(tick, 520);
    };
    tick();
  }

  function cancelCountdown() {
    if (countdownTimer) clearTimeout(countdownTimer);
    countdownTimer = null;
    countdownActive = false;
    game.inCountdown = false;
    finishCountdown = null;
    countdownOverlay?.classList.remove('active');
  }

  // Start & Restart Game
  function startGame() {
    startOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');
    pauseOverlay.classList.remove('active');
    rewindOverlay.classList.remove('active');
    btnPause.classList.remove('disabled');
    
    // Auto-collapse sidebar on mobile
    sidebarPanel?.classList.remove('open');
    
    audio.playClick();

    // Resume persisted BGM preference on first (gesture-driven) game start
    if (storage.getSetting('bgm') && !audio.bgmPlaying) {
      audio.toggleBGM();
    }

    // A mode picked mid-run takes effect here
    if (pendingMode) {
      game.mode = pendingMode;
      pendingMode = null;
      refreshScores();
    }

    game.start(game.mode);
    runCountdown();
  }

  // Tap anywhere to start
  startOverlay?.addEventListener('click', (e) => {
    // Don't start if they clicked the mode selector or theme buttons
    if (e.target.closest('.mode-selector') || e.target.closest('.nav-actions')) return;
    startGame();
  });

  // Input Handling: Keyboard Controls
  window.addEventListener('keydown', (e) => {
    // Typing in a text field (e.g. the leaderboard name) is never game input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Open modals capture input
    if (achievementsModal?.classList.contains('active')) {
      if (e.key === 'Escape') closeAchievements();
      return;
    }
    if (leaderboardModal?.classList.contains('active')) {
      if (e.key === 'Escape') closeLeaderboard();
      return;
    }
    if (howtoModal?.classList.contains('active')) {
      if (e.key === 'Escape') {
        howtoModal.classList.remove('active');
        audio.playClick();
      }
      return;
    }
    // Mid-countdown: any play input skips the rest of the count, then falls
    // through below so a direction key also steers on the same press.
    if (countdownActive) {
      const skipKeys = ['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                        'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (!skipKeys.includes(e.key)) return;
      e.preventDefault();
      finishCountdown?.();
    }

    // Handle keyboard quick-start if on start or game over screen
    if (!game.isRunning) {
      if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
        startGame();
      }
      return;
    }

    audio.init();

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        game.snake.setDirection(0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        game.snake.setDirection(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        game.snake.setDirection(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        game.snake.setDirection(1, 0);
        break;
      case ' ':
        e.preventDefault();
        game.triggerSurge();
        break;
      case 'p':
      case 'P':
      case 'Escape':
        togglePause();
        break;
      case 'r':
      case 'R':
        if (rewindOverlay && rewindOverlay.classList.contains('active')) {
          audio.playClick();
          game.triggerRewind();
        }
        break;
    }
  });

  /* ==========================================================================
     UNIFIED TOUCH / POINTER STEERING (tap + swipe on the board)

     One pointer pipeline instead of the old separate tap (pointer events) and
     swipe (touch events) systems, which double-fired on the same gesture.

     Tap: a press that moves less than TAP_SLOP. Decided on pointerup so a
     swipe never begins with a spurious turn. The turn axis is judged against
     the direction the snake is ABOUT to travel (last queued input), not its
     current heading — otherwise two quick taps inside one movement tick read
     as the same axis and the second is dropped, which feels like a cooldown
     between taps.

     Swipe: every SWIPE_STEP px of travel issues a turn and re-anchors, so a
     single continuous drag can chain corners.
     ========================================================================== */
  const gameCanvas = document.getElementById('game-canvas');
  const TAP_SLOP = 14;
  const SWIPE_STEP = 24;
  let ptr = null; // { id, startX, startY, anchorX, anchorY, swiped }

  const steerable = () => game.isRunning && !game.isPaused && game.snake;

  // The direction the head will have once queued inputs run out
  const pendingDir = () => {
    const q = game.snake.inputQueue;
    return q.length ? q[q.length - 1] : game.snake.direction;
  };

  // Small burst where the player touched, so steering feels acknowledged
  const tapFeedback = (clientX, clientY) => {
    const rect = gameCanvas.getBoundingClientRect();
    game.snake.spawnParticles(clientX - rect.left, clientY - rect.top, '#00f0ff', 4, 2.5);
  };

  gameCanvas?.addEventListener('pointerdown', (e) => {
    ptr = { id: e.pointerId, startX: e.clientX, startY: e.clientY, anchorX: e.clientX, anchorY: e.clientY, swiped: false };
    // Keep receiving moves even if the finger drifts off the board mid-swipe
    try { gameCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  });

  gameCanvas?.addEventListener('pointermove', (e) => {
    if (!ptr || e.pointerId !== ptr.id || !steerable()) return;
    const dx = e.clientX - ptr.anchorX;
    const dy = e.clientY - ptr.anchorY;
    if (Math.abs(dx) < SWIPE_STEP && Math.abs(dy) < SWIPE_STEP) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      game.snake.setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      game.snake.setDirection(0, dy > 0 ? 1 : -1);
    }
    ptr.anchorX = e.clientX;
    ptr.anchorY = e.clientY;
    ptr.swiped = true;
  });

  gameCanvas?.addEventListener('pointerup', (e) => {
    const p = ptr;
    ptr = null;
    if (!p || e.pointerId !== p.id || p.swiped) return;
    if (Math.abs(e.clientX - p.startX) > TAP_SLOP || Math.abs(e.clientY - p.startY) > TAP_SLOP) return;
    if (!steerable()) return;

    const rect = gameCanvas.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const tapY = e.clientY - rect.top;
    const head = game.snake.segments[0];
    const headX = (head.x + 0.5) * game.cellSize;
    const headY = (head.y + 0.5) * game.cellSize;

    const before = game.snake.inputQueue.length;
    if (pendingDir().x !== 0) {
      // Will be moving horizontally: tap above or below the head to turn
      game.snake.setDirection(0, tapY < headY ? -1 : 1);
    } else {
      // Will be moving vertically: tap left or right of the head to turn
      game.snake.setDirection(tapX < headX ? -1 : 1, 0);
    }
    if (game.snake.inputQueue.length > before) tapFeedback(e.clientX, e.clientY);
  });

  gameCanvas?.addEventListener('pointercancel', () => { ptr = null; });

  btnSurgeTouch?.addEventListener('click', () => { game.triggerSurge(); });

  // Tap / click anywhere on the board to skip the count-in
  const viewport = document.getElementById('game-viewport');
  viewport?.addEventListener('click', (e) => {
    if (!countdownActive) return;
    if (e.target.closest('.overlay-screen') || e.target.closest('button')) return;
    finishCountdown?.();
  });

  // Auto-Pause when the window loses focus. visibilitychange alone misses
  // the common desktop case of clicking another window while the tab stays
  // visible — the snake keeps sliding into a wall behind the other app.
  window.addEventListener('blur', () => {
    if (game.isRunning && !game.isPaused && !countdownActive) togglePause();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !game.isRunning) return;
    if (countdownActive) {
      // Background tabs throttle timers, which would stall the count-in.
      // Drop straight to a normal pause instead.
      cancelCountdown();
      game.isPaused = true;
      pauseOverlay.classList.add('active');
      btnPause.innerHTML = '<i data-lucide="play"></i>';
      refreshIcons();
    } else if (!game.isPaused) {
      togglePause();
    }
  });

  /* Returns a running game to the start screen — used when a setting change
     makes the in-progress run invalid (mode or grid change). */
  function abortToStartScreen() {
    cancelCountdown();
    pauseOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');
    rewindOverlay.classList.remove('active');
    btnPause.classList.add('disabled');
    btnPause.innerHTML = '<i data-lucide="pause"></i>';
    startOverlay.classList.add('active');
    refreshIcons();
  }

  // Game Mode Selection Buttons
  let pendingMode = null; // chosen mid-run, applied on the next game
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');

      // Applying a new mode's collision rules to a board built for the old one
      // is incoherent, but killing a run in progress to avoid that is worse —
      // so queue it for the next game and leave the current one alone.
      if (game.isRunning) {
        pendingMode = mode;
        const label = btn.querySelector('.mode-name')?.textContent.trim() || mode;
        showToast(`🎮 ${label} starts on your next game`);
      } else {
        game.mode = mode;
        pendingMode = null;
        refreshScores();
      }
      audio.playClick();
    });
  });

  // Difficulty Selection Buttons
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.getAttribute('data-diff');
      
      // Update UI classes
      document.querySelectorAll('.difficulty-btn').forEach(b => {
        b.className = 'btn-secondary difficulty-btn';
        b.classList.remove('active');
      });
      btn.className = 'btn-primary difficulty-btn active';

      storage.setDifficulty(diff);
      const wasRunning = game.isRunning;
      game.setDifficulty(diff); // Rebuilds the grid, ending any active game
      if (wasRunning) abortToStartScreen();
      audio.playClick();
    });
  });

  // HUD Update Frame Loop
  setInterval(() => {
    if (game.isRunning) {
      scoreVal.textContent = game.score.toLocaleString();
      comboVal.textContent = `${game.combo}x`;
      surgeFill.style.width = `${game.surgeMeter}%`;

      // "Best" tracks you live once you pass it — beating your record
      // mid-run should feel like it, not wait for the death screen
      const best = storage.getHighScore(game.mode);
      if (game.score > best) {
        highVal.textContent = game.score.toLocaleString();
        scoreVal.style.color = 'var(--accent-gold)';
      } else {
        scoreVal.style.color = '';
      }

      if (game.surgeMeter >= 100) {
        surgeFill.classList.add('surge-ready');
      } else {
        surgeFill.classList.remove('surge-ready');
      }

      if (game.mode === 'pvp') {
        pvpTimerBox.style.display = 'flex';
        pvpTimerVal.textContent = `${game.pvpTimeRemaining}s`;
      } else {
        pvpTimerBox.style.display = 'none';
      }

      // Classic has no surge: show the combo alone and hide the surge chrome
      const isClassic = game.mode === 'classic';
      const surgeBar = document.querySelector('.surge-bar-bg');
      const surgeLabel = document.getElementById('surge-label-text');
      if (surgeBar) surgeBar.style.display = isClassic ? 'none' : '';
      if (surgeLabel) surgeLabel.textContent = isClassic ? 'COMBO' : 'SURGE POWER';
      if (btnSurgeTouch) btnSurgeTouch.style.display = isClassic ? 'none' : '';

      // Active buff pills with remaining time (~10 ticks per second)
      if (buffBox) {
        const pills = Object.entries(game.buffs)
          .filter(([, ticks]) => ticks > 0)
          .map(([key, ticks]) => `<span class="buff-pill">${BUFF_META[key].icon} ${BUFF_META[key].label} ${Math.ceil(ticks / 10)}s</span>`)
          .join('');
        if (buffBox.innerHTML !== pills) buffBox.innerHTML = pills;
      }
    } else if (buffBox && buffBox.innerHTML) {
      buffBox.innerHTML = '';
    }
  }, 100);

  btnStart?.addEventListener('click', startGame);
  
  // Also allow tapping anywhere on the game over screen to restart (excluding buttons)
  gameOverOverlay?.addEventListener('click', (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'button' || tag === 'input') return;
    startGame();
  });
  
  btnRestart?.addEventListener('click', startGame);

  // Pause Controls
  const togglePause = () => {
    if (!game.isRunning) return;
    // Don't allow unpausing out of the rewind death-prompt or mid-countdown
    if (rewindOverlay?.classList.contains('active')) return;
    if (countdownActive) return;

    if (game.isPaused) {
      // Resuming: hide the overlay and count back in
      pauseOverlay.classList.remove('active');
      btnPause.innerHTML = '<i data-lucide="pause"></i>';
      runCountdown(1);
    } else {
      game.togglePause();
      pauseOverlay.classList.add('active');
      btnPause.innerHTML = '<i data-lucide="play"></i>';
    }
    refreshIcons();
  };

  btnPause?.addEventListener('click', togglePause);
  btnResume?.addEventListener('click', togglePause);

  // Rewind Controls
  game.onRewindPrompt = () => {
    rewindOverlay.classList.add('active');
    audio.playDie(); // Initial crash sound
  };

  game.onRewindComplete = () => {
    rewindOverlay.classList.remove('active');
  };

  btnRewind?.addEventListener('click', () => {
    if (rewindOverlay.classList.contains('active')) {
      audio.playClick();
      game.triggerRewind();
    }
  });

  btnSkipRewind?.addEventListener('click', () => {
    rewindOverlay.classList.remove('active');
    game.isPaused = false;
    game.surgeMeter = 0; // Prevent intercept loop
    game.endGame(false); // Force full death
  });

  // Mute & BGM Controls
  btnMute?.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    storage.setSetting('muted', isMuted);
    btnMute.innerHTML = isMuted ? '<i data-lucide="volume-x"></i>' : '<i data-lucide="volume-2"></i>';
    btnMute.classList.toggle('disabled-emoji', isMuted);
    refreshIcons();
  });

  btnBgm?.addEventListener('click', () => {
    const isBgmOn = audio.toggleBGM();
    storage.setSetting('bgm', isBgmOn);
    btnBgm.classList.toggle('disabled-emoji', !isBgmOn);
  });

  volumeSlider?.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    audio.setVolume(vol);
    storage.setSetting('volume', vol);
  });

  // Snake Skin Picker
  function renderSkins() {
    const grid = document.getElementById('skin-grid');
    if (!grid) return;
    const unlocked = storage.data.unlockedSkins;
    const selected = storage.data.selectedSkin;
    grid.innerHTML = SKINS.map(s => {
      const isUnlocked = unlocked.includes(s.id);
      const cls = `skin-btn ${isUnlocked ? '' : 'locked'} ${selected === s.id ? 'selected' : ''}`;
      const title = isUnlocked ? s.name : `${s.name} — LOCKED: ${s.desc}`;
      const swatches = s.palette.slice(0, 3)
        .map(c => `<span class="skin-swatch" style="background:${c}"></span>`).join('');
      return `<button class="${cls}" data-skin="${s.id}" title="${title}">
        <span>${isUnlocked ? s.icon : '🔒'}</span>
        <span class="skin-swatches">${swatches}</span>
      </button>`;
    }).join('');

    grid.querySelectorAll('.skin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-skin');
        if (storage.setSkin(id)) {
          renderSkins();
          audio.playClick();
          showToast(`${getSkin(id).icon} Skin equipped: ${getSkin(id).name}`);
        } else {
          audio.playClick();
          showToast(`🔒 ${getSkin(id).desc}`);
        }
      });
    });
  }
  renderSkins();

  storage.onSkinUnlocked = (skin) => {
    audio.playAchievement();
    showToast(`${skin.icon} New skin unlocked: ${skin.name}!`);
    renderSkins();
  };

  // Leaderboard Modal — local runs plus the shared global board
  let lbMode = 'surge';
  let lbScope = 'global';
  const globalCache = {}; // mode -> entries, refreshed on each modal open

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  async function fetchGlobal(mode, force = false) {
    if (!force && globalCache[mode]) return globalCache[mode];
    const res = await fetch(`/api/leaderboard?mode=${mode}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    globalCache[mode] = data.entries || [];
    return globalCache[mode];
  }

  function lbRows(entries, withNames) {
    const you = (storage.getSetting('playerName') || '').toLowerCase();
    return entries.map((e, i) => `
      <div class="lb-row top-${i + 1} ${withNames && you && e.name.toLowerCase() === you ? 'is-you' : ''}">
        <span class="lb-rank">#${i + 1}</span>
        ${withNames ? `<span class="lb-name">${esc(e.name)}</span>` : ''}
        <span class="lb-score">${e.score.toLocaleString()}</span>
        <span class="lb-date">${e.date || ''}</span>
      </div>`).join('');
  }

  function renderLeaderboard() {
    const list = document.getElementById('lb-list');
    if (!list) return;

    document.querySelectorAll('#lb-tabs .lb-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-lb-mode') === lbMode);
    });
    document.querySelectorAll('#lb-scope-tabs .lb-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-lb-scope') === lbScope);
    });

    if (lbScope === 'local') {
      const entries = storage.getLeaderboard(lbMode);
      list.innerHTML = entries.length
        ? lbRows(entries, false)
        : `<div class="lb-empty">No runs recorded in this mode yet.</div>`;
      return;
    }

    // Global scope
    list.innerHTML = `<div class="lb-empty">Loading global scores…</div>`;
    const requested = `${lbMode}|${lbScope}`;
    fetchGlobal(lbMode)
      .then(entries => {
        if (`${lbMode}|${lbScope}` !== requested) return; // user switched tabs mid-fetch
        list.innerHTML = entries.length
          ? lbRows(entries, true)
          : `<div class="lb-empty">No global scores yet — set the first one!</div>`;
      })
      .catch(() => {
        if (`${lbMode}|${lbScope}` !== requested) return;
        list.innerHTML = `<div class="lb-empty">Couldn't reach the global board. Check your connection.</div>`;
      });
  }

  function closeLeaderboard() {
    leaderboardModal?.classList.remove('active');
    audio.playClick();
  }

  document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
    lbMode = game.mode;
    Object.keys(globalCache).forEach(k => delete globalCache[k]); // fresh scores per open
    renderLeaderboard();
    openModal(leaderboardModal);
    sidebarPanel?.classList.remove('open');
    audio.playClick();
  });

  document.getElementById('btn-close-leaderboard')?.addEventListener('click', closeLeaderboard);

  // How To / Snake Whispering Modal
  btnHowto?.addEventListener('click', () => {
    audio.playClick();
    openModal(howtoModal);
    // Ensure new icons render if fetched dynamically
    window.lucide?.createIcons();
  });

  btnCloseHowto?.addEventListener('click', () => {
    audio.playClick();
    howtoModal.classList.remove('active');
  });

  howtoModal?.addEventListener('click', (e) => {
    if (e.target === howtoModal) {
      audio.playClick();
      howtoModal.classList.remove('active');
    }
  });

  leaderboardModal?.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) closeLeaderboard();
  });

  document.querySelectorAll('#lb-tabs .lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      lbMode = tab.getAttribute('data-lb-mode');
      renderLeaderboard();
      audio.playClick();
    });
  });

  document.querySelectorAll('#lb-scope-tabs .lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      lbScope = tab.getAttribute('data-lb-scope');
      renderLeaderboard();
      audio.playClick();
    });
  });

  // Achievements Modal
  function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const unlockedIds = storage.data.unlockedAchievements;
    grid.innerHTML = ACHIEVEMENTS.map(a => {
      const unlocked = unlockedIds.includes(a.id);
      return `<div class="ach-item ${unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${a.icon}</span>
        <div>
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
      </div>`;
    }).join('');
    const count = document.getElementById('ach-count');
    if (count) count.textContent = `${unlockedIds.length}/${ACHIEVEMENTS.length} UNLOCKED`;
  }

  function closeAchievements() {
    achievementsModal?.classList.remove('active');
    audio.playClick();
  }

  document.getElementById('btn-achievements')?.addEventListener('click', () => {
    audio.playClick();
    renderAchievements();
    openModal(achievementsModal);
  });

  document.getElementById('btn-close-achievements')?.addEventListener('click', closeAchievements);

  achievementsModal?.addEventListener('click', (e) => {
    if (e.target === achievementsModal) closeAchievements();
  });

  // Theme Switcher Loop
  const themes = ['cyber', 'synthwave', 'gameboy', 'nokia', 'oled'];
  btnTheme?.addEventListener('click', () => {
    const curr = storage.getTheme();
    const nextIndex = (themes.indexOf(curr) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    storage.setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    refreshScores();
    audio.playClick();
    showToast(`🎨 Theme switched to ${nextTheme.toUpperCase()}`);
  });

  // Game Over Callback
  game.onGameOver = (res) => {
    cancelCountdown();
    btnPause.classList.add('disabled');

    // Record the run and surface its leaderboard placing
    const rank = storage.addLeaderboardEntry(res.mode, res.score);
    const rankBadge = document.getElementById('rank-badge');
    if (rankBadge) {
      if (rank) {
        rankBadge.textContent = `🏅 LEADERBOARD #${rank}`;
        rankBadge.style.display = 'inline-block';
      } else {
        rankBadge.style.display = 'none';
      }
    }

    const title = document.getElementById('game-over-title');
    if (title) {
      if (res.mode === 'pvp') {
        title.textContent = res.isWin ? 'VICTORY!' : 'DEFEAT';
        // .overlay-title paints text via background-clip, so restyle the gradient
        title.style.background = res.isWin
          ? 'linear-gradient(135deg, #fff, var(--accent-gold))'
          : 'linear-gradient(135deg, #fff, var(--accent-magenta))';
        title.style.webkitBackgroundClip = 'text';
      } else {
        title.textContent = 'GAME OVER';
        title.style.background = '';
      }
    }

    finalScoreVal.textContent = res.score.toLocaleString();
    finalHighVal.textContent = storage.getHighScore(res.mode).toLocaleString();
    finalMergesVal.textContent = res.merges;

    if (res.isNewHighScore) {
      newHighBadge.style.display = 'inline-block';
      audio.playAchievement();
    } else {
      newHighBadge.style.display = 'none';
    }

    refreshScores();
    renderSkins(); // A run may have just unlocked a skin
    prepareGlobalSubmit(res);
    gameOverOverlay.classList.add('active');
  };

  /* ------- Global leaderboard submission on the game-over card -------
     First qualifying run asks for a name once; after that every run
     auto-submits under the saved name and just shows the resulting rank. */
  const submitBox = document.getElementById('global-submit-box');
  const nameInput = document.getElementById('player-name-input');
  const btnSubmitGlobal = document.getElementById('btn-submit-global');
  const globalRankBadge = document.getElementById('global-rank-badge');
  let lastRun = null;

  async function submitGlobal(run, name) {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: run.mode, score: run.score, name })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function showGlobalRank(result) {
    if (!globalRankBadge) return;
    globalRankBadge.textContent = result.improved
      ? (result.rank && result.rank <= 25 ? `🌍 GLOBAL #${result.rank}` : '🌍 On the global board!')
      : '🌍 Your global best still stands';
    globalRankBadge.style.display = 'inline-block';
    delete globalCache[lastRun?.mode]; // stale now
  }

  function prepareGlobalSubmit(res) {
    lastRun = { mode: res.mode, score: res.score };
    if (globalRankBadge) globalRankBadge.style.display = 'none';
    if (!submitBox) return;

    if (res.score <= 0 || !navigator.onLine) {
      submitBox.style.display = 'none';
      return;
    }

    const savedName = storage.getSetting('playerName');
    if (savedName) {
      submitBox.style.display = 'none';
      // Returning player: submit quietly, but only when this run beats what
      // we've already sent — every death posting to the API would chew
      // through the per-IP rate limit for nothing.
      const best = storage.getSetting('bestSubmitted') || {};
      if (res.score > (best[res.mode] || 0)) {
        submitGlobal(lastRun, savedName).then(result => {
          best[res.mode] = res.score;
          storage.setSetting('bestSubmitted', best);
          showGlobalRank(result);
        }).catch(() => {});
      }
    } else {
      submitBox.style.display = 'flex';
      if (nameInput) nameInput.value = '';
    }
  }

  async function handleGlobalSubmit() {
    const name = (nameInput?.value || '').trim().replace(/[^A-Za-z0-9 _\-.]/g, '').slice(0, 16);
    if (!name) {
      showToast('⚠️ Enter a name first');
      nameInput?.focus();
      return;
    }
    if (!lastRun) return;
    btnSubmitGlobal.disabled = true;
    try {
      const result = await submitGlobal(lastRun, name);
      storage.setSetting('playerName', name);
      const best = storage.getSetting('bestSubmitted') || {};
      best[lastRun.mode] = Math.max(best[lastRun.mode] || 0, lastRun.score);
      storage.setSetting('bestSubmitted', best);
      submitBox.style.display = 'none';
      showGlobalRank(result);
      audio.playAchievement();
    } catch {
      showToast('⚠️ Could not reach the global board');
    } finally {
      btnSubmitGlobal.disabled = false;
    }
  }

  btnSubmitGlobal?.addEventListener('click', handleGlobalSubmit);
  nameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGlobalSubmit();
  });

  // Share Card Download & Copy
  btnShareCard?.addEventListener('click', () => {
    StatCardGenerator.downloadCard({
      score: game.score,
      mode: game.mode,
      merges: game.mergesCount,
      maxCombo: storage.data.stats.maxCombo,
      foodEaten: storage.data.stats.foodEaten
    });
    audio.playClick();
  });

  btnShareText?.addEventListener('click', () => {
    StatCardGenerator.copyShareText({
      score: game.score,
      mode: game.mode,
      merges: game.mergesCount
    }).then(ok => {
      showToast(ok ? '📋 Score copied to clipboard!' : '⚠️ Could not copy to clipboard');
    });
    audio.playClick();
  });
});
