// schedule.js
const util = require('../../utils/util.js')
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
    // 读取自定义班次
    let customShifts = wx.getStorageSync('customShifts') || []
    // 兼容旧数据
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s)
    // 将默认班次也转换为对象格式
    let defaultTypes = [
      { name: '早班', color: '#007AFF' },
      { name: '休息', color: '#4CAF50' },
      { name: '中班', color: '#FF9800' }
    ]
    // 读取备注数据
    const remarks = wx.getStorageSync('remarks') || {}
    this.setData({
      scheduleTypes: defaultTypes.concat(customShifts),
      remarks
    })
  },
  onShow: function () {
    let customShifts = wx.getStorageSync('customShifts') || []
    // 兼容旧数据
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s)
    // 将默认班次也转换为对象格式
    let defaultTypes = [
      { name: '早班', color: '#007AFF' },
      { name: '休息', color: '#4CAF50' },
      { name: '中班', color: '#FF9800' }
    ]
    this.setData({
      scheduleTypes: defaultTypes.concat(customShifts)
    })
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
    setTimeout(() => {
      this.setData({ isSaving: false, selectedDates: [] })
      this.updateDateGrid([], this.data.year, this.data.month)
      this.loadSchedules() // 新增：刷新schedules，保证WXML能显示
      // wx.navigateBack() // 不再跳转页面，方便继续排下一个班
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
    // 刷新网格
    this.updateDateGrid([], this.data.year, this.data.month)
    this.setData({ selectedDates: [] })
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
  }
})
