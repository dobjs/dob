import { Action, isObservable, observable, observe, Reaction, startDebug, useStrict } from "../../src"

const obj = observable({
  a: 1,
  b: 2
})

const reaction = new Reaction("test", () => {
  // tslint:disable-next-line:no-console
  console.log("obj.b", obj.b)
})

reaction.track(() => {
  // tslint:disable-next-line:no-unused-expression
  obj.a
})

obj.a = 3
