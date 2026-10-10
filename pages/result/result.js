// pages/result/result.js
Page({
  data: {
    type: 'vision', // vision, colorblind, astigmatism
    level: '--', // 初始设为空白，避免显示硬编码的 5.0
    eye: '',
    time: '',
    duration: '',
    analysisText: '',
    score: 0,
    resultText: '',
    suggestion: '',
    language: 'zh',
    t: null,
    visionTrainBtnText: ''
  },

  onLoad(options) {
    this.updateLanguage();
    const lastResult = wx.getStorageSync('lastTestResult');
    
    // 逻辑优化：显式指定默认类型为 'vision'
    let type = options.type || (lastResult && lastResult.type) || 'vision';
    
    // 如果存储中的结果类型匹配当前要显示的类型，或者存储中没有类型（视为旧版视力数据）
    if (lastResult && (!lastResult.type || lastResult.type === type)) {
      this.setData({
        type: type, // 使用解析后的 type
        time: lastResult.time || '',
        score: lastResult.score || 0,
        resultText: lastResult.resultText || '',
        suggestion: lastResult.suggestion || ''
      });

      if (type === 'vision') {
        const l = parseFloat(lastResult.level);
        let btnText = this.data.t.result.goToVisionTrain;
        if (!isNaN(l)) {
          if (l >= 5.0) btnText = this.data.language === 'zh' ? '视力维护训练' : 'Vision Maintenance';
          else if (l >= 4.8) btnText = this.data.language === 'zh' ? '视力提升游戏' : 'Vision Boost Game';
          else btnText = this.data.language === 'zh' ? '视力恢复训练' : 'Vision Recovery';
        }

        this.setData({
          level: lastResult.level || '--',
          eye: lastResult.eye === '左眼' ? this.data.t.result.leftEye : this.data.t.result.rightEye,
          duration: lastResult.duration || '',
          analysisText: this.getAnalysisText(lastResult.level),
          visionTrainBtnText: btnText
        });
      }
    } else if (options.level) {
      // 兼容旧的跳转逻辑
      const levelValue = parseFloat(options.level);
      let btnText = this.data.t.result.goToVisionTrain;
      if (!isNaN(levelValue)) {
        if (levelValue >= 5.0) btnText = this.data.language === 'zh' ? '视力维护训练' : 'Vision Maintenance';
        else if (levelValue >= 4.8) btnText = this.data.language === 'zh' ? '视力提升游戏' : 'Vision Boost Game';
        else btnText = this.data.language === 'zh' ? '视力恢复训练' : 'Vision Recovery';
      }

      this.setData({
        type: 'vision',
        level: options.level,
        eye: options.eye === '左眼' ? this.data.t.result.leftEye : this.data.t.result.rightEye,
        time: new Date().toLocaleString(),
        duration: '2分钟',
        analysisText: this.getAnalysisText(options.level),
        visionTrainBtnText: btnText
      });
    }

    // 护眼引导机制 (对所有视力模式用户开放)
    if (this.data.type === 'vision') {
      const l = parseFloat(this.data.level);
      const { t } = this.data;
      let modalTitle = t.result.modal.warnTitle;
      let modalContent = t.result.modal.warnContent;
      
      if (!isNaN(l) && l >= 5.0) {
        modalTitle = t.result.modal.idealTitle;
        modalContent = t.result.modal.idealContent;
      }

      setTimeout(() => {
        wx.showModal({
          title: modalTitle,
          content: modalContent,
          confirmText: t.result.modal.view,
          cancelText: t.result.modal.later,
          success: (res) => {
            if (res.confirm) {
              this.goToVisionTrain();
            }
          }
        });
      }, 1500);
    }
  },

  getAnalysisText(level) {
    const l = parseFloat(level);
    const { t } = this.data;
    if (!t) return '';

    if (isNaN(l)) return t.result.analysis.invalid;
    if (l >= 5.0) {
      return t.result.analysis.ideal;
    } else if (l >= 4.8) {
      return t.result.analysis.normal;
    } else if (l >= 4.5) {
      return t.result.analysis.low;
    } else {
      return t.result.analysis.warn;
    }
  },

  retest() {
    const type = this.data.type;
    let url = '/pages/detect/detect';
    if (type === 'colorblind') url = '/package_colorblind/pages/colorblind/colorblind';
    else if (type === 'astigmatism') url = '/pages/astigmatism/astigmatism';
    
    wx.redirectTo({ url });
  },

  /**
   * 更新语言显示
   */
  updateLanguage() {
    const app = getApp();
    const t = app.globalData.t;
    this.setData({
      language: app.globalData.language,
      t: t
    });
    
    // 如果页面已经有数据，重新计算翻译文本
    if (this.data.level && this.data.level !== '--') {
      this.setData({
        analysisText: this.getAnalysisText(this.data.level)
      });
    }
    
    // 重新处理眼睛翻译
    const lastResult = wx.getStorageSync('lastTestResult');
    if (lastResult && lastResult.type === 'vision') {
      this.setData({
        eye: lastResult.eye === '左眼' ? t.result.leftEye : t.result.rightEye
      });
    }
  },

  /**
   * 切换语言
   */
  switchLanguage() {
    const app = getApp();
    const nextLang = this.data.language === 'zh' ? 'en' : 'zh';
    app.setLanguage(nextLang);
    wx.vibrateShort({ type: 'light' });
  },

  goToTrain() {
    wx.navigateTo({
      url: '/pages/color-train/color-train',
    });
  },

  goToVisionTrain() {
    wx.navigateTo({
      url: '/pages/protect/protect',
    });
  },

  goToAstigmatismTrain() {
    wx.navigateTo({
      url: '/pages/astigmatism-train/astigmatism-train',
    });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
