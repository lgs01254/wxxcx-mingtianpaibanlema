// settings.js
Page({
  goAdminPanel: function () {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },
  loadEmployeeData: function () {
    const employees = wx.getStorageSync('employees') || []
    const allSchedules = wx.getStorageSync('allSchedules') || {}

    if (employees.length === 0) {
      wx.showToast({ title: '暂无员工数据', icon: 'none' })
      return
    }

    const employeeNames = employees.map(e => e)

    wx.showActionSheet({
      itemList: employeeNames,
      success: (res) => {
        const selectedEmployee = employeeNames[res.tapIndex]
        const schedules = allSchedules[selectedEmployee] || {}

        if (Object.keys(schedules).length === 0) {
          wx.showToast({ title: '该员工暂无排班数据', icon: 'none' })
          return
        }

        wx.setStorageSync('schedules', schedules)
        wx.setStorageSync('isEmployeeMode', true)
        wx.setStorageSync('employeeName', selectedEmployee)

        wx.showModal({
          title: '加载成功',
          content: `已加载 ${selectedEmployee} 的排班数据到本地`,
          showCancel: false,
          success: () => {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        })
      }
    })
  }
})