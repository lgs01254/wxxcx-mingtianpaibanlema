// admin.js
const util = require('../../utils/util')

Page({
  data: {
    employees: [],
    newEmployee: '',
    currentMonth: '',
    currentMonthDate: new Date(),
    dateHeaders: [],
    dayHeaders: [],
    allSchedules: {},
    showShiftPopup: false,
    currentEditEmployee: '',
    currentEditDate: '',
    shiftTypes: [
      { name: '早班', color: '#4CAF50' },
      { name: '中班', color: '#2196F3' },
      { name: '晚班', color: '#FF9800' },
      { name: '休息', color: '#9E9E9E' }
    ],
    weekdayMap: {} // 存储每个日期的星期几
  },

  onLoad() {
    this.loadEmployees()
    this.loadSchedules()
    this.setCurrentMonth(new Date())
    console.log('onLoad - employees:', this.data.employees)
    console.log('onLoad - dateHeaders:', this.data.dateHeaders)
    console.log('onLoad - allSchedules:', this.data.allSchedules)
  },

  loadEmployees() {
    const employees = wx.getStorageSync('employees') || ['张三', '李四']
    this.setData({ employees })
  },

  loadSchedules() {
    const allSchedules = wx.getStorageSync('allSchedules') || {}
    this.setData({ allSchedules })
  },

  onNewEmployeeInput(e) {
    this.setData({ newEmployee: e.detail.value })
  },

  addEmployee() {
    const name = this.data.newEmployee.trim()
    if (!name) return
    if (this.data.employees.includes(name)) return
    const employees = [...this.data.employees, name]
    wx.setStorageSync('employees', employees)
    this.setData({ employees, newEmployee: '' })
  },

  deleteEmployee(e) {
    const name = e.currentTarget.dataset.name
    const employees = this.data.employees.filter(emp => emp !== name)
    wx.setStorageSync('employees', employees)
    this.setData({ employees })
  },

  prevMonth() {
    const d = new Date(this.data.currentMonthDate)
    d.setMonth(d.getMonth() - 1)
    this.setCurrentMonth(d)
  },

  nextMonth() {
    const d = new Date(this.data.currentMonthDate)
    d.setMonth(d.getMonth() + 1)
    this.setCurrentMonth(d)
  },

  setCurrentMonth(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const daysCount = this.getDaysInMonth(year, month)
    const days = Array.from({length: daysCount}, (_, i) => i + 1)
    const dateHeaders = days.map(d => util.formatDate(new Date(year, month-1, d)))
    const dayHeaders = days
    const weekMap = ['日', '一', '二', '三', '四', '五', '六']
    const weekdayMap = {}
    dateHeaders.forEach(dateStr => {
      const d = new Date(dateStr)
      weekdayMap[dateStr] = weekMap[d.getDay()]
    })
    this.setData({
      currentMonth: `${year}年${month}月`,
      currentMonthDate: new Date(year, month-1, 1),
      dateHeaders,
      dayHeaders,
      weekdayMap
    })
  },

  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
  },

  getShiftText(employee, date) {
    const allSchedules = this.data.allSchedules
    const val = (allSchedules[employee] && allSchedules[employee][date]) || '-'
    console.log('getShiftText called:', { employee, date, val, hasEmployee: !!allSchedules[employee], employeeData: allSchedules[employee] })
    return val
  },

  getShiftBgColor(employee, date) {
    const type = this.getShiftText(employee, date)
    if (!type || type === '-') return ''
    const shiftTypes = this.data.shiftTypes
    const found = shiftTypes.find(t => t.name === type)
    return found ? found.color : '#007AFF'
  },

  getShiftTextColor(employee, date) {
    const bg = this.getShiftBgColor(employee, date)
    if (!bg) return '#999'
    return '#ffffff'
  },

  editShift(e) {
    const employee = e.currentTarget.dataset.employee
    const date = e.currentTarget.dataset.date
    this.setData({
      showShiftPopup: true,
      currentEditEmployee: employee,
      currentEditDate: date
    })
  },

  selectShift(e) {
    const type = e.currentTarget.dataset.type
    const emp = this.data.currentEditEmployee
    const date = this.data.currentEditDate
    console.log('selectShift called:', { type, emp, date })
    if (!emp || !date) {
      console.error('ERROR: emp or date is empty!', { emp, date })
      this.setData({ showShiftPopup: false })
      return
    }
    let allSchedules = JSON.parse(JSON.stringify(this.data.allSchedules))
    console.log('Before update:', allSchedules)
    if (!allSchedules[emp]) allSchedules[emp] = {}
    if (type === '__clear__') {
      delete allSchedules[emp][date]
    } else {
      allSchedules[emp][date] = type
    }
    console.log('After update:', allSchedules)
    wx.setStorageSync('allSchedules', allSchedules)
    const freshData = wx.getStorageSync('allSchedules') || {}
    console.log('Fresh data:', freshData)
    this.setData({ allSchedules: freshData, showShiftPopup: false })
    console.log('setData called')
  },

  closeShiftPopup() {
    this.setData({ showShiftPopup: false })
  },

  shareEmployee(e) {
    const employee = e.currentTarget.dataset.employee
    this.setData({ shareEmployee: employee })
  },

  onShareAppMessage(e) {
    const employee = e.target.dataset.employee
    if (!employee) return
    const month = this.data.currentMonth
    const schedules = this.data.allSchedules[employee] || {}
    const shareData = {
      employee,
      month,
      schedules
    }
    const encodedData = encodeURIComponent(JSON.stringify(shareData))
    return {
      title: `${employee} ${month}排班表`,
      path: `/pages/index/index?type=share&data=${encodedData}`,
      success: function(res) {
        wx.showToast({ title: '分享成功' })
      },
      fail: function(res) {
        wx.showToast({ title: '分享失败', icon: 'none' })
      }
    }
  }
})
