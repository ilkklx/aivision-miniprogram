// pages/colorblind/colorblind.js
const colorSim = require('../../../utils/color-simulation.js');

Page({
  data: {
    currentIndex: 0,
    correctCount: 0,
    isSimulating: false,
    simulationType: 'normal', // normal, protanopia, deuteranopia, tritanopia, achromatopsia
    currentContrast: 0,
    testList: [
      {
        id: 1,
        image: '/package_colorblind/assets/images/压缩图片/01.png.png',
        answer: '15',
        options: ['12', '15', '17', '18'],
        color1: '#e2e8f0', color2: '#4a5568', type: 'all'
      },
      {
        id: 2,
        image: '/package_colorblind/assets/images/压缩图片/02.png.png',
        answer: '1',
        options: ['1', '7', '0', '9'],
        color1: '#fbd38d', color2: '#ed8936', type: 'deuteranopia'
      },
      {
        id: 3,
        image: '/package_colorblind/assets/images/压缩图片/03.png.png',
        answer: '36',
        options: ['20', '36', '70', '79'],
        color1: '#9ae6b4', color2: '#38a169', type: 'protanopia'
      },
      {
        id: 4,
        image: '/package_colorblind/assets/images/压缩图片/04.png.png',
        answer: '6',
        options: ['2', '5', '6', '8'],
        color1: '#feb2b2', color2: '#e53e3e', type: 'protanopia'
      },
      {
        id: 5,
        image: '/package_colorblind/assets/images/压缩图片/05.png.png',
        answer: '骆驼',
        options: ['马', '牛', '骆驼', '羊'],
        color1: '#a0aec0', color2: '#2d3748', type: 'achromatopsia'
      },
      {
        id: 6,
        image: '/package_colorblind/assets/images/压缩图片/06.png.png',
        answer: '猎豹',
        options: ['老虎', '猎豹', '狮子', '猫'],
        color1: '#81E6D9', color2: '#319795', type: 'tritanopia'
      },
      {
        id: 7,
        image: '/package_colorblind/assets/images/压缩图片/07.png.png',
        answer: '铃鹿',
        options: ['马', '羚羊', '斑马', '铃鹿'],
        color1: '#FBB6CE', color2: '#D53F8C', type: 'deuteranopia'
      }
    ],
    displayColors: {
      bg: '',
      target: ''
    },
    results: [],
    language: 'zh',
    t: null,
    selectedOption: null, // 当前点击的选项
    answerStatus: '', // 'correct' 或 'wrong'
    isAnimating: false // 动画锁
  },

  onLoad() {
    this.updateLanguage();
    this.updateDisplayColors();
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

  updateDisplayColors() {
    const current = this.data.testList[this.data.currentIndex];
    const type = this.data.simulationType;
    
    let bg = current.color1;
    let target = current.color2;

    if (type !== 'normal') {
      bg = colorSim.simulateColorblind(bg, type);
      target = colorSim.simulateColorblind(target, type);
    }

    const contrast = colorSim.getContrastRatio(bg, target).toFixed(2);

    this.setData({
      displayColors: { bg, target },
      currentContrast: contrast
    });
  },

  toggleSimulation() {
    const isSimulating = !this.data.isSimulating;
    this.setData({ 
      isSimulating,
      simulationType: isSimulating ? 'protanopia' : 'normal'
    });
    this.updateDisplayColors();
  },

  changeSimType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ simulationType: type });
    this.updateDisplayColors();
  },

  selectOption(e) {
    if (this.data.isAnimating) return; // 动画播放期间锁定点击，防止狂点

    const val = e.currentTarget.dataset.val;
    const current = this.data.testList[this.data.currentIndex];
    const isCorrect = val === current.answer;
    
    const results = this.data.results;
    results.push({
      id: current.id,
      selected: val,
      correct: current.answer,
      isCorrect
    });

    // 触发动画状态
    this.setData({
      selectedOption: val,
      answerStatus: isCorrect ? 'correct' : 'wrong',
      isAnimating: true,
      results,
      correctCount: isCorrect ? this.data.correctCount + 1 : this.data.correctCount
    });

    // 加入触觉震动反馈增强沉浸感
    if (isCorrect) {
      wx.vibrateShort({ type: 'medium' });
    } else {
      wx.vibrateLong();
    }

    // 等待动画播放 800ms 后切换到下一题
    setTimeout(() => {
      // 恢复状态
      this.setData({
        selectedOption: null,
        answerStatus: '',
        isAnimating: false
      });

      if (this.data.currentIndex < this.data.testList.length - 1) {
        this.setData({
          currentIndex: this.data.currentIndex + 1
        });
        this.updateDisplayColors();
      } else {
        this.finishTest();
      }
    }, 800);
  },

  finishTest() {
    const score = Math.round((this.data.correctCount / this.data.testList.length) * 100);
    const { t } = this.data;
    let resultText = '';
    let suggestion = '';

    if (score === 100) {
      resultText = t.result.colorblind.normal;
      suggestion = t.result.colorblind.sugNormal;
    } else if (score >= 60) {
      resultText = t.result.colorblind.mild;
      suggestion = t.result.colorblind.sugMild;
    } else {
      resultText = t.result.colorblind.severe;
      suggestion = t.result.colorblind.sugSevere;
    }

    wx.setStorageSync('lastTestResult', {
      type: 'colorblind',
      score: score,
      resultText,
      suggestion,
      time: new Date().toLocaleString(),
      details: this.data.results
    });

    wx.redirectTo({
      url: '/pages/result/result?type=colorblind',
    });
  }
});