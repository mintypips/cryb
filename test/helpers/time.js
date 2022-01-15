const {ethers} = require('hardhat')

const duration = {
  seconds(val) {
    return val
  },
  minutes(val) {
    return val * this.seconds(60)
  },
  hours(val) {
    return val * this.minutes(60)
  },
  days(val) {
    return val * this.hours(24)
  },
  weeks(val) {
    return val * this.days(7)
  },
  months(val) {
    return val * this.days(30)
  },
  years(val) {
    return val * this.days(365)
  }
}

const startOfDay = (day=new Date()) => {
  const start = new Date(day)
  start.setHours(0,0,0,0)

  return toSolTime(start)
}

const endOfDay = (day=new Date()) => {
  const end = new Date(day)
  end.setHours(23, 59, 0, 0)

  return toSolTime(end)
}

const dayAfter = (day=new Date()) => {
  const date = new Date(day)
  date.setDate(new Date().getDate() + 1)

  return toSolTime(date)
}

const addDays = (days, date=new Date()) => new Date(date.getTime() + days * 8.64e7)

const getDaysFromEpoch = (date=new Date()) => Math.floor(date / 8.64e7)

const toSolTime = ts => Math.floor(ts / 1000)
const fromSolTime = ts => ts * 1000

module.exports = {
  duration,
  startOfDay,
  endOfDay,
  dayAfter,
  toSolTime,
  fromSolTime,
  getDaysFromEpoch,
  addDays
}
