/*
 * date.js
 */

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function asTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function asWeekDay(date) {
  return weekDays[date.getDay()]
}

function asDate(date) {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return month + '-' + day
}

function isToday(date) {
  return date.toDateString() === new Date().toDateString()
}

function isYesterday(date) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return date.toDateString() === yesterday.toDateString()
}

function isThisWeek(date) {
  const sixDaysAgo = new Date()
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  return date > sixDaysAgo
}

function isThisYear(date) {
  return date.getFullYear() === new Date().getFullYear()
}

export function compact(date, options = {}) {
  if (isToday(date))
    return asTime(date)

  if (isYesterday(date))
    return 'Yesterday at ' + asTime(date)

  if (isThisWeek(date))
    return asWeekDay(date) + ' ' + asTime(date)

  return full(date)
}

export function full(date) {
  if (isThisYear(date))
    return asDate(date) + ' ' + asTime(date)

  return date.getFullYear() + '-' + asDate(date) + ' ' + asTime(date)
}
