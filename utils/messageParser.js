// 预设分类及其关键词
const CATEGORIES = {
  '餐饮': ['饭', '餐', '咖啡', '奶茶', '水果', '零食', '外卖', '火锅', '烧烤', '面', '菜', '饮', '食'],
  '交通': ['车', '地铁', '公交', '出租', '高铁', '飞机', '票', '打车', '滴滴', '地铁', '公交'],
  '购物': ['衣服', '鞋', '包', '化妆品', '日用品', '超市', '商场', '淘宝', '京东', '拼多多'],
  '娱乐': ['电影', '游戏', 'KTV', '酒吧', '门票', '演出', '演唱会', '展览', '游乐园'],
  '居住': ['房租', '水费', '电费', '燃气费', '物业费', '维修', '家具', '家电'],
  '医疗': ['药', '医院', '诊所', '挂号', '检查', '治疗', '保健', '体检'],
  '教育': ['书', '课', '培训', '学费', '考试', '教育', '学习', '辅导'],
  '通讯': ['话费', '网费', '流量', '宽带', '手机', '电脑', '数码'],
  '人情': ['红包', '礼物', '礼金', '孝敬', '请客', '送礼'],
  '其他': []
};

/**
 * 解析用户输入的消息
 * @param {string} message 用户输入的消息
 * @returns {object} 解析结果
 */
function messageParser(message) {
  // 移除多余空格
  message = message.trim();
  
  // 匹配金额和描述
  const pattern = /^([+-]?\d+(\.\d{1,2})?)\s*(.+)$/;
  const match = message.match(pattern);
  
  if (!match) {
    return {
      success: false,
      error: '请输入正确的金额和描述，例如：9.9 瑞幸咖啡'
    };
  }
  
  const amount = parseFloat(match[1]);
  const description = match[3].trim();
  
  // 查找匹配的分类
  let category = '其他';
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  return {
    success: true,
    data: {
      amount,
      description,
      category,
      time: new Date().toISOString()
    }
  };
}

/**
 * 格式化金额显示
 * @param {number} amount 金额
 * @returns {string} 格式化后的金额字符串
 */
function formatAmount(amount) {
  return amount.toFixed(2);
}

/**
 * 生成AI回复消息
 * @param {object} parsedData 解析后的数据
 * @returns {string} AI回复消息
 */
function generateAIResponse(parsedData) {
  const { amount, description, category } = parsedData;
  const amountStr = formatAmount(Math.abs(amount));
  const type = amount < 0 ? '支出' : '收入';
  
  return `已记录：\n${description} ${type}${amountStr}元\n分类：${category}`;
}

module.exports = {
  messageParser,
  formatAmount,
  generateAIResponse
}; 