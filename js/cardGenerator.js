/* ==========================================================================
   VIRAL STAT CARD GENERATOR (CANVAS IMAGE EXPORT)
   ========================================================================== */

class StatCardGenerator {
  static generateCard(stats) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 360);
    bgGrad.addColorStop(0, '#0a0c16');
    bgGrad.addColorStop(1, '#121629');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 360);

    // Decorative Glowing Orbs
    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.globalAlpha = 0.15;
    ctx.filter = 'blur(40px)';
    ctx.beginPath();
    ctx.arc(80, 80, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(520, 280, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Card Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 576, 336);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px Outfit, sans-serif';
    ctx.fillText('⚡ SNAKE SURGE', 36, 56);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px "Space Grotesk", monospace';
    ctx.fillText(`MODE: ${(stats.mode || 'SURGE').toUpperCase()}`, 36, 80);

    // Big Score Display
    ctx.fillStyle = '#00f0ff';
    ctx.font = '900 56px "Space Grotesk", monospace';
    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(stats.score.toLocaleString(), 36, 150);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px "Space Grotesk", monospace';
    ctx.fillText('FINAL SCORE', 36, 170);

    // Stats Grid Layout
    const statBoxes = [
      { label: 'MERGES', val: stats.merges || 0 },
      { label: 'MAX COMBO', val: `${stats.maxCombo || 1}x` },
      { label: 'FOOD EATEN', val: stats.foodEaten || 0 }
    ];

    statBoxes.forEach((b, idx) => {
      const bx = 36 + (idx * 175);
      const by = 200;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, 160, 70, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#39ff14';
      ctx.font = '800 22px "Space Grotesk", monospace';
      ctx.fillText(b.val, bx + 16, by + 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px "Space Grotesk", monospace';
      ctx.fillText(b.label, bx + 16, by + 58);
    });

    // Footer Watermark
    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.fillText('Can you beat my score? Play Snake Surge now!', 36, 320);

    return canvas.toDataURL('image/png');
  }

  static downloadCard(stats) {
    const dataUrl = this.generateCard(stats);
    const link = document.createElement('a');
    link.download = `SnakeSurge_Score_${stats.score}.png`;
    link.href = dataUrl;
    link.click();
  }

  static copyShareText(stats) {
    const text = `🐍 I just scored ${stats.score.toLocaleString()} points in Snake Surge (${stats.mode} Mode) with ${stats.merges || 0} merges! Beat my score! 🚀`;
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }
}
