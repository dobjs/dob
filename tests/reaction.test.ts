import test from "ava"
import { Action, isObservable, observable, observe, Reaction, Static } from "../src/index"

test("reaction 初始化不会执行 callback", t => {
  let flag = false

  // tslint:disable-next-line:no-unused-expression
  new Reaction("test", () => {
    flag = true
  })

  t.false(flag)
})

test("reaction 手动执行", t => {
  let flag = false

  const reaction = new Reaction("test", () => {
    flag = true
  })

  reaction.run()
  t.true(flag)
})

test("reaction 绑定与构造函数无关，与 track 有关", t => {
  const values: number[] = []

  const obj = observable({
    a: 1,
    b: 2
  })

  const reaction = new Reaction("test", () => {
    // 使用 a
    values.push(obj.a)
  })

  reaction.track(() => {
    // 绑定的是 b
    // tslint:disable-next-line:no-unused-expression
    obj.b
  })

  obj.b = 3
  obj.b = 4
  obj.a = 8
  obj.a = 9

  t.true(values.length === 2)
  t.true(values[0] === 1)
  t.true(values[1] === 1)
})
