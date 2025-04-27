const app = getApp()
const deepseek = require('../../utils/deepseek')

Page({
  data: {
    messages: [],
    inputValue: '',
    scrollToMessage: '',
    inputFocus: false,
    isLoading: false
  },

  onLoad() {
    this.loadMessages()
  },

  // 加载消息历史
  loadMessages() {
    const messages = wx.getStorageSync('chat_messages') || []
    this.setData({ 
      messages,
      scrollToMessage: messages.length > 0 ? `msg-${messages[messages.length - 1].timestamp}` : ''
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

    // 立即清空输入框，但保持键盘展开
    this.setData({ 
      inputValue: '',
      inputFocus: true,
      isLoading: true
    })

    // 先添加用户的原始消息
    this.addTextMessage(content)

    // 智能分析收入支出
    const isIncome = this.analyzeIncomeOrExpense(content)
    
    // 解析消费记录
    const billMatch = content.match(/(.+?)\s*(\d+(\.\d{1,2})?)(\s*元)?/)
    if (billMatch) {
      const [_, item, amount] = billMatch
      // 不再添加用户的账单消息，直接由AI回复账单确认
      await this.handleBillAnalysis(item, parseFloat(amount), isIncome)
    }

    // 保持输入框展开状态
    this.setData({ 
      isLoading: false,
      inputFocus: true
    })
  },

  // 分析是收入还是支出
  analyzeIncomeOrExpense(content) {
    const incomeKeywords = [
      '众筹款', '打赏', '小费', '服务费', '感谢费' 
    ];
    
    return incomeKeywords.some(keyword => content.includes(keyword));
  },

  // 处理账单分析
  async handleBillAnalysis(item, amount, isIncome) {
    try {
      const analysis = await deepseek.analyzeFinance({
        type: 'consumption',
        content: {
          item,
          amount,
          isIncome
        }
      })
      
      if (analysis && analysis.length > 0) {
        // 添加AI的账单确认消息，包含分析内容
        const timestamp = Date.now()
        const billMessage = {
          ...analysis[0],
          timestamp: timestamp,
          timeStr: this.formatTime(timestamp),
          content: {
            ...analysis[0].content,
            analysis: analysis[1].content // 将分析内容添加到账单消息中
          }
        }
        this.addMessage(billMessage)
      }
    } catch (error) {
      wx.showToast({
        title: error.message || '获取分析失败',
        icon: 'none'
      })
    }
  },

  // 添加文本消息
  addTextMessage(text) {
    const message = {
      type: 'text',
      content: text,
      isSelf: true,
      timestamp: Date.now(),
      timeStr: this.formatTime(Date.now())
    }
    this.addMessage(message)
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  },

  // 添加消息
  addMessage(message) {
    // 确保消息有时间戳和时间字符串
    if (!message.timestamp) {
      message.timestamp = Date.now()
    }
    if (!message.timeStr) {
      message.timeStr = this.formatTime(message.timestamp)
    }

    const messages = [...this.data.messages, message]
    this.setData({ 
      messages,
      scrollToMessage: `msg-${message.timestamp}`
    }, () => {
      // 使用 nextTick 确保在消息渲染后再滚动
      wx.nextTick(() => {
        // 获取消息列表容器
        const query = wx.createSelectorQuery()
        query.select('.message-list').node()
        query.exec((res) => {
          const scrollView = res[0].node
          scrollView.scrollTo({
            top: scrollView.scrollHeight,
            behavior: 'smooth'
          })
        })
      })
    })
    wx.setStorageSync('chat_messages', messages)
  },

  // 清空消息
  clearMessages() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有消息吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [] })
          wx.removeStorageSync('chat_messages')
        }
      }
    })
  },

  // 编辑账单
  editBill(e) {
    const bill = e.currentTarget.dataset.bill
    // 实现编辑账单功能
  },

  // 删除账单
  deleteBill(e) {
    const bill = e.currentTarget.dataset.bill
    // 实现删除账单功能
  }
}) 