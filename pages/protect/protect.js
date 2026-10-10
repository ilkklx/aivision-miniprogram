// pages/protect/protect.js
Page({
  data: {
    weeklyMinutes: 0,
    completedCount: 0,
    parentMode: false,
    currentGame: null,
    isGamePlaying: false,
    timeLeft: 60,
    voiceText: '准备好了吗？我们要开始啦！',
    language: 'zh',
    t: null,
    games: []
  },

  onLoad() {
    this.updateLanguage();
    this.loadStats();
    this.innerAudioContext = wx.createInnerAudioContext();
  },

  /**
   * 更新语言显示
   */
  updateLanguage() {
    const app = getApp();
    const t = app.globalData.t;
    const games = [
      {
        id: 'track',
        name: t.protect.track,
        icon: '⭐',
        level: 1,
        desc: t.protect.trackDesc,
        guide: t.protect.guideTrack
      },
      {
        id: 'focus',
        name: t.protect.focus,
        icon: '🎈',
        level: 2,
        desc: t.protect.focusDesc,
        guide: t.protect.guideFocus
      },
      {
        id: 'rotate',
        name: t.protect.rotate,
        icon: '🌀',
        level: 3,
        desc: t.protect.rotateDesc,
        guide: t.protect.guideRotate
      }
    ];

    this.setData({
      language: app.globalData.language,
      t: t,
      games: games,
      voiceText: t.protect.finishModalContent // 初始占位
    });
  },

  onUnload() {
    this.stopTimer();
  },

  loadStats() {
    const stats = wx.getStorageSync('protectStats') || { weeklyMinutes: 0, completedCount: 0, history: [] };
    this.setData({
      weeklyMinutes: stats.weeklyMinutes,
      completedCount: stats.completedCount
    });
  },

  showWeeklyReport() {
    const stats = wx.getStorageSync('protectStats') || { weeklyMinutes: 0, completedCount: 0, history: [] };
    if (stats.history.length === 0) {
      wx.showToast({ title: '暂无训练数据', icon: 'none' });
      return;
    }
    
    const last7Days = stats.history.slice(-7);
    const reportMsg = last7Days.map(h => `${h.date}: 训练${h.duration}分钟`).join('\n');
    
    wx.showModal({
      title: '训练周报 📊',
      content: `本周总时长: ${stats.weeklyMinutes}分钟\n\n最近记录:\n${reportMsg}`,
      showCancel: false,
      confirmText: '继续加油'
    });
  },

  saveStats(minutes) {
    const stats = wx.getStorageSync('protectStats') || { weeklyMinutes: 0, completedCount: 0, history: [] };
    stats.weeklyMinutes += minutes;
    stats.completedCount += 1;
    stats.history.push({
      date: new Date().toLocaleDateString(),
      duration: minutes,
      gameId: this.data.currentGame.id
    });
    wx.setStorageSync('protectStats', stats);
    this.loadStats();
  },

  startGame(e) {
    const id = e.currentTarget.dataset.id;
    const game = this.data.games.find(g => g.id === id);
    this.setData({
      currentGame: game,
      timeLeft: 60,
      isGamePlaying: true,
      voiceText: game.guide
    });
    this.playVoice(game.guide);
    this.startTimer();
  },

  exitGame() {
    this.stopTimer();
    this.setData({
      currentGame: null,
      isGamePlaying: false
    });
  },

  toggleGamePlay() {
    const nextPlaying = !this.data.isGamePlaying;
    this.setData({ isGamePlaying: nextPlaying });
    if (nextPlaying) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.data.timeLeft > 0) {
        this.setData({ timeLeft: this.data.timeLeft - 1 });
        
        // 每20秒换个语音提示
        if (this.data.timeLeft % 20 === 0 && this.data.timeLeft > 0) {
          const tips = ['真棒！继续加油！', '坚持住，眼睛会感谢你的', '做得很到位哦'];
          const tip = tips[Math.floor(Math.random() * tips.length)];
          this.setData({ voiceText: tip });
          this.playVoice(tip);
        }
      } else {
        this.finishGame();
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  finishGame() {
    this.stopTimer();
    this.saveStats(1); // 每次训练计1分钟
    const { t } = this.data;
    wx.showModal({
      title: t.protect.finishModalTitle,
      content: t.protect.finishModalContent,
      showCancel: false,
      confirmText: t.common.confirm,
      success: () => {
        this.exitGame();
      }
    });
    this.playVoice(t.protect.finishModalTitle);
  },

  toggleParentMode() {
    const nextMode = !this.data.parentMode;
    if (nextMode) {
      wx.showModal({
        title: '开启监督模式',
        content: '开启后将记录更详细的训练周报，建议家长陪同。',
        success: (res) => {
          if (res.confirm) {
            this.setData({ parentMode: true });
          }
        }
      });
    } else {
      this.setData({ parentMode: false });
    }
  },

  playVoice(text) {
    console.log('Voice Guidance:', text);
    // 实际应使用语音合成 API 或预录制的音频文件
    // 这里仅做演示
  }
});