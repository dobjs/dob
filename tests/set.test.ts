import test from "ava"
import { Action, isObservable, observable, observe, Static } from "../src/index"

test("should return a new observable when no argument is provided", t => {
  let size = 0

  const obj = observable({
    set: new Set()
  })

  observe(() => {
    size = obj.set.size
  })

  obj.set.add(1)
  obj.set.add(2)
  obj.set.add(3)

  t.true(size === 3)
})
