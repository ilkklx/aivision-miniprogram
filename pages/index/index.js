// pages/index/index.js
Page({
  data: {
    animateState: 'playing',
    showDebug: false,
    language: 'zh',
    t: null,
    isShattering: false,
    particles: [],
    greetingText: '',
    eyeTipText: '',
    actionTipText: '',
    isLoggedIn: false,
    userInfo: null
  },

  onLoad() {
    this.updateLanguage();
    this.startAnimation();
    this._initGreeting();
  },

  onShow() {
    const app = getApp();
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo
    });
  },

  _initGreeting() {
    const hasShown = wx.getStorageSync('hasShownGreeting');
    if (hasShown) return;

    const app = getApp();
    const checkGreeting = () => {
      if (app.globalData.greeting) {
        const g = app.globalData.greeting;
        this.setData({
          greetingText: g.greeting,
          eyeTipText: g.eyeTip,
          actionTipText: g.actionTip
        });
        wx.setStorageSync('hasShownGreeting', true);
      } else {
        setTimeout(checkGreeting, 500);
      }
    };
    checkGreeting();
  },

  /**
   * 切换语言并执行破碎动画
   */
  switchLanguage() {
    if (this.data.isShattering) return;

    const app = getApp();
    const nextLang = this.data.language === 'zh' ? 'en' : 'zh';
    
    // 1. 生成初始粒子
    this.generateParticles();
    
    // 2. 触发破碎状态
    this.setData({ isShattering: true });
    wx.vibrateShort({ type: 'medium' });

    // 3. 在动画中途切换语言内容 (500ms)
    setTimeout(() => {
      app.setLanguage(nextLang);
      this.updateLanguage();
    }, 500);

    // 4. 动画结束，恢复正常内容 (1200ms)
    setTimeout(() => {
      this.setData({ 
        isShattering: false,
        particles: [] // 清空粒子释放内存
      });
      console.log('[Animation] Shatter & Regroup finished');
    }, 1200);
  },

  /**
   * 动态生成粒子坐标与轨迹
   */
  generateParticles() {
    const particleCount = 40; // 自定义碎片数量
    const newParticles = [];
    const colors = ['#007AFF', '#5AC8FA', '#34C759', '#FF3B30', '#FFCC00'];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        // 初始位置在屏幕中央区域
        x: 40 + Math.random() * 20,
        y: 30 + Math.random() * 40,
        // 目标偏移量 (物理轨迹)
        tx: (Math.random() - 0.5) * 600, // 左右扩散
        ty: (Math.random() - 0.5) * 800, // 上下扩散
        rot: Math.random() * 720 - 360, // 旋转
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    this.setData({ particles: newParticles });
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

  /**
   * 启动/重置动画
   */
  startAnimation() {
    this.setData({ animateState: 'playing' });
    console.log('[Animation] Started');
  },

  /**
   * 暂停/继续动画切换
   */
  toggleAnimatePause() {
    const nextState = this.data.animateState === 'paused' ? 'playing' : 'paused';
    this.setData({ animateState: nextState });
    console.log(`[Animation] ${nextState === 'paused' ? 'Paused' : 'Resumed'}`);
  },

  /**
   * 重新播放动画
   */
  replayAnimation() {
    this.setData({ animateState: '' }, () => {
      setTimeout(() => {
        this.startAnimation();
      }, 50);
    });
  },

  /**
   * 动画完成回调 (绑定在最后一个完成的元素上)
   */
  onAnimationFinished() {
    this.setData({ animateState: 'finished' });
    console.log('[Animation] All elements arrived at target positions.');
    
    // 可以在此处执行动画完成后的业务逻辑，如显示提示等
    /*
    wx.showToast({
      title: '欢迎体验',
      icon: 'none'
    });
    */
  },

  goToVision() {
    wx.navigateTo({
      url: '/pages/detect/detect',
    });
  },

  goToColorblind() {
    wx.navigateTo({
      url: '/package_colorblind/pages/colorblind/colorblind',
    });
  },

  goToAstigmatism() {
    wx.navigateTo({
      url: '/pages/astigmatism/astigmatism',
    });
  },

  goToEyeExercises() {
    wx.navigateTo({
      url: '/package_eye_exercises/pages/eye-exercises/eye-exercises',
    });
  },

  goToLogin() {
    wx.navigateTo({
      url: '/package_user/pages/login/login',
    });
  },

  onShareAppMessage() {
    return {
      title: '试试稳定触控 + 可选AI的智能视力检测',
      path: '/pages/index/index'
    }
  }
});
