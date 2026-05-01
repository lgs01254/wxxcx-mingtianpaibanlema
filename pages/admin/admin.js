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
    weekdayMap: {},
    shiftDisplay: {},
    shiftColors: {} // 存储每个日期的星期几
  },

  onLoad() {
    this.loadEmployees()
    this.loadSchedules()
    this.setCurrentMonth(new Date())
    this.updateShiftDisplay()
    console.log('onLoad - employees:', this.data.employees)
    console.log('onLoad - dateHeaders:', this.data.dateHeaders)
    console.log('onLoad - allSchedules:', this.data.allSchedules)
  },

  updateShiftDisplay() {
    const { employees, dateHeaders, allSchedules, shiftTypes } = this.data
    const shiftDisplay = {}
    const shiftColors = {}
    const colorMap = {}
    shiftTypes.forEach(t => { colorMap[t.name] = t.color })

    employees.forEach(emp => {
      shiftDisplay[emp] = {}
      shiftColors[emp] = {}
      dateHeaders.forEach(date => {
        const shift = (allSchedules[emp] && allSchedules[emp][date]) || '-'
        shiftDisplay[emp][date] = shift
        shiftColors[emp][date] = shift !== '-' ? (colorMap[shift] || '#007AFF') : ''
      })
    })
    console.log('updateShiftDisplay:', JSON.stringify(shiftDisplay))
    this.setData({ shiftDisplay, shiftColors })
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
    this.updateShiftDisplay()
  },

  nextMonth() {
    const d = new Date(this.data.currentMonthDate)
    d.setMonth(d.getMonth() + 1)
    this.setCurrentMonth(d)
    this.updateShiftDisplay()
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
    console.log('Before update:', JSON.stringify(allSchedules))
    if (!allSchedules[emp]) allSchedules[emp] = {}
    if (type === '__clear__') {
      delete allSchedules[emp][date]
    } else {
      allSchedules[emp][date] = type
    }
    console.log('After update:', JSON.stringify(allSchedules))
    wx.setStorageSync('allSchedules', allSchedules)
    const freshData = wx.getStorageSync('allSchedules') || {}
    console.log('Fresh data:', JSON.stringify(freshData))
    this.setData({ allSchedules: freshData, showShiftPopup: false }, () => {
      console.log('setData callback - allSchedules:', JSON.stringify(this.data.allSchedules))
      this.updateShiftDisplay()
    })
    console.log('setData called')
  },

  closeShiftPopup() {
    this.setData({ showShiftPopup: false })
  },

  shareEmployee(e) {
    const employee = e.currentTarget.dataset.employee
    console.log('shareEmployee called:', employee)
    this.setData({ shareEmployee: employee })
  },

  onShareAppMessage(e) {
    console.log('=== onShareAppMessage called ===')
    console.log('e.from:', e.from)
    console.log('e.target:', e.target)
    console.log('e.target.dataset:', e.target ? e.target.dataset : 'null')
    console.log('e.detail:', e.detail)

    const monthStr = this.data.currentMonth // 如 "2026年5月"
    const monthParts = monthStr.match(/(\d+)年(\d+)月/)
    const year = monthParts[1]
    const month = monthParts[2]

    // 判断是分享全部还是分享单个
    const isShareAll = e.target && e.target.dataset && e.target.dataset.all === 'true'

    if (isShareAll) {
      // 分享全部员工
      const employees = this.data.employees
      const allSchedules = this.data.allSchedules
      
      const allMonthSchedules = {}
      employees.forEach(emp => {
        const employeeSchedules = allSchedules[emp] || {}
        const monthSchedules = {}
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
        for (let i = 1; i <= daysInMonth; i++) {
          const day = String(i).padStart(2, '0')
          const monthPadded = String(month).padStart(2, '0')
          const dateStr = `${year}-${monthPadded}-${day}`
          if (employeeSchedules[dateStr]) {
            monthSchedules[dateStr] = employeeSchedules[dateStr]
          }
        }
        if (Object.keys(monthSchedules).length > 0) {
          allMonthSchedules[emp] = monthSchedules
        }
      })

      const schedulesStr = JSON.stringify(allMonthSchedules)
      const encodedSchedules = encodeURIComponent(schedulesStr)

      console.log('=== Share All Data ===')
      console.log('allMonthSchedules:', schedulesStr)

      return {
        title: `${monthStr}全员工排班表`,
        path: `/pages/index/index?share=all&year=${year}&month=${month}&schedules=${encodedSchedules}`,
        success: function(res) {
          wx.showToast({ title: '分享成功' })
        },
        fail: function(res) {
          wx.showToast({ title: '分享失败', icon: 'none' })
        }
      }
    } else {
      // 分享单个员工
      let employee = ''
      if (e.target && e.target.dataset && e.target.dataset.employee) {
        employee = e.target.dataset.employee
        console.log('Got employee from target.dataset:', employee)
      }

      if (!employee) {
        console.error('onShareAppMessage: employee is empty')
        return {
          title: '排班分享',
          path: '/pages/index/index'
        }
      }

      // 只获取该员工的排班
      const employeeSchedules = this.data.allSchedules[employee] || {}

      // 提取当前月份内的排班
      const monthSchedules = {}
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const day = String(i).padStart(2, '0')
        const monthPadded = String(month).padStart(2, '0')
        const dateStr = `${year}-${monthPadded}-${day}`
        if (employeeSchedules[dateStr]) {
          monthSchedules[dateStr] = employeeSchedules[dateStr]
        }
      }

      // 将数据编码到分享路径中（方案一）
      const schedulesStr = JSON.stringify(monthSchedules)
      const encodedSchedules = encodeURIComponent(schedulesStr)
      
      console.log('=== Share Data ===')
      console.log('employee:', employee)
      console.log('monthSchedules:', schedulesStr)

      return {
        title: `${employee} ${monthStr}排班表`,
        path: `/pages/index/index?share=1&employee=${encodeURIComponent(employee)}&year=${year}&month=${month}&schedules=${encodedSchedules}`,
        success: function(res) {
          wx.showToast({ title: '分享成功' })
        },
        fail: function(res) {
          wx.showToast({ title: '分享失败', icon: 'none' })
        }
      }
    }
  },

  shareAllEmployees() {
    const employees = this.data.employees
    const allSchedules = this.data.allSchedules
    const monthStr = this.data.currentMonth
    const monthParts = monthStr.match(/(\d+)年(\d+)月/)
    const year = monthParts[1]
    const month = monthParts[2]

    const shareData = []
    employees.forEach(emp => {
      const schedules = allSchedules[emp] || {}
      const monthSchedules = {}
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const day = String(i).padStart(2, '0')
        const monthPadded = String(month).padStart(2, '0')
        const dateStr = `${year}-${monthPadded}-${day}`
        if (schedules[dateStr]) {
          monthSchedules[dateStr] = schedules[dateStr]
        }
      }
      shareData.push({ employee: emp, schedules: monthSchedules })
    })

    console.log('shareAllEmployees:', JSON.stringify(shareData))
    wx.setStorageSync('shareAllData', shareData)

    wx.showModal({
      title: '全部员工排班',
      content: `已保存 ${employees.length} 名员工的排班数据，点击确定跳转到主页查看`,
      success: (res) => {
        if (res.confirm) {
          wx.reLaunch({ url: '/pages/index/index' })
        }
      }
    })
  }
})
