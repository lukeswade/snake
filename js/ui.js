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
  const btnShareCard = document.getElementById('btn-share-card');
  const btnShareText = document.getElementById('btn-share-text');
  const btnSurgeTouch = document.getElementById('btn-surge-touch');

  const finalScoreVal = document.getElementById('final-score-val');
  const finalHighVal = document.getElementById('final-high-val');
  const finalMergesVal = document.getElementById('final-merges-val');
  const newHighBadge = document.getElementById('new-high-badge');

  const buffBox = document.getElementById('buff-indicators');
  const BUFF_META = {
    magnet: { icon: '🧲', label: 'MAGNET' },
    ghost: { icon: '👻', label: 'GHOST' },
    slowmo: { icon: '🐌', label: 'SLOW-MO' }
  };

  // Apply Stored Theme & Difficulty
  const currentTheme = storage.getTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Apply Persisted Audio Settings
  if (storage.getSetting('muted')) {
    audio.muted = true;
    if (btnMute) {
      btnMute.innerHTML = '<i data-lucide="volume-x"></i>';
      btnMute.classList.add('disabled-emoji');
    }
  }
  if (!storage.getSetting('bgm')) {
    btnBgm?.classList.add('disabled-emoji'); // BGM itself starts on first game (needs a user gesture)
  }

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
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 4000);
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
    // Open modals capture input
    if (achievementsModal?.classList.contains('active')) {
      if (e.key === 'Escape') closeAchievements();
      return;
    }
    if (leaderboardModal?.classList.contains('active')) {
      if (e.key === 'Escape') closeLeaderboard();
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

  // Mobile Virtual Joystick Touch Controls
  const joystickBase = document.getElementById('joystick-base');
  const joystickKnob = document.getElementById('joystick-knob');
  
  if (joystickBase && joystickKnob) {
    let joystickActive = false;
    let baseCenter = { x: 0, y: 0 };
    const maxDist = 40; // Max radius for knob

    const handleJoystickStart = (e) => {
      joystickActive = true;
      const rect = joystickBase.getBoundingClientRect();
      baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      handleJoystickMove(e);
    };

    const handleJoystickMove = (e) => {
      if (!joystickActive) return;
      e.preventDefault();
      
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - baseCenter.x;
      const dy = touch.clientY - baseCenter.y;
      const dist = Math.min(Math.sqrt(dx*dx + dy*dy), maxDist);
      const angle = Math.atan2(dy, dx);
      
      const knobX = Math.cos(angle) * dist;
      const knobY = Math.sin(angle) * dist;
      
      joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Map to snake direction if distance is significant enough
      if (dist > 15) {
        if (Math.abs(dx) > Math.abs(dy)) {
          game.snake.setDirection(dx > 0 ? 1 : -1, 0);
        } else {
          game.snake.setDirection(0, dy > 0 ? 1 : -1);
        }
      }
    };

    const handleJoystickEnd = () => {
      joystickActive = false;
      joystickKnob.style.transform = `translate(0px, 0px)`;
    };

    joystickBase.addEventListener('touchstart', handleJoystickStart, {passive: false});
    joystickBase.addEventListener('touchmove', handleJoystickMove, {passive: false});
    joystickBase.addEventListener('touchend', handleJoystickEnd);
    joystickBase.addEventListener('mousedown', handleJoystickStart);
    document.addEventListener('mousemove', handleJoystickMove);
    document.addEventListener('mouseup', handleJoystickEnd);
  }

  // Canvas Directional Tapping
  const gameCanvas = document.getElementById('game-canvas');
  gameCanvas?.addEventListener('pointerdown', (e) => {
    if (!game.isRunning || game.isPaused || game.isGameOver) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const tapY = e.clientY - rect.top;

    const dx = (rect.width - game.cols * game.cellSize) / 2;
    const dy = (rect.height - game.rows * game.cellSize) / 2;

    const headX = (game.snake.segments[0].x + 0.5) * game.cellSize + dx;
    const headY = (game.snake.segments[0].y + 0.5) * game.cellSize + dy;

    const snakeDx = game.snake.dx;
    const snakeDy = game.snake.dy;

    if (snakeDx !== 0) {
      // Moving horizontally, tap above or below
      if (tapY < headY) {
        game.snake.setDirection(0, -1);
      } else {
        game.snake.setDirection(0, 1);
      }
    } else if (snakeDy !== 0) {
      // Moving vertically, tap left or right
      if (tapX < headX) {
        game.snake.setDirection(-1, 0);
      } else {
        game.snake.setDirection(1, 0);
      }
    }
  });

  btnSurgeTouch?.addEventListener('click', () => { game.triggerSurge(); });

  // Swipe Gestures on the Game Viewport (mobile alternative to the joystick)
  const viewport = document.getElementById('game-viewport');
  let swipeStart = null;
  viewport?.addEventListener('touchstart', (e) => {
    if (e.target.closest('.d-pad') || e.target.closest('.surge-touch-btn') || e.target.closest('.overlay-screen')) return;
    if (countdownActive) finishCountdown?.(); // tap to skip the count-in
    swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  // Click to skip the count-in on desktop too
  viewport?.addEventListener('click', (e) => {
    if (!countdownActive) return;
    if (e.target.closest('.overlay-screen') || e.target.closest('button')) return;
    finishCountdown?.();
  });

  viewport?.addEventListener('touchmove', (e) => {
    if (!swipeStart || !game.isRunning || game.isPaused || !game.snake) return;
    const dx = e.touches[0].clientX - swipeStart.x;
    const dy = e.touches[0].clientY - swipeStart.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      game.snake.setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      game.snake.setDirection(0, dy > 0 ? 1 : -1);
    }
    // Re-anchor so a continuous drag can chain multiple turns
    swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  viewport?.addEventListener('touchend', () => { swipeStart = null; });

  // Auto-Pause when the tab loses focus
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
    if (e.target.tagName.toLowerCase() === 'button') return;
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

  // Leaderboard Modal
  let lbMode = 'surge';

  function renderLeaderboard() {
    const list = document.getElementById('lb-list');
    if (!list) return;
    const entries = storage.getLeaderboard(lbMode);
    if (!entries.length) {
      list.innerHTML = `<div class="lb-empty">No runs recorded in this mode yet.</div>`;
    } else {
      list.innerHTML = entries.map((e, i) => `
        <div class="lb-row top-${i + 1}">
          <span class="lb-rank">#${i + 1}</span>
          <span class="lb-score">${e.score.toLocaleString()}</span>
          <span class="lb-date">${e.date || ''}</span>
        </div>`).join('');
    }
    document.querySelectorAll('.lb-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-lb-mode') === lbMode);
    });
  }

  function closeLeaderboard() {
    leaderboardModal?.classList.remove('active');
    audio.playClick();
  }

  document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
    if (game.isRunning && !game.isPaused && !countdownActive) togglePause();
    lbMode = game.mode;
    renderLeaderboard();
    leaderboardModal?.classList.add('active');
    sidebarPanel?.classList.remove('open');
    audio.playClick();
  });

  document.getElementById('btn-close-leaderboard')?.addEventListener('click', closeLeaderboard);

  leaderboardModal?.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) closeLeaderboard();
  });

  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      lbMode = tab.getAttribute('data-lb-mode');
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
    if (game.isRunning && !game.isPaused) togglePause();
    renderAchievements();
    achievementsModal?.classList.add('active');
    audio.playClick();
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
    gameOverOverlay.classList.add('active');
  };

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
