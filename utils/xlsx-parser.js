// xlsx解析工具 - 支持格式转换和员工识别

// 加载xlsx库
const XLSX = require('./xlsx.full.min.js');

// 解析Excel文件
function parseExcel(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      success: (res) => {
        try {
          // 将Buffer转换为ArrayBuffer
          const buffer = res.data
          const data = new Uint8Array(buffer)
          
          // 使用xlsx解析
          const workbook = XLSX.read(data, { type: 'array' })
          
          // 获取第一个可见的工作表
          const sheetName = getFirstVisibleSheet(workbook)
          console.log('选择的工作表:', sheetName)
          
          if (!sheetName) {
            reject(new Error('未找到可见的工作表'))
            return
          }
          
          const worksheet = workbook.Sheets[sheetName]
          
          // 转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false
          })
          
          resolve(jsonData)
        } catch (error) {
          console.error('解析Excel失败:', error)
          reject(error)
        }
      },
      fail: (err) => {
        console.error('读取文件失败:', err)
        reject(err)
      }
    })
  })
}

// 获取第一个可见的工作表
function getFirstVisibleSheet(workbook) {
  // 遍历所有工作表，找到第一个可见的
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const sheetState = sheet['!scope'] ? sheet['!scope'].state : 'visible'
    
    // visible表示可见，hidden表示隐藏，veryHidden表示超隐藏
    if (sheetState !== 'hidden' && sheetState !== 'veryHidden') {
      console.log(`工作表 ${sheetName} 状态: ${sheetState}`)
      return sheetName
    }
    console.log(`工作表 ${sheetName} 已隐藏，跳过`)
  }
  
  // 如果都隐藏了，返回第一个
  console.log('所有工作表都隐藏，使用第一个:', workbook.SheetNames[0])
  return workbook.SheetNames[0]
}

// 解析Excel数据为排班格式
function parseExcelData(excelData) {
  console.log('=== 开始解析Excel数据 ===')
  console.log('原始数据行数:', excelData.length)
  console.log('表头:', excelData[0])
  
  if (!excelData || excelData.length < 2) {
    console.log('错误：数据为空或行数不足')
    return null
  }
  
  // 获取表头
  const headers = excelData[0]
  if (!headers || headers.length < 2) {
    console.log('错误：表头为空或列数不足')
    return null
  }
  
  // 查找姓名列和日期列的起始位置
  const { nameColumnIndex, dateStartIndex, dateHeaders } = analyzeHeaders(headers)
  
  console.log('分析结果：')
  console.log('  姓名列索引:', nameColumnIndex)
  console.log('  日期起始索引:', dateStartIndex)
  console.log('  日期表头数量:', dateHeaders.length)
  console.log('  日期表头:', dateHeaders)
  
  if (dateHeaders.length === 0) {
    console.log('错误：未找到日期列')
    return null
  }
  
  // 解析员工和排班数据
  const employees = []
  const schedules = {}
  const currentYearMonth = getCurrentYearMonth()
  
  console.log('开始解析员工数据，总行数:', excelData.length - 1)
  
  for (let i = 1; i < excelData.length; i++) {
    const row = excelData[i]
    console.log(`\n第${i}行数据:`, row)
    
    if (!row || row.length < dateStartIndex + 1) {
      console.log(`  跳过：数据不完整`)
      continue
    }
    
    // 获取姓名（从指定列）
    const nameValue = row[nameColumnIndex]
    console.log(`  姓名列值[${nameColumnIndex}]:`, nameValue)
    
    const employeeName = extractChineseName(String(nameValue))
    console.log(`  提取的姓名:`, employeeName)
    
    // 如果没有识别到姓名，跳过该行
    if (!employeeName) {
      // 检查是否是汇总行
      if (isSummaryRow(row)) {
        console.log(`  跳过：汇总行`)
        continue
      }
      // 尝试从第一列提取姓名
      const altName = extractChineseName(String(row[0]))
      console.log(`  从第一列尝试提取姓名:`, altName)
      if (!altName) {
        console.log(`  跳过：未识别到姓名`)
        continue
      }
      employeeName = altName
    }
    
    // 跳过重复员工
    if (employees.includes(employeeName)) {
      console.log(`  跳过：重复员工 ${employeeName}`)
      continue
    }
    
    employees.push(employeeName)
    schedules[employeeName] = {}
    console.log(`  添加员工: ${employeeName}`)
    
    // 获取排班年月（从第三列）
    let yearMonth = currentYearMonth
    if (row[2]) {
      const ym = String(row[2]).trim()
      if (ym.match(/^\d{4}-\d{1,2}$/)) {
        yearMonth = ym
        console.log(`  排班年月: ${yearMonth}`)
      }
    }
    
    // 解析该行的排班数据
    console.log(`  日期起始索引: ${dateStartIndex}, 日期表头数量: ${dateHeaders.length}`)
    let dateIndex = 0
    let shiftCount = 0
    for (let j = dateStartIndex; j < row.length && dateIndex < dateHeaders.length; j++) {
      const shiftText = String(row[j] || '').trim()
      if (dateHeaders[dateIndex]) {
        const normalizedShift = normalizeShiftName(shiftText)
        console.log(`    列${j}: '${shiftText}' -> 标准化后: ${normalizedShift}`)
        if (normalizedShift) {
          const fullDate = formatDate(yearMonth, dateHeaders[dateIndex])
          schedules[employeeName][fullDate] = normalizedShift
          shiftCount++
          console.log(`    -> 添加排班: ${fullDate} = ${normalizedShift}`)
        }
      }
      dateIndex++
    }
    console.log(`  该行共添加 ${shiftCount} 条排班记录`)
  }
  
  if (employees.length === 0) {
    console.log('解析完成：未找到任何员工')
    return null
  }
  
  console.log('=== 解析完成 ===')
  console.log('识别到的员工:', employees)
  console.log('排班数据:', schedules)
  
  return {
    employees,
    schedules,
    shiftTypes: ['早班', '休息', '中班', '晚班']
  }
}

// 分析表头结构
function analyzeHeaders(headers) {
  let nameColumnIndex = 0 // 默认第一列
  let dateStartIndex = 1  // 默认第二列开始
  const dateHeaders = []
  
  console.log('分析表头:', headers)
  
  // 查找姓名列（优先匹配"姓名"，避免误识别"人员工号"）
  for (let i = 0; i < Math.min(5, headers.length); i++) {
    const header = String(headers[i]).trim()
    // 优先匹配"姓名"，避免将"人员工号"误认为姓名列
    if (header === '姓名' || header.includes('姓名') && !header.includes('工号') && !header.includes('编号')) {
      nameColumnIndex = i
      console.log(`找到姓名列在索引 ${i}: ${header}`)
      break
    }
  }
  
  // 查找日期列开始位置
  // 跳过前几列（人员工号、姓名、排班年月等）
  let startFound = false
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).trim()
    
    console.log(`检查第${i}列: '${header}'`)
    
    // 如果找到"1"开始的日期，标记开始
    if (!startFound && /^1$/.test(header)) {
      startFound = true
      dateStartIndex = i
      console.log(`找到日期起始列在索引 ${i}`)
    }
    
    // 收集日期列
    if (startFound && isValidDateHeader(header)) {
      dateHeaders.push(header)
      console.log(`添加日期: '${header}'`)
    }
    
    // 如果遇到"早班"、"中班"等班次统计列，停止
    if (header.includes('班') && !/^\d+$/.test(header)) {
      console.log(`遇到班次统计列，停止: ${header}`)
      break
    }
  }
  
  // 如果没有找到日期列，尝试备用方案：查找连续的数字列
  if (dateHeaders.length === 0) {
    console.log('未找到日期列，尝试备用方案')
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim()
      if (/^\d{1,2}$/.test(header)) {
        const num = parseInt(header)
        if (num >= 1 && num <= 31) {
          if (dateHeaders.length === 0 || parseInt(dateHeaders[dateHeaders.length - 1]) + 1 === num) {
            dateHeaders.push(header)
            if (dateHeaders.length === 1) {
              dateStartIndex = i
              console.log(`备用方案：找到日期起始列在索引 ${i}`)
            }
            console.log(`备用方案添加日期: '${header}'`)
          }
        }
      }
    }
  }
  
  return { nameColumnIndex, dateStartIndex, dateHeaders }
}

// 检查是否是汇总行
function isSummaryRow(row) {
  if (!row || row.length === 0) return true
  
  // 检查是否是空行（所有元素都是空）
  const allEmpty = row.every(cell => {
    const val = String(cell || '').trim()
    return val === '' || val === 'undefined' || val === 'null'
  })
  if (allEmpty) return true
  
  // 检查任意列是否包含汇总行标记
  const summaryMarkers = ['合计', '总计', '早', '中', '晚', '休息']
  
  for (let i = 0; i < Math.min(5, row.length); i++) {
    const value = String(row[i] || '').trim()
    if (summaryMarkers.some(marker => value === marker)) {
      return true
    }
  }
  
  return false
}

// 获取当前年月
function getCurrentYearMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// 格式化日期
function formatDate(yearMonth, day) {
  const parts = yearMonth.split('-')
  const year = parts[0]
  const month = String(parts[1]).padStart(2, '0')
  const dayPadded = String(day).padStart(2, '0')
  return `${year}-${month}-${dayPadded}`
}

// 提取汉字姓名（只保留汉字）
function extractChineseName(text) {
  if (!text) return null
  
  const str = String(text).trim()
  // 提取连续的汉字
  const chineseMatch = str.match(/[\u4e00-\u9fa5]{2,}/)
  
  if (chineseMatch) {
    const name = chineseMatch[0]
    // 验证是否为有效姓名（2-4个汉字）
    if (name.length >= 2 && name.length <= 4) {
      return name
    }
  }
  
  return null
}

// 检查是否是有效的日期表头
function isValidDateHeader(header) {
  if (!header) return false
  
  const datePatterns = [
    /^\d{4}-\d{1,2}-\d{1,2}$/,
    /^\d{4}\/\d{1,2}\/\d{1,2}$/,
    /^(\d{1,2}[-\/]\d{1,2})$/,
    /^\d{1,2}$/
  ]
  
  return datePatterns.some(pattern => pattern.test(header.trim()))
}

// 标准化班次名称（支持格式转换）
function normalizeShiftName(text) {
  if (!text) return null
  
  const t = text.trim()
  
  // 检查是否是数字（统计数据），跳过
  if (/^\d+$/.test(t)) return null
  
  // 早班识别
  if (t === '早' || t === '早班' || t === '早班8H' || t === '8H') return '早班'
  if (t.match(/^8[Hh]$/) || t.match(/^8小时$/)) return '早班'
  
  // 中班识别（包括"8H中"格式）
  if (t === '中' || t === '中班') return '中班'
  if (t.match(/^中[班]?$/) || t.match(/^16[Hh]$/)) return '中班'
  if (t.includes('8H') && t.includes('中')) return '中班'
  
  // 晚班识别
  if (t === '晚' || t === '晚班') return '晚班'
  if (t.match(/^晚[班]?$/) || t.match(/^24[Hh]$/)) return '晚班'
  
  // 休息识别（xx为休息）
  if (t === '休' || t === '休息') return '休息'
  if (t === 'xx' || t === 'XX' || t === '××' || t === '--') return '休息'
  if (t.match(/^休[息]?$/) || t.match(/^放假$/)) return '休息'
  if (t === '请假' || t === '事假' || t === '病假') return '休息'
  
  // 放假识别
  if (t === '假' || t === '放假' || t === '休假') return '放假'
  
  return null
}

module.exports = {
  parseExcel,
  parseExcelData
}