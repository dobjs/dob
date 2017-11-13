import test from "ava"
import { Action, cancelStrict, isObservable, observable, observe, startDebug, Static, stopDebug, useStrict } from "../src/index"

test("debug", t => {
  useStrict()
  startDebug()

  let data = ""
  const dynamicObj = observable({ name: "b" })

  data += "a"
  observe(() => data += dynamicObj.name)
  data += "c"

  Action(() => {
    dynamicObj.name = "d"
  })

  stopDebug()
  cancelStrict()

  return Promise.resolve()
    .then(() => t.true(data === "abcd"))
})

test("nested debug", t => {
  useStrict()
  startDebug()

  let data = ""
  const dynamicObj = observable({
    user: { name: "b" }
  })

  data += "a"
  observe(() => data += dynamicObj.user.name)
  data += "c"

  Action(() => {
    dynamicObj.user.name = "d"
  })

  stopDebug()
  cancelStrict()

  return Promise.resolve()
    .then(() => t.true(data === "abcd"))
})

test("debug out of action", t => {
  startDebug()

  let data = ""
  const dynamicObj = observable({ name: "b" })

  data += "a"
  observe(() => data += dynamicObj.name)
  data += "c"

  Action(() => {
    dynamicObj.name = "d"
  })
  dynamicObj.name = "e"

  stopDebug()

  return Promise.resolve()
    .then(() => t.true(data === "abcde"))
})
