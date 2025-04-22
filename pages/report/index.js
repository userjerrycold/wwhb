//import * as echarts from '../../miniprogram_npm/echarts-for-weixin/index'
// 或者尝试
import * as echarts from '../../miniprogram_npm/echarts/index'

Page({
  data: {
    type: '',
    reportData: [],
    aiAnalysis: '',
    ec: {
      lazyLoad: true
    }
  },

  onLoad(options) {
    this.setData({ type: options.type })
    
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('reportData', (data) => {
      this.setData({ reportData: data.data })
      this.initCharts()
      this.generateAIAnalysis()
    })
  },

  initCharts() {
    this.incomeExpenseChart = this.selectComponent('#incomeExpenseChart')
    this.categoryChart = this.selectComponent('#categoryChart')
    this.trendChart = this.selectComponent('#trendChart')

    this.drawIncomeExpenseChart()
    this.drawCategoryChart()
    this.drawTrendChart()
  },

  drawIncomeExpenseChart() {
    const data = this.data.reportData
    const income = data.filter(item => item.isIncome).reduce((sum, item) => sum + item.amount, 0)
    const expense = data.filter(item => !item.isIncome).reduce((sum, item) => sum + item.amount, 0)

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}元 ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: income, name: '收入', itemStyle: { color: '#ff4d4f' } },
          { value: expense, name: '支出', itemStyle: { color: '#1890ff' } }
        ]
      }]
    }

    this.incomeExpenseChart.init((canvas, width, height) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      })
      chart.setOption(option)
      return chart
    })
  },

  drawCategoryChart() {
    const data = this.data.reportData
    const categories = {}
    
    data.forEach(item => {
      if (!item.isIncome) {
        categories[item.category] = (categories[item.category] || 0) + item.amount
      }
    })

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}元 ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: '50%',
        data: Object.entries(categories).map(([name, value]) => ({
          value,
          name,
          itemStyle: { color: this.getRandomColor() }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }

    this.categoryChart.init((canvas, width, height) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      })
      chart.setOption(option)
      return chart
    })
  },

  drawTrendChart() {
    const data = this.data.reportData
    const dates = [...new Set(data.map(item => item.date))].sort()
    
    const incomeData = dates.map(date => 
      data.filter(item => item.date === date && item.isIncome)
          .reduce((sum, item) => sum + item.amount, 0)
    )
    
    const expenseData = dates.map(date => 
      data.filter(item => item.date === date && !item.isIncome)
          .reduce((sum, item) => sum + item.amount, 0)
    )

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['收入', '支出']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '收入',
          type: 'line',
          data: incomeData,
          itemStyle: { color: '#ff4d4f' }
        },
        {
          name: '支出',
          type: 'line',
          data: expenseData,
          itemStyle: { color: '#1890ff' }
        }
      ]
    }

    this.trendChart.init((canvas, width, height) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      })
      chart.setOption(option)
      return chart
    })
  },

  getRandomColor() {
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  },

  generateAIAnalysis() {
    const data = this.data.reportData
    const totalIncome = data.filter(item => item.isIncome).reduce((sum, item) => sum + item.amount, 0)
    const totalExpense = data.filter(item => !item.isIncome).reduce((sum, item) => sum + item.amount, 0)
    const categories = {}
    
    data.forEach(item => {
      if (!item.isIncome) {
        categories[item.category] = (categories[item.category] || 0) + item.amount
      }
    })

    const maxCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]
    
    let analysis = `根据分析，${this.data.type === 'daily' ? '今日' : this.data.type === 'monthly' ? '本月' : '本年'}`
    analysis += `总收入${totalIncome}元，总支出${totalExpense}元。`
    analysis += `主要支出类别为${maxCategory[0]}，占比${((maxCategory[1] / totalExpense) * 100).toFixed(1)}%。`
    analysis += `建议合理控制${maxCategory[0]}类支出，保持收支平衡。`

    this.setData({ aiAnalysis: analysis })
  }
})