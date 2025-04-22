const app = getApp()
const deepseek = require('../../utils/deepseek')

Page({
  data: {
    messages: [],
    inputValue: '',
    billStats: {
      daily: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0
    },
    scrollToMessage: '',
    inputFocus: false,
    isLoading: false
  },

  onLoad() {
    this.loadMessages()
    this.updateBillStats()
  },

  // 加载消息历史
  loadMessages() {
    const messages = wx.getStorageSync('chat_messages') || []
    this.setData({ 
      messages,
      scrollToMessage: messages.length > 0 ? `msg-${messages[messages.length - 1].timestamp}` : ''
    })
  },

  // 更新账单统计
  updateBillStats() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const messages = this.data.messages
    let daily = 0, monthly = 0, quarterly = 0, yearly = 0

    messages.forEach(msg => {
      if (msg.type === 'consumption') {
        const msgDate = new Date(msg.timestamp)
        const amount = parseFloat(msg.content.amount)

        if (msgDate >= today) daily += amount
        if (msgDate >= monthStart) monthly += amount
        if (msgDate >= quarterStart) quarterly += amount
        if (msgDate >= yearStart) yearly += amount
      }
    })

    this.setData({
      billStats: { daily, monthly, quarterly, yearly }
    })
  },

  // 处理输入变化
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 发送消息
  async sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content) return

    // 设置加载状态为true，显示加载动画
    this.setData({ 
      isLoading: true
    })

    // 解析消费记录
    const billMatch = content.match(/(.+?)\s*(\d+(\.\d{1,2})?)\s*元/)
    if (billMatch) {
      const [_, item, amount] = billMatch
      this.addBillMessage(item, parseFloat(amount))
    } else {
      this.addTextMessage(content)
    }

    this.setData({ 
      inputValue: '',
      inputFocus: true
    })

    try {
      // 模拟延迟，让加载动画显示更明显
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 获取AI分析回复
      const analysis = await deepseek.analyzeFinance(this.data.messages)
      if (analysis && analysis.length > 0) {
        this.addMessage(analysis[0])
      }
    } catch (error) {
      wx.showToast({
        title: error.message || '获取分析失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 添加账单消息
  addBillMessage(item, amount) {
    // 获取消费分类和图标
    const categoryHelper = require('../../utils/categoryHelper');
    const category = categoryHelper.getCategory(item);
    const icon = categoryHelper.getCategoryIcon(category);
    
    const message = {
      type: 'consumption',
      content: {
        item,
        amount,
        category,
        icon: `/assets/icons/categories/${icon}`
      },
      timestamp: Date.now(),
      isSelf: true
    }
    this.addMessage(message)
  },

  // 添加文本消息
  addTextMessage(text) {
    const message = {
      type: 'text',
      content: text,
      timestamp: Date.now(),
      isSelf: true
    }
    this.addMessage(message)
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  // 添加消息到列表
  addMessage(message) {
    const messages = [...this.data.messages, {
      ...message,
      timeStr: this.formatTime(message.timestamp)
    }];
    this.setData({ 
      messages,
      scrollToMessage: `msg-${message.timestamp}`
    });
    wx.setStorageSync('chat_messages', messages);
    this.updateBillStats();
  },

  // 开始语音输入
  startVoiceInput() {
    wx.showToast({
      title: '语音输入功能开发中',
      icon: 'none'
    })
  },

  // 展开更多选项
  expandOptions() {
    wx.showActionSheet({
      itemList: ['选择图片', '清空记录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseImage()
        } else if (res.tapIndex === 1) {
          this.clearMessages()
        }
      }
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        const message = {
          type: 'image',
          content: res.tempFilePaths[0],
          timestamp: Date.now(),
          isSelf: true
        }
        this.addMessage(message)
      }
    })
  },

  // 清空消息记录
  clearMessages() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 
            messages: [],
            scrollToMessage: ''
          })
          wx.removeStorageSync('chat_messages')
          this.updateBillStats()
        }
      }
    })
  }
}) 