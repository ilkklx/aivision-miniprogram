// pages/astigmatism-train/astigmatism-train.js
Page({
  data: {
    todayTrainTime: 0,
    streakDays: 0,
    activeGame: null,
    difficulty: 1,
    timeLeft: 60,
    score: 0,
    
    // 游戏1：经线对齐
    targetAngle: 0,
    currentAngle: 0,
    
    // 游戏2：对比度强化
    gaborAngle: 0,
    gaborOpacity: 1.0,
    
    showFeedback: false,
    feedbackText: '',
    feedbackType: ''
  },

  onLoad() {
    this.updateLanguage();
    this.loadStats();
    this._startTime = 0;
  },

  onShow() {
    this.updateLanguage();
  },

  /**
   * 更新语言显示
   */
  updateLanguage() {
    const app = getApp();
    this.setData({
      language: app.globalData.language,
      t: app.globalData.t
    });
  },

  onUnload() {
    this.stopTimer();
    this.recordProgress();
  },

  loadStats() {
    const stats = wx.getStorageSync('astigmatismStats') || { totalMinutes: 0, lastDate: '', streak: 0 };
    const today = new Date().toLocaleDateString();
    
    this.setData({
      todayTrainTime: stats.lastDate === today ? stats.todayMinutes : 0,
      streakDays: stats.streak
    });
  },

  recordProgress() {
    if (!this._startTime) return;
    const durationMs = Date.now() - this._startTime;
    const minutes = Math.floor(durationMs / 60000);
    if (minutes <= 0) return;

    const stats = wx.getStorageSync('astigmatismStats') || { totalMinutes: 0, lastDate: '', streak: 0, todayMinutes: 0 };
    const today = new Date().toLocaleDateString();
    
    if (stats.lastDate === today) {
      stats.todayMinutes += minutes;
    } else {
      // 检查连续性
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
      if (stats.lastDate === yesterday) {
        stats.streak += 1;
      } else {
        stats.streak = 1;
      }
      stats.lastDate = today;
      stats.todayMinutes = minutes;
    }
    stats.totalMinutes += minutes;
    wx.setStorageSync('astigmatismStats', stats);
  },

  selectGame(e) {
    const id = e.currentTarget.dataset.id;
    const { t } = this.data;
    const game = {
      id,
      name: id === 'meridian' ? t.astigTrain.meridian : t.astigTrain.contrast
    };
    this.setData({ activeGame: game, score: 0, timeLeft: 60 });
    this._startTime = Date.now();
    this.initGame();
  },

  initGame() {
    const id = this.data.activeGame.id;
    if (id === 'meridian') {
      this.resetMeridianRound();
    } else {
      this.startGaborRotation();
    }
    this.startTimer();
  },

  // --- 游戏1逻辑 ---
  resetMeridianRound() {
    const target = Math.floor(Math.random() * 12) * 15; // 每15度一个目标
    this.setData({
      targetAngle: target,
      currentAngle: Math.floor(Math.random() * 180)
    });
  },

  handleTouchStart(e) {
    this._touchStartAngle = this.data.currentAngle;
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
  },

  handleTouchMove(e) {
    const dx = e.touches[0].clientX - this._touchStartX;
    // 简单的线性移动映射到旋转，实际可优化为极坐标计算
    const newAngle = (this._touchStartAngle + dx / 2) % 180;
    this.setData({ currentAngle: newAngle });

    // 检查对齐
    if (Math.abs(newAngle - this.data.targetAngle) < 5) {
      this.triggerFeedback(this.data.t.astigTrain.meridianSuccess, 'success');
      this.setData({ score: this.data.score + 10 });
      wx.vibrateShort();
      this.resetMeridianRound();
    }
  },

  // --- 游戏2逻辑 ---
  startGaborRotation() {
    this._gaborTimer = setInterval(() => {
      let nextAngle = (this.data.gaborAngle + 5) % 180;
      this.setData({ gaborAngle: nextAngle });
    }, 100);
  },

  handleContrastAction(e) {
    const type = e.currentTarget.dataset.type;
    const lastTest = wx.getStorageSync('lastTestResult');
    const targetAxis = lastTest && lastTest.type === 'astigmatism' ? lastTest.axis : 90;

    if (type === 'clear') {
      // 检查当前旋转角度是否接近用户的散光轴向（或预设轴向）
      const diff = Math.abs(this.data.gaborAngle - targetAxis);
      if (diff < 15 || diff > 165) {
        this.triggerFeedback('捕捉精准！', 'success');
        this.setData({ score: this.data.score + 20 });
      } else {
        this.triggerFeedback('继续观察细节', 'error');
      }
    }
  },

  // --- 通用逻辑 ---
  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.data.timeLeft > 0) {
        this.setData({ timeLeft: this.data.timeLeft - 1 });
      } else {
        this.finishGame();
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    if (this._gaborTimer) clearInterval(this._gaborTimer);
  },

  triggerFeedback(text, type) {
    this.setData({
      showFeedback: true,
      feedbackText: text,
      feedbackType: type
    });
    setTimeout(() => this.setData({ showFeedback: false }), 800);
  },

  finishGame() {
    this.stopTimer();
    const { t } = this.data;
    wx.showModal({
      title: t.protect.finishModalTitle,
      content: `${t.colorTrain.difficulty}: L${this.data.difficulty}\n${t.protect.finishModalContent}`,
      showCancel: false,
      confirmText: t.common.confirm,
      success: () => this.exitGame()
    });
  },

  exitGame() {
    this.stopTimer();
    this.recordProgress();
    this.setData({ activeGame: null });
    this.loadStats();
  }
});