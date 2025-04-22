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

    this.setData({ 
      inputValue: '',
      inputFocus: true,
      isLoading: false
    })
  },

  // 分析是收入还是支出
  analyzeIncomeOrExpense(content) {
    const incomeKeywords = ['收入', '工资', '发工资', '工钱', '奖金', '报销', '收款', '红包', '补贴', '退款']
    return incomeKeywords.some(keyword => content.includes(keyword))
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
        // 添加AI的账单确认消息
        this.addMessage(analysis[0])
        
        // 延迟1秒后添加分析消息
        setTimeout(() => {
          this.addMessage(analysis[1])
        }, 1000)
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
  },

  // 编辑账单
  editBill(e) {
    const bill = e.currentTarget.dataset.bill
    wx.showModal({
      title: '编辑账单',
      content: '',
      editable: true,
      placeholderText: '请输入事项和金额，例如：买药 26',
      success: async (res) => {
        if (res.confirm && res.content) {
          // 解析新的账单信息
          const billMatch = res.content.match(/(.+?)\s*(\d+(\.\d{1,2})?)(\s*元)?/)
          if (billMatch) {
            const [_, item, amount] = billMatch
            // 更新账单
            const messages = this.data.messages.map(msg => {
              if (msg.timestamp === bill.timestamp) {
                const isIncome = this.analyzeIncomeOrExpense(item)
                return {
                  ...msg,
                  content: {
                    ...msg.content,
                    item,
                    amount: parseFloat(amount),
                    isIncome
                  }
                }
              }
              return msg
            })
            
            this.setData({ messages })
            wx.setStorageSync('chat_messages', messages)
            this.updateBillStats()
            
            // 重新获取AI分析
            await this.handleBillAnalysis(item, parseFloat(amount), this.analyzeIncomeOrExpense(item))
          } else {
            wx.showToast({
              title: '格式错误',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 删除账单
  deleteBill(e) {
    const bill = e.currentTarget.dataset.bill
    wx.showModal({
      title: '删除账单',
      content: '确定要删除这条账单吗？',
      success: (res) => {
        if (res.confirm) {
          // 删除账单消息和相关的AI回复
          const billIndex = this.data.messages.findIndex(msg => msg.timestamp === bill.timestamp)
          if (billIndex !== -1) {
            const messages = this.data.messages.filter((msg, index) => {
              // 删除账单消息和它后面的第一条AI回复
              return index !== billIndex && index !== billIndex + 1
            })
            
            this.setData({ messages })
            wx.setStorageSync('chat_messages', messages)
            this.updateBillStats()
          }
        }
      }
    })
  }
}) 