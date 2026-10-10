// pages/astigmatism/astigmatism.js
Page({
  data: {
    lines: [],
    showAxisPicker: false,
    selectedAxis: -1,
    hasAstigmatism: false,
    language: 'zh',
    t: null
  },

  onLoad() {
    this.updateLanguage();
    // 生成散光表线条，每15度一根
    const lines = [];
    for (let i = 0; i < 180; i += 15) {
      lines.push({ angle: i });
    }
    this.setData({ lines });
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

  answer(e) {
    const val = e.currentTarget.dataset.val;
    if (val === 'yes') {
      this.setData({
        showAxisPicker: true,
        hasAstigmatism: true
      });
    } else {
      this.finishTest(false);
    }
  },

  selectAxis(e) {
    const angle = e.currentTarget.dataset.angle;
    this.setData({
      selectedAxis: angle
    });
  },

  confirmAxis() {
    if (this.data.selectedAxis === -1) {
      wx.showToast({
        title: '请选择最深的方向',
        icon: 'none'
      });
      return;
    }
    this.finishTest(true);
  },

  finishTest(hasAstigmatism) {
    const { t } = this.data;
    let resultText = '';
    let suggestion = '';
    let score = hasAstigmatism ? 60 : 100;

    if (!hasAstigmatism) {
      resultText = t.result.astigmatism.none;
      suggestion = t.result.astigmatism.sugNone;
    } else {
      resultText = t.result.astigmatism.suspect;
      suggestion = t.result.astigmatism.sugSuspect.replace('{axis}', this.data.selectedAxis);
    }

    wx.setStorageSync('lastTestResult', {
      type: 'astigmatism',
      score: score,
      resultText,
      suggestion,
      time: new Date().toLocaleString(),
      axis: this.data.selectedAxis
    });

    wx.redirectTo({
      url: '/pages/result/result?type=astigmatism',
    });
  }
});