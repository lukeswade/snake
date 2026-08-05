/* ==========================================================================
   AI SNAKE BOT FOR PVP BLITZ MODE
   ========================================================================= */

class AISnake {
  constructor(name, color, startX, startY) {
    this.name = name;
    this.color = color;
    this.segments = [
      { x: startX, y: startY, tier: 1 },
      { x: startX - 1, y: startY, tier: 1 },
      { x: startX - 2, y: startY, tier: 1 }
    ];
    this.direction = { x: 1, y: 0 };
    this.score = 0;
    this.alive = true;
  }

  getHead() {
    return this.segments[0];
  }

  updateAI(foodList, cols, rows, obstacles = []) {
    if (!this.alive) return;

    const head = this.getHead();
    const possibleDirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    // Filter out dirs that cause immediate reversal
    const validDirs = possibleDirs.filter(d => !(d.x === -this.direction.x && d.y === -this.direction.y));

    // Find nearest food target
    let target = null;
    let minDist = Infinity;
    foodList.forEach(f => {
      const dist = Math.abs(f.x - head.x) + Math.abs(f.y - head.y);
      if (dist < minDist) {
        minDist = dist;
        target = f;
      }
    });

    // Rank directions by safety and distance to target
    let bestDir = this.direction;
    let bestScore = -Infinity;

    validDirs.forEach(dir => {
      const nextX = head.x + dir.x;
      const nextY = head.y + dir.y;

      // Check wall collision safety
      if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) return;

      // Check obstacle/body collision safety
      const collides = obstacles.some(obs => obs.x === nextX && obs.y === nextY);
      if (collides) return;

      // Calculate heuristic score (closer to food = higher score)
      let score = 100;
      if (target) {
        const dist = Math.abs(target.x - nextX) + Math.abs(target.y - nextY);
        score -= dist * 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    });

    this.direction = bestDir;

    // Store previous positions for smooth interpolation
    this.segments.forEach(seg => {
      seg.prevX = seg.x;
      seg.prevY = seg.y;
    });

    // Move body forward
    const newX = head.x + this.direction.x;
    const newY = head.y + this.direction.y;

    // Check bounds crash
    if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) {
      this.alive = false;
      return;
    }

    for (let i = this.segments.length - 1; i > 0; i--) {
      this.segments[i].x = this.segments[i - 1].x;
      this.segments[i].y = this.segments[i - 1].y;
    }
    head.x = newX;
    head.y = newY;
  }

  grow() {
    const tail = this.segments[this.segments.length - 1];
    this.segments.push({ x: tail.x, y: tail.y, tier: 1 });
    this.score += 10;
  }

  draw(ctx, cellSize, isNokiaTheme = false, lerpFactor = 1.0) {
    if (!this.alive) return;

    // Draw from tail to head
    [...this.segments].reverse().forEach((seg, reverseIdx) => {
      const idx = this.segments.length - 1 - reverseIdx;
      const isHead = idx === 0;

      // Smooth Interpolation
      const startX = (seg.prevX !== undefined) ? seg.prevX : seg.x;
      const startY = (seg.prevY !== undefined) ? seg.prevY : seg.y;
      
      let interpX = seg.x;
      let interpY = seg.y;
      
      if (Math.abs(seg.x - startX) <= 1 && Math.abs(seg.y - startY) <= 1) {
        interpX = startX + (seg.x - startX) * lerpFactor;
        interpY = startY + (seg.y - startY) * lerpFactor;
      }

      const px = interpX * cellSize;
      const py = interpY * cellSize;

      ctx.save();
      if (isNokiaTheme) {
        ctx.fillStyle = isHead ? '#1a201c' : '#2c3630';
        ctx.shadowBlur = 0;
        ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        if (isHead) {
          ctx.fillStyle = '#879C7B';
          ctx.fillRect(px + 4, py + 4, 3, 3);
        }
      } else {
        ctx.fillStyle = isHead ? this.color : '#64748b';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = isHead ? 10 : 2;

        ctx.beginPath();
        ctx.roundRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3, isHead ? 6 : 3);
        ctx.fill();

        if (isHead) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.fillText('🤖', px + 2, py + cellSize - 3);
        }
      }
      ctx.restore();
    });
  }
}
