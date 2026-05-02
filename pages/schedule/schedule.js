// schedule.js
const util = require('../../utils/util.js')
const xlsxParser = require('../../utils/xlsx-parser')
Page({
  data: {
    dates: [], // 日期列表
    selectedDates: [], // 已选日期
    scheduleType: '早班', // 排班类型
    isSaving: false, // 保存状态
    scheduleTypes: [
      { name: '早班', color: '#007AFF' },
      { name: '休息', color: '#4CAF50' },
      { name: '中班', color: '#FF9800' }
    ],
    customType: '',
    customColor: '#007AFF', // 默认颜色
    colorOptions: ['#007AFF', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'], // 固定颜色选项
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    dateGrid: [],
    schedules: {},
    year: 0, // 当前年份
    month: 0, // 当前月份
    // 新增文件读取相关数据
    showFileImportModal: false, // 显示文件导入弹窗
    importedData: null, // 导入的数据
    selectedEmployee: '', // 选中的员工
    employeeList: [], // 员工列表
    importProgress: '', // 导入进度提示
    // 新增备注相关数据
    showRemarkModal: false, // 显示备注弹窗
    remarkDate: '', // 当前备注的日期
    remarkContent: '', // 备注内容
    remarks: {}, // 备注数据
    // Excel导入相关数据
    showSheetSelector: false, // 是否显示工作表选择器
    sheetList: [], // 工作表列表
    selectedSheets: {}, // 选中的工作表映射
    isSelectAllSheets: false, // 是否全选工作表
    currentWorkbook: null, // 当前工作簿
    currentExcelFileName: '', // 当前Excel文件名
    showEmployeeSelector: false, // 是否显示员工选择器
    parsedEmployees: [], // 解析出的员工列表
    selectedParsedEmployees: [], // 选中的解析员工
    selectedParsedMap: {}, // 选中的解析员工映射
  },
  onLoad: function (options) {
    let year, month
    if (options.year && options.month) {
      year = parseInt(options.year)
      month = parseInt(options.month)
    } else {
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth() + 1
    }
    this.setData({ year, month })
    this.initDates(year, month)
    this.loadSchedules()
    this.setData({ selectedDates: [] })
    let customShifts = wx.getStorageSync('customShifts') || []
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s)
    let defaultTypes = [
      { name: '早班', color: '#007AFF' },
      { name: '休息', color: '#4CAF50' },
      { name: '中班', color: '#FF9800' }
    ]
    const remarks = wx.getStorageSync('remarks') || {}
    this.setData({
      scheduleTypes: defaultTypes.concat(customShifts),
      remarks
    })
    this.updateShiftCounts()
  },

  updateShiftCounts: function() {
    const schedules = wx.getStorageSync('schedules') || {}
    const { year, month } = this.data
    const counts = {}
    const daysInMonth = new Date(year, month, 0).getDate()

    for (let i = 1; i <= daysInMonth; i++) {
      const day = String(i).padStart(2, '0')
      const monthPadded = String(month).padStart(2, '0')
      const dateStr = `${year}-${monthPadded}-${day}`
      if (schedules[dateStr]) {
        const shift = schedules[dateStr]
        counts[shift] = (counts[shift] || 0) + 1
      }
    }

    this.setData({ shiftCounts: counts })
  },
  onShow: function () {
    let customShifts = wx.getStorageSync('customShifts') || []
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s)
    let defaultTypes = [
      { name: '早班', color: '#007AFF' },
      { name: '休息', color: '#4CAF50' },
      { name: '中班', color: '#FF9800' }
    ]
    this.setData({
      scheduleTypes: defaultTypes.concat(customShifts)
    })
    this.loadSchedules()
    this.updateShiftCounts()
  },
  // 初始化指定年月的日期
  initDates: function (year, month) {
    year = year || this.data.year
    month = month || this.data.month
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const dateGrid = []
    for (let i = 0; i < firstDay; i++) {
      dateGrid.push({ empty: true })
    }
    const dates = []
    const selectedDates = this.data.selectedDates || []
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i)
      const dateStr = util.formatDate(d)
      dateGrid.push({ day: i, date: dateStr, isSelected: selectedDates.includes(dateStr) })
      dates.push(dateStr)
    }
    this.setData({ dates, dateGrid })
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
    this.updateDateGrid(selectedDates, this.data.year, this.data.month)
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
    let current = schedules[date] || scheduleTypes[0].name
    // 查找当前班次在scheduleTypes中的索引
    let idx = scheduleTypes.findIndex(t => t.name === current)
    let next = scheduleTypes[(idx + 1) % scheduleTypes.length]
    schedules[date] = next.name
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
    this.updateDateGrid([], this.data.year, this.data.month)
    console.log('保存后schedules:', wx.getStorageSync('schedules'))
    wx.showToast({
      title: '排班已保存',
      icon: 'success',
      duration: 1500
    })
    this.updateShiftCounts()
    setTimeout(() => {
      this.setData({ isSaving: false, selectedDates: [] })
      this.updateDateGrid([], this.data.year, this.data.month)
      this.loadSchedules()
    }, 1500)
  },
  // 全选日期
  selectAllDates: function () {
    const allDates = [...this.data.dates]
    wx.setStorageSync('selectedDates', allDates)
    this.updateDateGrid(allDates, this.data.year, this.data.month)
    this.setData({ selectedDates: allDates })
  },
  // 清空选择
  clearSelectedDates: function () {
    wx.setStorageSync('selectedDates', [])
    this.updateDateGrid([], this.data.year, this.data.month)
    this.setData({ selectedDates: [] })
  },
  updateDateGrid: function(selectedDates, year, month) {
    year = year || this.data.year
    month = month || this.data.month
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const dateGrid = []
    for (let i = 0; i < firstDay; i++) {
      dateGrid.push({ empty: true })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i)
      const dateStr = util.formatDate(d)
      dateGrid.push({ day: i, date: dateStr, isSelected: selectedDates.includes(dateStr) })
    }
    this.setData({ dateGrid })
  },
  onCustomTypeInput: function(e) {
    this.setData({ customType: e.detail.value })
  },
  addCustomType: function() {
    const { customType, customColor, scheduleTypes } = this.data;
    if (!customType) return;
    let customShifts = wx.getStorageSync('customShifts') || [];
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s);
    if (customShifts.find(s => s.name === customType)) return;
    customShifts.push({ name: customType, color: customColor });
    wx.setStorageSync('customShifts', customShifts);
    this.setData({
      scheduleTypes: [...scheduleTypes, { name: customType, color: customColor }],
      scheduleType: customType,
      customType: '',
      customColor: '#007AFF'
    });
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
  },
  clearMonthSchedules: function () {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空本月所有排班数据吗？此操作不可撤销！',
      confirmText: '确定清空',
      confirmColor: '#FF5252',
      success: (res) => {
        if (res.confirm) {
          const { dates } = this.data
          let schedules = wx.getStorageSync('schedules') || {}
          dates.forEach(date => {
            delete schedules[date]
          })
          wx.setStorageSync('schedules', schedules)
          this.setData({ schedules })
          wx.showToast({
            title: '已清空',
            icon: 'success',
            duration: 1200
          })
          this.updateDateGrid([], this.data.year, this.data.month)
          this.setData({ selectedDates: [] })
          this.updateShiftCounts()
        }
      }
    })
  },
  // 长按日期弹出班次选择
  onDateLongPress: function(e) {
    const date = e.currentTarget.dataset.date;
    const { scheduleTypes, schedules, remarks } = this.data;
    const typeNames = ['清除', '备注'].concat(scheduleTypes.map(t => t.name));
    wx.showActionSheet({
      itemList: typeNames,
      success: (res) => {
        if (res.tapIndex >= 0) {
          const selectedType = typeNames[res.tapIndex];
          if (selectedType === '清除') {
            // 删除该日期的排班
            delete schedules[date];
            wx.showToast({
              title: '已清除排班',
              icon: 'success',
              duration: 1000
            });
          } else if (selectedType === '备注') {
            this.setData({
              showRemarkModal: true,
              remarkDate: date,
              remarkContent: remarks[date] || ''
            });
          } else {
            // 设置排班
            schedules[date] = selectedType;
          }
          wx.setStorageSync('schedules', schedules);
          this.setData({ schedules });
        }
      }
    });
  },
  // 获取班次颜色
  getShiftColor: function(type) {
    if (!type) return '';
    if (type === '早班') return '#007AFF';
    if (type === '休息') return '#4CAF50';
    if (type === '中班') return '#FF9800';
    // 检查是否包含"假"字，如果是则显示黄色背景
    if (type && type.indexOf('假') !== -1) return '#FFD700';
    let customShifts = wx.getStorageSync('customShifts') || [];
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s);
    const found = customShifts.find(s => s.name === type);
    return found ? found.color : '#007AFF';
  },
  // 备注相关方法
  showRemarkModal: function() {
    this.setData({ showRemarkModal: true });
  },
  closeRemarkModal: function() {
    this.setData({ showRemarkModal: false });
  },
  onRemarkInput: function(e) {
    this.setData({ remarkContent: e.detail.value });
  },
  saveRemark: function() {
    const { remarkDate, remarkContent, remarks } = this.data;
    if (remarkContent.trim()) {
      remarks[remarkDate] = remarkContent.trim();
      wx.setStorageSync('remarks', remarks);
      this.setData({ remarks, showRemarkModal: false });
      wx.showToast({ title: '备注已保存', icon: 'success' });
    } else {
      wx.showToast({ title: '请输入备注内容', icon: 'none' });
    }
  },
  deleteRemark: function() {
    const { remarkDate, remarks } = this.data;
    delete remarks[remarkDate];
    wx.setStorageSync('remarks', remarks);
    this.setData({ remarks, showRemarkModal: false });
    wx.showToast({ title: '备注已删除', icon: 'success' });
  },

  // 选择Excel导入方式
  selectExcelImportType: function() {
    wx.showActionSheet({
      itemList: ['从聊天记录导入', '从本地文件导入'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.importExcelFromChat()
        } else {
          this.importExcelFromLocal()
        }
      }
    })
  },

  // 导入Excel（统一入口）
  importExcel: function() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const filePath = res.tempFiles[0].path
        const fileName = res.tempFiles[0].name

        wx.showLoading({ title: '正在读取文件...' })

        xlsxParser.readExcelWithSheets(filePath)
          .then(({ workbook, sheetList }) => {
            wx.hideLoading()

            const visibleSheets = sheetList.filter(s => s.isVisible)

            if (visibleSheets.length === 0) {
              wx.showToast({ title: '没有可见的工作表', icon: 'none' })
              return
            }

            this.setData({
              currentWorkbook: workbook,
              currentExcelFileName: fileName
            })

            if (visibleSheets.length === 1) {
              this.parseSheetAndShowEmployeeSelector(workbook, visibleSheets[0].name, fileName)
            } else {
              this.showSheetSelectorModal(sheetList, workbook, fileName)
            }
          })
          .catch((error) => {
            wx.hideLoading()
            wx.showModal({
              title: '读取失败',
              content: '无法读取Excel文件，请检查文件格式是否正确',
              showCancel: false
            })
          })
      },
      fail: () => {
        wx.showToast({ title: '选择取消', icon: 'none' })
      }
    })
  },

  // 显示工作表选择弹窗
  showSheetSelectorModal: function(sheetList, workbook, fileName) {
    const visibleSheets = sheetList.filter(s => s.isVisible)
    
    const selectedSheets = {}
    visibleSheets.forEach(sheet => {
      selectedSheets[sheet.name] = false
    })
    
    this.setData({
      sheetList: visibleSheets,
      selectedSheets,
      isSelectAllSheets: false,
      showSheetSelector: true
    })
  },

  // 切换工作表选择
  toggleSheetSelect: function(e) {
    const name = e.currentTarget.dataset.name
    const selectedSheets = { ...this.data.selectedSheets }
    
    selectedSheets[name] = !selectedSheets[name]
    
    const allSelected = this.data.sheetList.every(sheet => selectedSheets[sheet.name])
    
    this.setData({ selectedSheets, isSelectAllSheets: allSelected })
  },

  // 切换全选工作表
  toggleSelectAllSheets: function() {
    if (this.data.isSelectAllSheets) {
      const selectedSheets = {}
      this.data.sheetList.forEach(sheet => {
        selectedSheets[sheet.name] = false
      })
      this.setData({ selectedSheets, isSelectAllSheets: false })
    } else {
      const selectedSheets = {}
      this.data.sheetList.forEach(sheet => {
        selectedSheets[sheet.name] = true
      })
      this.setData({ selectedSheets, isSelectAllSheets: true })
    }
  },

  // 关闭工作表选择器
  closeSheetSelector: function() {
    this.setData({ showSheetSelector: false })
  },

  // 确认工作表选择
  confirmSheetSelection: function() {
    const selectedSheetNames = Object.keys(this.data.selectedSheets).filter(name => this.data.selectedSheets[name])
    
    if (selectedSheetNames.length === 0) {
      wx.showToast({ title: '请至少选择一个工作表', icon: 'none' })
      return
    }
    
    this.setData({ showSheetSelector: false })
    
    // 解析第一个选中的工作表并显示员工选择器
    this.parseSheetAndShowEmployeeSelector(this.data.currentWorkbook, selectedSheetNames[0], this.data.currentExcelFileName)
  },

  // 解析工作表并显示员工选择器
  parseSheetAndShowEmployeeSelector: function(workbook, sheetName, fileName) {
    wx.showLoading({ title: '正在解析...' })
    
    try {
      const excelData = xlsxParser.readSheetData(workbook, sheetName)
      const parsedData = xlsxParser.parseExcelData(excelData)
      
      wx.hideLoading()
      
      if (!parsedData || !parsedData.employees || parsedData.employees.length === 0) {
        wx.showToast({ title: '未识别到有效数据', icon: 'none' })
        return
      }
      
      // 显示员工选择器
      const selectedParsedMap = {}
      parsedData.employees.forEach(name => {
        selectedParsedMap[name] = false
      })
      
      this.setData({
        parsedEmployees: parsedData.employees,
        parsedSchedules: parsedData.schedules,
        selectedParsedMap,
        selectedParsedEmployees: [],
        showEmployeeSelector: true
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '解析失败', icon: 'none' })
    }
  },

  // 切换解析员工选择
  toggleParsedEmployeeSelect: function(e) {
    const name = e.currentTarget.dataset.name
    const selectedParsedMap = { ...this.data.selectedParsedMap }
    const selectedParsedEmployees = [...this.data.selectedParsedEmployees]
    
    if (selectedParsedMap[name]) {
      delete selectedParsedMap[name]
      const index = selectedParsedEmployees.indexOf(name)
      if (index > -1) {
        selectedParsedEmployees.splice(index, 1)
      }
    } else {
      selectedParsedMap[name] = true
      selectedParsedEmployees.push(name)
    }
    
    const isSelectAllParsed = selectedParsedEmployees.length === this.data.parsedEmployees.length && this.data.parsedEmployees.length > 0
    
    this.setData({ selectedParsedMap, selectedParsedEmployees, isSelectAllParsed })
  },

  // 全选/取消全选解析员工
  toggleSelectAllParsedEmployees: function() {
    if (this.data.isSelectAllParsed) {
      const selectedParsedMap = {}
      this.data.parsedEmployees.forEach(name => {
        selectedParsedMap[name] = false
      })
      this.setData({ selectedParsedMap, selectedParsedEmployees: [], isSelectAllParsed: false })
    } else {
      const selectedParsedMap = {}
      this.data.parsedEmployees.forEach(name => {
        selectedParsedMap[name] = true
      })
      this.setData({ selectedParsedMap, selectedParsedEmployees: [...this.data.parsedEmployees], isSelectAllParsed: true })
    }
  },

  // 关闭员工选择器
  closeEmployeeSelector: function() {
    this.setData({ showEmployeeSelector: false })
  },

  // 确认导入选中的员工排班
  confirmImportEmployees: function() {
    const { selectedParsedEmployees, parsedSchedules, year, month } = this.data
    
    if (selectedParsedEmployees.length === 0) {
      wx.showToast({ title: '请至少选择一个员工', icon: 'none' })
      return
    }
    
    // 获取当前本地的排班数据
    let schedules = wx.getStorageSync('schedules') || {}
    if (typeof schedules !== 'object' || Array.isArray(schedules)) {
      schedules = {}
    }
    
    // 导入选中员工的排班
    selectedParsedEmployees.forEach(name => {
      const employeeSchedules = parsedSchedules[name] || {}
      Object.keys(employeeSchedules).forEach(date => {
        // 只导入当月的数据
        if (date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
          schedules[date] = employeeSchedules[date]
        }
      })
    })
    
    wx.setStorageSync('schedules', schedules)
    
    this.setData({ 
      schedules,
      showEmployeeSelector: false,
      selectedDates: []
    })
    
    this.updateDateGrid([], year, month)
    
    wx.showToast({ title: '导入成功', icon: 'success' })
  }
})
