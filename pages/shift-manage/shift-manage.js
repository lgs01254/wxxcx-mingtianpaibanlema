// pages/shift-manage/shift-manage.js
Page({
  data: {
    customShifts: [],
    showShiftModal: false,
    formName: '',
    formColor: '#007AFF',
    editingName: '' // 空表示新增，非空表示编辑该名称
  },
  onLoad: function() {
    this.loadCustomShifts()
  },
  onShow: function() {
    this.loadCustomShifts()
  },
  loadCustomShifts: function() {
    let customShifts = wx.getStorageSync('customShifts') || []
    // 兼容字符串与对象两种格式，统一成{name,color}
    customShifts = customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s)
    this.setData({ customShifts })
  },
  // 打开新增
  openAddShift: function() {
    this.setData({ showShiftModal: true, formName: '', formColor: '#007AFF', editingName: '' })
  },
  // 打开编辑
  openEditShift: function(e) {
    const name = e.currentTarget.dataset.name
    const shift = (this.data.customShifts || []).find(s => s.name === name)
    if (!shift) return
    this.setData({ showShiftModal: true, formName: shift.name, formColor: shift.color || '#007AFF', editingName: shift.name })
  },
  closeShiftModal: function() { this.setData({ showShiftModal: false }) },
  onShiftNameInput: function(e) { this.setData({ formName: (e.detail.value || '').trim() }) },
  onPickColor: function(e) { this.setData({ formColor: e.currentTarget.dataset.color }) },
  // 保存（新增或编辑）
  saveShift: function() {
    const name = (this.data.formName || '').trim()
    if (!name) { wx.showToast({ title: '请输入班制名称', icon: 'none' }); return }
    let list = wx.getStorageSync('customShifts') || []
    // 统一成对象
    list = list.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s)
    const idx = list.findIndex(s => s.name === name)
    if (this.data.editingName) {
      // 编辑：如果改名与他人重复则提示
      if (name !== this.data.editingName && idx !== -1) {
        wx.showToast({ title: '名称已存在', icon: 'none' }); return
      }
      // 根据 editingName 定位
      const editIdx = list.findIndex(s => s.name === this.data.editingName)
      if (editIdx !== -1) { list[editIdx] = { name, color: this.data.formColor } }
    } else {
      // 新增：禁止重复
      if (idx !== -1) { wx.showToast({ title: '名称已存在', icon: 'none' }); return }
      list.push({ name, color: this.data.formColor })
    }
    wx.setStorageSync('customShifts', list)
    this.setData({ showShiftModal: false, editingName: '' })
    this.loadCustomShifts()
    wx.showToast({ title: '已保存', icon: 'success', duration: 800 })
  },
  deleteShift: function(e) {
    const name = e.currentTarget.dataset.name
    let customShifts = wx.getStorageSync('customShifts') || []
    // 支持两种结构删除
    customShifts = customShifts.filter(s => (typeof s === 'string' ? s !== name : s.name !== name))
    wx.setStorageSync('customShifts', customShifts)
    // 刷新显示用的规范化数据
    this.setData({ customShifts: customShifts.map(s => typeof s === 'string' ? { name: s, color: '#007AFF' } : s) })
    wx.showToast({ title: '已删除', icon: 'success', duration: 800 })
  }
})