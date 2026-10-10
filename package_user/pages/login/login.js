Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    loginCount: 0,
    lastLoginTime: '',
    nickName: '',
    avatarUrl: ''
  },

  onLoad() {
    const app = getApp();
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: app.globalData.userInfo,
        nickName: app.globalData.userInfo.nickName || '',
        avatarUrl: app.globalData.userInfo.avatarUrl || ''
      });
      this._loadLocalStats();
    }
  },

  _loadLocalStats() {
    const records = wx.getStorageSync('loginRecords') || [];
    this.setData({
      loginCount: records.length,
      lastLoginTime: records.length > 0 ? new Date(records[records.length - 1].time).toLocaleString() : ''
    });
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({ avatarUrl: avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  onConfirmLogin() {
    const nickName = this.data.nickName.trim() || '微信用户';
    const avatarUrl = this.data.avatarUrl || '';

    const userInfo = {
      nickName: nickName,
      avatarUrl: avatarUrl,
      loginType: 'wechat',
      province: '',
      city: ''
    };

    const app = getApp();
    app.login(userInfo);

    this.setData({
      isLoggedIn: true,
      userInfo: userInfo
    });
    this._loadLocalStats();

    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 1200);
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.logout();
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            loginCount: 0,
            lastLoginTime: '',
            nickName: '',
            avatarUrl: ''
          });
        }
      }
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
