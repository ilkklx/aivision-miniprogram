Page({
  data: {
    currentIndex: 0,
    currentName: '按揉攒竹穴',
    totalCount: 6,
    names: [
      '按揉攒竹穴',
      '按压睛明穴',
      '按揉四白穴',
      '按揉太阳穴刮上眼眶',
      '按揉风池穴',
      '揉捏耳垂脚趾抓地'
    ]
  },

  onLoad() {
    console.log('眼保健操页面加载成功');
  },

  onImageError(e) {
    console.error('图片加载失败:', e.detail);
  },

  onNextExercise() {
    const nextIndex = (this.data.currentIndex + 1) % this.data.totalCount;
    
    if (nextIndex === 0) {
      wx.showToast({
        title: '已完成全部！',
        icon: 'success'
      });
    }
    
    this.setData({
      currentIndex: nextIndex,
      currentName: this.data.names[nextIndex]
    });
    
    wx.vibrateShort({ type: 'light' });
  },

  onPrevExercise() {
    const prevIndex = this.data.currentIndex === 0 
      ? this.data.totalCount - 1 
      : this.data.currentIndex - 1;
    
    this.setData({
      currentIndex: prevIndex,
      currentName: this.data.names[prevIndex]
    });
    
    wx.vibrateShort({ type: 'light' });
  }
});
