//index.js
//获取应用实例
// const app = getApp()

Page({
  
  data: {
    imgW:0,
    imgH:0,
    imgSrc:''
  },
  
  onLoad: function () {
     
  },

  onReady: function () {
    
  },

  btnClick: function () {
  	wx.navigateTo({
  		url:'../camera/camera'
  	})
  }

})
