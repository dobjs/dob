import { Atom, observe } from "../../index"

class Clock {
  private atom: Atom
  private intervalHandler: any = null
  private currentDateTime: Date

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

  public tick() {
    this.currentDateTime = new Date()
    this.atom.reportChanged()
  }

  public startTicking() {
    this.tick() // initial tick
    this.intervalHandler = setInterval(
      () => this.tick(),
      1000
    )
  }

  public stopTicking() {
    clearInterval(this.intervalHandler)
    this.intervalHandler = null
  }
}

const clock = new Clock()

// const disposer = observe(() => console.log(clock.getTime()))
