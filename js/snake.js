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
    this.direction = { x: 1, y: 0 }; // Moving right
    this.nextDirection = { x: 1, y: 0 };
    this.segments = [];
    this.particles = [];
    this.isSurging = false;

    // Build initial snake segments
    for (let i = 0; i < initialLength; i++) {
      this.segments.push({
        x: startX - i,
        y: startY,
        tier: 1
      });
    }
  }

  setDirection(dirX, dirY) {
    // Prevent 180-degree instant self-reversal
    if (this.direction.x + dirX === 0 && this.direction.y + dirY === 0) return;
    this.nextDirection = { x: dirX, y: dirY };
  }

  getHead() {
    return this.segments[0];
  }

  move(cols, rows, wrapEdges = false) {
    this.direction = { ...this.nextDirection };
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
      this.spawnParticles((tail.x + 0.5) * 20, (tail.y + 0.5) * 20, '#00f0ff', 2, 3);
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
    // Check if 3 adjacent segments share the same tier
    for (let i = 0; i <= this.segments.length - 3; i++) {
      const t1 = this.segments[i].tier;
      const t2 = this.segments[i + 1].tier;
      const t3 = this.segments[i + 2].tier;

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

  draw(ctx, cellSize, isNokiaTheme = false, lerpFactor = 1.0) {
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
        ctx.fillStyle = isHead ? '#0f380f' : '#306230';
        ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        if (isHead) {
          ctx.fillStyle = '#9bbc0f';
          ctx.fillRect(px + 4, py + 4, 3, 3);
        }
      } else {
        // Neon / OLED Glowing Rounded Segment Style
        const color = TIER_COLORS[(seg.tier - 1) % TIER_COLORS.length];
        
        if (this.isSurging) {
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 18;
        } else {
          ctx.shadowColor = color;
          ctx.shadowBlur = isHead ? 15 : 6;
        }

        ctx.fillStyle = this.isSurging ? '#00f0ff' : color;
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
