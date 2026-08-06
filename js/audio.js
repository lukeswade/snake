/* ==========================================================================
   WEB AUDIO API PROCEDURAL SYNTHESIZER & MULTI-CHANNEL SYNTH BGM
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.mood = 'mario'; // 'mario' or 'bowser'
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        // Master Audio Chain
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 20000; // Open filter by default
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6; // Master volume normalization
        
        this.filter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        
        // Create Noise Buffer for Percussion
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSurgeFilter(active) {
    if (!this.ctx || !this.filter) return;
    const now = this.ctx.currentTime;
    if (active) {
      // Sweeping underwater effect
      this.filter.frequency.setValueAtTime(this.filter.frequency.value, now);
      this.filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);
      this.filter.Q.value = 5;
    } else {
      // Restore normal
      this.filter.frequency.setValueAtTime(this.filter.frequency.value, now);
      this.filter.frequency.exponentialRampToValueAtTime(20000, now + 0.3);
      this.filter.Q.value = 1;
    }
  }

  playEat(tier = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 300 + (tier * 40);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playMerge() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + (idx * 0.05);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 0.12);
    });
  }

  playSurge() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playDie() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  playReady() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Quick two-note "power ready" chirp
    [660, 990].forEach((freq, idx) => {
      const now = this.ctx.currentTime + (idx * 0.08);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  playAchievement() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const arpeggio = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    arpeggio.forEach((freq, idx) => {
      const now = this.ctx.currentTime + (idx * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  toggleBGM() {
    this.bgmPlaying = !this.bgmPlaying;
    if (this.bgmPlaying) {
      this.init();
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.bgmPlaying;
  }

  setMood(newMood) {
    if (this.mood !== newMood) {
      this.mood = newMood;
      // Reset step to keep pattern in sync when switching
      this.bgmStep = 0;
    }
  }

  startBGM() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);

    // Mellow, slower Overworld (Mario-esque)
    const marioLead = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 293.66]; // C4, E4, G4, A4, G4, E4, C4, D4
    const marioBass = [130.81, 130.81, 98.00, 98.00, 130.81, 130.81, 98.00, 98.00];   // C3, G2

    // Dark, dissonant Castle (Bowser-esque)
    const bowserLead = [261.63, 311.13, 369.99, 440.00, 369.99, 311.13, 261.63, 277.18]; // C4, Eb4, Gb4, A4, Gb4, Eb4, C4, Db4
    const bowserBass = [65.41, 65.41, 46.25, 46.25, 65.41, 65.41, 46.25, 46.25];       // C2, F#1

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      
      const isBowser = this.mood === 'bowser';
      const leadPattern = isBowser ? bowserLead : marioLead;
      const bassPattern = isBowser ? bowserBass : marioBass;
      const speedMult = isBowser ? 1.5 : 1.0; // Bowser feels slower/heavier

      // Channel 1: Lead Arpeggio
      const oscLead = this.ctx.createOscillator();
      const gainLead = this.ctx.createGain();
      oscLead.type = isBowser ? 'sawtooth' : 'triangle';
      
      const leadFreq = leadPattern[this.bgmStep % leadPattern.length];
      oscLead.frequency.setValueAtTime(leadFreq, now);
      gainLead.gain.setValueAtTime(isBowser ? 0.06 : 0.04, now);
      gainLead.gain.exponentialRampToValueAtTime(0.001, now + (0.31 * speedMult));
      oscLead.connect(gainLead);
      gainLead.connect(this.filter);
      oscLead.start(now);
      oscLead.stop(now + (0.31 * speedMult));

      // Channel 2: Sub Bass (every 2nd step)
      if (this.bgmStep % 2 === 0) {
        const oscBass = this.ctx.createOscillator();
        const gainBass = this.ctx.createGain();
        oscBass.type = isBowser ? 'square' : 'triangle';
        const bassFreq = bassPattern[Math.floor(this.bgmStep / 2) % bassPattern.length];
        oscBass.frequency.setValueAtTime(bassFreq, now);
        gainBass.gain.setValueAtTime(0.06, now);
        gainBass.gain.exponentialRampToValueAtTime(0.001, now + (0.28 * speedMult));
        oscBass.connect(gainBass);
        gainBass.connect(this.filter);
        oscBass.start(now);
        oscBass.stop(now + (0.58 * speedMult));
      }

      // Channel 3: Dynamic Percussion (only when Combo >= 4)
      // Pass game combo via global variable or assume game.combo is accessible (window.game)
      // Since AudioEngine doesn't have direct ref to game, let's just check window.game
      if (window.game && window.game.combo >= 4) {
        // Play hi-hat on every step, and snare on every 2nd step
        const isSnare = (this.bgmStep % 2 === 0);
        
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this.noiseBuffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = isSnare ? 'bandpass' : 'highpass';
        noiseFilter.frequency.value = isSnare ? 1000 : 5000;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(isSnare ? 0.3 : 0.1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isSnare ? 0.2 : 0.05));
        
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        noiseSrc.start(now);
      }

      this.bgmStep++;
    }, 312);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const audio = new SoundEngine();
