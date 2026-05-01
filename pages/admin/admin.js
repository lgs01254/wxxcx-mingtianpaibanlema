// admin.js
const util = require('../../utils/util')
const xlsxParser = require('../../utils/xlsx-parser')

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
    currentEmployeeName: '', // 当前操作的员工姓名
    isParsingExcel: false, // 是否正在解析Excel
    currentExcelFilePath: '', // 当前Excel文件路径
    currentExcelFileName: '' // 当前Excel文件名
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
    const employees = wx.getStorageSync('employees') || []
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
      content: `确定要加载${name}的排班数据到本地吗？`,
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
      content: `确定要删除员工${name}及其所有排班数据吗？`,
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
    if (str === '早班') return '#007AFF'
    if (str === '休息') return '#4CAF50'
    if (str === '中班') return '#FF9800'
    if (str === '晚班') return '#F44336'
    if (str && str.indexOf('假') !== -1) return '#FFC107'
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
        title: `${employee}${monthStr}排班表`,
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

  // 选择Excel文件
  selectExcelFile() {
    wx.showActionSheet({
      itemList: ['从微信聊天记录选择', '从本地文件选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseExcelFromChat()
        } else {
          this.chooseExcelFromLocal()
        }
      }
    })
  },

  // 从微信聊天记录选择Excel文件
  chooseExcelFromChat() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const tempFiles = res.tempFiles
        if (tempFiles && tempFiles.length > 0) {
          const fileInfo = tempFiles[0]
          const filePath = fileInfo.path
          const fileName = fileInfo.name
          const fileSize = fileInfo.size
          
          console.log('选择的文件信息:', {
            name: fileName,
            path: filePath,
            size: fileSize
          })
          
          wx.showLoading({ title: '正在读取文件...' })
          
          // 判断文件类型
          const isCSV = fileName.toLowerCase().endsWith('.csv')
          
          if (isCSV) {
            // CSV文件可以直接读取解析
            this.readCSVFile(filePath, fileName)
          } else {
            // xlsx/xls文件需要第三方库解析，这里演示处理
            wx.showLoading({ title: '正在解析Excel...' })
            setTimeout(() => {
              // 读取文件内容（微信小程序不支持直接读取，需要借助服务端或第三方库）
              this.processExcelFile(filePath, fileName)
            }, 500)
          }
        }
      },
      fail: (err) => {
        console.error('选择文件失败:', err)
        if (err.errMsg.includes('cancel')) {
          // 用户取消选择，不提示
        } else {
          wx.showToast({ title: '选择文件失败', icon: 'none' })
        }
      }
    })
  },

  // 从本地文件选择Excel
  chooseExcelFromLocal() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const tempFiles = res.tempFiles
        if (tempFiles && tempFiles.length > 0) {
          const fileInfo = tempFiles[0]
          const filePath = fileInfo.path
          const fileName = fileInfo.name
          const fileSize = fileInfo.size
          
          console.log('本地文件信息:', {
            name: fileName,
            path: filePath,
            size: fileSize
          })
          
          wx.showLoading({ title: '正在读取文件...' })
          
          const isCSV = fileName.toLowerCase().endsWith('.csv')
          
          if (isCSV) {
            this.readCSVFile(filePath, fileName)
          } else {
            wx.showLoading({ title: '正在解析Excel...' })
            setTimeout(() => {
              this.processExcelFile(filePath, fileName)
            }, 500)
          }
        }
      },
      fail: (err) => {
        console.error('选择本地文件失败:', err)
        if (!err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选择文件失败', icon: 'none' })
        }
      }
    })
  },
  
  // 读取CSV文件
  readCSVFile(filePath, fileName) {
    wx.showLoading({ title: '正在解析CSV...' })
    
    // 尝试读取文件内容
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'utf-8',
      success: (res) => {
        console.log('CSV文件读取成功，数据长度:', res.data.length)
        
        try {
          const csvData = res.data
          const parsedData = this.parseCSVData(csvData)
          
          if (parsedData && parsedData.employees && parsedData.employees.length > 0) {
            this.showConfirmDialog(parsedData)
          } else {
            wx.showToast({ title: '未能识别到有效数据', icon: 'none' })
          }
        } catch (error) {
          console.error('解析CSV失败:', error)
          wx.showToast({ title: '解析CSV失败', icon: 'none' })
        }
        
        wx.hideLoading()
      },
      fail: (err) => {
        console.error('读取CSV文件失败:', err)
        wx.hideLoading()
        wx.showToast({ title: '读取文件失败', icon: 'none' })
      }
    })
  },
  
  // 解析CSV数据
  parseCSVData(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return null
    }
    
    // 假设第一行是表头，格式：姓名, 1号, 2号, 3号, ...
    // 或者：姓名, 2026-05-01, 2026-05-02, ...
    const headerLine = lines[0]
    const headerParts = this.splitCSVLine(headerLine)
    
    // 检查表头格式
    const dateHeaders = []
    
    // 如果第一列不是日期，则跳过
    for (let i = 1; i < headerParts.length; i++) {
      const header = headerParts[i].trim()
      if (this.isValidDateHeader(header)) {
        dateHeaders.push(header)
      }
    }
    
    // 解析每行数据
    const employees = []
    const schedules = {}
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const parts = this.splitCSVLine(line)
      if (parts.length < 2) continue
      
      const employeeName = parts[0].trim()
      if (!employeeName) continue
      
      employees.push(employeeName)
      schedules[employeeName] = {}
      
      // 解析该员工的排班数据
      let dateIndex = 0
      for (let j = 1; j < parts.length && dateIndex < dateHeaders.length; j++) {
        const shiftText = parts[j].trim()
        if (shiftText && dateHeaders[dateIndex]) {
          const normalizedShift = this.normalizeShiftName(shiftText)
          if (normalizedShift) {
            schedules[employeeName][dateHeaders[dateIndex]] = normalizedShift
          }
        }
        dateIndex++
      }
    }
    
    return {
      employees,
      schedules,
      shiftTypes: ['早班', '休息', '中班', '晚班']
    }
  },
  
  // 分割CSV行（处理引号）
  splitCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  },
  
  // 检查是否是有效的日期表头
  isValidDateHeader(header) {
    if (!header) return false
    
    // 检查是否是日期格式：2026-05-01 或 2026/05/01 或 类似格式
    const datePatterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/,  // 2026-5-1
      /^\d{4}\/\d{1,2}\/\d{1,2}$/, // 2026/5/1
      /^(\d{1,2}[-\/]\d{1,2})$/,    // 5-1 或 5/1
      /^\d{1,2}$/                    // 1, 2, 3...
    ]
    
    return datePatterns.some(pattern => pattern.test(header.trim()))
  },
  
  // 处理Excel文件（xlsx/xls）
  processExcelFile(filePath, fileName) {
    wx.showLoading({ title: '正在解析Excel...' })
    
    xlsxParser.readExcelWithSheets(filePath)
      .then(({ workbook, sheetList }) => {
        console.log('Excel解析成功，工作表列表:', sheetList)
        wx.hideLoading()
        
        // 保存文件信息
        this.setData({
          currentExcelFilePath: filePath,
          currentExcelFileName: fileName
        })
        
        // 如果只有一个可见工作表，直接解析
        const visibleSheets = sheetList.filter(s => s.isVisible)
        
        if (visibleSheets.length === 0) {
          wx.showToast({ title: '没有可见的工作表', icon: 'none' })
          return
        }
        
        if (visibleSheets.length === 1) {
          // 只有一个可见工作表，直接解析
          this.parseExcelSheet(workbook, visibleSheets[0].name, fileName)
        } else {
          // 多个工作表，让用户选择
          this.showSheetSelector(sheetList, workbook, fileName)
        }
      })
      .catch((error) => {
        console.error('解析Excel失败:', error)
        wx.hideLoading()
        wx.showModal({
          title: '解析失败',
          content: `文件: ${fileName}\n\n解析Excel文件时发生错误，请检查文件格式是否正确。\n\n建议将文件保存为CSV格式后重试。`,
          showCancel: false,
          confirmText: '知道了'
        })
      })
  },

  // 显示工作表选择器
  showSheetSelector(sheetList, workbook, fileName) {
    const visibleSheets = sheetList.filter(s => s.isVisible)
    const sheetNames = visibleSheets.map(s => s.name)
    
    wx.showActionSheet({
      itemList: sheetNames,
      success: (res) => {
        const selectedSheet = visibleSheets[res.tapIndex]
        console.log('选择的工作表:', selectedSheet)
        this.parseExcelSheet(workbook, selectedSheet.name, fileName)
      },
      fail: (err) => {
        console.error('选择工作表失败:', err)
      }
    })
  },

  // 解析指定工作表
  parseExcelSheet(workbook, sheetName, fileName) {
    wx.showLoading({ title: '正在解析工作表...' })
    
    try {
      const excelData = xlsxParser.readSheetData(workbook, sheetName)
      console.log(`工作表 ${sheetName} 解析成功，数据:`, excelData)
      
      // 解析Excel数据为排班格式
      const parsedData = xlsxParser.parseExcelData(excelData)
      
      if (parsedData && parsedData.employees && parsedData.employees.length > 0) {
        wx.hideLoading()
        this.showConfirmDialog(parsedData)
      } else {
        wx.hideLoading()
        wx.showToast({ title: '未能识别到有效数据', icon: 'none' })
      }
    } catch (error) {
      console.error('解析工作表失败:', error)
      wx.hideLoading()
      wx.showModal({
        title: '解析失败',
        content: `工作表: ${sheetName}\n\n解析工作表时发生错误`,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  // 标准化班次名称
  normalizeShiftName(text) {
    const t = text.trim()
    if (t === '早' || t === '早班') return '早班'
    if (t === '休' || t === '休息') return '休息'
    if (t === '中' || t === '中班') return '中班'
    if (t === '晚' || t === '晚班') return '晚班'
    if (t === '假' || t === '放假' || t === '休假') return '放假'
    return null
  },

  // 显示确认对话框
  showConfirmDialog(parsedData) {
    const { employees, schedules, shiftTypes } = parsedData
    const employeeNames = employees.join('、')
    const shiftNames = shiftTypes.join('、')

    wx.showModal({
      title: '识别结果',
      content: `识别到${employees.length}名员工：${employeeNames}\n班次类型：${shiftNames}\n是否导入？`,
      confirmText: '导入',
      success: (res) => {
        if (res.confirm) {
          this.importRecognizedData(parsedData)
        }
      }
    })
  },

  // 导入识别的数据
  importRecognizedData(parsedData) {
    const { employees, schedules, shiftTypes } = parsedData
    
    // 添加新员工
    const existingEmployees = this.data.employees
    const newEmployees = [...existingEmployees]
    employees.forEach(emp => {
      if (!newEmployees.includes(emp)) {
        newEmployees.push(emp)
      }
    })
    
    // 更新排班数据
    const allSchedules = JSON.parse(JSON.stringify(this.data.allSchedules))
    Object.keys(schedules).forEach(emp => {
      if (!allSchedules[emp]) {
        allSchedules[emp] = {}
      }
      Object.assign(allSchedules[emp], schedules[emp])
    })

    // 更新班次类型
    const existingShiftNames = this.data.shiftTypes.map(t => t.name)
    const newShiftTypes = [...this.data.shiftTypes]
    const colors = ['#F44336', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A']
    let colorIndex = 0
    shiftTypes.forEach(shiftName => {
      if (!existingShiftNames.includes(shiftName)) {
        newShiftTypes.push({
          name: shiftName,
          color: colors[colorIndex % colors.length]
        })
        colorIndex++
      }
    })

    // 保存到存储
    wx.setStorageSync('employees', newEmployees)
    wx.setStorageSync('allSchedules', allSchedules)
    
    // 保存自定义班次
    const customShifts = newShiftTypes.slice(3).map(t => ({ name: t.name, color: t.color }))
    wx.setStorageSync('customShifts', customShifts)

    // 更新页面
    this.setData({
      employees: newEmployees,
      allSchedules,
      shiftTypes: newShiftTypes
    }, () => {
      this.updateShiftDisplay()
      wx.showToast({ title: '导入成功', icon: 'success' })
    })
  }
})
