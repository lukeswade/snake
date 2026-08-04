/* ==========================================================================
   UI CONTROLLER & EVENT BINDINGS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine('game-canvas');
  window.game = game; // Expose for audio.js dynamic percussion

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

  // Apply Stored Theme
  const currentTheme = storage.getTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

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

  // Start & Restart Game
  function startGame() {
    startOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');
    pauseOverlay.classList.remove('active');
    rewindOverlay.classList.remove('active');
    btnPause.classList.remove('disabled');
    audio.playClick();
    game.start(game.mode);
  }

  // Tap anywhere to start
  startOverlay?.addEventListener('click', (e) => {
    // Don't start if they clicked the mode selector or theme buttons
    if (e.target.closest('.mode-selector') || e.target.closest('.nav-actions')) return;
    startGame();
  });

  // Input Handling: Keyboard Controls
  window.addEventListener('keydown', (e) => {
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

  btnSurgeTouch?.addEventListener('click', () => { game.triggerSurge(); });

  // Game Mode Selection Buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      game.mode = btn.getAttribute('data-mode');
      refreshScores();
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
    game.isPaused = !game.isPaused;
    if (game.isPaused) {
      pauseOverlay.classList.add('active');
    } else {
      pauseOverlay.classList.remove('active');
    }
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
    btnMute.textContent = isMuted ? '🔇' : '🔊';
  });

  btnBgm?.addEventListener('click', () => {
    const isBgmOn = audio.toggleBGM();
    btnBgm.classList.toggle('disabled-emoji', !isBgmOn);
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
    btnPause.classList.add('disabled');
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
    const shareStr = StatCardGenerator.copyShareText({
      score: game.score,
      mode: game.mode,
      merges: game.mergesCount
    });
    showToast('📋 Score copied to clipboard!');
    audio.playClick();
  });
});
