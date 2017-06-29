// import { Atom, observe } from "../../index"

// class Clock {
//   private atom: Atom
//   private intervalHandler: any = null
//   private currentDateTime: Date

//   constructor() {
//     this.atom = new Atom(
//       () => this.startTicking(),
//       () => this.stopTicking()
//     )
//   }

//   public getTime() {
//     this.atom.reportObserved()
//     return this.currentDateTime
//   }

//   public tick() {
//     this.currentDateTime = new Date()
//     this.atom.reportChanged()
//   }

//   public startTicking() {
//     this.tick() // initial tick
//     this.intervalHandler = setInterval(
//       () => this.tick(),
//       1000
//     )
//   }

//   public stopTicking() {
//     clearInterval(this.intervalHandler)
//     this.intervalHandler = null
//   }
// }

// const clock = new Clock()

// observe(() => console.log(clock.getTime()))

import { observable, observe } from "../../index"
import { computedAsync } from "./computed-async"

async function fetchName(name: string) {
  await Promise.resolve(1)
  return "fetched: " + name
}

async function fetchAge(age: number) {
  await Promise.resolve(1)
  return "fetched: " + age
}

class Test {
  public store = observable({
    userName: "小明",
    userAge: 6
  })

  public name = computedAsync<string>("", async () => {
    return await fetchName(this.store.userName)
  })

  public age = computedAsync<string>("", async () => {
    return await fetchAge(this.store.userAge)
  })
}

const test = new Test()

observe(() => {
  // tslint:disable-next-line:no-console
  console.log(test.name.value, test.age.value)
})

setTimeout(() => {
  test.store.userName = "小黑"
}, 1000)

setTimeout(() => {
  test.store.userAge = 9
}, 2000)
