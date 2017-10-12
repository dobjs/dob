import test from "ava"
import { Action, cancelStrict, isObservable, observable, observe, Static, useStrict } from "../index"

test("use strict in Action otherwise will throw error", t => {
  const obj = observable({
    a: 1
  })

  useStrict()

  t.throws(() => {
    obj.a = 2
  })

  t.notThrows(() => {
    Action(() => {
      obj.a = 3
    })
  })

  cancelStrict()
})

test("use strict in Action otherwise will throw error in decorator", t => {
  @observable
  class Test {
    public value = 1

    @Action public changeValue(value: number) {
      this.value = value
    }

    public changeValueNotSafe(value: number) {
      this.value = value
    }
  }

  const instance = new Test()

  useStrict()

  t.throws(() => {
    instance.changeValueNotSafe(2)
  })

  t.notThrows(() => {
    instance.changeValue(3)
  })

  cancelStrict()
})
