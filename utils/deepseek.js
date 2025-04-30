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

// 分析财务数据
const analyzeFinance = async (message) => {
  try {
    const { item, amount, isIncome } = message.content;
    
    // 获取消费分类
    const category = getCategory(item);
    
    // 生成记账确认消息
    const confirmMessage = {
      type: 'consumption',
      content: {
        item,
        amount,
        category,
        icon: `/assets/icons/categories/${getCategoryIcon(category)}`,
        isIncome
      },
      timestamp: Date.now(),
      isSelf: false
    };
    
    // 生成分析消息
    const analysisMessage = await generateAnalysisMessage(item, amount, isIncome, category);
    
    return [confirmMessage, analysisMessage];
  } catch (error) {
    console.error('财务分析失败:', error);
    throw new Error('财务分析服务暂时不可用，请稍后再试');
  }
};

// 生成AI分析回复
const generateAnalysisMessage = async (item, amount, isIncome, category) => {
  try {
    const response = await request('/chat/completions', {
      method: 'POST', // 明确指定请求方法
      data: {
        model: 'deepseek-chat',
        messages: [
          {
            role: "system",
            // 简化系统提示词避免格式问题
            content: "你是一个理财顾问，用口语化方式(40-50字)分析用户财务，要幽默,专业且友好"
          },
          {
            role: "user",
            // 优化请求内容格式
            content: `项目：${item}，金额：${amount}元，类型：${isIncome ? '收入' : '支出'}，分类：${category}`
          }
        ],
        temperature: 1.3, // 降低随机性
        max_tokens: 60   // 减少响应长度
      },
      header: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'  // 添加 Accept 头
      }
    });

    // 添加响应校验
    if (!response?.choices?.[0]?.message?.content) {
      throw new Error('无效的API响应格式');
    }

    return {
      type: 'text',
      content: response.choices[0].message.content.trim(),
      timestamp: Date.now(),
      isSelf: false
    };
  } catch (error) {
    console.error('生成分析消息失败:', error.message, error.response?.data);
    return {
      type: 'text',
      content: getRandomResponse(item, amount, isIncome, category),
      timestamp: Date.now(),
      isSelf: false
    };
  }
};

// 获取随机回复
const getRandomResponse = (item, amount, isIncome, category) => {
  if (isIncome) {
    if (amount >= 5000) {
      return [
        "这笔收入不错啊！建议合理分配：50%生活，30%投资，20%储蓄，让钱持续生钱～",
        "工资到账，记得给自己定个理财小目标，既要及时行乐也要未雨绸缪！",
        "收入可观，建议了解一下稳健理财产品，让钱包越来越鼓～",
        "这么大笔收入，除了犒劳自己也别忘了做好资产配置哦！",
        "工资理财两不误，考虑配置一些稳健型基金和保险产品吗？"
      ][Math.floor(Math.random() * 5)];
    } else {
      return [
        "零花钱也要精打细算，攒起来可以考虑买入一些小额基金～",
        "小收入也要好好规划，建议加入零钱通之类的小额理财～",
        "虽然数额不大，但积少成多，建议开启定投计划！",
        "这笔小收入可以当作理财启动资金，考虑试试吗？",
        "零碎收入也别闲着，放进余额宝让它帮你生钱～"
      ][Math.floor(Math.random() * 5)];
    }
  }
  
  // 根据不同消费类别给出建议
  const adviceMap = {
    '餐饮': [
      "注意营养均衡的同时也要关注消费频率，建议每月做个餐饮预算～",
      "吃得好很重要，不过也要注意合理分配餐饮开支哦！",
      "投资于美食无可厚非，但也要注意适度，建议记录每月餐饮支出～"
    ],
    '购物': [
      "买买买要理性哦，建议列个购物清单，避免冲动消费～",
      "购物也要讲究性价比，不妨等等看有没有优惠活动？",
      "适度消费享受生活没问题，但也要留意每月购物支出占比哦～"
    ],
    '交通': [
      "出行花销也是一笔不小的开支，建议了解下各种月票优惠～",
      "便捷出行很重要，但也可以对比下不同交通方式的性价比～",
      "交通支出看似小，累积起来也不少，建议做个月度预算～"
    ]
  };

  const defaultAdvice = [
    "这笔支出要记得归类，方便之后做支出分析哦～",
    "理性消费很重要，建议每月做个支出预算计划～",
    "支出也要精打细算，积少成多才能越存越多！"
  ];

  const advice = adviceMap[category] || defaultAdvice;
  return advice[Math.floor(Math.random() * advice.length)];
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