import test from "ava"
import { Event } from "../src/event"

test("test on", t => {
  let count = 0

  const event = new Event()

  event.emit("change", 1)

  event.on("change" as any, (changedValue: any) => {
    count += changedValue
  })

  event.emit("change", 2)

  t.true(count === 2)
})

test("test multiple on", t => {
  let count = 0

  const event = new Event()

  event.emit("change", 1)

  event.on("change" as any, (changedValue: any) => {
    count += changedValue
  })

  event.on("change" as any, (changedValue: any) => {
    count += changedValue
  })

  event.emit("change", 2)

  t.true(count === 4)
})

test("test off", t => {
  let count = 0

  const event = new Event()

  event.emit("change", 1)

  function changeValue(changedValue: any) {
    count += changedValue
  }

  event.on("change" as any, changeValue)

  event.on("change" as any, changeValue)

  event.emit("change", 2)
  event.off("change", changeValue)
  event.emit("change", 2)

  t.true(count === 4)
})

test("test off not exist event", t => {
  let count = 0

  const event = new Event()

  event.emit("change", 1)

  function changeValue(changedValue: any) {
    count += changedValue
  }

  event.on("change" as any, changeValue)

  event.on("change" as any, changeValue)

  event.emit("change", 2)
  event.off("someThing", changeValue)
  event.emit("change", 2)

  t.true(count === 8)
})
