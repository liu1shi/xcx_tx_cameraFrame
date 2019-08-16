// pages/camera/camera.js
//index.js
//获取应用实例
var face = require('../../utils/face.js');

const app = getApp()
const ww = app.globalData.ww;
const hh = app.globalData.hh;
Page({
  data: {
    ww: ww,
    hh: hh,
    tips: 0,
    hideCamera: false,
    devicePosition: 'front',
    avg: 0,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    hideFaceInfo: true
  },
  //faceTime = 0,
  onLoad() {
    this.ctx = wx.createCameraContext();
    this.showTips();
    const listener = this.ctx.onCameraFrame((frame) => {    
      //faceTime++; 
      //console.log('img size:', frame.width, frame.height)
      const pixels_large = new Uint8Array(frame.data)
      const result = face.downsample(pixels_large, frame.width, frame.height)
      //console.log('after downsample');
      //const pixels = model_data.faces_bmp;

      var r = face.face_detect(result.buffer, result.width, result.height)
      //console.log('after merge', r)
      if(r.length>=1){
        this.setData({
          x: r[0].x,
          y: r[0].y,
          w: r[0].width,
          h: r[0].height,
          hideFaceInfo: false
        })
      }
      else
      {
        this.setData({
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          hideFaceInfo: true
        })
      }
  
    })
    listener.start()
  },
  takePhoto() {
    this.ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        this.setData({
          photo: res.tempImagePath,
          hideCamara: true,
        });
      }
    })
  },

  retoken() {
    this.setData({
      photo: 0,
      hideCamara: false,
      flash: 'on',
    })
  },

  change() {
    if (this.data.devicePosition == 'back') {
      this.setData({
        devicePosition: 'front'
      })
    } else {
      this.setData({
        devicePosition: 'back'
      })
    }
  },

  showTips() {
    this.setData({
      tips: 1
    });
    setTimeout(() => {
      this.setData({
        tips: 0
      });
    }, 3000);
  }
})