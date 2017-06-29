import test from "ava"
import { Atom, observe } from "../index"

class Clock {
  private atom: Atom
  private intervalHandler: any = null
  private currentDateTime = 1

  constructor() {
    this.atom = new Atom(
      () => this.startTicking(),
      () => this.stopTicking()
    )
  }

  public getTime() {
    this.atom.reportObserved()
    return this.currentDateTime
  }

  public startTicking() {
    this.currentDateTime++
    this.atom.reportChanged()
  }

  public stopTicking() {
    clearInterval(this.intervalHandler)
    this.intervalHandler = null
  }
}

test("basic test", t => {
  let time: number = 0
  const clock = new Clock()
  observe(() => {
    time = clock.getTime()
  })

  clock.startTicking()
  clock.startTicking()
  clock.startTicking()

  return Promise.resolve()
    .then(() => t.true(time === 5))
})
