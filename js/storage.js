/* ==========================================================================
   PERSISTENT LOCALSTORAGE & ACHIEVEMENT MANAGER
   ========================================================================== */

const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Byte', desc: 'Eat your first food item.', icon: '🍎' },
  { id: 'score_100', name: 'Century Club', desc: 'Reach a score of 100 points.', icon: '💯' },
  { id: 'score_500', name: 'High Roller', desc: 'Reach a score of 500 points.', icon: '👑' },
  { id: 'merge_master', name: 'Merge Master', desc: 'Perform 10 segment merges in Merge Surge mode.', icon: '⚡' },
  { id: 'surge_activate', name: 'Surge Charge!', desc: 'Activate Hyper-Surge ability.', icon: '🔥' },
  { id: 'pvp_winner', name: 'Apex Predator', desc: 'Win a 60-second PvP Blitz match against AI opponents.', icon: '🏆' },
  { id: 'retro_fan', name: 'Nokia Nostalgia', desc: 'Play a game in Nokia 3310 LCD theme.', icon: '📱' },
  { id: 'skin_collector', name: 'Fashion Cobra', desc: 'Unlock any custom snake skin.', icon: '🎨' }
];

class StorageManager {
  constructor() {
    this.key = 'SNAKE_SURGE_DATA';
    this.data = this.loadData();
  }

  getDefaultData() {
    return {
      highScores: {
        classic: 0,
        surge: 0,
        pvp: 0
      },
      stats: {
        foodEaten: 0,
        totalMerges: 0,
        surgesActivated: 0,
        gamesPlayed: 0,
        pvpWins: 0,
        maxCombo: 0
      },
      selectedTheme: 'cyber',
      selectedDifficulty: 'hard', // Default to current behavior
      settings: {
        muted: false,
        bgm: false
      },
      selectedSkin: 'cyber',
      unlockedSkins: ['cyber'],
      unlockedAchievements: [],
      leaderboard: { classic: [], surge: [], pvp: [] }
    };
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.key);
      const defaults = this.getDefaultData();
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const merged = { ...defaults, ...parsed };
      // Merge nested objects key-by-key, otherwise an older save's `stats`
      // object replaces the defaults wholesale and any newly added stat key
      // stays undefined (updateStats then silently skips it forever).
      for (const key of ['highScores', 'stats', 'settings', 'leaderboard']) {
        merged[key] = { ...defaults[key], ...(parsed[key] || {}) };
      }
      return merged;
    } catch (e) {
      console.warn('Failed to load LocalStorage data, using defaults.', e);
      return this.getDefaultData();
    }
  }

  /* Leaderboard: keeps the top 10 runs per mode.
     Returns the 1-based rank if the run placed, otherwise null. */
  addLeaderboardEntry(mode, score) {
    if (score <= 0) return null;
    if (!this.data.leaderboard[mode]) this.data.leaderboard[mode] = [];
    const list = this.data.leaderboard[mode];
    // Local calendar date — toISOString() is UTC and would stamp "tomorrow"
    // for anyone playing in the evening west of Greenwich.
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = { score, date: stamp };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    this.data.leaderboard[mode] = list.slice(0, 10);
    this.saveData();
    const rank = this.data.leaderboard[mode].indexOf(entry);
    return rank === -1 ? null : rank + 1;
  }

  getLeaderboard(mode) {
    return this.data.leaderboard[mode] || [];
  }

  saveData() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save LocalStorage data.', e);
    }
  }

  getHighScore(mode) {
    return this.data.highScores[mode] || 0;
  }

  setHighScore(mode, score) {
    if (score > (this.data.highScores[mode] || 0)) {
      this.data.highScores[mode] = score;
      this.saveData();
      return true;
    }
    return false;
  }

  updateStats(deltaStats) {
    for (const [key, val] of Object.entries(deltaStats)) {
      if (key === 'maxCombo') {
        this.data.stats.maxCombo = Math.max(this.data.stats.maxCombo, val);
      } else if (this.data.stats[key] !== undefined) {
        this.data.stats[key] += val;
      }
    }
    this.saveData();
    this.checkAchievements();
  }

  /* Evaluate skin unlock conditions against career progress.
     SKINS lives in snake.js, which loads after this file — hence the guard. */
  checkSkinUnlocks() {
    if (typeof SKINS === 'undefined') return;
    const bestScore = Math.max(...Object.values(this.data.highScores));
    SKINS.forEach(skin => {
      if (!skin.unlock || this.data.unlockedSkins.includes(skin.id)) return;
      const u = skin.unlock;
      const earned = u.stat
        ? (this.data.stats[u.stat] || 0) >= u.need
        : bestScore >= u.anyScore;
      if (earned) {
        this.data.unlockedSkins.push(skin.id);
        this.saveData();
        if (this.onSkinUnlocked) this.onSkinUnlocked(skin);
      }
    });
  }

  checkAchievements() {
    this.checkSkinUnlocks();
    const newlyUnlocked = [];

    const unlock = (id) => {
      if (!this.data.unlockedAchievements.includes(id)) {
        this.data.unlockedAchievements.push(id);
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) newlyUnlocked.push(ach);
      }
    };

    if (this.data.stats.foodEaten >= 1) unlock('first_blood');
    if (this.data.highScores.classic >= 100 || this.data.highScores.surge >= 100) unlock('score_100');
    if (this.data.highScores.classic >= 500 || this.data.highScores.surge >= 500) unlock('score_500');
    if (this.data.stats.totalMerges >= 10) unlock('merge_master');
    if (this.data.stats.surgesActivated >= 1) unlock('surge_activate');
    if (this.data.stats.pvpWins >= 1) unlock('pvp_winner');
    if (this.data.selectedTheme === 'nokia') unlock('retro_fan');
    if (this.data.unlockedSkins.length > 1) unlock('skin_collector');

    if (newlyUnlocked.length > 0) {
      this.saveData();
      if (this.onAchievementUnlocked) {
        newlyUnlocked.forEach(ach => this.onAchievementUnlocked(ach));
      }
    }
  }

  setTheme(theme) {
    this.data.selectedTheme = theme;
    this.saveData();
    this.checkAchievements();
  }

  getTheme() {
    return this.data.selectedTheme;
  }

  getSetting(key) {
    return this.data.settings ? this.data.settings[key] : undefined;
  }

  setSetting(key, val) {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings[key] = val;
    this.saveData();
  }

  setDifficulty(diff) {
    this.data.selectedDifficulty = diff;
    this.saveData();
  }

  getDifficulty() {
    return this.data.selectedDifficulty || 'hard';
  }

  setSkin(skin) {
    if (this.data.unlockedSkins.includes(skin)) {
      this.data.selectedSkin = skin;
      this.saveData();
      return true;
    }
    return false;
  }

  unlockSkin(skin) {
    if (!this.data.unlockedSkins.includes(skin)) {
      this.data.unlockedSkins.push(skin);
      this.saveData();
      this.checkAchievements();
      return true;
    }
    return false;
  }
}

const storage = new StorageManager();
