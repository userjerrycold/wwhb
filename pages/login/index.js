Page({
  data: {
    inviteCode: '',
    isLoading: false
  },

  onLoad() {
    // 每次进入登录页面时清除登录状态
    wx.removeStorageSync('isLoggedIn')
  },

  onShow() {
    // 每次显示页面时也清除登录状态
    wx.removeStorageSync('isLoggedIn')
  },

  // 处理邀请码输入
  onInput(e) {
    // van-field 的 change 事件返回的是 detail 而不是 detail.value
    const value = e.detail ? e.detail : ''
    this.setData({
      inviteCode: value
    })
  },

  // 处理登录
  handleLogin() {
    const { inviteCode } = this.data
    console.log('输入的邀请码:', inviteCode)

    if (!inviteCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    // 验证邀请码
    if (inviteCode.toLowerCase() === 'qianhu') {
      console.log('邀请码验证通过')
      
      // 保存登录状态
      wx.setStorageSync('isLoggedIn', true)
      
      // 延迟一下再跳转，让用户看到成功提示
      setTimeout(() => {
        this.navigateToChat()
      }, 1500)

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
    } else {
      console.log('邀请码验证失败')
      wx.showToast({
        title: '邀请码错误',
        icon: 'error'
      })
    }

    this.setData({ isLoading: false })
  },

  // 跳转到聊天页面
  navigateToChat() {
    wx.switchTab({
      url: '/pages/chat/index'
    })
  }
}) 