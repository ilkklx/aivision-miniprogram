// pages/color-train/color-train.js
const colorSim = require('../../utils/color-simulation.js');

Page({
  data: {
    simulationType: 'normal',
    todayMinutes: 0,
    avgAccuracy: 0,
    activeGame: null,
    difficulty: 1,
    timeLeft: 30,
    guideText: '准备好了吗？',
    games: [
      { id: 'odd', name: '色差挑战', icon: '🎨', desc: '找出颜色稍微不同的那一格', difficulty: 1 },
      { id: 'memory', name: '色彩记忆', icon: '🧠', desc: '翻转并配对相同颜色的卡片', difficulty: 1 },
      { id: 'sort', name: '渐变排序', icon: '📊', desc: '按色调深浅重新排列方块', difficulty: 1 }
    ],
    // 游戏1数据
    gridSize: 2,
    gridItems: [],
    // 游戏2数据
    memorySize: 3,
    memoryCards: [],
    // 游戏3数据
    sortItems: [],
    selectedIndex: -1
  },

  playVoice(text) {
    if (!this.innerAudioContext) return;
    console.log('Voice Guidance:', text);
    // 这里可以接入微信同声传译插件实现真实的语音引导
  },

  onLoad() {
    this.updateLanguage();
    this.loadStats();
    this.innerAudioContext = wx.createInnerAudioContext();
    this._startTime = Date.now();
  },

  onShow() {
    this.updateLanguage();
  },

  updateLanguage() {
    const app = getApp();
    const t = app.globalData.t;
    
    const games = [
      { id: 'odd', name: t.colorTrain.odd, icon: '🎨', desc: t.colorTrain.oddDesc, difficulty: 1 },
      { id: 'memory', name: t.colorTrain.memory, icon: '🧠', desc: t.colorTrain.memoryDesc, difficulty: 1 },
      { id: 'sort', name: t.colorTrain.sort, icon: '📊', desc: t.colorTrain.sortDesc, difficulty: 1 }
    ];

    this.setData({
      language: app.globalData.language,
      t: t,
      games: games,
      guideText: this.data.activeGame ? this.data.guideText : t.colorTrain.timeUp.split('！')[0] // 初始占位
    });
  },

  onUnload() {
    this.stopTimer();
    this.recordDuration();
  },

  recordDuration() {
    if (!this._startTime) return;
    const durationMs = Date.now() - this._startTime;
    const minutes = Math.floor(durationMs / 60000);
    if (minutes > 0) {
      const stats = wx.getStorageSync('colorTrainStats') || { daily: {}, history: [] };
      const today = new Date().toLocaleDateString();
      if (!stats.daily[today]) stats.daily[today] = { minutes: 0, count: 0, correct: 0 };
      stats.daily[today].minutes += minutes;
      wx.setStorageSync('colorTrainStats', stats);
    }
  },

  loadStats() {
    const stats = wx.getStorageSync('colorTrainStats') || { daily: {}, history: [] };
    const today = new Date().toLocaleDateString();
    const todayStats = stats.daily[today] || { minutes: 0, count: 0, correct: 0 };
    
    this.setData({
      todayMinutes: todayStats.minutes,
      avgAccuracy: todayStats.count > 0 ? Math.round((todayStats.correct / todayStats.count) * 100) : 0
    });
  },

  changeMode(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ simulationType: type });
    if (this.data.activeGame) {
      this.refreshGameColors();
    }
  },

  selectGame(e) {
    const id = e.currentTarget.dataset.id;
    const game = this.data.games.find(g => g.id === id);
    this.setData({ activeGame: game, difficulty: 1, timeLeft: 30 });
    this.initGame();
  },

  initGame() {
    const { id } = this.data.activeGame;
    if (id === 'odd') this.initOddOne();
    else if (id === 'memory') this.initMemory();
    else if (id === 'sort') this.initSort();
    this.startTimer();
  },

  // --- 游戏1：色差找不同 ---
  initOddOne() {
    const size = this.data.difficulty + 1;
    const total = size * size;
    const baseColor = this.getRandomColor();
    const diffColor = this.getLightenedColor(baseColor, 40 / this.data.difficulty);
    const oddIndex = Math.floor(Math.random() * total);
    
    const items = Array(total).fill(0).map((_, i) => ({
      color: this.applySim(i === oddIndex ? diffColor : baseColor),
      isOdd: i === oddIndex
    }));

    this.setData({ gridSize: size, gridItems: items, guideText: '点选颜色不同的方块' });
  },

  handleGridTap(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.gridItems[index];
    if (item.isOdd) {
      wx.vibrateShort();
      this.updateDifficulty(true);
      this.initOddOne();
    } else {
      this.updateDifficulty(false);
    }
  },

  // --- 游戏2：颜色记忆 ---
  initMemory() {
    const pairs = this.data.difficulty + 2;
    const colors = Array(pairs).fill(0).map(() => this.getRandomColor());
    const deck = [...colors, ...colors]
      .sort(() => Math.random() - 0.5)
      .map((c, i) => ({ id: i, color: this.applySim(c), flipped: false, matched: false }));
    
    this.setData({ memorySize: pairs > 4 ? 4 : 3, memoryCards: deck, guideText: '找出所有配对的颜色' });
  },

  handleCardTap(e) {
    const index = e.currentTarget.dataset.index;
    const cards = this.data.memoryCards;
    if (cards[index].flipped || cards[index].matched) return;

    const flippedCards = cards.filter(c => c.flipped && !c.matched);
    if (flippedCards.length >= 2) return;

    cards[index].flipped = true;
    this.setData({ memoryCards: cards });

    if (flippedCards.length === 1) {
      const first = flippedCards[0];
      const second = cards[index];
      if (first.color === second.color) {
        setTimeout(() => {
          cards.forEach(c => { if (c.color === first.color) c.matched = true; });
          this.setData({ memoryCards: cards });
          if (cards.every(c => c.matched)) {
            this.updateDifficulty(true);
            this.initMemory();
          }
        }, 500);
      } else {
        setTimeout(() => {
          cards[cards.findIndex(c => c.id === first.id)].flipped = false;
          cards[index].flipped = false;
          this.setData({ memoryCards: cards });
        }, 1000);
      }
    }
  },

  // --- 游戏3：渐变排序 ---
  initSort() {
    const count = this.data.difficulty + 2;
    const startColor = this.getRandomColor();
    const endColor = this.getLightenedColor(startColor, 100);
    
    // 生成渐变色
    const items = Array(count).fill(0).map((_, i) => ({
      id: i,
      color: this.applySim(this.interpolateColor(startColor, endColor, i / (count - 1)))
    })).sort(() => Math.random() - 0.5);

    this.setData({ sortItems: items, selectedIndex: -1, guideText: '点击两个方块交换位置' });
  },

  handleSortTap(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.selectedIndex === -1) {
      this.setData({ selectedIndex: index });
    } else {
      const items = this.data.sortItems;
      const temp = items[index];
      items[index] = items[this.data.selectedIndex];
      items[this.data.selectedIndex] = temp;
      this.setData({ sortItems: items, selectedIndex: -1 });
    }
  },

  checkSortResult() {
    // 检查颜色亮度是否递增
    const items = this.data.sortItems;
    const isCorrect = items.every((item, i) => i === 0 || this.getLum(items[i-1].color) < this.getLum(item.color));
    if (isCorrect) {
      wx.showToast({ title: '完美排列！', icon: 'success' });
      this.updateDifficulty(true);
      this.initSort();
    } else {
      wx.showToast({ title: '顺序不对哦', icon: 'none' });
    }
  },

  // --- 通用工具 ---
  getRandomColor() {
    // 针对不同色盲模式，提供更容易区分的基础色相
    let h;
    const type = this.data.simulationType;
    if (type === 'protanopia') {
      // 红色盲：避开深红，多用黄蓝
      h = Math.random() < 0.5 ? Math.floor(Math.random() * 60 + 40) : Math.floor(Math.random() * 60 + 200);
    } else if (type === 'tritanopia') {
      // 蓝色盲：避开青紫，多用红绿
      h = Math.random() < 0.5 ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 60 + 120);
    } else {
      h = Math.floor(Math.random() * 360);
    }
    return `hsl(${h}, 70%, 50%)`;
  },

  getLightenedColor(hsl, amount) {
    const parts = hsl.match(/\d+/g);
    return `hsl(${parts[0]}, ${parts[1]}%, ${Math.min(90, parseInt(parts[2]) + amount)}%)`;
  },

  interpolateColor(c1, c2, factor) {
    const p1 = c1.match(/\d+/g).map(Number);
    const p2 = c2.match(/\d+/g).map(Number);
    const h = Math.round(p1[0] + (p2[0] - p1[0]) * factor);
    const s = Math.round(p1[1] + (p2[1] - p1[1]) * factor);
    const l = Math.round(p1[2] + (p2[2] - p1[2]) * factor);
    return `hsl(${h}, ${s}%, ${l}%)`;
  },

  applySim(color) {
    // 简单转换 HSL 为 HEX 供算法使用
    const hex = this.hslToHex(color);
    return colorSim.simulateColorblind(hex, this.data.simulationType);
  },

  hslToHex(hsl) {
    const parts = hsl.match(/\d+/g).map(Number);
    let h = parts[0] / 360, s = parts[1] / 100, l = parts[2] / 100;
    let r, g, b;
    if (s === 0) r = g = b = l;
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = this.hue2rgb(p, q, h + 1/3);
      g = this.hue2rgb(p, q, h);
      b = this.hue2rgb(p, q, h - 1/3);
    }
    return colorSim.rgbToHex(r * 255, g * 255, b * 255);
  },

  hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  },

  getLum(hex) {
    const rgb = colorSim.hexToRgb(hex);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  },

  refreshGameColors() {
    this.initGame();
  },

  updateDifficulty(isCorrect) {
    let diff = this.data.difficulty;
    if (isCorrect) diff = Math.min(3, diff + 0.2);
    else diff = Math.max(1, diff - 0.1);
    this.setData({ difficulty: Math.round(diff * 10) / 10 });
    this.saveStats(isCorrect);
  },

  saveStats(isCorrect) {
    const stats = wx.getStorageSync('colorTrainStats') || { daily: {}, history: [] };
    const today = new Date().toLocaleDateString();
    if (!stats.daily[today]) stats.daily[today] = { minutes: 0, count: 0, correct: 0 };
    
    stats.daily[today].count += 1;
    if (isCorrect) stats.daily[today].correct += 1;
    wx.setStorageSync('colorTrainStats', stats);
    this.loadStats();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.data.timeLeft > 0) {
        this.setData({ timeLeft: this.data.timeLeft - 1 });
      } else {
        this.finishRound();
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
  },

  finishRound() {
    this.stopTimer();
    wx.showModal({
      title: '训练时间到！',
      content: `本轮难度: L${this.data.difficulty}`,
      confirmText: '再来一局',
      cancelText: '休息一下',
      success: (res) => {
        if (res.confirm) this.initGame();
        else this.exitGame();
      }
    });
  },

  exitGame() {
    this.stopTimer();
    this.setData({ activeGame: null });
  },

  showWeeklyReport() {
    const stats = wx.getStorageSync('colorTrainStats') || { daily: {}, history: [] };
    wx.showModal({
      title: '训练成就 🏆',
      content: `累计参与次数: ${Object.values(stats.daily).reduce((a, b) => a + b.count, 0)}\n平均正确率: ${this.data.avgAccuracy}%\n\n坚持每天训练，色彩感知会越来越敏锐哦！`,
      showCancel: false
    });
  }
});