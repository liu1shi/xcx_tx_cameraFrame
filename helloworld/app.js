//app.js
App({
  onLaunch: function () {
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)


    this.getSize();
  },
  getSize() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        that.globalData.ww = res.windowWidth;
        that.globalData.hh = res.windowHeight;
        //rpx = px
        console.log('sys size:', res.windowWidth, res.windowHeight, res.pixelRatio)
      }
    })
  },
  globalData: {
    userInfo: null
  }
})