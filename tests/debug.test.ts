import test from "ava"
import {
  Action,
  cancelStrict,
  dobEvent,
  globalState,
  isObservable,
  observable,
  observe,
  startDebug,
  Static,
  stopDebug,
  useStrict
} from "../src/index"
import { immediate, timeout } from "./util"

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

  return immediate(() => t.true(data === "abcd"))
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

  return immediate(() => t.true(data === "abcd"))
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

  return immediate(() => t.true(data === "abcde"))
})

test("test callstack", async t => {
  return immediate(async () => {
    startDebug()

    @observable
    class Store {
      public a: any = {
        b: {
          c: {
            d: {
              e: {
                f: "b"
              }
            }
          }
        }
      }
    }

    const store = new Store()
    let callStack: PropertyKey[] = []

    dobEvent.on("debug", debugInfo => {
      callStack = debugInfo.changeList[0].callStack
    })

    store.a.b.c.d.e.f = "d"

    stopDebug()

    return immediate(() => t.true(callStack.length === 6))
  }, 20)
})

test("test overflow callstack", async t => {
  return immediate(async () => {
    startDebug()

    globalState.getCallstackMaxCount = 3

    @observable
    class Store {
      public a: any = {
        b: {
          c: {
            d: {
              e: {
                f: "b"
              }
            }
          }
        }
      }
    }

    const store = new Store()
    let callStack: PropertyKey[] = []

    dobEvent.on("debug", debugInfo => {
      callStack = debugInfo.changeList[0].callStack
    })

    store.a.b.c.d.e.f = "d"

    stopDebug()

    globalState.getCallstackMaxCount = 50

    return immediate(() => t.true(callStack.length === 3))
  }, 40)
})

test("test action", async t => {
  return immediate(async () => {
    startDebug()

    class CustomAction {
      @Action public action1() {
        this.action2()
      }
      @Action public action2() {
        this.action3()
      }
      @Action public action3() {
        //
      }
    }

    const action = new CustomAction()

    dobEvent.on("debug", debugInfo => {
      delete debugInfo.id
      t.deepEqual(debugInfo, {
        name: "CustomAction.action1",
        changeList: [
          {
            type: "action",
            action: {
              name: "CustomAction.action2",
              changeList: [
                {
                  type: "action",
                  action: {
                    name: "CustomAction.action3",
                    changeList: [],
                    type: "action"
                  }
                }
              ],
              type: "action"
            }
          }
        ],
        type: "action"
      })
    })

    action.action1()

    stopDebug()

    return immediate(() => t.true(true))
  }, 60)
})

test("test delete", async t => {
  return immediate(async () => {
    startDebug()

    const dynamicObj = observable({ name: "b" })

    dobEvent.on("debug", debugInfo => {
      t.deepEqual(debugInfo, {
        name: null,
        changeList: [
          {
            type: "delete",
            callStack: [
              "Object"
            ],
            key: "name"
          }
        ],
        type: "isolated"
      })
    })

    delete dynamicObj.name

    return immediate(() => t.true(true))
  }, 80)
})
