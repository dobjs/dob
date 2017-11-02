import { Action, globalState, isObservable, observable, observe, Reaction, startDebug, useStrict } from "../../src"

function waitOneMinute() {
  return new Promise(resolve => {
    setTimeout(resolve, 1000)
  })
}

@observable
class Test {
  public store = {
    a: {
      b: {
        c: {
          d: 5
        }
      }
    }
  }

  @Action public run() {
    this.store.a = {
      b: {
        c: {
          d: 6
        }
      }
    }
    waitOneMinute().then(() => {
      this.store.a.b.c.d = 7
    })
  }
}

const test = new Test()

observe(() => {
  // tslint:disable-next-line:no-console
  console.log("observe", test.store.a.b.c.d)
})

test.run()
