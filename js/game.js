/* ==========================================================================
   MAIN GAME ENGINE & LOOP CONTROLLER
   ========================================================================== */

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    
    const diff = storage.getDifficulty();
    this.setCellSizeFromDifficulty(diff);
    this.cols = 40;
    this.rows = 24;

    this.mode = 'surge'; // 'classic', 'surge', 'pvp'
    this.snake = null;
    this.aiSnakes = [];
    this.foodList = [];
    this.floatingTexts = [];
    
    this.score = 0;
    this.combo = 1;
    this.comboTimer = null;
    this.mergesCount = 0;
    this.surgeMeter = 0; // 0 to 100
    this.isSurging = false;
    this.surgeDuration = 0;
    
    this.obstacles = [];
    this.buffs = { magnet: 0, ghost: 0, slowmo: 0 };
    
    // Chrono-Surge History Tracking
    this.historyBuffer = [];
    this.isRewinding = false;
    
    this.pvpTimeRemaining = 60;
    this.pvpTimer = null;

    this.isRunning = false;
    this.isPaused = false;

    this.lastStepTime = 0;

    this.shakeTime = 0;
    this.shakeIntensity = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  setDifficulty(diff) {
    this.setCellSizeFromDifficulty(diff);
    this.resizeCanvas();
    this.reset();
  }

  setCellSizeFromDifficulty(diff) {
    // Difficulty controls both grid density (cell size) and base tick speed
    switch (diff) {
      case 'easy':
        this.cellSize = 30;
        this.stepInterval = 120;
        break;
      case 'medium':
        this.cellSize = 25;
        this.stepInterval = 105;
        break;
      case 'hard':
      default:
        this.cellSize = 20;
        this.stepInterval = 90;
    }
  }

  resizeCanvas() {
    const main = document.querySelector('main');
    if (!main) return;

    // Reserve space for the sidebar only while it is actually in the layout
    // flow — under the mobile breakpoint it becomes an absolute drawer, and
    // subtracting its width there would shrink the board for no reason.
    const sidebar = document.querySelector('.sidebar-panel');
    const sidebarInFlow = sidebar && getComputedStyle(sidebar).position !== 'absolute';
    const reserved = sidebarInFlow ? sidebar.offsetWidth + 16 : 0;

    const availableWidth = main.clientWidth - reserved - 32;
    const availableHeight = main.clientHeight - 32;

    this.cols = Math.floor(availableWidth / this.cellSize);
    this.rows = Math.floor(availableHeight / this.cellSize);

    // Keep grid dimensions balanced. The lower bound stays small enough that a
    // narrow phone viewport can't be forced into a board wider than the screen.
    this.cols = Math.max(12, Math.min(48, this.cols));
    this.rows = Math.max(12, Math.min(36, this.rows));

    const finalWidth = this.cols * this.cellSize;
    const finalHeight = this.rows * this.cellSize;

    // Shrink the viewport to precisely wrap the grid, eliminating empty space
    const viewport = document.getElementById('game-viewport');
    if (viewport) {
      viewport.style.flex = 'none';
      viewport.style.width = `${finalWidth + 40}px`;
      viewport.style.height = `${finalHeight + 40}px`;
    }

    // High-DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = finalWidth * dpr;
    this.canvas.height = finalHeight * dpr;
    this.canvas.style.width = `${finalWidth}px`;
    this.canvas.style.height = `${finalHeight}px`;
    
    // Normalize coordinate system to use CSS pixels
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(mode = 'surge') {
    this.mode = mode;
    this.score = 0;
    this.combo = 1;
    this.mergesCount = 0;
    this.surgeMeter = 0;
    this.isSurging = false;
    this.isPaused = false;
    this.surgeDuration = 0;
    this.hitStopFrames = 0;
    this.isRunning = true;
    this.shakeTime = 0;
    audio.setSurgeFilter(false);

    const currentSkin = storage.data.selectedSkin;
    this.snake = new Snake(Math.floor(this.cols / 2), Math.floor(this.rows / 2), 4, currentSkin);

    this.foodList = [];
    this.floatingTexts = [];
    this.obstacles = [];
    this.buffs = { magnet: 0, ghost: 20, slowmo: 0 }; // 2-second invulnerability grace period
    this.historyBuffer = [];
    this.isRewinding = false;
    
    this.combo = 1;
    this.comboTicksLeft = 0;
    
    // Spawn static obstacles
    this.aiSnakes = [];
    this.spawnObstacles(8);
    this.spawnFood(4);

    if (this.mode === 'pvp') {
      this.pvpTimeRemaining = 60;
      this.aiSnakes = [
        new AISnake('ViperBot', '#ff007f', 4, 4),
        new AISnake('CobraBot', '#39ff14', this.cols - 5, this.rows - 5)
      ];
      if (this.pvpTimer) clearInterval(this.pvpTimer);
      this.pvpTimer = setInterval(() => {
        if (this.isRunning && !this.isPaused) {
          this.pvpTimeRemaining--;
          if (this.pvpTimeRemaining <= 0) {
            // Timer expired: highest score wins
            const bestAI = Math.max(0, ...this.aiSnakes.map(a => a.alive ? a.score : 0));
            this.endGame(this.score >= bestAI);
          }
        }
      }, 1000);
    }

    this.lastStepTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  isCellOccupied(x, y) {
    return this.snake.segments.some(s => s.x === x && s.y === y)
      || this.obstacles.some(o => o.x === x && o.y === y)
      || this.foodList.some(f => f.x === x && f.y === y)
      || this.aiSnakes.some(ai => ai.alive && ai.segments.some(s => s.x === x && s.y === y));
  }

  spawnFood(count = 1) {
    for (let i = 0; i < count; i++) {
      let x, y, occupied, attempts = 0;
      do {
        x = Math.floor(Math.random() * this.cols);
        y = Math.floor(Math.random() * this.rows);
        occupied = this.isCellOccupied(x, y);
        attempts++;
      } while (occupied && attempts < 200);
      if (occupied) continue; // Board is effectively full

      const typeRand = Math.random();
      let tier = 1;
      let type = 'normal';

      // 10% chance for a power-up in surge mode
      if (this.mode === 'surge' && Math.random() > 0.90) {
        const powerUps = ['magnet', 'ghost', 'slowmo'];
        type = powerUps[Math.floor(Math.random() * powerUps.length)];
        tier = 1;
      } else if (this.mode === 'surge') {
        if (typeRand > 0.95) { tier = 3; type = 'runner'; }
        else if (typeRand > 0.85) { tier = 3; type = 'gold'; }
        else if (typeRand > 0.60) { tier = 2; type = 'tier2'; }
      }

      this.foodList.push({ x, y, tier, type });
    }
  }

  spawnObstacles(count = 5) {
    for (let i = 0; i < count; i++) {
      let x, y, isValid = false;
      let attempts = 0;
      while (!isValid && attempts < 50) {
        x = Math.floor(Math.random() * this.cols);
        y = Math.floor(Math.random() * this.rows);
        
        // Avoid player spawn (center), edges, and anything already placed
        const distToCenter = Math.abs(x - this.cols/2) + Math.abs(y - this.rows/2);

        if (distToCenter > 4 && !this.isCellOccupied(x, y) && x > 0 && x < this.cols-1 && y > 0 && y < this.rows-1) {
          isValid = true;
          this.obstacles.push({ x, y });
        }
        attempts++;
      }
    }
  }

  hitStop(frames = 3) {
    this.hitStopFrames = frames;
  }

  togglePause() {
    // inCountdown is owned by the UI's count-in; unpausing during it would
    // drop the player into a moving board before the count finished.
    if (!this.isRunning || this.isRewinding || this.inCountdown) return;
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      // Avoid a huge delta (instant multi-step) on resume
      this.lastStepTime = performance.now();
    }
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.isSurging = false;
    this.isRewinding = false;
    this.inCountdown = false;
    if (this.pvpTimer) clearInterval(this.pvpTimer);
    this.snake = null;
    this.aiSnakes = [];
    this.foodList = [];
    this.obstacles = [];
    this.floatingTexts = [];
    this.historyBuffer = [];
    this.score = 0;
    this.combo = 1;
    this.surgeMeter = 0;
    this.canvas.classList.remove('fever-active');
    audio.setSurgeFilter(false);
    this.render(1.0);
  }

  triggerSurge() {
    if (this.surgeMeter >= 100 && !this.isSurging) {
      this.isSurging = true;
      this.surgeDuration = 100;
      this.surgeMeter = 0;
      this.snake.isSurging = true;
      this.hitStop(5); // Major impact!
      audio.playSurge();
      audio.setSurgeFilter(true);
      storage.updateStats({ surgesActivated: 1 });
      this.addFloatingText("SURGE!", (this.snake.getHead().x + 0.5) * this.cellSize, this.snake.getHead().y * this.cellSize, '#ff007f');
      this.triggerShake(5, 5);
    }
    return false;
  }

  gainSurge(amount) {
    const wasReady = this.surgeMeter >= 100;
    this.surgeMeter = Math.min(100, this.surgeMeter + amount);
    if (!wasReady && this.surgeMeter >= 100) {
      audio.playReady();
      const h = this.snake.getHead();
      this.addFloatingText('SURGE READY! [SPACE]', (h.x + 0.5) * this.cellSize, (h.y - 1) * this.cellSize, '#00f0ff', 70);
    }
  }

  triggerShake(duration = 10, intensity = 6) {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
  }

  addFloatingText(text, x, y, color = '#ffffff', duration = 40) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      life: duration,
      maxLife: duration,
      vy: -1
    });
  }

  gameLoop(timestamp) {
    if (!this.isRunning) return;

    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      this.lastStepTime = timestamp; // Prevent delta accumulation during freeze
      requestAnimationFrame(this.gameLoop.bind(this));
      return;
    }

    let lerpFactor = 1.0;

    if (!this.isPaused && !this.isRewinding) {
      const delta = timestamp - this.lastStepTime;
      let speedMult = this.isSurging ? 0.5 : 1.0;
      if (this.buffs.slowmo > 0) speedMult *= 1.8; // Slow down game loop

      const currentInterval = Math.max(50, (this.stepInterval - Math.floor(this.score / 50) * 3) * speedMult);

      lerpFactor = Math.min(1.0, delta / currentInterval);

      if (delta >= currentInterval) {
        this.step();
        this.lastStepTime = timestamp;
        lerpFactor = 0.0;
      }
    }

    // Toggle Fever Mode CSS class on Canvas
    if (this.combo >= 8) {
      this.canvas.classList.add('fever-active');
    } else {
      this.canvas.classList.remove('fever-active');
    }

    this.render(lerpFactor);
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  step() {
    if (this.isSurging) {
      this.surgeDuration--;
      if (this.surgeDuration <= 0) {
        this.isSurging = false;
        this.snake.isSurging = false;
        audio.setSurgeFilter(false);
      }
    }

    let head = this.snake.getHead();

    // Scaredy 'Runner' Food AI
    this.foodList.forEach(f => {
      if (f.type === 'runner') {
        const dx = f.x - head.x;
        const dy = f.y - head.y;
        if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
          let nx = f.x + (Math.sign(dx) || (Math.random() > 0.5 ? 1 : -1));
          let ny = f.y + (Math.sign(dy) || (Math.random() > 0.5 ? 1 : -1));
          nx = Math.max(1, Math.min(this.cols - 2, nx));
          ny = Math.max(1, Math.min(this.rows - 2, ny));
          // Don't flee into an obstacle where it could never be eaten
          if (!this.obstacles.some(o => o.x === nx && o.y === ny)) {
            f.x = nx;
            f.y = ny;
          }
        }
      }
    });

    // Save state to history buffer for Chrono-Surge Rewind (max 40 ticks = ~4 seconds)
    if (this.snake && this.mode !== 'pvp') { // Chrono-Surge disabled in PvP
      this.historyBuffer.push({
        snake: JSON.parse(JSON.stringify(this.snake.segments)),
        snakeDir: { ...this.snake.direction },
        score: this.score,
        combo: this.combo,
        surgeMeter: this.surgeMeter,
        foodList: JSON.parse(JSON.stringify(this.foodList)),
        buffs: { ...this.buffs }
      });
      if (this.historyBuffer.length > 40) {
        this.historyBuffer.shift();
      }
    }

    // Update Buff Timers
    if (this.buffs.magnet > 0) this.buffs.magnet--;
    if (this.buffs.ghost > 0) this.buffs.ghost--;
    if (this.buffs.slowmo > 0) this.buffs.slowmo--;

    // Update Combo Timer (pause-safe)
    if (this.combo > 1) {
      this.comboTicksLeft--;
      if (this.comboTicksLeft <= 0) {
        this.combo = 1;
      }
    }

    // Move player snake. Surge mode always wraps; Classic/PvP only wrap
    // while a Ghost buff or an active Surge makes the snake intangible.
    const canWrapEdges = this.mode === 'surge' || this.isSurging || this.buffs.ghost > 0;
    this.snake.move(this.cols, this.rows, canWrapEdges, this.cellSize);

    // Dynamic Reactive Music Mood
    let mood = 'mario'; // Default bright
    if (this.isSurging) {
      mood = 'bowser'; // Dark when surging
    } else if (this.mode === 'pvp' && this.snake) {
      // Check distance to closest alive AI snake
      const pHead = this.snake.getHead();
      for (const ai of this.aiSnakes) {
        if (ai.alive) {
          const aiHead = ai.getHead();
          const dist = Math.abs(pHead.x - aiHead.x) + Math.abs(pHead.y - aiHead.y);
          if (dist < 8) { // Danger close!
            mood = 'bowser';
            break;
          }
        }
      }
    }
    audio.setMood(mood);

    // Self collision check (only if not surging)
    this.snake.updateParticles();

    head = this.snake.getHead();

    // Check Wall Crash (Classic & PvP — any mode that didn't wrap)
    if (!canWrapEdges) {
      if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
        audio.playDie();
        this.endGame(false);
        return;
      }
    }

    // Check Obstacle Crash
    if (!this.isSurging && this.buffs.ghost <= 0) {
      const hitObstacle = this.obstacles.some(o => o.x === head.x && o.y === head.y);
      if (hitObstacle) {
        audio.playDie();
        this.endGame(false);
        return;
      }
    }

    // Check Self Collision
    if (!this.isSurging && this.buffs.ghost <= 0 && this.snake.checkSelfCollision()) {
      audio.playDie();
      this.endGame(false);
      return;
    }

    // Check Food Eating
    for (let i = this.foodList.length - 1; i >= 0; i--) {
      const food = this.foodList[i];
      
      // Magnet Powerup Effect: Pull food towards head
      if (this.buffs.magnet > 0) {
        const dx = head.x - food.x;
        const dy = head.y - food.y;
        if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) {
          const nx = food.x + Math.sign(dx);
          const ny = food.y + Math.sign(dy);
          // Don't pull food inside an obstacle
          if (!this.obstacles.some(o => o.x === nx && o.y === ny)) {
            food.x = nx;
            food.y = ny;
          }
        }
      }

      if (head.x === food.x && head.y === food.y) {
        audio.playEat(food.tier);
        
        if (['magnet', 'ghost', 'slowmo'].includes(food.type)) {
          this.buffs[food.type] = 100; // 100 ticks duration
          this.addFloatingText(`${food.type.toUpperCase()}!`, (head.x + 0.5) * this.cellSize, head.y * this.cellSize, '#00f0ff', 60);
          this.snake.spawnParticles((head.x + 0.5) * this.cellSize, (head.y + 0.5) * this.cellSize, '#00f0ff', 15);
          this.hitStop(3);
        } else {
          this.snake.grow(food.tier);
          let pts = 10 * food.tier * this.combo;
          
          if (food.type === 'runner') {
            pts += 500;
            this.gainSurge(25);
            this.hitStop(5);
            this.addFloatingText(`CAUGHT!`, (head.x + 0.5) * this.cellSize, (head.y - 1) * this.cellSize, '#9d00ff');
          } else if (food.type === 'gold') {
            this.hitStop(3);
          }

          if (this.combo >= 8) pts *= 2; // Fever mode double points!
          
          this.score += pts;
          this.gainSurge(15 * food.tier);

          // Combo increment
          this.combo = Math.min(8, this.combo + 1);
          // Tighter combo window if in fever mode (e.g. 40 ticks vs 60 ticks)
          this.comboTicksLeft = this.combo >= 8 ? 40 : 60;

          if (this.combo >= 8) {
            // Confetti explosion!
            this.snake.spawnParticles((head.x + 0.5) * this.cellSize, (head.y + 0.5) * this.cellSize, '#ff0000', 5);
            this.snake.spawnParticles((head.x + 0.5) * this.cellSize, (head.y + 0.5) * this.cellSize, '#00ff00', 5);
            this.snake.spawnParticles((head.x + 0.5) * this.cellSize, (head.y + 0.5) * this.cellSize, '#0000ff', 5);
          } else {
            this.snake.spawnParticles((head.x + 0.5) * this.cellSize, (head.y + 0.5) * this.cellSize, TIER_COLORS[food.tier - 1], 10);
          }
          this.addFloatingText(`+${pts}`, (head.x + 0.5) * this.cellSize, head.y * this.cellSize, this.combo >= 8 ? '#ffffff' : TIER_COLORS[food.tier - 1]);
        }

        this.foodList.splice(i, 1);
        this.spawnFood(1);
        storage.updateStats({ foodEaten: 1, maxCombo: this.combo });
      }
    }

    // Check Merging Mechanics (Merge Surge Mode)
    if (this.mode === 'surge') {
      const mergeRes = this.snake.checkMerge();
      if (mergeRes.merged) {
        audio.playMerge();
        this.mergesCount++;
        this.score += 50 * mergeRes.newTier;
        this.triggerShake(8, 5);
        this.snake.spawnParticles((mergeRes.x + 0.5) * this.cellSize, (mergeRes.y + 0.5) * this.cellSize, '#ffd700', 16);
        this.addFloatingText('MERGE!', (mergeRes.x + 0.5) * this.cellSize, mergeRes.y * this.cellSize, '#ffd700', 50);
        storage.updateStats({ totalMerges: 1 });
      }
    }

    // Update AI Opponents (PvP Mode)
    if (this.mode === 'pvp') {
      const allObstacles = [
        ...this.obstacles,
        ...this.snake.segments,
        ...this.aiSnakes.filter(a => a.alive).flatMap(a => a.segments)
      ];

      this.aiSnakes.forEach(ai => {
        if (!ai.alive) return;
        ai.updateAI(this.foodList, this.cols, this.rows, allObstacles);
        if (!ai.alive) return; // Died crashing into a wall
        const aiHead = ai.getHead();

        // AI dies crashing into obstacles, the player, or another snake's body
        const crashed =
          this.obstacles.some(o => o.x === aiHead.x && o.y === aiHead.y) ||
          this.snake.segments.some(s => s.x === aiHead.x && s.y === aiHead.y) ||
          this.aiSnakes.some(other => other.alive && other.segments.some((s, i) =>
            !(other === ai && i === 0) && s.x === aiHead.x && s.y === aiHead.y));
        if (crashed) {
          ai.alive = false;
          this.addFloatingText(`${ai.name} DOWN!`, (aiHead.x + 0.5) * this.cellSize, aiHead.y * this.cellSize, ai.color, 60);
          return;
        }

        // AI food collision
        for (let i = this.foodList.length - 1; i >= 0; i--) {
          const food = this.foodList[i];
          if (aiHead.x === food.x && aiHead.y === food.y) {
            ai.grow();
            this.foodList.splice(i, 1);
            this.spawnFood(1);
          }
        }
      });

      // Player dies crashing into a living AI snake (unless intangible)
      if (!this.isSurging && this.buffs.ghost <= 0) {
        const hitAI = this.aiSnakes.some(ai => ai.alive &&
          ai.segments.some(s => s.x === head.x && s.y === head.y));
        if (hitAI) {
          audio.playDie();
          this.endGame(false);
          return;
        }
      }

      // All opponents eliminated: instant victory
      if (this.aiSnakes.length > 0 && this.aiSnakes.every(ai => !ai.alive)) {
        this.endGame(true);
        return;
      }
    }
  }

  render(lerpFactor = 1.0) {
    this.ctx.save();
    
    // Since we setTransform in resize, clearRect needs to know the scaled dimensions
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    // Apply Camera Shake
    if (this.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
      this.shakeTime--;
    }

    const isNokia = storage.getTheme() === 'nokia';

    // Draw Grid Lines
    this.ctx.strokeStyle = isNokia ? 'rgba(15, 56, 15, 0.1)' : 'rgba(0, 240, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let c = 0; c <= this.cols; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * this.cellSize, 0);
      this.ctx.lineTo(c * this.cellSize, this.rows * this.cellSize);
      this.ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * this.cellSize);
      this.ctx.lineTo(this.cols * this.cellSize, r * this.cellSize);
      this.ctx.stroke();
    }

    // Draw Obstacles
    this.ctx.fillStyle = isNokia ? '#0f380f' : 'rgba(255, 255, 255, 0.2)';
    this.ctx.shadowBlur = 0;
    this.obstacles.forEach(obs => {
      this.ctx.beginPath();
      this.ctx.roundRect(obs.x * this.cellSize + 1, obs.y * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2, 4);
      this.ctx.fill();
    });

    // Draw Food
    this.foodList.forEach(f => {
      const px = f.x * this.cellSize;
      const py = f.y * this.cellSize;

      this.ctx.save();
      if (isNokia) {
        this.ctx.fillStyle = '#0f380f';
        this.ctx.fillRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
      } else if (['magnet', 'ghost', 'slowmo'].includes(f.type)) {
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        // Draw a diamond for powerups
        this.ctx.moveTo(px + this.cellSize / 2, py + 2);
        this.ctx.lineTo(px + this.cellSize - 2, py + this.cellSize / 2);
        this.ctx.lineTo(px + this.cellSize / 2, py + this.cellSize - 2);
        this.ctx.lineTo(px + 2, py + this.cellSize / 2);
        this.ctx.fill();
      } else if (f.type === 'runner') {
        this.ctx.fillStyle = '#9d00ff';
        this.ctx.shadowColor = '#9d00ff';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        // Draw a star shape for the runner
        this.ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, (this.cellSize / 2) - 1, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        const color = f.type === 'gold' ? '#ffd700' : (f.tier === 2 ? '#39ff14' : '#ff007f');
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 12;

        this.ctx.beginPath();
        this.ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, (this.cellSize / 2) - 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // Draw Player Snake
    if (this.snake) {
      if (this.buffs.ghost > 0) this.ctx.globalAlpha = 0.5;
      
      // Override colors for Fever Mode
      const isFever = this.combo >= 8;
      this.snake.draw(this.ctx, this.cellSize, isNokia, lerpFactor, isFever);
      
      this.ctx.globalAlpha = 1.0;
    }

    // Draw AI Snakes
    if (this.mode === 'pvp') {
      this.aiSnakes.forEach(ai => ai.draw(this.ctx, this.cellSize, isNokia, lerpFactor));
    }

    // Draw Floating Text
    if (!this.isPaused) {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        
        this.ctx.save();
        this.ctx.fillStyle = ft.color;
        this.ctx.globalAlpha = ft.life / ft.maxLife;
        this.ctx.shadowColor = ft.color;
        this.ctx.shadowBlur = 8;
        this.ctx.font = '800 14px "Space Grotesk", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(ft.text, ft.x, ft.y);
        this.ctx.restore();

        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    this.ctx.restore();
  }

  endGame(isWin = false) {
    // CHRONO-SURGE DEATH INTERCEPT
    // If the player died but has >= 50 surge meter, offer a rewind!
    if (!isWin && this.mode !== 'pvp' && this.surgeMeter >= 50 && this.historyBuffer.length > 10) {
      this.isPaused = true;
      if (this.onRewindPrompt) {
        this.onRewindPrompt();
        return; // Halt normal game over
      }
    }

    this.isRunning = false;
    if (this.pvpTimer) clearInterval(this.pvpTimer);
    audio.setSurgeFilter(false);

    const isNewHigh = storage.setHighScore(this.mode, this.score);
    storage.updateStats({
      gamesPlayed: 1,
      pvpWins: (this.mode === 'pvp' && isWin) ? 1 : 0
    });

    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        mode: this.mode,
        merges: this.mergesCount,
        maxCombo: storage.data.stats.maxCombo,
        foodEaten: storage.data.stats.foodEaten,
        isNewHighScore: isNewHigh,
        isWin: isWin
      });
    }
  }

  triggerRewind() {
    if (this.isRewinding || this.historyBuffer.length === 0 || this.surgeMeter < 50) return;
    
    this.isRewinding = true;
    this.isPaused = true;
    this.surgeMeter -= 50;
    storage.updateStats({ surgesActivated: 1 });
    audio.setMood('mario');
    this.hitStop(10); // Massive hit stop on rewind trigger

    // Visual effect state
    let rewindingSteps = this.historyBuffer.length;
    
    // Initial vomit text
    const head = this.snake.getHead();
    this.addFloatingText("BLEUGH!!", (head.x + 0.5) * this.cellSize, head.y * this.cellSize, '#39ff14', 100);
    
    const rewindInterval = setInterval(() => {
      if (rewindingSteps <= 0) {
        clearInterval(rewindInterval);
        this.isRewinding = false;
        this.isPaused = false;
        this.buffs.ghost = 20; // Give a brief invulnerability window after rewinding
        this.lastStepTime = performance.now();
        
        // Hide the prompt
        if (this.onRewindComplete) this.onRewindComplete();
        return;
      }

      // Pop state from buffer
      const state = this.historyBuffer.pop();
      this.snake.segments = state.snake;
      this.snake.direction = state.snakeDir;
      this.snake.inputQueue = [];
      this.score = state.score;
      this.combo = state.combo;
      this.surgeMeter = state.surgeMeter;
      this.foodList = state.foodList;
      
      // Vomiting visual effect: spawn green/yellow particles from the retreating head
      const currentHead = this.snake.getHead();
      if (currentHead) {
        this.snake.spawnParticles((currentHead.x + 0.5) * this.cellSize, (currentHead.y + 0.5) * this.cellSize, '#39ff14', 3);
        this.snake.spawnParticles((currentHead.x + 0.5) * this.cellSize, (currentHead.y + 0.5) * this.cellSize, '#ffd700', 2);
      }
      
      // We don't restore buffs because we want to guarantee the 2-second ghost after rewind finishes
      
      rewindingSteps--;
      this.render(0.0); // Render exactly the state without lerp
      this.triggerShake(2, 2); // Subtle shaking during rewind
    }, 30); // Rewind fast!
  }
}
