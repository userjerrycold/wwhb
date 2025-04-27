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

    // 立即清空输入框，并收起键盘
    this.setData({ 
      inputValue: '',
      inputFocus: false
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
  },

  // 分析是收入还是支出
  analyzeIncomeOrExpense(content) {
    const incomeKeywords = [
      // 工资薪资类
      '工资', '薪资', '薪水', '薪金', '月薪', '年薪', '基本工资', '绩效工资', '岗位工资', '职务工资',
      '工钱', '劳务费', '劳务报酬', '稿费', '稿酬', '兼职收入', '外快', '辛苦费', '手工费',
      '发工资', '发薪', '工资到账', '薪资发放', '工资结算', '工资转账',
      
      // 奖金补贴类
      '奖金', '年终奖', '绩效奖', '季度奖', '项目奖', '提成', '分红', '佣金', '回扣',
      '补贴', '津贴', '餐补', '交通补贴', '住房补贴', '通讯补贴', '高温补贴', '加班补贴',
      '福利', '过节费', '节日福利', '生日福利', '慰问金', '礼金', '红包', '压岁钱',
      
      // 投资理财类
      '利息', '股息', '分红', '理财收益', '投资回报', '股票收益', '基金收益', '债券利息',
      '租金', '房租', '租赁收入', '押金退还', '版权费', '专利费', '特许权使用费',
      
      // 退款返还类
      '退款', '退费', '退押金', '退保证金', '退税款', '退税', '返还', '退回', '返现', '返利',
      '报销', '费用报销', '差旅报销', '医疗报销', '社保报销', '公积金提取',
      
      // 收款转账类
      '收款', '到账', '入账', '转账收入', '汇款', '打款', '打赏', '赞助', '捐赠收入',
      '借款收回', '还款', '还钱', '应收款到账', '货款', '尾款', '结算款', '工程款',
      
      // 其他收入
      '中奖', '彩票', '赌博赢钱', '比赛奖金', '奖学金', '助学金', '补助金', '赔偿金',
      '补偿款', '保险理赔', '保险金', '继承', '赠与', '遗产', '拾得物', '意外之财',
      
      // 英文或简写
      'income', 'salary', 'bonus', 'reward', 'refund', 'reimbursement', 'commission',
      'fee', 'royalty', 'dividend', 'interest', 'rent', 'payment', 'transfer',
      '支付宝到账', '微信收款', '银行入账', 'POS入款'
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

        // 立即执行滚动
        const query = wx.createSelectorQuery()
        query.select('.message-list').boundingClientRect()
        query.selectAll('.message-item').boundingClientRect()
        query.exec((res) => {
          if (res[0] && res[1]) {
            const scrollView = res[0]
            const messageItems = res[1]
            const lastMessage = messageItems[messageItems.length - 1]
            
            if (lastMessage) {
              const scrollTop = lastMessage.top - scrollView.top
              const scrollQuery = wx.createSelectorQuery()
              scrollQuery.select('.message-list').node()
              scrollQuery.exec((scrollRes) => {
                if (scrollRes[0] && scrollRes[0].node) {
                  const scrollViewNode = scrollRes[0].node
                  scrollViewNode.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                  })
                }
              })
            }
          }
        })
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
      // 如果是AI消息，立即滚动到底部
      if (!message.isSelf) {
        const query = wx.createSelectorQuery()
        query.select('.message-list').boundingClientRect()
        query.selectAll('.message-item').boundingClientRect()
        query.exec((res) => {
          if (res[0] && res[1]) {
            const scrollView = res[0]
            const messageItems = res[1]
            const lastMessage = messageItems[messageItems.length - 1]
            
            if (lastMessage) {
              const scrollTop = lastMessage.top - scrollView.top
              const scrollQuery = wx.createSelectorQuery()
              scrollQuery.select('.message-list').node()
              scrollQuery.exec((scrollRes) => {
                if (scrollRes[0] && scrollRes[0].node) {
                  const scrollViewNode = scrollRes[0].node
                  scrollViewNode.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                  })
                }
              })
            }
          }
        })
      }
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