export function immediate(fn: any, time?: number) {
  if (time) {
    return new Promise(resolve => setTimeout(() => {
      fn()
      resolve()
    }, time));
  }

  return Promise.resolve().then(() => {
    fn()
  })
}

export function timeout(time?: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}
