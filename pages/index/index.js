// index.js
const util = require('../../utils/util.js')
Page({
  data: {
    today: '',
    tomorrow: '',
    todaySchedule: '',
    tomorrowSchedule: '',
    currentMonth: '',
    days: [],
    schedules: {},
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    todayWeekday: '',
    tomorrowWeekday: '',
    topCards: [],
    topCardsIndex: 10, // 默认定位到今天（前后各10天）
    // 新增
    currentMonthDate: null, // 当前日历显示的月份Date对象
    calendarSwiperIndex: 1, // 日历swiper的当前index，默认中间页
    calendarMonths: [] // 三个月的日历数据
  },
  onLoad: function () {
    this.initData()
  },
  onShow: function () {
    this.initData()
    console.log('主页onShow')
  },
  initData: function () {
    const now = new Date()
    const today = util.formatDate(now)
    const tomorrow = util.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))
    const currentMonth = util.formatMonth(now)
    const weekMap = ['日', '一', '二', '三', '四', '五', '六']
    const todayWeekday = '星期' + weekMap[now.getDay()]
    const tomorrowWeekday = '星期' + weekMap[new Date(now.getTime() + 24 * 60 * 60 * 1000).getDay()]
    // 无限滑动：前后各10天
    const topCards = []
    const schedules = wx.getStorageSync('schedules') || {}
    for (let i = -10; i <= 10; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = util.formatDate(d)
      topCards.push({
        date: dateStr,
        weekday: '星期' + weekMap[d.getDay()],
        label: i === 0 ? '今天' : (i === 1 ? '明天' : (i === -1 ? '昨天' : '')),
        schedule: schedules[dateStr] || '未排班'
      })
    }
    // 新增：初始化currentMonthDate和calendarMonths
    const calendarMonths = this.generateCalendarMonths(now)
    console.log('initData calendarMonths:', calendarMonths)
    this.setData({
      today,
      tomorrow,
      currentMonth,
      days: this.generateMonthDays(now), // 兼容旧逻辑
      todayWeekday,
      tomorrowWeekday,
      topCards,
      topCardsIndex: 10, // 默认滑到今天
      currentMonthDate: now,
      calendarSwiperIndex: 1,
      calendarMonths: calendarMonths
    }, () => {
      this.loadSchedules(today, tomorrow)
    })
  },
  // 新增：生成三个月的日历
  generateCalendarMonths: function (centerDate) {
    const prevMonth = new Date(centerDate.getFullYear(), centerDate.getMonth() - 1, 1)
    const nextMonth = new Date(centerDate.getFullYear(), centerDate.getMonth() + 1, 1)
    const months = [
      this.generateMonthDays(prevMonth),
      this.generateMonthDays(centerDate),
      this.generateMonthDays(nextMonth)
    ]
    console.log('generateCalendarMonths:', months)
    return months
  },
  // 修改：去掉todayStr参数
  generateMonthDays: function (date) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const days = []
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(date.getFullYear(), date.getMonth(), i)
      const dateStr = util.formatDate(d)
      days.push({
        day: i,
        date: dateStr,
        week: d.getDay(),
        isToday: dateStr === util.formatDate(new Date())
      })
    }
    console.log('generateMonthDays for', date, 'result:', days)
    return days
  },
  loadSchedules: function (today, tomorrow) {
    const schedules = wx.getStorageSync('schedules') || {}
    console.log('主页读取schedules:', schedules)
    this.setData({ schedules }, () => {
      this.updateTodayTomorrowSchedule(today, tomorrow, schedules)
    })
  },
  updateTodayTomorrowSchedule: function (today, tomorrow, schedules) {
    this.setData({
      todaySchedule: (schedules && schedules[today]) || '未排班',
      tomorrowSchedule: (schedules && schedules[tomorrow]) || '未排班'
    })
  },
  navigateToSchedule: function () {
    wx.navigateTo({
      url: '/pages/schedule/schedule'
    })
  },
  navigateToSettings: function () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },
  toPinyin: function(str) {
    if (!str) return '';
    if (str.indexOf('早班') !== -1) return 'zaoban';
    if (str.indexOf('休息') !== -1) return 'xiuxi';
    return '';
  },
  // swiper滑动事件，动态补充卡片
  onTopCardsChange: function(e) {
    const current = e.detail.current
    let { topCards, topCardsIndex } = this.data
    // 滑到最左，补充前10天
    if (current < 5) {
      const firstDate = new Date(topCards[0].date)
      const weekMap = ['日', '一', '二', '三', '四', '五', '六']
      const schedules = wx.getStorageSync('schedules') || {}
      const newCards = []
      for (let i = -10; i < 0; i++) {
        const d = new Date(firstDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = util.formatDate(d)
        newCards.push({
          date: dateStr,
          weekday: '星期' + weekMap[d.getDay()],
          label: '',
          schedule: schedules[dateStr] || '未排班'
        })
      }
      this.setData({
        topCards: [...newCards, ...topCards],
        topCardsIndex: topCardsIndex + 10
      })
    }
    // 滑到最右，补充后10天
    if (current > topCards.length - 6) {
      const lastDate = new Date(topCards[topCards.length - 1].date)
      const weekMap = ['日', '一', '二', '三', '四', '五', '六']
      const schedules = wx.getStorageSync('schedules') || {}
      const newCards = []
      for (let i = 1; i <= 10; i++) {
        const d = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = util.formatDate(d)
        newCards.push({
          date: dateStr,
          weekday: '星期' + weekMap[d.getDay()],
          label: '',
          schedule: schedules[dateStr] || '未排班'
        })
      }
      this.setData({
        topCards: [...topCards, ...newCards]
      })
    }
  },
  // 新增：日历swiper切换事件
  onCalendarSwiperChange: function(e) {
    const newIndex = e.detail.current
    let { calendarSwiperIndex, currentMonthDate } = this.data
    if (newIndex === calendarSwiperIndex) return
    let newMonthDate
    if (newIndex > calendarSwiperIndex) {
      // 右滑，下个月
      newMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    } else {
      // 左滑，上个月
      newMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    }
    this.setData({
      currentMonthDate: newMonthDate,
      calendarMonths: this.generateCalendarMonths(newMonthDate),
      calendarSwiperIndex: 1,
      currentMonth: util.formatMonth(newMonthDate)
    })
  }
})
