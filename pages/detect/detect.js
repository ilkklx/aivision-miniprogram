const GestureManager = require('../../utils/GestureManager.js');

Page({
  data: {
    showCamera: true,
    showE: true,
    progress: 0,
    progressColor: '#007AFF',
    currentLevel: 0,
    visionLevels: [
      { size: 240, level: '4.0' },
      { size: 190, level: '4.1' },
      { size: 150, level: '4.2' },
      { size: 120, level: '4.3' },
      { size: 96, level: '4.4' },
      { size: 76, level: '4.5' },
      { size: 60, level: '4.6' },
      { size: 48, level: '4.7' },
      { size: 38, level: '4.8' },
      { size: 30, level: '4.9' },
      { size: 24, level: '5.0' },
      { size: 19, level: '5.1' },
      { size: 15, level: '5.2' }
    ],
    eDirection: 0,
    eSize: 100,
    chartType: 'E',
    currentSymbol: 'E',
    modes: ['E字表', '数字表', '图形表'],
    modeIndex: 0,
    tipText: '正在准备...',
    feedback: {
      show: false,
      type: '',
      icon: ''
    },
    showPermissionModal: false,
    correctCount: 0,
    wrongCount: 0,
    maxWrong: 2,
    testResults: [],
    diagnostics: {
      isAnalyzing: false,
      lastError: '',
      lowConfidenceCount: 0,
      poorLightingCount: 0,
      history: []
    },
    handDetected: false,
    guidanceTip: '等待摄像头启动...',
    isProcessing: false,
    showDebug: false,
    confidence: 0,
    isSimulator: false,
    cameraPosition: 'front',
    engineModeText: '未启动',
    gestureGuideText: '触控模式：上滑/右滑/下滑/左滑',
    lastGestureLabel: '无',
    aiEnabled: false,
    isTransitioning: false,
    currentEye: 'right', // 'left' or 'right'
    eyeToastShow: false,
    eyeToastText: '',
    // 等级系统
    levelChar: '👶',
    showLevelUp: false,
    animationEnabled: true,
    levelParticles: [],
    // 小动物同步组件
    showAnimal: true,
    currentAnimal: '🐱',
    animalSize: 40, // 默认大小 rpx
    animalPosition: 0, // 对应进度条百分比
    animalSpeedRate: 1.0,
    isAnimalJump: false,
    // 多语言
    language: 'zh',
    t: null
  },

  onLoad() {
    this._cameraRestartTimer = null;
    this._processingCooldownTimer = null;
    this._uiThrottleTimer = null;
    this._eyeToastTimer = null;
    this._levelUpTimer = null;
    this._animalJumpTimer = null;
    this._ctx = null;
    this._lastUIUpdateTime = 0;
    this._lastFrameTime = 0;
    
    this.updateLanguage();

    // 加载上次记忆的设置
    const savedEye = wx.getStorageSync('currentEye');
    const savedAnim = wx.getStorageSync('animationEnabled');
    const savedShowAnimal = wx.getStorageSync('showAnimal');
    
    // 随机选择一个小动物
    const animals = ['🐱', '🐶', '🐰', '🐦', '🐹', '🦊', '🐼', '🐨'];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

    this.setData({ 
      currentEye: savedEye || 'right',
      progressColor: (savedEye || 'right') === 'left' ? '#007AFF' : '#FF3B30',
      animationEnabled: savedAnim !== false,
      showAnimal: savedShowAnimal !== false,
      currentAnimal: randomAnimal
    });

    // 初始化简化版手势管理器
    this.gestureManager = new GestureManager(this);
    this._setupGestureEvents();

    this.checkEnvironment();
    this.initTest();
    this.checkCameraPermission();
    this.innerAudioContext = wx.createInnerAudioContext();
  },

  _setupGestureEvents() {
    this.gestureManager.on('statusChange', ({ status, error, engineType }) => {
      let guidanceTip = this.data.guidanceTip;
      let engineModeText = this.data.engineModeText;
      const { t } = this.data;

      switch (status) {
        case 'STARTING':
          guidanceTip = t.detect.engineStarting + '...';
          engineModeText = t.detect.engineStarting;
          break;
        case 'RUNNING':
          guidanceTip = t.detect.guidanceAI;
          engineModeText = `${t.detect.engineRunning}(${engineType})`;
          break;
        case 'ERROR':
          guidanceTip = t.detect.guidanceStable;
          engineModeText = t.detect.touchMode;
          this.setData({ aiEnabled: false });
          break;
        case 'IDLE':
          engineModeText = t.detect.touchMode;
          break;
      }

      this.setData({ guidanceTip, engineModeText });
      if (error) this.logDiagnostic('ERROR', error);
    });

    this.gestureManager.on('result', (res) => {
      this.throttledSetData({
        handDetected: true,
        confidence: Math.round(res.score * 100),
        lastGestureLabel: this.getGestureLabel(res.gesture)
      });

      if (res.points) this.drawHandLandmarks(res.points);
      
      // 使用 GestureManager 统一输出的结果值进行判定
      if (res.value !== -1) {
        this.debounceDirection(res.value);
      }
    });
  },

  /**
   * 更新语言显示
   */
  updateLanguage() {
    const app = getApp();
    const t = app.globalData.t;
    this.setData({
      language: app.globalData.language,
      t: t,
      // 同步更新一些依赖语言的动态数据
      modes: [t.index.visionMode, t.index.colorblindMode, t.index.astigmatismMode],
      guidanceTip: t.detect.guidanceReady
    });
    this.refreshSymbol(); // 刷新提示语
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

  onShow() {
    if (this.data.isSimulator || this.data.showPermissionModal) return;
    if (!this.data.showCamera) this.remountCamera(160);
  },

  onHide() {
    this.gestureManager.stop();
    this.setData({ showCamera: false });
  },

  onUnload() {
    this.gestureManager.stop();
  },

  checkEnvironment() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const isSimulator = info.platform === 'devtools';
    this.setData({ isSimulator });
    if (isSimulator) {
      this.logDiagnostic('WARNING', '模拟器不支持手势，请使用真机预览');
    }
  },

  toggleDebug() {
    this.setData({ showDebug: !this.data.showDebug });
  },

  switchCamera() {
    if (this.data.isTransitioning) return;
    const nextPosition = this.data.cameraPosition === 'front' ? 'back' : 'front';
    this.gestureManager.stop();
    this.setData({
      isTransitioning: true,
      handDetected: false,
      confidence: 0,
      cameraPosition: nextPosition,
      showCamera: false
    });
    this.remountCamera();
  },

  handleCameraInit() {
    this.logDiagnostic('SUCCESS', '摄像头初始化完成');
    this.setData({ isTransitioning: false });
    if (this.data.aiEnabled) {
      this.gestureManager.start({ 
        cameraPosition: this.data.cameraPosition
      });
    }
  },

  remountCamera(delay = 120) {
    clearTimeout(this._cameraRestartTimer);
    this._cameraRestartTimer = setTimeout(() => {
      this._ctx = null;
      this.setData({ showCamera: true });
    }, delay);
  },

  toggleAIMode() {
    if (this.data.isTransitioning) return;
    const aiEnabled = !this.data.aiEnabled;
    this.setData({ 
      aiEnabled,
      handDetected: false,
      confidence: 0,
      lastGestureLabel: '无'
    });

    if (aiEnabled) {
      this.gestureManager.start({ cameraPosition: this.data.cameraPosition });
    } else {
      this.gestureManager.stop();
    }
  },

  toggleEye() {
    const nextEye = this.data.currentEye === 'right' ? 'left' : 'right';
    const toastText = nextEye === 'left' ? '请切换至左眼' : '请切换至右眼';
    const progressColor = nextEye === 'left' ? '#007AFF' : '#FF3B30'; // 进度条颜色同步切换
    
    // 触感反馈增强科技感
    wx.vibrateShort({ type: 'medium' });

    this.setData({
      currentEye: nextEye,
      eyeToastText: toastText,
      eyeToastShow: true,
      progressColor
    });

    // 记忆设置
    wx.setStorageSync('currentEye', nextEye);

    // 自动隐藏提示
    clearTimeout(this._eyeToastTimer);
    this._eyeToastTimer = setTimeout(() => {
      this.setData({ eyeToastShow: false });
    }, 2500);
  },

  throttledSetData(data) {
    const now = Date.now();
    const minInterval = 100; // 10fps
    
    if (now - this._lastUIUpdateTime > minInterval) {
      this.setData(data);
      this._lastUIUpdateTime = now;
      clearTimeout(this._uiThrottleTimer);
    } else {
      clearTimeout(this._uiThrottleTimer);
      this._uiThrottleTimer = setTimeout(() => {
        this.setData(data);
        this._lastUIUpdateTime = Date.now();
      }, minInterval);
    }
  },

  handleTouchStart(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    this._touchStartPoint = { x: touch.clientX, y: touch.clientY };
  },

  handleTouchEnd(e) {
    if (!this._touchStartPoint || this.data.aiEnabled) {
      this._touchStartPoint = null;
      return;
    }
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) {
      this._touchStartPoint = null;
      return;
    }
    const dx = touch.clientX - this._touchStartPoint.x;
    const dy = touch.clientY - this._touchStartPoint.y;
    this._touchStartPoint = null;

    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    if (this.data.chartType === 'E') {
      if (isHorizontal) {
        this.handleRecognition(dx > 0 ? 0 : 180);
      } else {
        this.handleRecognition(dy > 0 ? 90 : 270);
      }
    }
  },

  drawHandLandmarks(points) {
    if (!this.data.showDebug) return;

    if (!this._ctx) {
      if (this._ctxInitializing) return;
      this._ctxInitializing = true;

      const query = wx.createSelectorQuery();
      query.select('#handCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          this._ctxInitializing = false;
          if (!res || !res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          this._ctx = canvas.getContext('2d');
          this._ctx.scale(dpr, dpr);
          this._canvasWidth = res[0].width;
          this._canvasHeight = res[0].height;
        });
      return;
    }

    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
    ctx.fillStyle = '#007AFF';
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * this._canvasWidth, p.y * this._canvasHeight, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  },

  analyzeHandDirection(points, gesture) {
    // 逻辑已完全迁移至 GestureManager
  },

  debounceDirection(value) {
    if (value === this._lastDetected) {
      this._dirCount += 1;
    } else {
      this._dirCount = 1;
      this._lastDetected = value;
    }

    const threshold = this.data.confidence >= 80 ? 3 : 4;
    if (this._dirCount >= threshold) {
      this.setData({ isProcessing: true });
      this.handleRecognition(value);
      this._dirCount = 0;
      this._lastDetected = null;
      clearTimeout(this._processingCooldownTimer);
      this._processingCooldownTimer = setTimeout(() => {
        this.setData({ isProcessing: false });
      }, 700);
    }
  },

  logDiagnostic(type, message) {
    const entry = { time: new Date().toLocaleTimeString(), type, message };
    
    // 性能优化：只有在调试面板真正显示时，才执行耗时的数组操作和 setData
    if (this.data.showDebug) {
      const history = (this.data.diagnostics.history || []).concat(entry).slice(-30); // 减少保留条数至30
      this.setData({ 'diagnostics.history': history });
    }
    
    console.log(`[DIAGNOSTIC] ${type}: ${message}`);
  },

  getGestureLabel(gesture) {
    const labels = { 1: '手掌', 2: '剪刀', 3: '握拳', 4: '数字1', 6: '点赞', 7: '数字3', 13: 'OK' };
    return labels[gesture] || '未知';
  },

  handleCameraError(e) {
    this.logDiagnostic('FAILURE', '摄像头异常');
    this.setData({ guidanceTip: '摄像头启动失败', engineModeText: '异常' });
  },

  initTest() {
    this.setData({
      currentLevel: 0,
      correctCount: 0,
      wrongCount: 0,
      eSize: this.data.visionLevels[0].size,
      tipText: this.data.t.detect.preparing,
      progress: 0
    });
    this.refreshSymbol();
  },

  changeMode(e) {
    const index = parseInt(e.detail.value, 10);
    const types = ['E', 'number', 'graphic'];
    this.setData({ modeIndex: index, chartType: types[index] });
    this.refreshSymbol();
  },

  refreshSymbol() {
    const { chartType, aiEnabled, t } = this.data;
    if (!t) return; // 还没加载好

    let currentSymbol = 'E';
    let eDirection = 0;

    if (chartType === 'E') {
      eDirection = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
    } else if (chartType === 'number') {
      currentSymbol = ['0', '1', '2', '3', '4', '5', '6', '8'][Math.floor(Math.random() * 8)];
    } else {
      currentSymbol = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
    }

    this.setData({
      currentSymbol,
      eDirection,
      gestureGuideText: aiEnabled ? t.detect.guideE_AI : t.detect.guideE,
      tipText: aiEnabled ? t.detect.tipE_AI : t.detect.tipE,
      lastGestureLabel: t.detect.placeholder
    });
  },

  handleRecognition(val) {
    if (this.data.feedback.show) return;
    wx.vibrateShort();
    const { chartType, eDirection, currentSymbol } = this.data;
    let isCorrect = false;

    if (chartType === 'E') isCorrect = parseInt(val, 10) === eDirection;
    else if (chartType === 'number') isCorrect = String(val) === currentSymbol;
    else isCorrect = val === currentSymbol;

    this.showFeedback(isCorrect);
    if (isCorrect) this.handleCorrect();
    else this.handleWrong();
  },

  showFeedback(isCorrect) {
    this.setData({ feedback: { show: true, type: isCorrect ? 'correct' : 'wrong', icon: isCorrect ? '✔️' : '❌' } });
    setTimeout(() => this.setData({ 'feedback.show': false }), 1000);
  },

  handleCorrect() {
    let { currentLevel, correctCount, visionLevels } = this.data;
    const oldLevel = currentLevel;

    if (++correctCount >= 2 || currentLevel === 0) {
      currentLevel++;
      correctCount = 0;
    }

    if (currentLevel >= visionLevels.length) {
      return this.finishTest(visionLevels[visionLevels.length - 1].level);
    }


    // 检测等级提升
    if (currentLevel > oldLevel && this.data.animationEnabled) {
      this.triggerLevelUpAnimation(currentLevel);
      
      // 触发小动物跳跃
      if (this.data.showAnimal) {
        this.setData({ isAnimalJump: true });
        clearTimeout(this._animalJumpTimer);
        this._animalJumpTimer = setTimeout(() => {
          this.setData({ isAnimalJump: false });
        }, 600);
      }
    }

    this.setData({
      currentLevel,
      correctCount,
      eSize: visionLevels[currentLevel].size,
      progress: (currentLevel / visionLevels.length) * 100
    });
    this.refreshSymbol();
  },

  triggerLevelUpAnimation(levelIndex) {
    let char = '👶';
    if (levelIndex >= 11) char = '⚡';
    else if (levelIndex >= 8) char = '🦅';
    else if (levelIndex >= 4) char = '🧐';

    // 震动反馈
    wx.vibrateShort({ type: 'heavy' });

    // 生成随机粒子数据
    const particles = [];
    for (let i = 0; i < 12; i++) {
      particles.push({
        id: Date.now() + i,
        left: Math.random() * 100 - 50, // 相对偏移
        top: Math.random() * 100 - 50,
        delay: Math.random() * 0.5
      });
    }

    this.setData({
      levelChar: char,
      showLevelUp: true,
      levelParticles: particles
    });

    clearTimeout(this._levelUpTimer);
    this._levelUpTimer = setTimeout(() => {
      this.setData({
        showLevelUp: false,
        levelParticles: []
      });
    }, 2000);
  },

  toggleAnimation() {
    const nextState = !this.data.animationEnabled;
    this.setData({ animationEnabled: nextState });
    wx.setStorageSync('animationEnabled', nextState);
    wx.showToast({
      title: nextState ? '特效已开启' : '特效已关闭',
      icon: 'none'
    });
  },

  toggleAnimal() {
    const nextState = !this.data.showAnimal;
    this.setData({ showAnimal: nextState });
    wx.setStorageSync('showAnimal', nextState);
    wx.showToast({
      title: nextState ? '小伙伴已上线' : '小伙伴已休息',
      icon: 'none'
    });
  },

  handleWrong() {
    let { wrongCount, maxWrong, currentLevel, visionLevels, t } = this.data;
    if (++wrongCount >= maxWrong) {
      const resultLevel = currentLevel > 0 ? visionLevels[currentLevel - 1].level : t.detect.below4;
      return this.finishTest(resultLevel);
    }
    this.setData({ wrongCount });
    this.refreshSymbol();
  },

  finishTest(result) {
    wx.setStorageSync('lastTestResult', {
      type: 'vision', // 必须保存类型，以便结果页正确路由逻辑
      level: result,
      eye: this.data.currentEye === 'left' ? '左眼' : '右眼',
      time: new Date().toLocaleString(),
      duration: '2分钟'
    });
    wx.redirectTo({ url: `/pages/result/result?type=vision&level=${result}` });
  },

  playVoice(text) { console.log('Playing voice:', text); },
  handlePermission() {},
  requestCameraAccess() { wx.authorize({ scope: 'scope.camera', success: () => this.toggleAIMode() }); },
  handleRejectPermission() { this.setData({ showPermissionModal: false }); },
  mockRecognize(e) { this.handleRecognition(e.currentTarget.dataset.val); }
});
