class Scheduler {
  constructor() {
      this.intervalTasks = new Map()
      this.timeoutTasks = new Map()
  }

  setInterval(func, delay, ...args) {
      this.intervalTasks.set(func, window.setInterval(func, delay, ...args))
  }

  clearInterval(func) {
      if (this.intervalTasks.has(func)) {
          window.clearInterval(this.intervalTasks.get(func))
          this.intervalTasks.delete(func)
      }
  }

  resetInterval(func, delay, ...args) {
      this.clearInterval(func)
      this.setInterval(func, delay, ...args)
  }

  setTimeout(func, delay, ...args) {
      this.timeoutTasks.set(func, window.setTimeout(func, delay, ...args))
  }

  clearTimeout(func) {
      if (this.timeoutTasks.has(func)) {
          window.clearTimeout(this.timeoutTasks.get(func))
          this.timeoutTasks.delete(func)
      }
  }

  resetTimeout(func, delay, ...args) {
      this.clearTimeout(func)
      this.setTimeout(func, delay, ...args)
  }
}


export const scheduler = new Scheduler()