/* ==========================================================================
   MAIN GAME ENGINE & LOOP CONTROLLER
   ========================================================================== */

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.cellSize = 20;
    this.cols = 32;
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
    
    this.pvpTimeRemaining = 60;
    this.pvpTimer = null;

    this.isRunning = false;
    this.isPaused = false;

    this.lastStepTime = 0;
    this.stepInterval = 100; // ms per frame movement tick

    this.shakeTime = 0;
    this.shakeIntensity = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth - 32;
    const h = parent.clientHeight - 32;

    this.cols = Math.floor(w / this.cellSize);
    this.rows = Math.floor(h / this.cellSize);

    // Keep grid dimensions balanced
    this.cols = Math.max(20, Math.min(48, this.cols));
    this.rows = Math.max(16, Math.min(36, this.rows));

    // High-DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.cols * this.cellSize * dpr;
    this.canvas.height = this.rows * this.cellSize * dpr;
    this.canvas.style.width = `${this.cols * this.cellSize}px`;
    this.canvas.style.height = `${this.rows * this.cellSize}px`;
    
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
    this.isRunning = true;
    this.shakeTime = 0;

    const currentSkin = storage.data.selectedSkin;
    this.snake = new Snake(Math.floor(this.cols / 2), Math.floor(this.rows / 2), 4, currentSkin);

    this.foodList = [];
    this.floatingTexts = [];
    this.spawnFood(4);

    this.aiSnakes = [];
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
            this.endGame(true);
          }
        }
      }, 1000);
    }

    this.lastStepTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  spawnFood(count = 1) {
    for (let i = 0; i < count; i++) {
      let x, y, occupied;
      do {
        x = Math.floor(Math.random() * this.cols);
        y = Math.floor(Math.random() * this.rows);
        occupied = this.snake.segments.some(s => s.x === x && s.y === y);
      } while (occupied);

      const typeRand = Math.random();
      let tier = 1;
      let type = 'normal';

      if (this.mode === 'surge') {
        if (typeRand > 0.85) { tier = 3; type = 'gold'; }
        else if (typeRand > 0.60) { tier = 2; type = 'tier2'; }
      }

      this.foodList.push({ x, y, tier, type });
    }
  }

  triggerSurge() {
    if (this.surgeMeter >= 100 && !this.isSurging) {
      this.isSurging = true;
      this.surgeDuration = 50; // ticks
      this.snake.isSurging = true;
      this.surgeMeter = 0;
      audio.playSurge();
      this.triggerShake(10, 8);
      storage.updateStats({ surgesActivated: 1 });
      return true;
    }
    return false;
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

    let lerpFactor = 1.0;

    if (!this.isPaused) {
      const delta = timestamp - this.lastStepTime;
      const speedMult = this.isSurging ? 0.5 : 1.0;
      const currentInterval = Math.max(50, (this.stepInterval - Math.floor(this.score / 50) * 3) * speedMult);

      lerpFactor = Math.min(1.0, delta / currentInterval);

      if (delta >= currentInterval) {
        this.step();
        this.lastStepTime = timestamp;
        lerpFactor = 0.0;
      }
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
      }
    }

    // Move player snake
    this.snake.move(this.cols, this.rows, this.mode !== 'pvp');

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

    const head = this.snake.getHead();

    // Check Wall Crash (in Classic Mode)
    if (this.mode === 'classic' && !this.isSurging) {
      if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
        audio.playDie();
        this.endGame(false);
        return;
      }
    }

    // Check Self Collision
    if (!this.isSurging && this.snake.checkSelfCollision()) {
      audio.playDie();
      this.endGame(false);
      return;
    }

    // Check Food Eating
    for (let i = this.foodList.length - 1; i >= 0; i--) {
      const food = this.foodList[i];
      if (head.x === food.x && head.y === food.y) {
        audio.playEat(food.tier);
        this.snake.grow(food.tier);
        this.foodList.splice(i, 1);

        const pts = 10 * food.tier * this.combo;
        this.score += pts;
        this.surgeMeter = Math.min(100, this.surgeMeter + (15 * food.tier));

        // Combo increment
        this.combo = Math.min(8, this.combo + 1);
        if (this.comboTimer) clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => { this.combo = 1; }, 3000);

        this.snake.spawnParticles((head.x + 0.5) * this.cellSize, (head.y + 0.5) * this.cellSize, TIER_COLORS[food.tier - 1], 10);
        this.addFloatingText(`+${pts}`, (head.x + 0.5) * this.cellSize, head.y * this.cellSize, TIER_COLORS[food.tier - 1]);
        
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
        ...this.snake.segments,
        ...this.aiSnakes.flatMap(a => a.segments)
      ];

      this.aiSnakes.forEach(ai => {
        ai.updateAI(this.foodList, this.cols, this.rows, allObstacles);
        const aiHead = ai.getHead();

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

    // Draw Food
    this.foodList.forEach(f => {
      const px = f.x * this.cellSize;
      const py = f.y * this.cellSize;

      this.ctx.save();
      if (isNokia) {
        this.ctx.fillStyle = '#0f380f';
        this.ctx.fillRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
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
      this.snake.draw(this.ctx, this.cellSize, isNokia, lerpFactor);
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
    this.isRunning = false;
    if (this.pvpTimer) clearInterval(this.pvpTimer);

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
}
