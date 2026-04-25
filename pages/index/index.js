// index.js
const util = require('../../utils/util.js')
Page({
  data: {
    today: '',
    tomorrow: '',
    todaySchedule: '',
    tomorrowSchedule: '',
    currentMonth: '',
    days: [],
    schedules: {},
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    todayWeekday: '',
    tomorrowWeekday: '',
    topCards: [],
    topCardsIndex: 10, // 默认定位到今天（前后各10天）
    // 新增
    currentMonthDate: null, // 当前日历显示的月份Date对象
    calendarSwiperIndex: 1, // 日历swiper的当前index，默认中间页
    calendarMonths: [], // 三个月的日历数据
    showTypePopup: false,
    popupX: 0,
    popupY: 0,
    popupDate: '',
    allTypeNames: [],
    typePopupWidth: 100, // 弹窗宽度，单位px
    nickName: '微信用户', // 新增：微信昵称
    // 新增备注相关数据
    showRemarkModal: false, // 显示备注弹窗
    remarkDate: '', // 当前备注的日期
    remarkContent: '', // 备注内容
    remarks: {}, // 备注数据
    // 新增键盘避让相关数据
    keyboardHeight: 0, // 键盘高度
    // 新增双击检测相关数据
    lastTapTime: 0, // 上次点击时间
    lastTapDate: '', // 上次点击的日期
    tapTimer: null, // 单击延迟定时器
    // 新增天气相关数据
    weatherIcon: '🌤️', // 天气图标
    temperature: '--', // 温度
    weatherDesc: '获取中...', // 天气描述
    city: '定位中...', // 城市名称
    weeklyWeather: [], // 新增：存储7天天气数据
    realTimeWeather: null, // 新增：实时天气数据
    // 日历左右滑动手势
    touchStartX: 0,
    touchStartY: 0,
    calendarAnimClass: '',
    calendarAnim: null,
    windowWidth: 750,
    // 双面板滑动相关
    dualMode: false,
    dualLeftDays: [],
    dualRightDays: [],
    calendarTrackAnim: null,
    // 城市输入弹窗
    showCityModal: false,
    cityInputValue: '',
    cityInputPlaceholder: '请输入城市名称（如：北京、上海、广州）',
    // 新增用户角色相关数据
    userRole: 'employee', // 默认角色为员工
    isAdmin: false, // 是否为管理员
    // 新增通知相关数据
    showNotificationModal: false, // 显示通知弹窗
    notifications: [], // 通知数据
    unreadCount: 0, // 未读通知数量
    isEmployeeMode: false,   // 是否员工单人模式
    employeeName: ''          // 员工姓名
  },
  onLoad: function (options) {
    // 检查是否为员工单人模式
    if (options.employee) {
      this.setData({
        isEmployeeMode: true,
        employeeName: options.employee
      })
    }

    // 处理分享链接中的参数（保留原有逻辑）
    if (options.year && options.month && options.schedules) {
      try {
        const year = parseInt(options.year)
        const month = parseInt(options.month)
        const scheduleData = decodeURIComponent(options.schedules)
        const schedules = JSON.parse(scheduleData)
        
        // 如果单人模式，只保存该员工的排班到页面data，不影响其他
        if (this.data.isEmployeeMode) {
          this.setData({ schedules })
          const currentMonthDate = new Date(year, month - 1, 1)
          this.setData({ currentMonthDate })
        } else {
          // 原来逻辑：覆盖全局
          wx.setStorageSync('schedules', schedules)
          const currentMonthDate = new Date(year, month - 1, 1)
          this.setData({ currentMonthDate })
        }
      } catch (e) {
        console.error('解析分享数据失败:', e)
      }
    }
    
    this.initData()
    // 获取微信昵称
    wx.getUserInfo({
      success: res => {
        this.setData({
          nickName: res.userInfo.nickName || '微信用户'
        })
      },
      fail: () => {
        this.setData({
          nickName: '微信用户'
        })
      }
    })
    
    // 从本地加载数据
    this.loadDataFromLocal()
    
    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      this.setData({
        keyboardHeight: res.height
      })
    })
    
    // 获取天气信息
    this.getWeatherInfo()
    // 记录屏幕宽度用于平滑动画
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ windowWidth: sys.windowWidth })
    } catch (e) {}
  },
  
  // 从本地加载数据
  loadDataFromLocal: function() {
    if (this.data.isEmployeeMode && !this.data.schedules) {
      // 员工模式：从allSchedules中加载该员工的排班
      const allSchedules = wx.getStorageSync('allSchedules') || {}
      const empSchedules = allSchedules[this.data.employeeName] || {}
      this.setData({ schedules: empSchedules })
    } else {
      // 原逻辑
      const schedules = wx.getStorageSync('schedules') || {}
      const remarks = wx.getStorageSync('remarks') || {}
      this.setData({ schedules, remarks })
    }
  },
  
  // 关闭通知中心
  closeNotificationModal: function() {
    this.setData({ showNotificationModal: false })
  },
  
  // 上传数据到本地存储（模拟上传到云端）
  uploadDataToCloud: function() {
    wx.showLoading({ title: '上传数据中...' })
    
    const { schedules, remarks } = this.data
    
    // 保存到本地存储
    wx.setStorageSync('schedules', schedules)
    wx.setStorageSync('remarks', remarks)
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ 
        title: '数据上传完成', 
        icon: 'success',
        duration: 1500 
      })
    }, 500)
  },
  
  // 页面分享配置
  onShareAppMessage: function (options) {
    // 判断是否由分享按钮触发
    const isShareBtn = options.from === 'button';
    const shareType = isShareBtn ? options.target.dataset.shareType : 'menu';

    if (shareType === 'monthSchedule') {
      // ----- 生成当月排班数据的逻辑（直接复用你原来的内容）-----
      const { currentMonthDate, schedules, nickName } = this.data;
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth() + 1;

      // 提取当前月份内有排班的日期
      const monthSchedules = {};
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month - 1, i);
        const dateStr = util.formatDate(date);
        if (schedules[dateStr]) {
          monthSchedules[dateStr] = schedules[dateStr];
        }
      }

      // 将排班数据编码后放入分享路径
      const encodedData = encodeURIComponent(JSON.stringify(monthSchedules));
      return {
        title: `${nickName}的${year}年${month}月排班表`,
        path: `/pages/index/index?year=${year}&month=${month}&schedules=${encodedData}`,
        imageUrl: '',  // 可设置分享卡片图片（建议为空，会使用默认截图）
      };
    }

    // 右上角菜单分享（默认内容）
    return {
      title: '明天排版了吗',
      desc: '查看当月排班信息',
      path: '/pages/index/index',
    };
  },
  
  // 分享到朋友圈
  onShareTimeline: function() {
    const { currentMonthDate, schedules, nickName } = this.data;
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth() + 1;

    // 提取当前月份内有排班的日期
    const monthSchedules = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      const dateStr = util.formatDate(date);
      if (schedules[dateStr]) {
        monthSchedules[dateStr] = schedules[dateStr];
      }
    }

    // 将排班数据编码后放入分享路径
    const encodedData = encodeURIComponent(JSON.stringify(monthSchedules));
    return {
      title: `${nickName}的${year}年${month}月排班表`,
      path: `/pages/index/index?year=${year}&month=${month}&schedules=${encodedData}`,
      imageUrl: '',  // 可设置分享卡片图片（建议为空，会使用默认截图）
    };
  },
  onShow: function () {
    this.initData()
    // 重新从本地加载数据
    this.loadDataFromLocal()
    console.log('主页onShow')
  },
  initData: function () {
    const now = new Date()
    const today = util.formatDate(now)
    const tomorrow = util.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))
    const currentMonth = util.formatMonth(now)
    const weekMap = ['日', '一', '二', '三', '四', '五', '六']
    const todayWeekday = '星期' + weekMap[now.getDay()]
    const tomorrowWeekday = '星期' + weekMap[new Date(now.getTime() + 24 * 60 * 60 * 1000).getDay()]
    // 无限滑动：前后各10天
    const topCards = []
    const schedules = this.data.schedules || {}
    const remarks = this.data.remarks || {}
    for (let i = -10; i <= 10; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = util.formatDate(d)
      const remark = remarks[dateStr] || ''
      
      // 为顶部卡片处理三个字换行
      let remarkFormatted = ''
      if (remark) {
        for (let j = 0; j < remark.length; j++) {
          remarkFormatted += remark[j]
          if ((j + 1) % 3 === 0 && j < remark.length - 1) {
            remarkFormatted += '\n'
          }
        }
      }
      
      // 获取对应日期的天气信息
      const weather = this.getWeatherForTopCard(dateStr)
      
      topCards.push({
        date: dateStr,
        weekday: '星期' + weekMap[d.getDay()],
        label: i === 0 ? '今天' : (i === 1 ? '明天' : (i === -1 ? '昨天' : '')),
        schedule: schedules[dateStr] || '未排班',
        remarkFormatted: remarkFormatted,
        weather: weather // 添加天气信息
      })
    }
    // 新增：初始化currentMonthDate和calendarMonths
    const calendarMonths = this.generateCalendarMonths(now)
    console.log('initData calendarMonths:', calendarMonths)
    this.setData({
      today,
      tomorrow,
      currentMonth,
      days: this.generateMonthDays(now), // 兼容旧逻辑
      todayWeekday,
      tomorrowWeekday,
      topCards,
      topCardsIndex: 11, // 默认滑到明天
      currentMonthDate: now,
      calendarSwiperIndex: 1,
      calendarMonths: calendarMonths,
      remarks
    }, () => {
      this.loadSchedules(today, tomorrow)
    })
  },
  // 新增：生成三个月的日历
  generateCalendarMonths: function (centerDate) {
    const prevMonth = new Date(centerDate.getFullYear(), centerDate.getMonth() - 1, 1)
    const nextMonth = new Date(centerDate.getFullYear(), centerDate.getMonth() + 1, 1)
    const months = [
      this.generateMonthDays(prevMonth),
      this.generateMonthDays(centerDate),
      this.generateMonthDays(nextMonth)
    ]
    console.log('generateCalendarMonths:', months)
    return months
  },
  // 修改：去掉todayStr参数
  generateMonthDays: function (date) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const days = []
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(date.getFullYear(), date.getMonth(), i)
      const dateStr = util.formatDate(d)
      const lunarStr = util.getLunar(d)
      const solarTerm = util.getSolarTerm(d)
      days.push({
        day: i,
        date: dateStr,
        week: d.getDay(),
        isToday: dateStr === util.formatDate(new Date()),
        lunar: lunarStr,
        solarTerm: solarTerm
      })
    }
    console.log('generateMonthDays for', date, 'result:', days)
    return days
  },
  

  loadSchedules: function (today, tomorrow) {
    const schedules = this.data.schedules || {}
    console.log('主页读取schedules:', schedules)
    this.setData({ schedules }, () => {
      this.updateTodayTomorrowSchedule(today, tomorrow, schedules)
    })
  },
  updateTodayTomorrowSchedule: function (today, tomorrow, schedules) {
    this.setData({
      todaySchedule: (schedules && schedules[today]) || '未排班',
      tomorrowSchedule: (schedules && schedules[tomorrow]) || '未排班'
    })
  },
  navigateToSchedule: function () {
    const { currentMonthDate } = this.data
    const year = currentMonthDate.getFullYear()
    const month = currentMonthDate.getMonth() + 1 // js月份从0开始
    wx.navigateTo({
      url: `/pages/schedule/schedule?year=${year}&month=${month}`
    })
  },
  navigateToSettings: function () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },
  toPinyin: function(str) {
    if (!str) return '';
    if (str.indexOf('早班') !== -1) return 'zaoban';
    if (str.indexOf('休息') !== -1) return 'xiuxi';
    return '';
  },
  // swiper滑动事件，动态补充卡片
  onTopCardsChange: function(e) {
    const current = e.detail.current
    let { topCards, topCardsIndex, schedules, remarks } = this.data
    // 滑到最左，补充前10天
    if (current < 5) {
      const firstDate = new Date(topCards[0].date)
      const weekMap = ['日', '一', '二', '三', '四', '五', '六']
      const newCards = []
      for (let i = -10; i < 0; i++) {
        const d = new Date(firstDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = util.formatDate(d)
        newCards.push({
          date: dateStr,
          weekday: '星期' + weekMap[d.getDay()],
          label: '',
          schedule: schedules[dateStr] || '未排班'
        })
      }
      this.setData({
        topCards: [...newCards, ...topCards],
        topCardsIndex: topCardsIndex + 10
      })
    }
    // 滑到最右，补充后10天
    if (current > topCards.length - 6) {
      const lastDate = new Date(topCards[topCards.length - 1].date)
      const weekMap = ['日', '一', '二', '三', '四', '五', '六']
      const newCards = []
      for (let i = 1; i <= 10; i++) {
        const d = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = util.formatDate(d)
        newCards.push({
          date: dateStr,
          weekday: '星期' + weekMap[d.getDay()],
          label: '',
          schedule: schedules[dateStr] || '未排班'
        })
      }
      this.setData({
        topCards: [...topCards, ...newCards]
      })
    }
  },
  // 新增：日历swiper切换事件
  onCalendarSwiperChange: function(e) {
    const newIndex = e.detail.current
    let { calendarSwiperIndex, currentMonthDate } = this.data
    if (newIndex === calendarSwiperIndex) return
    let newMonthDate
    if (newIndex > calendarSwiperIndex) {
      // 右滑，下个月
      newMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    } else {
      // 左滑，上个月
      newMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    }
    this.setData({
      currentMonthDate: newMonthDate,
      calendarMonths: this.generateCalendarMonths(newMonthDate),
      calendarSwiperIndex: 1,
      currentMonth: util.formatMonth(newMonthDate)
    })
  },
  changeMonth: function(e) {
    const type = e.currentTarget.dataset.type
    let { currentMonthDate } = this.data
    let newDate
    if (type === 'prev') {
      newDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    } else {
      newDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    }
    this.slideBetweenMonths(type)
  },
  // 支持代码内直接切换月份
  changeMonthByType: function(type) {
    let { currentMonthDate } = this.data
    let newDate
    if (type === 'prev') {
      newDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    } else {
      newDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    }
    this.slideBetweenMonths(type)
  },
  // 记录触摸开始位置
  onCalendarTouchStart: function(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY
    })
  },
  // 根据滑动方向切换月份
  onCalendarTouchEnd: function(e) {
    const touch = e.changedTouches && e.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - this.data.touchStartX
    const dy = touch.clientY - this.data.touchStartY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const distanceThreshold = 50 // 水平滑动阈值
    const angleOk = absDx > absDy // 更水平
    if (absDx > distanceThreshold && angleOk) {
      if (dx < 0) {
        this.changeMonthByType('next')
      } else {
        this.changeMonthByType('prev')
      }
    }
  },
  // 双面板滑动，让两个月份首尾相接
  slideBetweenMonths: function(type) {
    const goingPrev = type === 'prev'
    const current = this.data.currentMonthDate
    const leftDate = goingPrev ? new Date(current.getFullYear(), current.getMonth() - 1, 1) : current
    const rightDate = goingPrev ? current : new Date(current.getFullYear(), current.getMonth() + 1, 1)
    const leftDays = this.generateMonthDays(leftDate)
    const rightDays = this.generateMonthDays(rightDate)
    // 开启双面板模式并重置轨道到起点
    this.setData({
      dualMode: true,
      dualLeftDays: leftDays,
      dualRightDays: rightDays,
      calendarTrackAnim: null
    }, () => {
      const width = this.data.windowWidth
      // 初始位置：如果向下一月，则从0滑到-100%；如果向上一月，则先把轨道设到-100%，再滑回0
      if (goingPrev) {
        // 先把轨道放到-100%位置（显示右侧=当前月），再向右滑动回到0（显示左侧=上个月）
        const place = wx.createAnimation({ duration: 0 })
        place.translateX(-width).step()
        this.setData({ calendarTrackAnim: place.export() })
        const anim = wx.createAnimation({ duration: 300, timingFunction: 'ease-in-out' })
        anim.translateX(0).step()
        this.setData({ calendarTrackAnim: anim.export() })
        setTimeout(() => {
          // 完成后设置为上个月
          const newDate = leftDate
          this.setData({
            currentMonthDate: newDate,
            currentMonth: util.formatMonth(newDate),
            days: this.generateMonthDays(newDate),
            dualMode: false
          })
        }, 300)
      } else {
        // 向下一月：从0滑到-100%（左->右）
        const anim = wx.createAnimation({ duration: 300, timingFunction: 'ease-in-out' })
        anim.translateX(-width).step()
        this.setData({ calendarTrackAnim: anim.export() })
        setTimeout(() => {
          const newDate = rightDate
          this.setData({
            currentMonthDate: newDate,
            currentMonth: util.formatMonth(newDate),
            days: this.generateMonthDays(newDate),
            dualMode: false
          })
        }, 300)
      }
    })
  },
  // 使用小程序动画API实现更平滑的“画卷”式月切换
  playCalendarAnimSmooth: function(direction, done) {
    const distance = this.data.windowWidth || 320
    const outX = direction === 'left' ? -distance : distance
    const inX = direction === 'left' ? distance : -distance
    // 离场动画
    const animOut = wx.createAnimation({ duration: 260, timingFunction: 'ease-in-out' })
    animOut.translateX(outX).step()
    this.setData({ calendarAnim: animOut.export() })
    setTimeout(() => {
      if (typeof done === 'function') done()
      // 立即把新内容放到屏外
      const animPlace = wx.createAnimation({ duration: 0 })
      animPlace.translateX(inX).step()
      this.setData({ calendarAnim: animPlace.export() })
      // 进入动画
      setTimeout(() => {
        const animIn = wx.createAnimation({ duration: 280, timingFunction: 'ease-in-out' })
        animIn.translateX(0).step()
        this.setData({ calendarAnim: animIn.export() })
      }, 10)
    }, 260)
  },
  onDayLongPress: function(e) {
    if (this.data.isEmployeeMode) return; // 单人模式禁止修改
    const date = e.currentTarget.dataset.date;
    // 获取所有班制
    let customShifts = wx.getStorageSync('customShifts') || [];
    customShifts = customShifts.map(s => typeof s === 'string' ? s : s.name);
    const allTypeNames = ['清除', '备注', '早班', '休息', '中班'].concat(customShifts.filter(n => n && n !== '早班' && n !== '休息' && n !== '中班'));
    
    // 获取日期元素的位置信息
    const query = wx.createSelectorQuery();
    query.select(`[data-date="${date}"]`).boundingClientRect();
    query.exec((res) => {
      if (res && res[0]) {
        const dateRect = res[0];
        const dateLeft = dateRect.left;
        const dateTop = dateRect.top;
        const dateWidth = dateRect.width;
        const dateHeight = dateRect.height;
        
        // 获取屏幕信息
        const screenInfo = wx.getSystemInfoSync();
        const screenWidth = screenInfo.windowWidth;
        const screenHeight = screenInfo.windowHeight;
        
        // 弹窗尺寸
        const itemHeight = 44;
        const popupPadding = 16;
        const popupWidth = 140;
        const popupHeight = allTypeNames.length * itemHeight + popupPadding * 2;
        const safeMargin = 12;
        const dateSpacing = 15; // 与日期的间距
        
        // 计算弹窗位置：优先显示在日期右侧，空间不够时显示在左侧
        let popupLeft, popupTop;
        
        // 水平位置：优先显示在日期右侧，确保不遮挡日期
        const spaceRight = screenWidth - dateLeft - dateWidth - dateSpacing - popupWidth;
        const spaceLeft = dateLeft - dateSpacing - popupWidth;
        
        if (spaceRight >= 0) {
          // 右侧空间足够，显示在日期右侧
          popupLeft = dateLeft + dateWidth + dateSpacing;
        } else if (spaceLeft >= 0) {
          // 左侧空间足够，显示在日期左侧
          popupLeft = dateLeft - dateSpacing - popupWidth;
        } else {
          // 左右空间都不够，选择空间较大的方向，但确保不遮挡日期
          if (spaceRight > spaceLeft) {
            // 右侧空间稍大，显示在右侧但可能被裁剪
            popupLeft = dateLeft + dateWidth + dateSpacing;
          } else {
            // 左侧空间稍大，显示在左侧但可能被裁剪
            popupLeft = dateLeft - dateSpacing - popupWidth;
          }
        }
        
        // 垂直位置：以日期中心为基准，确保不遮挡日期
        const dateCenterY = dateTop + dateHeight / 2;
        popupTop = dateCenterY - popupHeight / 2;
        
        // 检查弹窗是否会遮挡日期
        const popupRight = popupLeft + popupWidth;
        const popupBottom = popupTop + popupHeight;
        
        // 如果弹窗会遮挡日期，调整垂直位置
        if (popupLeft < dateLeft + dateWidth && popupRight > dateLeft && 
            popupTop < dateTop + dateHeight && popupBottom > dateTop) {
          // 弹窗会遮挡日期，调整到日期上方或下方
          if (dateTop - popupHeight - dateSpacing >= safeMargin) {
            // 显示在日期上方
            popupTop = dateTop - popupHeight - dateSpacing;
          } else if (dateTop + dateHeight + dateSpacing + popupHeight <= screenHeight - safeMargin) {
            // 显示在日期下方
            popupTop = dateTop + dateHeight + dateSpacing;
          }
        }
        
        // 垂直边界检查
        if (popupTop < safeMargin) {
          popupTop = safeMargin;
        } else if (popupTop + popupHeight > screenHeight - safeMargin) {
          popupTop = screenHeight - popupHeight - safeMargin;
        }
        
        // 水平边界检查
        if (popupLeft < safeMargin) {
          popupLeft = safeMargin;
        } else if (popupLeft + popupWidth > screenWidth - safeMargin) {
          popupLeft = screenWidth - popupWidth - safeMargin;
        }
        
        this.setData({
          showTypePopup: true,
          popupX: popupLeft,
          popupY: popupTop,
          popupDate: date,
          allTypeNames
        });
      } else {
        // 如果无法获取元素位置，使用触摸点位置作为备选方案
        this.fallbackToTouchPosition(e, date, allTypeNames);
      }
    });
  },
  
  // 备选方案：使用触摸点位置
  fallbackToTouchPosition: function(e, date, allTypeNames) {
    let clientX = 0, clientY = 0;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.detail) {
      clientX = e.detail.x || e.detail.clientX || 0;
      clientY = e.detail.y || e.detail.clientY || 0;
    }
    
    const res = wx.getSystemInfoSync();
    const screenWidth = res.windowWidth;
    const screenHeight = res.windowHeight;
    
    const itemHeight = 44;
    const popupPadding = 16;
    const popupWidth = 140;
    const popupHeight = allTypeNames.length * itemHeight + popupPadding * 2;
    const safeMargin = 12;
    
    let popupLeft = clientX - popupWidth / 2;
    let popupTop = clientY + 15;
    
    // 边界检查
    if (popupLeft < safeMargin) popupLeft = safeMargin;
    if (popupLeft + popupWidth > screenWidth - safeMargin) popupLeft = screenWidth - popupWidth - safeMargin;
    if (popupTop < safeMargin) popupTop = safeMargin;
    if (popupTop + popupHeight > screenHeight - safeMargin) popupTop = screenHeight - popupHeight - safeMargin;
    
    this.setData({
      showTypePopup: true,
      popupX: popupLeft,
      popupY: popupTop,
      popupDate: date,
      allTypeNames
    });
  },
  onSelectTypeFromPopup: function(e) {
    const type = e.currentTarget.dataset.type;
    const date = this.data.popupDate;
    let schedules = this.data.schedules || {};
    
    if (type === '清除') {
      // 删除该日期的排班
      delete schedules[date];
      
      wx.showToast({
        title: '已清除排班',
        icon: 'success',
        duration: 1000
      });
    } else if (type === '备注') {
      // 显示备注弹窗
      const remarks = this.data.remarks || {};
      this.setData({
        showTypePopup: false,
        showRemarkModal: true,
        remarkDate: date,
        remarkContent: remarks[date] || ''
      });
    } else {
      // 设置排班
      schedules[date] = type;
    }
    
    // 保存到本地
    wx.setStorageSync('schedules', schedules);
    
    // 更新排班数据
    this.setData({ schedules, showTypePopup: false });
    
    // 同步更新上方的每日信息卡片
    this.updateTopCards();
  },
  closeTypePopup: function() {
    this.setData({ showTypePopup: false });
  },
  getAllTypeNames: function() {
    let customShifts = wx.getStorageSync('customShifts') || [];
    customShifts = customShifts.map(s => typeof s === 'string' ? s : s.name);
    return ['早班', '休息', '中班'].concat(customShifts.filter(n => n && n !== '早班' && n !== '休息' && n !== '中班'));
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
  // 更新上方的每日信息卡片
  updateTopCards: function() {
    const schedules = wx.getStorageSync('schedules') || {};
    const remarks = wx.getStorageSync('remarks') || {};
    const now = new Date();
    const weekMap = ['日', '一', '二', '三', '四', '五', '六'];
    
    // 重新生成topCards数据
    const topCards = [];
    for (let i = -10; i <= 10; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = util.formatDate(d);
      const remark = remarks[dateStr] || '';
      
      // 为顶部卡片处理三个字换行
      let remarkFormatted = '';
      if (remark) {
        for (let j = 0; j < remark.length; j++) {
          remarkFormatted += remark[j];
          if ((j + 1) % 3 === 0 && j < remark.length - 1) {
            remarkFormatted += '\n';
          }
        }
      }
      
      topCards.push({
        date: dateStr,
        weekday: '星期' + weekMap[d.getDay()],
        label: i === 0 ? '今天' : (i === 1 ? '明天' : (i === -1 ? '昨天' : '')),
        schedule: schedules[dateStr] || '未排班',
        remarkFormatted: remarkFormatted
      });
    }
    
    this.setData({ topCards, remarks });
  },
  onShareSchedule: function() {
    wx.showLoading({title: '生成图片中...'})
    const ctx = wx.createCanvasContext('shareCanvas', this)
    const { currentMonthDate, days, schedules, nickName } = this.data
    // 背景
    ctx.setFillStyle('#fff')
    ctx.fillRect(0, 0, 700, 900)
    // 昵称
    ctx.setFontSize(28)
    ctx.setFillStyle('#333')
    ctx.fillText(nickName || '微信用户', 40, 60)
    // 年月
    const year = currentMonthDate.getFullYear()
    const month = currentMonthDate.getMonth() + 1
    ctx.setFontSize(24)
    ctx.setFillStyle('#666')
    ctx.fillText(`${year}年${month}月`, 40, 110)
    // 日历表头
    const weekArr = ['日','一','二','三','四','五','六']
    ctx.setFontSize(20)
    for(let i=0;i<7;i++){
      ctx.fillText(weekArr[i], 40 + i*88, 160)
    }
    // 日历内容
    let row = 0, col = 0
    for(let i=0;i<days.length;i++){
      const item = days[i]
      if(item.empty){
        col++
        if(col>=7){col=0;row++}
        continue
      }
      const x = 40 + col*88
      const y = 200 + row*90
      // 数字
      ctx.setFontSize(26)
      ctx.setFillStyle('#222')
      ctx.fillText(item.day+'', x, y)
      // 农历
      ctx.setFontSize(18)
      ctx.setFillStyle('#bfa96c')
      ctx.fillText(item.lunar||'', x, y+28)
      // 排班
      ctx.setFontSize(18)
      ctx.setFillStyle('#007aff')
      const sch = schedules[item.date]||''
      if(sch){
        ctx.fillText(sch, x, y+54)
      }
      col++
      if(col>=7){col=0;row++}
    }
    ctx.draw(false,()=>{
      wx.canvasToTempFilePath({
        canvasId:'shareCanvas',
        success:res=>{
          wx.hideLoading()
          wx.previewImage({urls:[res.tempFilePath]})
        },
        fail:()=>{wx.hideLoading();wx.showToast({title:'生成失败',icon:'none'})}
      },this)
    })
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
  // 备注输入框获得焦点
  onRemarkFocus: function(e) {
    // 输入框获得焦点时，键盘会自动弹出
    // keyboardHeight 会通过 onKeyboardHeightChange 自动更新
  },
  // 备注输入框失去焦点
  onRemarkBlur: function(e) {
    // 输入框失去焦点时，键盘会自动收起
    // keyboardHeight 会通过 onKeyboardHeightChange 自动更新为 0
  },
  saveRemark: function() {
    const { remarkDate, remarkContent, remarks } = this.data;
    if (remarkContent.trim()) {
      // 保存原始备注内容（不进行三个字换行处理）
      remarks[remarkDate] = remarkContent.trim();
      
      // 保存到本地
      wx.setStorageSync('remarks', remarks);
      this.setData({ remarks, showRemarkModal: false });
      // 更新顶部卡片
      this.updateTopCards();
      wx.showToast({ title: '备注已保存', icon: 'success' });
    } else {
      wx.showToast({ title: '请输入备注内容', icon: 'none' });
    }
  },
  deleteRemark: function() {
    const { remarkDate, remarks } = this.data;
    delete remarks[remarkDate];
    
    // 保存到本地
    wx.setStorageSync('remarks', remarks);
    this.setData({ remarks, showRemarkModal: false });
    wx.showToast({ title: '备注已删除', icon: 'success' });
  },
  // 点击日期（支持单击弹备注、双击跳转）
  onDayTap: function(e) {
    const date = e.currentTarget.dataset.date;
    const currentTime = new Date().getTime();
    const { lastTapTime, lastTapDate, tapTimer, remarks } = this.data;

    // 清除上一次的定时器
    if (tapTimer) {
      clearTimeout(tapTimer);
      this.setData({ tapTimer: null });
    }

    // 检查是否为双击（同一日期，时间间隔小于600ms）
    if (date === lastTapDate && currentTime - lastTapTime < 600) {
      this.jumpToDate(date);
      this.setData({
        lastTapTime: 0,
        lastTapDate: '',
        tapTimer: null
      });
      return;
    }

    // 单击事件 - 延迟执行，等待是否有第二次点击
    const timer = setTimeout(() => {
      // 只有有备注的日期才弹出备注编辑面板
      if (remarks[date]) {
        this.setData({
          showRemarkModal: true,
          remarkDate: date,
          remarkContent: remarks[date] || '',
          tapTimer: null
        });
      } else {
        // 没有备注的日期，只清除定时器
        this.setData({ tapTimer: null });
      }
    }, 350);

    this.setData({
      lastTapTime: currentTime,
      lastTapDate: date,
      tapTimer: timer
    });
  },

  // 跳转到指定日期（无Toast）
  jumpToDate: function(date) {
    const { topCards } = this.data;
    let targetIndex = -1;
    for (let i = 0; i < topCards.length; i++) {
      if (topCards[i].date === date) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex !== -1) {
      this.setData({
        topCardsIndex: targetIndex
      });
    } else {
      this.generateTopCardsForDate(date);
    }
  },
  
  // 为目标日期生成新的topCards
  generateTopCardsForDate: function(targetDate) {
    const targetTime = new Date(targetDate).getTime();
    const now = new Date();
    const weekMap = ['日', '一', '二', '三', '四', '五', '六'];
    const schedules = this.data.schedules || {};
    const remarks = this.data.remarks || {};
    
    // 重新生成topCards，以目标日期为中心
    const topCards = [];
    for (let i = -10; i <= 10; i++) {
      const d = new Date(targetTime + i * 24 * 60 * 60 * 1000);
      const dateStr = util.formatDate(d);
      const remark = remarks[dateStr] || '';
      
      // 为顶部卡片处理三个字换行
      let remarkFormatted = '';
      if (remark) {
        for (let j = 0; j < remark.length; j++) {
          remarkFormatted += remark[j];
          if ((j + 1) % 3 === 0 && j < remark.length - 1) {
            remarkFormatted += '\n';
          }
        }
      }
      
      topCards.push({
        date: dateStr,
        weekday: '星期' + weekMap[d.getDay()],
        label: i === 0 ? '今天' : (i === 1 ? '明天' : (i === -1 ? '昨天' : '')),
        schedule: schedules[dateStr] || '未排班',
        remarkFormatted: remarkFormatted
      });
    }
    
    this.setData({
      topCards: topCards,
      topCardsIndex: 10 // 目标日期在中间位置
    });
    
    wx.showToast({
      title: `已跳转到${targetDate}`,
      icon: 'success',
      duration: 1500
    });
  },
  // 获取天气信息
  getWeatherInfo: function() {
    // 从本地存储获取城市信息，默认北京
    let city = wx.getStorageSync('weatherCity') || '北京'
    this.fetchWeatherData(city)
  },
  
  // 获取用户位置 - 移除定位功能
  getUserLocation: function() {
    // 不再请求定位，直接使用默认城市
    this.fetchWeatherData('北京')
  },
  
  // 根据经纬度获取城市名称 - 简化处理
  getCityByLocation: function(latitude, longitude) {
    // 不再使用定位，直接使用默认城市
    this.fetchWeatherData('北京')
  },
  
  // 获取天气数据
  fetchWeatherData: function(city) {
    console.log('开始获取天气数据，城市:', city)
    
    // 先尝试获取城市ID，然后获取天气
    this.getCityId(city, (cityId) => {
      if (cityId) {
        this.getWeatherByCityId(cityId, city)
      } else {
        // 城市ID获取失败，使用模拟数据
        this.showWeatherError('城市信息获取失败')
      }
    })
  },
  
  // 获取城市ID
  getCityId: function(city, callback) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    // 使用正确的城市搜索API路径
    const searchUrl = `https://${apiHost}/geo/v2/city/lookup?location=${city}&range=cn&number=5`
    
    console.log('城市查询API地址:', searchUrl)
    console.log('使用的API Key:', apiKey)
    
    // 尝试不同的认证方式
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // 方式1：Bearer token
    headers['Authorization'] = `Bearer ${apiKey}`
    
    wx.request({
      url: searchUrl,
      method: 'GET',
      header: headers,
      success: (res) => {
        console.log('城市查询响应状态码:', res.statusCode)
        console.log('城市查询响应:', res.data)
        
        if (res.statusCode === 200 && res.data && res.data.code === '200' && res.data.location && res.data.location.length > 0) {
          // 选择排名最高的城市（Rank值最小）
          const bestMatch = res.data.location.reduce((prev, current) => 
            (prev.rank < current.rank) ? prev : current
          )
          const cityId = bestMatch.id
          console.log('获取到城市ID:', cityId, '城市名称:', bestMatch.name)
          callback(cityId)
        } else if (res.statusCode === 401) {
          console.log('认证失败，尝试其他认证方式')
          // 尝试方式2：直接使用API Key作为参数
          this.getCityIdWithKeyParam(city, callback)
        } else {
          console.log('城市查询失败:', res.data)
          callback(null)
        }
      },
      fail: (err) => {
        console.log('城市查询请求失败:', err)
        // 尝试方式2：直接使用API Key作为参数
        this.getCityIdWithKeyParam(city, callback)
      }
    })
  },
  
  // 方式2：使用API Key作为查询参数
  getCityIdWithKeyParam: function(city, callback) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    const searchUrl = `https://${apiHost}/geo/v2/city/lookup?location=${city}&range=cn&number=5&key=${apiKey}`
    
    console.log('尝试方式2 - 城市查询API地址:', searchUrl)
    
    wx.request({
      url: searchUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('方式2城市查询响应状态码:', res.statusCode)
        console.log('方式2城市查询响应:', res.data)
        
        if (res.statusCode === 200 && res.data && res.data.code === '200' && res.data.location && res.data.location.length > 0) {
          // 选择排名最高的城市（Rank值最小）
          const bestMatch = res.data.location.reduce((prev, current) => 
            (prev.rank < current.rank) ? prev : current
          )
          const cityId = bestMatch.id
          console.log('方式2获取到城市ID:', cityId, '城市名称:', bestMatch.name)
          callback(cityId)
        } else {
          console.log('方式2城市查询也失败:', res.data)
          callback(null)
        }
      },
      fail: (err) => {
        console.log('方式2城市查询请求失败:', err)
        callback(null)
      }
    })
  },
  
  // 根据城市ID获取天气
  getWeatherByCityId: function(cityId, cityName) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    
    // 先获取实时天气（当天）
    this.getRealTimeWeather(cityId, cityName, () => {
      // 实时天气获取成功后，再获取7天预报
      this.getWeeklyForecast(cityId, cityName)
    })
  },
  
  // 获取实时天气（当天）
  getRealTimeWeather: function(cityId, cityName, callback) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    const nowUrl = `https://${apiHost}/v7/weather/now?location=${cityId}`
    
    console.log('实时天气API地址:', nowUrl)
    console.log('使用的API Key:', apiKey)
    
    // 尝试不同的认证方式
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // 方式1：Bearer token
    headers['Authorization'] = `Bearer ${apiKey}`
    
    wx.request({
      url: nowUrl,
      method: 'GET',
      header: headers,
      success: (res) => {
        console.log('实时天气响应状态码:', res.statusCode)
        console.log('实时天气API响应:', res.data)
        
        if (res.statusCode === 200 && res.data && res.data.code === '200' && res.data.now) {
          const nowWeather = res.data.now
          console.log('实时天气数据:', nowWeather)
          
          // 更新实时天气数据
          this.setData({
            city: cityName,
            realTimeWeather: {
              temp: nowWeather.temp,
              feelsLike: nowWeather.feelsLike,
              icon: nowWeather.icon,
              text: nowWeather.text,
              humidity: nowWeather.humidity,
              windDir: nowWeather.windDir,
              windScale: nowWeather.windScale
            }
          })
          
          console.log('实时天气数据更新成功')
          
          // 调用回调函数，继续获取7天预报
          if (callback) callback()
        } else if (res.statusCode === 401) {
          console.log('实时天气认证失败，尝试其他认证方式')
          this.getRealTimeWeatherWithKeyParam(cityId, cityName, callback)
        } else {
          console.log('实时天气API返回错误:', res.data)
          this.showWeatherError('实时天气获取失败')
        }
      },
      fail: (err) => {
        console.log('请求实时天气API失败:', err)
        this.getRealTimeWeatherWithKeyParam(cityId, cityName, callback)
      }
    })
  },
  
  // 方式2：使用API Key作为查询参数获取实时天气
  getRealTimeWeatherWithKeyParam: function(cityId, cityName, callback) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    const nowUrl = `https://${apiHost}/v7/weather/now?location=${cityId}&key=${apiKey}`
    
    console.log('尝试方式2 - 实时天气API地址:', nowUrl)
    
    wx.request({
      url: nowUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('方式2实时天气响应状态码:', res.statusCode)
        console.log('方式2实时天气API响应:', res.data)
        
        if (res.statusCode === 200 && res.data && res.data.code === '200' && res.data.now) {
          const nowWeather = res.data.now
          console.log('方式2实时天气数据:', nowWeather)
          
          // 更新实时天气数据
          this.setData({
            city: cityName,
            realTimeWeather: {
              temp: nowWeather.temp,
              feelsLike: nowWeather.feelsLike,
              icon: nowWeather.icon,
              text: nowWeather.text,
              humidity: nowWeather.humidity,
              windDir: nowWeather.windDir,
              windScale: nowWeather.windScale
            }
          })
          
          console.log('方式2实时天气数据更新成功')
          
          // 调用回调函数，继续获取7天预报
          if (callback) callback()
        } else {
          console.log('方式2实时天气查询也失败:', res.data)
          this.showWeatherError('实时天气获取失败')
        }
      },
      fail: (err) => {
        console.log('方式2实时天气查询请求失败:', err)
        this.showWeatherError('实时天气获取失败')
      }
    })
  },
  
  // 获取7天预报（明天及之后）
  getWeeklyForecast: function(cityId, cityName) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    const forecastUrl = `https://${apiHost}/v7/weather/7d?location=${cityId}`
    
    console.log('7天预报API地址:', forecastUrl)
    
    // 尝试不同的认证方式
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // 方式1：Bearer token
    headers['Authorization'] = `Bearer ${apiKey}`
    
    wx.request({
      url: forecastUrl,
      method: 'GET',
      header: headers,
      success: (res) => {
        console.log('7天预报响应状态码:', res.statusCode)
        console.log('7天预报API响应:', res.data)
        
        if (res.statusCode === 200 && res.data && res.data.code === '200' && res.data.daily && res.data.daily.length > 0) {
          const weeklyWeather = res.data.daily
          console.log('7天预报数据:', weeklyWeather)
          
          // 更新7天预报数据
          this.setData({
            weeklyWeather: weeklyWeather
          })
          
          // 保存城市信息到本地存储
          wx.setStorageSync('weatherCity', cityName)
          console.log('7天预报数据更新成功')
          
          // 重新生成topCards以显示天气信息
          this.refreshTopCards()
          
          // 显示成功提示
          wx.showToast({
            title: '天气数据更新成功',
            icon: 'success',
            duration: 1500
          })
        } else if (res.statusCode === 401) {
          console.log('7天预报认证失败，尝试其他认证方式')
          this.getWeeklyForecastWithKeyParam(cityId, cityName)
        } else {
          console.log('7天预报API返回错误:', res.data)
          this.showWeatherError('7天预报获取失败')
        }
      },
      fail: (err) => {
        console.log('请求7天预报API失败:', err)
        this.getWeeklyForecastWithKeyParam(cityId, cityName)
      }
    })
  },
  
  // 方式2：使用API Key作为查询参数获取7天预报
  getWeeklyForecastWithKeyParam: function(cityId, cityName) {
    const apiKey = '7d43dc938940457ebaf8bc558926eed1'
    const apiHost = 'jc5b64je46.re.qweatherapi.com'
    const forecastUrl = `https://${apiHost}/v7/weather/7d?location=${cityId}&key=${apiKey}`
    
    console.log('尝试方式2 - 7天预报API地址:', forecastUrl)
    
    wx.request({
      url: forecastUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('方式2 7天预报响应状态码:', res.statusCode)
        console.log('方式2 7天预报API响应:', res.data)
        
        if (res.statusCode === 200 && res.data && res.data.code === '200' && res.data.daily && res.data.daily.length > 0) {
          const weeklyWeather = res.data.daily
          console.log('方式2 7天预报数据:', weeklyWeather)
          
          // 更新7天预报数据
          this.setData({
            weeklyWeather: weeklyWeather
          })
          
          // 保存城市信息到本地存储
          wx.setStorageSync('weatherCity', cityName)
          console.log('方式2 7天预报数据更新成功')
          
          // 重新生成topCards以显示天气信息
          this.refreshTopCards()
          
          // 显示成功提示
          wx.showToast({
            title: '天气数据更新成功',
            icon: 'success',
            duration: 1500
          })
        } else {
          console.log('方式2 7天预报查询也失败:', res.data)
          this.showWeatherError('7天预报获取失败')
        }
      },
      fail: (err) => {
        console.log('方式2 7天预报查询请求失败:', err)
        this.showWeatherError('7天预报获取失败')
      }
    })
  },
  
  // 显示天气错误提示
  showWeatherError: function(message) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    })
    
    // 清空天气数据
    this.setData({
      weatherIcon: '❌',
      temperature: '--',
      weatherDesc: '获取失败',
      city: '未知',
      weeklyWeather: [],
      realTimeWeather: null
    })
  },
  
  // 获取指定天数的日期字符串
  getDateString: function(dayOffset) {
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },
  
  // 根据天气代码获取天气图标
  getWeatherIcon: function(iconCode) {
    const iconMap = {
      // 晴天
      '100': '☀️',
      // 多云
      '101': '🌤️', '102': '⛅', '103': '🌥️',
      // 阴天
      '104': '☁️',
      // 雨
      '150': '🌦️', '151': '🌧️', '152': '🌨️', '153': '🌩️',
      // 雪
      '250': '🌨️', '251': '❄️', '252': '🌨️', '253': '❄️',
      // 雾霾
      '300': '🌫️', '301': '🌫️', '302': '🌫️', '303': '🌫️',
      // 风
      '400': '💨', '401': '💨', '402': '💨', '403': '💨',
      // 其他
      '500': '🌤️', '501': '🌤️', '502': '🌤️', '503': '🌤️',
      '504': '🌤️', '505': '🌤️', '506': '🌤️', '507': '🌤️',
      '508': '🌤️', '509': '🌤️', '510': '🌤️', '511': '🌤️',
      '512': '🌤️', '513': '🌤️', '514': '🌤️', '515': '🌤️'
    }
    return iconMap[iconCode] || '🌤️'
  },
  
  // 手动设置城市
  setWeatherCity: function(cityName) {
    this.setData({ city: cityName })
    this.fetchWeatherData(cityName)
  },
  
  // 显示城市选择器
  showCitySelector: function() {
    this.setData({
      showCityModal: true,
      cityInputValue: '',
      cityInputPlaceholder: '请输入城市名称（如：北京、上海、广州）'
    })
  },
  closeCityModal: function() {
    this.setData({ showCityModal: false })
  },
  onCityInputFocus: function() {
    // 聚焦时清空占位提示，避免与用户输入混淆
    this.setData({ cityInputPlaceholder: '' })
  },
  onCityInputBlur: function() {
    // 若未输入内容，则恢复提示语
    if (!this.data.cityInputValue) {
      this.setData({ cityInputPlaceholder: '请输入城市名称（如：北京、上海、广州）' })
    }
  },
  onCityInputChange: function(e) {
    this.setData({ cityInputValue: (e.detail.value || '').trim() })
  },
  confirmCityInput: function() {
    const cityName = this.data.cityInputValue
    if (!cityName) {
      wx.showToast({ title: '请输入城市名称', icon: 'none' })
      return
    }
    this.setData({ showCityModal: false })
    this.setWeatherCity(cityName)
    wx.showToast({ title: `已切换到${cityName}`, icon: 'success', duration: 1200 })
  },

  // 重新生成topCards以显示天气信息
  refreshTopCards: function() {
    const now = new Date();
    const weekMap = ['日', '一', '二', '三', '四', '五', '六'];
    const schedules = this.data.schedules || {};
    const remarks = this.data.remarks || {};

    // 重新生成topCards数据
    const topCards = [];
    for (let i = -10; i <= 10; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = util.formatDate(d);
      const remark = remarks[dateStr] || '';
      
      // 为顶部卡片处理三个字换行
      let remarkFormatted = '';
      if (remark) {
        for (let j = 0; j < remark.length; j++) {
          remarkFormatted += remark[j];
          if ((j + 1) % 3 === 0 && j < remark.length - 1) {
            remarkFormatted += '\n';
          }
        }
      }
      
      // 获取对应日期的天气信息
      const weather = this.getWeatherForTopCard(dateStr);
      
      topCards.push({
        date: dateStr,
        weekday: '星期' + weekMap[d.getDay()],
        label: i === 0 ? '今天' : (i === 1 ? '明天' : (i === -1 ? '昨天' : '')),
        schedule: schedules[dateStr] || '未排班',
        remarkFormatted: remarkFormatted,
        weather: weather // 添加天气信息
      });
    }
    
    this.setData({ topCards, remarks });
  },
  // 根据日期获取对应的天气信息（用于顶部卡片）
  getWeatherForTopCard: function(date) {
    const today = util.formatDate(new Date())
    const realTimeWeather = this.data.realTimeWeather
    const weeklyWeather = this.data.weeklyWeather || []
    
    // 如果是今天，返回实时天气
    if (date === today) {
      if (realTimeWeather) {
        return {
          type: 'realtime',
          temp: realTimeWeather.temp,
          icon: realTimeWeather.icon,
          text: realTimeWeather.text,
          feelsLike: realTimeWeather.feelsLike
        }
      }
      return null
    }
    
    // 如果是明天及之后，返回预报天气
    if (weeklyWeather.length > 0) {
      const weather = weeklyWeather.find(item => item.fxDate === date)
      if (weather) {
        return {
          type: 'forecast',
          tempMax: weather.tempMax,
          tempMin: weather.tempMin,
          icon: weather.iconDay,
          text: weather.textDay
        }
      }
    }
    
    return null
  }
})
