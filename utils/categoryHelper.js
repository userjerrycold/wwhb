// 消费分类映射
const CATEGORY_MAP = {
  '餐饮': ['饭', '餐', '咖啡', '奶茶', '水果', '零食', '外卖', '火锅', '烧烤', '面', '菜', '饮', '食', '烤肠', '小吃'],
  '购物': ['衣服', '鞋', '包', '化妆品', '日用品', '超市', '商场', '淘宝', '京东', '拼多多'],
  '交通': ['车', '地铁', '公交', '出租', '高铁', '飞机', '票', '打车', '滴滴', '地铁', '公交'],
  '娱乐': ['电影', '游戏', 'KTV', '酒吧', '门票', '演出', '演唱会', '展览', '游乐园'],
  '医疗': ['药', '医院', '诊所', '挂号', '检查', '治疗', '保健', '体检'],
  '教育': ['书', '课', '培训', '学费', '考试', '教育', '学习', '辅导'],
  '居住': ['房租', '水费', '电费', '燃气费', '物业费', '维修', '家具', '家电'],
  '通讯': ['话费', '网费', '流量', '宽带', '手机', '电脑', '数码'],
  '人情': ['红包', '礼物', '礼金', '孝敬', '请客', '送礼'],
  '其他': []
};

// 图标映射
const ICON_MAP = {
  '餐饮': 'food.png',
  '购物': 'shopping.png',
  '交通': 'transport.png',
  '娱乐': 'film.png',
  '医疗': 'medical.png',
  '教育': 'education.png',
  '居住': 'house.png',
  '通讯': 'electronics.png',
  '人情': 'gift.png',
  '其他': 'groceries.png'
};

// 获取消费分类
const getCategory = (description) => {
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      return category;
    }
  }
  return '其他';
};

// 获取分类图标
const getCategoryIcon = (category) => {
  return ICON_MAP[category] || 'groceries.png';
};

module.exports = {
  getCategory,
  getCategoryIcon
}; 