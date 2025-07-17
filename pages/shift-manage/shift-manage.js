// pages/shift-manage/shift-manage.js
Page({
  data: {
    customShifts: []
  },
  onLoad: function() {
    this.loadCustomShifts()
  },
  onShow: function() {
    this.loadCustomShifts()
  },
  loadCustomShifts: function() {
    let customShifts = wx.getStorageSync('customShifts') || []
    this.setData({ customShifts })
  },
  deleteShift: function(e) {
    const name = e.currentTarget.dataset.name
    let customShifts = wx.getStorageSync('customShifts') || []
    customShifts = customShifts.filter(n => n !== name)
    wx.setStorageSync('customShifts', customShifts)
    this.setData({ customShifts })
    wx.showToast({ title: '已删除', icon: 'success', duration: 800 })
  }
})