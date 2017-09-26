import test from "ava"
import { Action, isObservable, observable, observe, onSnapshot, startDebug, Static, stopDebug } from "../index"

test("debug", t => {
  startDebug()

  let data = ""
  const dynamicObj = observable({ name: "b" })

  data += "a"
  observe(() => data += dynamicObj.name)
  data += "c"

  stopDebug()

  return Promise.resolve()
    .then(() => t.true(data === "abc"))
})
