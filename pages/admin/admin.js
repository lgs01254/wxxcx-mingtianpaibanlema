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
    shiftTypes: [],
    weekdayMap: {},
    shiftDisplay: {},
    shiftColors: {},
    currentShiftType: '', // 当前选中的班次类型
    showEmployeeMenu: false, // 员工操作菜单
    currentEmployeeName: '' // 当前操作的员工姓名
  },

  onLoad() {
    this.loadEmployees()
    this.loadSchedules()
    this.loadShiftTypes()
    this.setCurrentMonth(new Date())
    this.updateShiftDisplay()
    console.log('onLoad - employees:', this.data.employees)
    console.log('onLoad - dateHeaders:', this.data.dateHeaders)
    console.log('onLoad - allSchedules:', this.data.allSchedules)
  },

  selectShiftType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentShiftType: type })
  },

  setShift(e) {
    const emp = e.currentTarget.dataset.employee
    const date = e.currentTarget.dataset.date
    const type = this.data.currentShiftType

    if (!type) {
      wx.showToast({ title: '请先选择班次', icon: 'none' })
      return
    }

    console.log('setShift:', { emp, date, type })

    let allSchedules = JSON.parse(JSON.stringify(this.data.allSchedules))
    if (!allSchedules[emp]) allSchedules[emp] = {}

    if (type === '__clear__') {
      delete allSchedules[emp][date]
    } else {
      allSchedules[emp][date] = type
    }

    wx.setStorageSync('allSchedules', allSchedules)
    this.setData({ allSchedules }, () => {
      this.updateShiftDisplay()
    })
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

  loadShiftTypes() {
    const customShifts = wx.getStorageSync('customShifts') || []
    const shiftTypes = [
      { name: '早班', color: '#007AFF' },
      { name: '休息', color: '#4CAF50' },
      { name: '中班', color: '#FF9800' }
    ]
    customShifts.forEach(s => {
      if (typeof s === 'string') {
        shiftTypes.push({ name: s, color: '#9C27B0' })
      } else if (s && s.name) {
        shiftTypes.push({ name: s.name, color: s.color || '#9C27B0' })
      }
    })
    this.setData({ shiftTypes })
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

  deleteEmployee() {
    const name = this.data.currentEmployeeName
    const employees = this.data.employees.filter(emp => emp !== name)
    wx.setStorageSync('employees', employees)
    // 删除该员工的排班数据
    const allSchedules = JSON.parse(JSON.stringify(this.data.allSchedules))
    delete allSchedules[name]
    wx.setStorageSync('allSchedules', allSchedules)
    this.setData({ employees, allSchedules, showEmployeeMenu: false })
    this.updateShiftDisplay()
  },

  showEmployeeMenu(e) {
    const name = e.currentTarget.dataset.name
    this.setData({ showEmployeeMenu: true, currentEmployeeName: name })
  },

  closeEmployeeMenu() {
    this.setData({ showEmployeeMenu: false, currentEmployeeName: '' })
  },

  loadEmployeeToLocal() {
    const name = this.data.currentEmployeeName
    const allSchedules = this.data.allSchedules
    const schedules = allSchedules[name] || {}

    if (Object.keys(schedules).length === 0) {
      wx.showToast({ title: '该员工暂无排班数据', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认加载',
      content: `确定要加载 ${name} 的排班数据到本地吗？`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('schedules', schedules)
          wx.setStorageSync('isEmployeeMode', true)
          wx.setStorageSync('employeeName', name)

          wx.showToast({ title: '加载成功', icon: 'success' })
          
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1500)
        }
      }
    })
  },

  editEmployee() {
    const name = this.data.currentEmployeeName
    wx.showModal({
      title: '编辑姓名',
      editable: true,
      placeholderText: '请输入新姓名',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newName = res.content.trim()
          const employees = this.data.employees.map(emp => emp === name ? newName : emp)
          wx.setStorageSync('employees', employees)
          // 更新排班数据中的员工名
          const allSchedules = JSON.parse(JSON.stringify(this.data.allSchedules))
          if (allSchedules[name]) {
            allSchedules[newName] = allSchedules[name]
            delete allSchedules[name]
            wx.setStorageSync('allSchedules', allSchedules)
          }
          this.setData({ employees, allSchedules, showEmployeeMenu: false })
          this.updateShiftDisplay()
        }
      }
    })
  },

  confirmDeleteEmployee() {
    const name = this.data.currentEmployeeName
    wx.showModal({
      title: '确认删除',
      content: `确定要删除员工 ${name} 及其所有排班数据吗？`,
      confirmText: '删除',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.deleteEmployee()
        }
      }
    })
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
    const weekendMap = {}
    dateHeaders.forEach(dateStr => {
      const d = new Date(dateStr)
      weekdayMap[dateStr] = weekMap[d.getDay()]
      weekendMap[dateStr] = d.getDay() === 0 || d.getDay() === 6 // 周日或周六
    })
    this.setData({
      currentMonth: `${year}年${month}月`,
      currentMonthDate: new Date(year, month-1, 1),
      dateHeaders,
      dayHeaders,
      weekdayMap,
      weekendMap
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

  getShiftBgColor(str) {
    if (!str || str === '-') return 'transparent'
    if (str === '早班') return '#4CAF50'
    if (str === '休息') return '#9E9E9E'
    if (str === '中班') return '#2196F3'
    if (str === '晚班') return '#FF9800'
    if (str && str.indexOf('假') !== -1) return '#FFD700'
    return '#9C27B0'
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
