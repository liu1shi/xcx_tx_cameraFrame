//index.js
//获取应用实例
// const app = getApp()

Page({
  
  data: {
    
  },
  
  onLoad: function () {
     
  },

  onReady: function () {

  	var i = 0;

    const context = wx.createCameraContext()
	this.listener = context.onCameraFrame((frame) => {
	  
	  if (i == 10) {

	  	wx.canvasPutImageData({
		  canvasId: 'canvas',
		  x: 0,
		  y: 0,
		  width: frame.width,
		  height: frame.height,
		  data: new Uint8ClampedArray(frame.data),
		  success (res) {

		  	wx.canvasToTempFilePath({
			  x: 0,
			  y: 0,
			  width: frame.width,
			  height: frame.height,
			  destWidth: frame.width,
			  destHeight: frame.height,
			  canvasId: 'canvas',
			  success(res) {

			    console.log(res.tempFilePath)

			    var pages = getCurrentPages();
        		var prePage = pages[pages.length - 2];  //图片显示在上一个页面
        		prePage.setData({
        			imgW: frame.width,
        			imgH: frame.height,
        			imgSrc: res.tempFilePath
        		})

			  }
			})
		  }
		})
	  }
	  i ++

	})
	this.listener.start()
  },

  onUnload: function () {
  	this.listener.stop()
  }

})
