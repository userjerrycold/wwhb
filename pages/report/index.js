Page({
  data: {
    active: 0,
    reportData: {
      daily: [],
      weekly: [],
      monthly: []
    }
  },

  onLoad() {
    this.loadReportData()
  },

  onTabChange(event) {
    this.setData({
      active: event.detail.index
    })
  },

  loadReportData() {
    // TODO: 从云数据库加载报表数据
    const mockData = {
      daily: [
        { date: '2024-04-22', amount: 100 },
        { date: '2024-04-21', amount: 150 }
      ],
      weekly: [
        { week: '第16周', amount: 800 },
        { week: '第15周', amount: 1200 }
      ],
      monthly: [
        { month: '2024-04', amount: 3000 },
        { month: '2024-03', amount: 2800 }
      ]
    }
    
    this.setData({
      reportData: mockData
    })
  }
}) 