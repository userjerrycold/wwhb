const app = getApp()
const deepseek = require('../../utils/deepseek')

Page({
  data: {
    messages: [],
    inputValue: '',
    currentTimeType: 'daily',
    billData: [],
    billStats: {
      daily: 0,
      dailyIncome: 0,
      monthly: 0,
      monthlyIncome: 0,
      yearly: 0,
      yearlyIncome: 0
    },
    scrollToMessage: '',
    inputFocus: false,
    isLoading: false,
    showReportPopup: false,
    showDetailPopup: false,
    reportType: 'daily',
    reportData: {
      totalIncome: 0,
      totalExpense: 0,
      analysis: '',
      details: []
    },
    detailData: {},
    ec: {
      lazyLoad: true,
      onInit: function(canvas, width, height, dpr) {
        const chart = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr
        })
        canvas.setChart(chart)
        return chart
      }
    },
    chartInstance: null // 添加图表实例引用
  },

  onLoad() {
    this.loadMessages()
    this.updateBillStats()
    this.loadBillData()
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
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const messages = this.data.messages
    let daily = 0, dailyIncome = 0
    let monthly = 0, monthlyIncome = 0
    let yearly = 0, yearlyIncome = 0

    messages.forEach(msg => {
      if (msg.type === 'consumption') {
        const msgDate = new Date(msg.timestamp)
        const amount = parseFloat(msg.content.amount)
        const isIncome = msg.content.isIncome

        if (msgDate >= today) {
          if (isIncome) dailyIncome += amount
          else daily += amount
        }
        if (msgDate >= monthStart) {
          if (isIncome) monthlyIncome += amount
          else monthly += amount
        }
        if (msgDate >= yearStart) {
          if (isIncome) yearlyIncome += amount
          else yearly += amount
        }
      }
    })

    this.setData({
      billStats: { daily, dailyIncome, monthly, monthlyIncome, yearly, yearlyIncome }
    })
  },

  // 显示日报表
  showDailyReport() {
    wx.navigateTo({
      url: '/pages/report/index?type=daily',
      success: (res) => {
        res.eventChannel.emit('reportData', {
          type: 'daily',
          data: this.getReportData('daily')
        })
      }
    })
  },

  // 显示月报表
  showMonthlyReport() {
    wx.navigateTo({
      url: '/pages/report/index?type=monthly',
      success: (res) => {
        res.eventChannel.emit('reportData', {
          type: 'monthly',
          data: this.getReportData('monthly')
        })
      }
    })
  },

  // 显示年报表
  showYearlyReport() {
    wx.navigateTo({
      url: '/pages/report/index?type=yearly',
      success: (res) => {
        res.eventChannel.emit('reportData', {
          type: 'yearly',
          data: this.getReportData('yearly')
        })
      }
    })
  },

  // 获取报表数据
  getReportData(type) {
    const messages = this.data.messages
    const now = new Date()
    let data = []

    messages.forEach(msg => {
      if (msg.type === 'consumption') {
        const msgDate = new Date(msg.timestamp)
        const amount = parseFloat(msg.content.amount)
        const isIncome = msg.content.isIncome

        if (type === 'daily' && msgDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          data.push({
            date: msgDate.toLocaleDateString(),
            amount: isIncome ? amount : -amount,
            isIncome,
            item: msg.content.item,
            category: msg.content.category
          })
        } else if (type === 'monthly' && msgDate >= new Date(now.getFullYear(), now.getMonth(), 1)) {
          data.push({
            date: msgDate.toLocaleDateString(),
            amount: isIncome ? amount : -amount,
            isIncome,
            item: msg.content.item,
            category: msg.content.category
          })
        } else if (type === 'yearly' && msgDate >= new Date(now.getFullYear(), 0, 1)) {
          data.push({
            date: msgDate.toLocaleDateString(),
            amount: isIncome ? amount : -amount,
            isIncome,
            item: msg.content.item,
            category: msg.content.category
          })
        }
      }
    })

    return data
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

    this.setData({ 
      isLoading: false,
      inputFocus: true  // 确保在完成后键盘仍然保持展开
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
        }, 2000)
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
            const isIncome = this.analyzeIncomeOrExpense(item)
            
            // 只删除记账单和AI分析消息
            const messages = this.data.messages.filter(msg => 
              !(msg.type === 'consumption' && msg.timestamp === bill.timestamp) &&
              !(msg.type === 'text' && msg.content.includes('分析') && msg.timestamp > bill.timestamp)
            )
            
            this.setData({ messages }, () => {
              // 重新生成账单和AI分析
              this.handleBillAnalysis(item, parseFloat(amount), isIncome)
              // 更新统计
              this.updateBillStats()
              // 保存到本地存储
              wx.setStorageSync('chat_messages', this.data.messages)
            })
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
  },

  switchTimeType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentTimeType: type })
    this.loadBillData()
    this.navigateToReport(type)
  },

  loadBillData() {
    // 根据currentTimeType加载对应时间段的账单数据
    const now = new Date()
    let startDate, endDate
    
    switch(this.data.currentTimeType) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
    }

    // 这里应该调用云函数获取数据
    // 暂时使用模拟数据
    const mockData = [
      { date: '2024-04-22', category: '餐饮', item: '午餐', amount: 30, isIncome: false },
      { date: '2024-04-22', category: '工资', item: '月薪', amount: 10000, isIncome: true }
    ]
    
    this.setData({ billData: mockData })
  },

  navigateToReport(type) {
    wx.navigateTo({
      url: '/pages/report/index',
      success: (res) => {
        res.eventChannel.emit('reportData', { 
          data: this.data.billData,
          type: type
        })
      }
    })
  },

  showReport(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ 
      reportType: type,
      showReportPopup: true
    })
    this.generateReportData(type)
  },

  hideReport() {
    this.setData({ showReportPopup: false })
  },

  showDetail(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showDetailPopup: true,
      detailData: item,
      showReportPopup: false
    })
  },

  hideDetail() {
    this.setData({ 
      showDetailPopup: false,
      showReportPopup: true
    })
  },

  // 生成报表数据
  async generateReportData(type) {
    const now = new Date()
    let startDate, endDate
    
    switch(type) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
    }

    // 获取对应时间段的账单数据
    const details = this.data.messages
      .filter(msg => {
        if (msg.type !== 'consumption') return false
        const msgDate = new Date(msg.timestamp)
        return msgDate >= startDate && msgDate < endDate
      })
      .map(msg => ({
        id: msg.timestamp,
        date: this.formatTime(msg.timestamp),
        category: msg.content.category,
        item: msg.content.item,
        amount: msg.content.amount,
        isIncome: msg.content.isIncome,
        icon: msg.content.icon
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const totalIncome = details
      .filter(item => item.isIncome)
      .reduce((sum, item) => sum + item.amount, 0)

    const totalExpense = details
      .filter(item => !item.isIncome)
      .reduce((sum, item) => sum + item.amount, 0)

    // 使用AI生成分析内容，添加重试机制
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        const analysis = await deepseek.analyzeFinance({
          type: 'report',
          content: {
            type,
            details,
            totalIncome,
            totalExpense
          }
        })

        this.setData({
          reportData: {
            totalIncome,
            totalExpense,
            analysis: analysis[0].content.text,
            details
          }
        })
        break
      } catch (error) {
        console.error(`生成AI分析失败(第${retryCount + 1}次尝试):`, error)
        retryCount++
        
        if (retryCount === maxRetries) {
          // 所有重试都失败后，使用备用分析
          const backupAnalysis = this.generateBackupAnalysis(details, type, totalIncome, totalExpense)
          this.setData({
            reportData: {
              totalIncome,
              totalExpense,
              analysis: backupAnalysis,
              details
            }
          })
        } else {
          // 等待一秒后重试
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
  },

  // 生成备用分析内容
  generateBackupAnalysis(details, type, totalIncome, totalExpense) {
    const typeText = type === 'daily' ? '今日' : type === 'monthly' ? '本月' : '本年'
    const categories = {}
    
    details.forEach(item => {
      if (!item.isIncome) {
        categories[item.category] = (categories[item.category] || 0) + item.amount
      }
    })

    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    let analysis = `${typeText}账单分析：\n`
    analysis += `总收入：${totalIncome}元\n`
    analysis += `总支出：${totalExpense}元\n`
    
    if (sortedCategories.length > 0) {
      analysis += `主要支出类别：\n`
      sortedCategories.forEach(([category, amount], index) => {
        const percentage = ((amount / totalExpense) * 100).toFixed(1)
        analysis += `${index + 1}. ${category}：${amount}元 (${percentage}%)\n`
      })
    }

    return analysis
  },

  getRandomColor() {
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  },

  generateAIAnalysis(details, type) {
    const totalIncome = details.filter(item => item.isIncome).reduce((sum, item) => sum + item.amount, 0)
    const totalExpense = details.filter(item => !item.isIncome).reduce((sum, item) => sum + item.amount, 0)

    const categories = {}
    details.forEach(item => {
      if (!item.isIncome) {
        categories[item.category] = (categories[item.category] || 0) + item.amount
      }
    })

    const maxCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]

    console.log(maxCategory)
    if(maxCategory === undefined){
      return '分逼不挣，分逼不花才是真正的高'
    }
    
    let analysis = `根据分析，${type === 'daily' ? '今日' : type === 'monthly' ? '本月' : '本年'}`
    analysis += `总收入${totalIncome}元，总支出${totalExpense}元。`
    analysis += `主要支出类别为${maxCategory[0]}，占比${((maxCategory[1] / totalExpense) * 100).toFixed(1)}%。`
    analysis += `建议合理控制${maxCategory[0]}类支出，保持收支平衡。`

    return analysis
  },

  downloadPDF() {
    wx.showLoading({ title: '生成PDF中...' })
    // 这里需要调用云函数生成PDF
    // 暂时模拟生成过程
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: 'PDF已保存到相册',
        icon: 'success'
      })
    }, 1500)
  }
}) 
