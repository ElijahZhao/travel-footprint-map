import type { Checkin, CheckinInput } from './types'

const FLAG = 'tf_guest'
const DATA = 'tf_guest_checkins'

/** 当前是否为本地游客模式（数据存于本设备，不关联云端账号）。 */
export function isGuest(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

/** 进入本地游客模式：写入标记并首次填充示例数据。 */
export function enterGuestStore() {
  try {
    localStorage.setItem(FLAG, '1')
  } catch {
    /* ignore */
  }
  ensureSeed()
}

/** 退出本地游客模式（登录正式账号时调用）。 */
export function exitGuestStore() {
  try {
    localStorage.removeItem(FLAG)
  } catch {
    /* ignore */
  }
}

export function getGuestCheckins(): Checkin[] {
  try {
    const raw = localStorage.getItem(DATA)
    if (raw) return JSON.parse(raw) as Checkin[]
  } catch {
    /* ignore */
  }
  return []
}

export function setGuestCheckins(list: Checkin[]) {
  try {
    localStorage.setItem(DATA, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** 首次进入游客模式时填充示例数据，便于快速了解应用。 */
export function ensureSeed() {
  if (getGuestCheckins().length === 0) setGuestCheckins(SAMPLE_CHECKINS)
}

/** 由表单输入构造一条完整的游客打卡（仅存于本地）。 */
export function buildGuestCheckin(input: CheckinInput): Checkin {
  const now = new Date().toISOString()
  return {
    id: Date.now(),
    user_id: 'guest',
    place_name: input.place_name,
    address: input.address ?? null,
    lng: input.lng,
    lat: input.lat,
    category: input.category,
    status: input.status,
    visit_date: input.visit_date ?? null,
    mood_text: input.mood_text ?? null,
    tags: input.tags ?? [],
    photos: input.photos ?? [],
    rating: input.rating ?? 0,
    is_public: input.is_public ?? false,
    created_at: now,
    updated_at: now,
  }
}

const SAMPLE_CHECKINS: Checkin[] = [
  {
    id: 1001, user_id: 'guest', place_name: '西湖', address: '浙江省杭州市西湖区',
    lng: 120.148, lat: 30.243, category: 'scenery', status: 'visited',
    visit_date: '2023-04-12', mood_text: '断桥残雪虽未逢雪，但春风里的湖面也足够温柔。',
    tags: ['湖景', '散步'], photos: [], rating: 5, is_public: true,
    created_at: '2023-04-13T08:00:00.000Z', updated_at: '2023-04-13T08:00:00.000Z',
  },
  {
    id: 1002, user_id: 'guest', place_name: '故宫博物院', address: '北京市东城区景山前街4号',
    lng: 116.397, lat: 39.918, category: 'culture', status: 'visited',
    visit_date: '2023-05-01', mood_text: '红墙金瓦，走在这条中轴线上像穿过六百年。',
    tags: ['历史', '古建筑'], photos: [], rating: 5, is_public: true,
    created_at: '2023-05-02T08:00:00.000Z', updated_at: '2023-05-02T08:00:00.000Z',
  },
  {
    id: 1003, user_id: 'guest', place_name: '宽窄巷子', address: '四川省成都市青羊区',
    lng: 104.063, lat: 30.67, category: 'food', status: 'visited',
    visit_date: '2023-06-18', mood_text: '一杯盖碗茶，一下午就晃过去了。',
    tags: ['小吃', '茶馆'], photos: [], rating: 4, is_public: false,
    created_at: '2023-06-19T08:00:00.000Z', updated_at: '2023-06-19T08:00:00.000Z',
  },
  {
    id: 1004, user_id: 'guest', place_name: '秦始皇兵马俑', address: '陕西省西安市临潼区',
    lng: 109.273, lat: 34.385, category: 'culture', status: 'visited',
    visit_date: '2023-07-09', mood_text: '站在坑道边，才真正理解什么叫“气势”。',
    tags: ['世界遗产'], photos: [], rating: 5, is_public: true,
    created_at: '2023-07-10T08:00:00.000Z', updated_at: '2023-07-10T08:00:00.000Z',
  },
  {
    id: 1005, user_id: 'guest', place_name: '上海外滩', address: '上海市黄浦区中山东一路',
    lng: 121.49, lat: 31.245, category: 'city', status: 'visited',
    visit_date: '2023-08-20', mood_text: '夜里的万国建筑群灯火，比白天更有味道。',
    tags: ['夜景', 'citywalk'], photos: [], rating: 4, is_public: false,
    created_at: '2023-08-21T08:00:00.000Z', updated_at: '2023-08-21T08:00:00.000Z',
  },
  {
    id: 1006, user_id: 'guest', place_name: '丽江古城', address: '云南省丽江市古城区',
    lng: 100.233, lat: 26.872, category: 'city', status: 'visited',
    visit_date: '2023-09-30', mood_text: '石板路、流水、远处的雪山，慢得刚刚好。',
    tags: ['古城', '慢生活'], photos: [], rating: 5, is_public: true,
    created_at: '2023-10-01T08:00:00.000Z', updated_at: '2023-10-01T08:00:00.000Z',
  },
  {
    id: 1007, user_id: 'guest', place_name: '广州塔', address: '广东省广州市海珠区',
    lng: 113.324, lat: 23.106, category: 'city', status: 'visited',
    visit_date: '2023-10-15', mood_text: '小蛮腰的夜景名不虚传，江风也很舒服。',
    tags: ['地标', '夜景'], photos: [], rating: 4, is_public: false,
    created_at: '2023-10-16T08:00:00.000Z', updated_at: '2023-10-16T08:00:00.000Z',
  },
  {
    id: 1008, user_id: 'guest', place_name: '长隆野生动物世界', address: '广东省广州市番禺区',
    lng: 113.32, lat: 23.006, category: 'family', status: 'visited',
    visit_date: '2023-10-16', mood_text: '娃看熊猫看了半小时不肯走，值了。',
    tags: ['亲子', '动物'], photos: [], rating: 5, is_public: false,
    created_at: '2023-10-17T08:00:00.000Z', updated_at: '2023-10-17T08:00:00.000Z',
  },
  {
    id: 1009, user_id: 'guest', place_name: '苏州拙政园', address: '江苏省苏州市姑苏区',
    lng: 120.619, lat: 31.328, category: 'culture', status: 'visited',
    visit_date: '2023-11-11', mood_text: '一步一景，江南园林的精致都在水里。',
    tags: ['园林', '江南'], photos: [], rating: 5, is_public: true,
    created_at: '2023-11-12T08:00:00.000Z', updated_at: '2023-11-12T08:00:00.000Z',
  },
  {
    id: 1010, user_id: 'guest', place_name: '鼓浪屿', address: '福建省厦门市思明区',
    lng: 118.073, lat: 24.447, category: 'scenery', status: 'wish',
    visit_date: null, mood_text: '', tags: ['海岛', '计划'], photos: [], rating: 0, is_public: false,
    created_at: '2023-12-01T08:00:00.000Z', updated_at: '2023-12-01T08:00:00.000Z',
  },
  {
    id: 1011, user_id: 'guest', place_name: '张家界国家森林公园', address: '湖南省张家界市武陵源区',
    lng: 110.479, lat: 29.317, category: 'outdoor', status: 'wish',
    visit_date: null, mood_text: '', tags: ['徒步', '奇峰'], photos: [], rating: 0, is_public: false,
    created_at: '2023-12-02T08:00:00.000Z', updated_at: '2023-12-02T08:00:00.000Z',
  },
  {
    id: 1012, user_id: 'guest', place_name: '千岛湖', address: '浙江省杭州市淳安县',
    lng: 119.046, lat: 29.606, category: 'outdoor', status: 'wish',
    visit_date: null, mood_text: '', tags: ['骑行', '湖光'], photos: [], rating: 0, is_public: false,
    created_at: '2023-12-03T08:00:00.000Z', updated_at: '2023-12-03T08:00:00.000Z',
  },
]
