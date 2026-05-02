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

// 读取Excel文件并返回工作表列表
function readExcelWithSheets(filePath) {
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
          
          // 获取所有工作表名称列表
          const sheetList = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name]
            const sheetState = sheet['!scope'] ? sheet['!scope'].state : 'visible'
            return {
              name: name,
              state: sheetState,
              isVisible: sheetState !== 'hidden' && sheetState !== 'veryHidden'
            }
          })
          
          resolve({ workbook, sheetList })
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
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const sheetState = sheet['!scope'] ? sheet['!scope'].state : 'visible'
    
    if (sheetState !== 'hidden' && sheetState !== 'veryHidden') {
      return sheetName
    }
  }
  
  return workbook.SheetNames[0]
}

// 根据工作表名称读取数据
function readSheetData(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName]
  
  // 转换为JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false
  })
  
  return jsonData
}

// 解析Excel数据为排班格式
function parseExcelData(excelData) {
  if (!excelData || excelData.length < 2) {
    return null
  }
  
  const headers = excelData[0]
  if (!headers || headers.length < 2) {
    return null
  }
  
  const { nameColumnIndex, dateStartIndex, dateHeaders, yearMonth } = analyzeHeaders(headers)
  
  if (dateHeaders.length === 0) {
    return null
  }
  
  const employees = []
  const schedules = {}
  const defaultYearMonth = yearMonth || getCurrentYearMonth()
  
  for (let i = 1; i < excelData.length; i++) {
    const row = excelData[i]
    
    if (!row || row.length < 2) {
      continue
    }
    
    // 跳过汇总行
    if (isSummaryRow(row)) {
      continue
    }
    
    // 查找该行的姓名
    let employeeName = null
    
    // 遍历该行的所有列，查找汉字姓名
    for (let col = 0; col < row.length; col++) {
      const cellValue = String(row[col] || '').trim()
      const name = extractChineseName(cellValue)
      if (name) {
        employeeName = name
        break
      }
    }
    
    if (!employeeName) {
      continue
    }
    
    // 跳过重复员工
    if (employees.includes(employeeName)) {
      continue
    }
    
    employees.push(employeeName)
    schedules[employeeName] = {}
    
    // 尝试获取该行的年月信息
    let currentYearMonth = defaultYearMonth
    for (let col = 0; col < Math.min(5, row.length); col++) {
      const cellValue = String(row[col] || '').trim()
      if (cellValue.match(/^\d{4}[-/]\d{1,2}$/)) {
        currentYearMonth = cellValue.replace('/', '-')
        break
      }
    }
    
    // 解析该行的排班数据（从日期列开始）
    for (let j = dateStartIndex; j < row.length && j - dateStartIndex < dateHeaders.length; j++) {
      const shiftText = String(row[j] || '').trim()
      const dateIndex = j - dateStartIndex
      if (dateHeaders[dateIndex]) {
        const normalizedShift = normalizeShiftName(shiftText)
        if (normalizedShift) {
          const fullDate = formatDate(currentYearMonth, dateHeaders[dateIndex])
          schedules[employeeName][fullDate] = normalizedShift
        }
      }
    }
  }
  
  if (employees.length === 0) {
    return null
  }
  
  return {
    employees,
    schedules,
    shiftTypes: ['早班', '休息', '中班', '晚班']
  }
}

// 分析表头结构
function analyzeHeaders(headers) {
  let nameColumnIndex = 0
  let dateStartIndex = 1
  const dateHeaders = []
  let yearMonth = null
  
  // 查找姓名列
  for (let i = 0; i < Math.min(5, headers.length); i++) {
    const header = String(headers[i]).trim()
    if (header === '姓名' || header.includes('姓名') && !header.includes('工号') && !header.includes('编号')) {
      nameColumnIndex = i
      break
    }
  }
  
  // 查找年月信息（可能在表头的任意位置）
  for (let i = 0; i < Math.min(10, headers.length); i++) {
    const header = String(headers[i]).trim()
    const ymMatch = header.match(/(\d{4})[-/](\d{1,2})/)
    if (ymMatch) {
      yearMonth = `${ymMatch[1]}-${ymMatch[2].padStart(2, '0')}`
      break
    }
  }
  
  // 如果表头没有年月，尝试从第一行的非日期列中查找
  if (!yearMonth && headers.length > 0) {
    // 在前几个表头中查找年月
    for (let i = 0; i < Math.min(10, headers.length); i++) {
      const header = String(headers[i]).trim()
      if (/^\d{4}[-/]\d{1,2}$/.test(header)) {
        yearMonth = header.replace('/', '-')
        break
      }
    }
  }
  
  let startFound = false
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).trim()
    
    if (!startFound && /^1$/.test(header)) {
      startFound = true
      dateStartIndex = i
    }
    
    if (startFound && isValidDateHeader(header)) {
      dateHeaders.push(header)
    }
    
    if (header.includes('班') && !/^\d+$/.test(header)) {
      break
    }
  }
  
  if (dateHeaders.length === 0) {
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim()
      if (/^\d{1,2}$/.test(header)) {
        const num = parseInt(header)
        if (num >= 1 && num <= 31) {
          if (dateHeaders.length === 0 || parseInt(dateHeaders[dateHeaders.length - 1]) + 1 === num) {
            dateHeaders.push(header)
            if (dateHeaders.length === 1) {
              dateStartIndex = i
            }
          }
        }
      }
    }
  }
  
  return { nameColumnIndex, dateStartIndex, dateHeaders, yearMonth }
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
  parseExcelData,
  readExcelWithSheets,
  readSheetData
}