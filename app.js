const i18n = require('./utils/i18n.js');

App({
  onLaunch() {
    const lang = wx.getStorageSync('language') || 'zh';
    this.globalData.language = lang;
    this.globalData.t = i18n.translations[lang];

    const userInfo = wx.getStorageSync('localUserInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }

    this._generateGreeting();
  },

  _generateGreeting() {
    const hour = new Date().getHours();
    let timeGreeting = '';
    let eyeTip = '';

    if (hour >= 6 && hour < 11) {
      timeGreeting = '早上好';
      eyeTip = '新的一天开始了，记得让眼睛也充充电哦！适当远眺5分钟，让眼睛更舒服～';
    } else if (hour >= 11 && hour < 14) {
      timeGreeting = '中午好';
      eyeTip = '午间休息时间，闭眼小憩一会儿，给眼睛放个短假吧！';
    } else if (hour >= 14 && hour < 18) {
      timeGreeting = '下午好';
      eyeTip = '下午容易眼疲劳，记得20-20-20法则：每20分钟看20英尺远处20秒～';
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = '晚上好';
      eyeTip = '忙碌了一天，晚上记得减少屏幕时间，让眼睛好好休息～';
    } else {
      timeGreeting = '夜深了';
      eyeTip = '这么晚还在用眼？记得调低屏幕亮度，早点休息哦～';
    }

    const userInfo = this.globalData.userInfo;
    let regionText = '';
    if (userInfo && userInfo.province) {
      regionText = userInfo.province + '的';
    }
    const nickname = (userInfo && userInfo.nickName) || '小伙伴';

    this.globalData.greeting = {
      greeting: `${timeGreeting}，${regionText}${nickname}！👋`,
      eyeTip: eyeTip,
      actionTip: '让我们开始今天的护眼流程吧！💪'
    };
  },

  login(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('localUserInfo', userInfo);

    const records = wx.getStorageSync('loginRecords') || [];
    records.push({
      time: new Date().toISOString(),
      platform: (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).platform || ''
    });
    wx.setStorageSync('loginRecords', records);

    this._generateGreeting();
  },

  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('localUserInfo');
  },

  setLanguage(lang) {
    this.globalData.language = lang;
    this.globalData.t = i18n.translations[lang];
    wx.setStorageSync('language', lang);
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page && typeof page.updateLanguage === 'function') {
        page.updateLanguage();
      }
    });
  },

  globalData: {
    userInfo: null,
    language: 'zh',
    t: null,
    isLoggedIn: false,
    greeting: null
  }
});
