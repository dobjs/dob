import { Action, isObservable, observable, observe, Static } from "../src/index"

test("should return a new observable when no argument is provided", () => {
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

  expect(size === 3).toBe(true)
})
