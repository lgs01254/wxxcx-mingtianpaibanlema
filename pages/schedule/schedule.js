// schedule.js
const util = require('../../utils/util.js')
Page({
  data: {
    dates: [], // 日期列表
    selectedDates: [], // 已选日期
    scheduleType: '早班', // 排班类型
    isSaving: false, // 保存状态
    scheduleTypes: ['早班', '休息'],
    customType: '',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    dateGrid: [],
    schedules: {}
  },
  onLoad: function () {
    this.initDates()
    this.loadSchedules()
    this.setData({ selectedDates: [] })
    // 读取自定义班次
    let customShifts = wx.getStorageSync('customShifts') || []
    let defaultTypes = ['早班', '休息']
    this.setData({
      scheduleTypes: defaultTypes.concat(customShifts)
    })
  },
  onShow: function () {
    let customShifts = wx.getStorageSync('customShifts') || []
    let defaultTypes = ['早班', '休息']
    this.setData({
      scheduleTypes: defaultTypes.concat(customShifts)
    })
  },
  // 初始化未来30天日期
  initDates: function () {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
    const dateGrid = []
    for (let i = 0; i < firstDay; i++) {
      dateGrid.push({ empty: true })
    }
    const dates = []
    const selectedDates = this.data.selectedDates || [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i)
      const dateStr = util.formatDate(d)
      dateGrid.push({ day: i, date: dateStr, isSelected: selectedDates.includes(dateStr) })
      dates.push(dateStr)
    }
    this.setData({ dates, dateGrid }) // 不要覆盖selectedDates
  },
  loadSchedules: function () {
    let schedules = wx.getStorageSync('schedules')
    if (typeof schedules !== 'object' || Array.isArray(schedules)) {
      schedules = {}
    }
    console.log('排班页读取schedules:', schedules)
    this.setData({ schedules })
  },
  // 切换日期选中状态
  toggleDateSelection: function (e) {
    const date = e.currentTarget.dataset.date
    let { selectedDates } = this.data
    if (selectedDates.includes(date)) {
      selectedDates = selectedDates.filter(d => d !== date)
    } else {
      selectedDates = [...selectedDates, date]
    }
    console.log('item.date:', date, 'selectedDates:', selectedDates)
    wx.setStorageSync('selectedDates', selectedDates)
    this.updateDateGrid(selectedDates)
    this.setData({ selectedDates })
  },
  // 切换排班类型
  changeScheduleType: function (e) {
    this.setData({
      scheduleType: e.detail.value
    })
  },
  changeDateSchedule: function(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const date = e.currentTarget.dataset.date
    const { schedules, scheduleTypes } = this.data
    let current = schedules[date] || scheduleTypes[0]
    let idx = scheduleTypes.indexOf(current)
    let next = scheduleTypes[(idx + 1) % scheduleTypes.length]
    schedules[date] = next
    wx.setStorageSync('schedules', schedules)
    this.setData({ schedules })
  },
  // 保存排班
  saveSchedule: function () {
    const { selectedDates, scheduleType } = this.data
    let schedules = wx.getStorageSync('schedules')
    if (typeof schedules !== 'object' || Array.isArray(schedules)) {
      schedules = {}
    }
    if (selectedDates.length === 0) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }
    this.setData({ isSaving: true })
    selectedDates.forEach(date => {
      schedules[date] = scheduleType
    })
    wx.setStorageSync('schedules', schedules)
    wx.setStorageSync('selectedDates', [])
    this.updateDateGrid([])
    console.log('保存后schedules:', wx.getStorageSync('schedules'))
    wx.showToast({
      title: '排班已保存',
      icon: 'success',
      duration: 1500
    })
    setTimeout(() => {
      this.setData({ isSaving: false, selectedDates: [] })
      wx.navigateBack()
    }, 1500)
  },
  // 全选日期
  selectAllDates: function () {
    const allDates = [...this.data.dates]
    wx.setStorageSync('selectedDates', allDates)
    this.updateDateGrid(allDates)
    this.setData({ selectedDates: allDates })
  },
  // 清空选择
  clearSelectedDates: function () {
    wx.setStorageSync('selectedDates', [])
    this.updateDateGrid([])
    this.setData({ selectedDates: [] })
  },
  updateDateGrid: function(selectedDates) {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
    const dateGrid = []
    for (let i = 0; i < firstDay; i++) {
      dateGrid.push({ empty: true })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i)
      const dateStr = util.formatDate(d)
      dateGrid.push({ day: i, date: dateStr, isSelected: selectedDates.includes(dateStr) })
    }
    this.setData({ dateGrid })
  },
  onCustomTypeInput: function(e) {
    this.setData({ customType: e.detail.value })
  },
  addCustomType: function() {
    const { customType, scheduleTypes } = this.data
    if (!customType) return
    if (scheduleTypes.includes(customType)) return
    // 先存本地
    let customShifts = wx.getStorageSync('customShifts') || []
    customShifts.push(customType)
    wx.setStorageSync('customShifts', customShifts)
    this.setData({
      scheduleTypes: [...scheduleTypes, customType],
      scheduleType: customType,
      customType: ''
    })
  },
  toPinyin: function(str) {
    if (!str) return '';
    if (str.indexOf('早班') !== -1) return 'zaoban';
    if (str.indexOf('休息') !== -1) return 'xiuxi';
    return '';
  },
  // 跳转到班次管理页
  goToShiftManage: function() {
    wx.navigateTo({
      url: '/pages/shift-manage/shift-manage'
    })
  }
})
