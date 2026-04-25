// settings.js
Page({
  data: {
    reminderTime: '08:00'
  },
  onLoad: function () {
    const reminderTime = wx.getStorageSync('reminderTime') || '08:00'
    this.setData({ reminderTime })
  },
  changeReminderTime: function (e) {
    this.setData({
      reminderTime: e.detail.value
    })
    wx.setStorageSync('reminderTime', e.detail.value)
  },
  clearSchedules: function () {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有排班数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('schedules')
          
          wx.showToast({
            title: '排班数据已清除',
            icon: 'success',
            duration: 2000
          })
        }
      }
    })
  },
  goAdminPanel: function () {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})
