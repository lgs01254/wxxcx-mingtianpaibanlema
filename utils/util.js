const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}
const formatDate = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return [year, month, day].map(formatNumber).join('-')
}
const formatMonth = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return `${year}年${month}月`
}
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}
// 农历算法
const lunarInfo = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0];
const solarMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
const Animals = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const Gan = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const Zhi = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const lunarMonthName = ["正","二","三","四","五","六","七","八","九","十","十一","腊"];
const lunarDayName = ["初一","初二","初三","初四","初五","初六","初七","初八","初九","初十","十一","十二","十三","十四","十五","十六","十七","十八","十九","二十","廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"];
// 24节气
const solarTermNames = [
  "小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨",
  "立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑",
  "白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"
];
const sTermInfo = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
];
function getSolarTerm(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  // 1900-01-06 02:05:00 UTC 基准
  const base = Date.UTC(1900, 0, 6, 2, 5, 0);
  const yearMillis = 31556925974.7; // 回归年毫秒数
  const term1 = new Date(base + (year - 1900) * yearMillis + sTermInfo[month * 2] * 60000);
  const term2 = new Date(base + (year - 1900) * yearMillis + sTermInfo[month * 2 + 1] * 60000);
  const d = date.getDate();
  const isT1 = d === term1.getUTCDate();
  const isT2 = d === term2.getUTCDate();
  if (isT1) return solarTermNames[month * 2];
  if (isT2) return solarTermNames[month * 2 + 1];
  return '';
}

function lYearDays(y) {
  let i, sum = 348;
  for (i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
  return sum + leapDays(y);
}
function leapDays(y) {
  if (leapMonth(y)) return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
  else return 0;
}
function leapMonth(y) {
  return lunarInfo[y - 1900] & 0xf;
}
function monthDays(y, m) {
  return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}
function solarToLunar(y, m, d) {
  let i, temp = 0, leap = 0, isLeap = false;
  let baseDate = new Date(1900, 0, 31);
  let objDate = new Date(y, m - 1, d);
  let offset = Math.floor((objDate - baseDate) / 86400000);
  let year, month, day;
  for (year = 1900; year < 2100 && offset > 0; year++) {
    temp = lYearDays(year);
    if (offset - temp < 0) break;
    offset -= temp;
  }
  if (offset < 0) {
    offset += temp;
    year--;
  }
  leap = leapMonth(year);
  for (month = 1; month < 13 && offset > 0; month++) {
    if (leap > 0 && month === (leap + 1) && !isLeap) {
      --month;
      isLeap = true;
      temp = leapDays(year);
    } else {
      temp = monthDays(year, month);
    }
    if (isLeap && month === (leap + 1)) isLeap = false;
    offset -= temp;
  }
  if (offset < 0) {
    offset += temp;
    month--;
  }
  day = offset + 1;
  return {
    lunarYear: year,
    lunarMonth: month,
    lunarDay: day,
    isLeap: isLeap
  };
}
function getLunar(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const lunar = solarToLunar(y, m, d);
  const monthStr = lunarMonthName[lunar.lunarMonth - 1] || '';
  const dayStr = lunarDayName[lunar.lunarDay - 1] || '';
  // 只在初一显示月份
  return dayStr === '初一' ? (monthStr + '月') : dayStr;
}

module.exports = {
  formatTime,
  formatDate,
  formatMonth,
  getLunar,
  getSolarTerm
}
