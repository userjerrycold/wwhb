Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        getApp().globalData.userInfo = res.userInfo
      }
    })
  },

  onSettingsTap() {
    wx.navigateTo({
      url: '/pages/settings/index'
    })
  },

  onAboutTap() {
    wx.navigateTo({
      url: '/pages/about/index'
    })
  }
}) 