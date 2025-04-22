const API_KEY = 'sk-498714f04dd04b9e9b1652983a93c552';
const BASE_URL = 'https://api.deepseek.com/v1';
const { getCategory, getCategoryIcon } = require('./categoryHelper');

// 封装请求函数
const request = async (endpoint, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${endpoint}`,
      method: options.method || 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        ...options.header
      },
      data: options.data,
      timeout: 30000, // 30秒超时
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`API请求失败: ${res.statusCode}`));
        }
      },
      fail: (error) => {
        console.error('DeepSeek API 请求错误:', error);
        reject(error);
      }
    });
  });
};

// 生成消费分析消息
const generateConsumptionMessage = (item, amount) => {
  const category = getCategory(item);
  const icon = getCategoryIcon(category);
  
  return {
    type: 'consumption',
    content: {
      item,
      amount,
      category,
      icon: `/assets/project/${icon}`
    },
    timestamp: Date.now(),
    isSelf: true
  };
};

// 生成AI分析回复
const generateAnalysisMessage = async (item, amount) => {
  try {
    // 模拟API响应，用于测试
    const mockResponse = {
      choices: [
        {
          message: {
            content: `你刚刚消费了${item}，花费了${amount}元。${getRandomResponse()}`
          }
        }
      ]
    };
    
    // 使用模拟响应
    return {
      type: 'text',
      content: mockResponse.choices[0].message.content,
      timestamp: Date.now(),
      isSelf: false
    };
    
    // 实际API调用代码（暂时注释掉）
    /*
    const response = await request('/chat/completions', {
      data: {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个幽默风趣的理财顾问，请用简短有趣的方式（30字以内）分析用户的消费行为，可以调皮、可以嘲讽、也可以鼓励。'
          },
          {
            role: 'user',
            content: `用户消费：${item} ${amount}元`
          }
        ],
        temperature: 0.8,
        max_tokens: 100
      }
    });

    return {
      type: 'text',
      content: response.choices[0].message.content,
      timestamp: Date.now(),
      isSelf: false
    };
    */
  } catch (error) {
    console.error('生成分析消息失败:', error);
    throw error;
  }
};

// 获取随机回复
const getRandomResponse = () => {
  const responses = [
    "这个消费看起来有点高哦，要控制一下啦~",
    "这个价格还不错，性价比很高！",
    "哇，你最近消费有点多，要存点钱哦~",
    "这个消费很合理，继续保持！",
    "这个价格有点贵，下次可以考虑更便宜的~",
    "这个消费很值得，投资自己总是没错的！",
    "这个价格有点高，但偶尔犒劳自己也是应该的~",
    "这个消费有点超出预算，下次要注意哦~",
    "这个价格很实惠，买到就是赚到！",
    "这个消费很必要，但也要注意控制频率~"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// 分析财务数据
const analyzeFinance = async (messages) => {
  try {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.type === 'consumption') {
      const { item, amount } = lastMessage.content;
      const analysisMessage = await generateAnalysisMessage(item, amount);
      return [analysisMessage];
    }
    return [];
  } catch (error) {
    console.error('财务分析失败:', error);
    throw new Error('财务分析服务暂时不可用，请稍后再试');
  }
};

// 获取消费建议
const getConsumptionAdvice = async (billData) => {
  try {
    // 模拟API响应，用于测试
    const mockResponse = {
      choices: [
        {
          message: {
            content: `根据你的消费情况，今日支出${billData.daily}元，本月支出${billData.monthly}元，本季度支出${billData.quarterly}元，本年支出${billData.yearly}元。${getRandomAdvice()}`
          }
        }
      ]
    };
    
    return mockResponse.choices[0].message.content;
    
    // 实际API调用代码（暂时注释掉）
    /*
    const response = await request('/chat/completions', {
      data: {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个理财顾问，请根据用户的消费情况给出合理的消费建议。'
          },
          {
            role: 'user',
            content: `我的消费情况：\n今日支出：${billData.daily}元\n本月支出：${billData.monthly}元\n本季度支出：${billData.quarterly}元\n本年支出：${billData.yearly}元`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      }
    });

    return response.choices[0].message.content;
    */
  } catch (error) {
    console.error('获取消费建议失败:', error);
    throw new Error('获取消费建议失败，请稍后再试');
  }
};

// 获取随机建议
const getRandomAdvice = () => {
  const advice = [
    "建议你控制一下日常支出，可以制定一个预算计划。",
    "你的消费习惯还不错，继续保持！",
    "可以考虑投资一些理财产品，让钱生钱。",
    "建议你记录每一笔支出，了解自己的消费习惯。",
    "可以尝试减少不必要的支出，增加储蓄。",
    "你的消费结构比较合理，但可以适当增加投资比例。",
    "建议你关注一些理财知识，提高理财能力。",
    "可以考虑使用一些记账软件，更好地管理财务。",
    "你的消费水平适中，但要注意控制冲动消费。",
    "建议你制定一个长期理财计划，为未来做准备。"
  ];
  return advice[Math.floor(Math.random() * advice.length)];
};

module.exports = {
  analyzeFinance,
  getConsumptionAdvice
}; 