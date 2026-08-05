/* ==========================================================================
   SNAKE CLASS & MERGE MECHANICS ENGINE
   ========================================================================== */

const TIER_COLORS = [
  '#00f0ff', // Tier 1: Cyan
  '#39ff14', // Tier 2: Neon Lime
  '#ffd700', // Tier 3: Gold
  '#ff007f', // Tier 4: Magenta
  '#9d4edd', // Tier 5: Purple
  '#ffffff'  // Tier 6: Radiant White
];

/* Snake Skins — recolour the body palette by tier.
   `unlock` is evaluated against career stats / high scores in storage.js. */
const SKINS = [
  {
    id: 'cyber', name: 'Cyber Neon', icon: '⚡',
    desc: 'Unlocked by default.',
    palette: TIER_COLORS,
    unlock: null
  },
  {
    id: 'toxic', name: 'Toxic Slime', icon: '☣️',
    desc: 'Eat 100 food items.',
    palette: ['#39ff14', '#a3ff00', '#00ff88', '#7fff00', '#d4ff00', '#f0fff0'],
    unlock: { stat: 'foodEaten', need: 100 }
  },
  {
    id: 'magma', name: 'Magma Core', icon: '🌋',
    desc: 'Perform 25 total merges.',
    palette: ['#ff6b00', '#ff3c00', '#ffb700', '#ff0044', '#ffd700', '#fff5e1'],
    unlock: { stat: 'totalMerges', need: 25 }
  },
  {
    id: 'void', name: 'Void Walker', icon: '🌌',
    desc: 'Activate 10 hyper-surges.',
    palette: ['#9d4edd', '#7b2cbf', '#c77dff', '#5a189a', '#e0aaff', '#ffffff'],
    unlock: { stat: 'surgesActivated', need: 10 }
  },
  {
    id: 'midas', name: 'Midas Touch', icon: '👑',
    desc: 'Score 1,000 points in any mode.',
    palette: ['#ffd700', '#ffed4e', '#ffb700', '#daa520', '#fff8dc', '#ffffff'],
    unlock: { anyScore: 1000 }
  }
];

function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

class Particle {
  constructor(x, y, color, speed = 2) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * speed;
    this.vy = (Math.random() - 0.5) * speed;
    this.alpha = 1;
    this.life = 1;
    this.decay = Math.random() * 0.03 + 0.02;
    this.radius = Math.random() * 3 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx, cellSize) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Snake {
  constructor(startX = 10, startY = 10, initialLength = 4, skin = 'cyber') {
    this.skin = skin;
    this.palette = getSkin(skin).palette;
    this.direction = { x: 1, y: 0 }; // Moving right
    this.inputQueue = []; // Buffered direction changes (max 2) so fast double-turns aren't lost
    this.segments = [];
    this.particles = [];
    this.isSurging = false;

    // Build initial snake segments (base segments never merge —
    // otherwise the starting body instantly merges for free points)
    for (let i = 0; i < initialLength; i++) {
      this.segments.push({
        x: startX - i,
        y: startY,
        tier: 1,
        base: true
      });
    }
  }

  setDirection(dirX, dirY) {
    const MAX_QUEUED = 2;
    const full = this.inputQueue.length >= MAX_QUEUED;

    // A turn must be legal relative to whichever direction immediately precedes
    // it. Appending puts it after the last queued turn; when the queue is full
    // we overwrite that last slot instead, so it follows the one before it.
    // Validating against the wrong one silently rejects legal inputs.
    const predecessor = full
      ? this.inputQueue[MAX_QUEUED - 2]
      : (this.inputQueue[this.inputQueue.length - 1] || this.direction);

    if (predecessor.x === dirX && predecessor.y === dirY) return;         // duplicate
    if (predecessor.x + dirX === 0 && predecessor.y + dirY === 0) return; // 180° reversal

    if (full) {
      // Overwrite rather than drop: dropping means a player correcting course
      // has their newest intent ignored in favour of a stale one, which reads
      // as the game not listening.
      this.inputQueue[MAX_QUEUED - 1] = { x: dirX, y: dirY };
    } else {
      this.inputQueue.push({ x: dirX, y: dirY });
    }
  }

  getHead() {
    return this.segments[0];
  }

  move(cols, rows, wrapEdges = false, cellSize = 20) {
    const queued = this.inputQueue.shift();
    if (queued) this.direction = queued;
    const head = this.getHead();

    // Store previous positions for smooth interpolation
    this.segments.forEach(seg => {
      seg.prevX = seg.x;
      seg.prevY = seg.y;
    });

    let newX = head.x + this.direction.x;
    let newY = head.y + this.direction.y;

    if (wrapEdges) {
      if (newX < 0) newX = cols - 1;
      if (newX >= cols) newX = 0;
      if (newY < 0) newY = rows - 1;
      if (newY >= rows) newY = 0;
    }

    // Move segments forward from tail to head
    for (let i = this.segments.length - 1; i > 0; i--) {
      this.segments[i].x = this.segments[i - 1].x;
      this.segments[i].y = this.segments[i - 1].y;
    }
    head.x = newX;
    head.y = newY;

    // Spawn subtle tail movement particles if surging
    if (this.isSurging) {
      const tail = this.segments[this.segments.length - 1];
      this.spawnParticles((tail.x + 0.5) * cellSize, (tail.y + 0.5) * cellSize, this.palette[0], 2, 3);
    }
  }

  grow(tier = 1) {
    const tail = this.segments[this.segments.length - 1];
    this.segments.push({
      x: tail.x,
      y: tail.y,
      tier: tier
    });
  }

  checkMerge() {
    // Check if 3 adjacent earned (non-base) segments share the same tier
    for (let i = 0; i <= this.segments.length - 3; i++) {
      const s1 = this.segments[i];
      const s2 = this.segments[i + 1];
      const s3 = this.segments[i + 2];
      if (s1.base || s2.base || s3.base) continue;
      const t1 = s1.tier;
      const t2 = s2.tier;
      const t3 = s3.tier;

      if (t1 === t2 && t2 === t3 && t1 < TIER_COLORS.length) {
        // Upgrade middle segment tier and shrink surrounding two
        this.segments[i].tier = t1 + 1;
        const mergedCoord = { ...this.segments[i] };
        this.segments.splice(i + 1, 2);
        
        // Return merge event data for SFX, particles & score boost
        return {
          merged: true,
          newTier: t1 + 1,
          x: mergedCoord.x,
          y: mergedCoord.y
        };
      }
    }
    return { merged: false };
  }

  spawnParticles(canvasX, canvasY, color, count = 12, speed = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(canvasX, canvasY, color, speed));
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx, cellSize, isNokiaTheme = false, lerpFactor = 1.0, isFever = false) {
    // Draw trail particles
    this.particles.forEach(p => p.draw(ctx, cellSize));

    // Draw snake segments
    // Draw from tail to head so head is on top
    [...this.segments].reverse().forEach((seg, reverseIdx) => {
      const idx = this.segments.length - 1 - reverseIdx;
      const isHead = idx === 0;

      // Smooth Interpolation
      const startX = (seg.prevX !== undefined) ? seg.prevX : seg.x;
      const startY = (seg.prevY !== undefined) ? seg.prevY : seg.y;
      
      let interpX = seg.x;
      let interpY = seg.y;
      
      // Only interpolate if distance is 1 (avoid wrapping jumps)
      if (Math.abs(seg.x - startX) <= 1 && Math.abs(seg.y - startY) <= 1) {
        interpX = startX + (seg.x - startX) * lerpFactor;
        interpY = startY + (seg.y - startY) * lerpFactor;
      }

      const px = interpX * cellSize;
      const py = interpY * cellSize;

      ctx.save();

      if (isNokiaTheme) {
        // Nokia 3310 Dot-Matrix pixel style
        ctx.fillStyle = isHead ? '#1a201c' : '#2c3630';
        ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        if (isHead) {
          ctx.fillStyle = '#9bbc0f';
          ctx.fillRect(px + 4, py + 4, 3, 3);
        }
      } else {
        // Neon / OLED Glowing Rounded Segment Style
        // Fever mode: cycle the skin palette along the body for maximum hype
        const pal = this.palette || TIER_COLORS;
        const color = isFever
          ? pal[idx % pal.length]
          : pal[(seg.tier - 1) % pal.length];
        
        if (this.isSurging) {
          ctx.shadowColor = pal[0];
          ctx.shadowBlur = 18;
        } else {
          ctx.shadowColor = color;
          ctx.shadowBlur = isHead ? 15 : 6;
        }

        ctx.fillStyle = this.isSurging ? pal[0] : color;
        const radius = isHead ? 6 : 4;
        const margin = 1.5;

        // Rounded rectangle segment
        ctx.beginPath();
        ctx.roundRect(px + margin, py + margin, cellSize - (margin * 2), cellSize - (margin * 2), radius);
        ctx.fill();

        // Tier Level Indicator Dots on higher tier segments
        if (seg.tier > 1) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px + cellSize / 2, py + cellSize / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Head Eyes
        if (isHead) {
          ctx.fillStyle = '#000000';
          const eyeOffset = 5;
          let eye1 = { x: px + eyeOffset, y: py + eyeOffset };
          let eye2 = { x: px + cellSize - eyeOffset, y: py + eyeOffset };

          if (this.direction.x === 1) {
            eye1 = { x: px + cellSize - 5, y: py + 5 };
            eye2 = { x: px + cellSize - 5, y: py + cellSize - 5 };
          } else if (this.direction.x === -1) {
            eye1 = { x: px + 5, y: py + 5 };
            eye2 = { x: px + 5, y: py + cellSize - 5 };
          } else if (this.direction.y === 1) {
            eye1 = { x: px + 5, y: py + cellSize - 5 };
            eye2 = { x: px + cellSize - 5, y: py + cellSize - 5 };
          }

          ctx.beginPath();
          ctx.arc(eye1.x, eye1.y, 2, 0, Math.PI * 2);
          ctx.arc(eye2.x, eye2.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }

  checkSelfCollision() {
    const head = this.getHead();
    for (let i = 1; i < this.segments.length; i++) {
      if (this.segments[i].x === head.x && this.segments[i].y === head.y) {
        return true;
      }
    }
    return false;
  }
}
