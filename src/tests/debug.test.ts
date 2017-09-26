import test from "ava"
import { Action, isObservable, observable, observe, onSnapshot, startDebug, Static, stopDebug } from "../index"

test("debug", t => {
  startDebug()

  let data = ""
  const dynamicObj = observable({ name: "b" })

  data += "a"
  observe(() => data += dynamicObj.name)
  data += "c"
  dynamicObj.name = "d"

  stopDebug()

  return Promise.resolve()
    .then(() => t.true(data === "abcd"))
})

test("nested debug", t => {
  startDebug()

  let data = ""
  const dynamicObj = observable({
    user: { name: "b" }
  })

  data += "a"
  observe(() => data += dynamicObj.user.name)
  data += "c"
  dynamicObj.user.name = "d"

  stopDebug()

  return Promise.resolve()
    .then(() => t.true(data === "abcd"))
})
