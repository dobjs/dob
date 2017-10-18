import { Action, dobEvent, isObservable, observable, observe, Reaction, startDebug, useStrict } from "../../src"

useStrict()
startDebug()

dobEvent.on("debug", info => {
  // tslint:disable-next-line:no-console
  console.log(123, info)
})

@observable
class Test {
  public age = 1

  @Action public test1() {
    this.test2()
    this.age = 2
  }

  @Action public test2() {
    this.age = 3
    this.test3()
  }

  @Action public test3() {
    this.age = 4
  }
}

const test = new Test()
test.test1()
