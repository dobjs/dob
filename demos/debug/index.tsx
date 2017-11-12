import { Action, combineStores, globalState, inject, isObservable, observable, observe, Reaction, startDebug, useStrict } from "../../src"

useStrict()
startDebug()

globalState.event.on("debug", info => {
  // tslint:disable-next-line:no-console
  console.log(123, info)
})

@observable
class Store1 {
  public age = 1
}

class Action1 {
  @inject(Store1) private Store1: Store1

  @Action public test1() {
    this.Store1.age = 2
  }
}

@observable
class Store2 {
  public name = "小明"
}

class Action2 {
  @inject(Store2) private Store2: Store2
  @inject(Store1) private Store1: Store1

  @Action public test2() {
    this.Store2.name = "小红"
    this.Store1.age = 3
  }
}

const stores = combineStores({
  Store1,
  Action1,
  Store2,
  Action2
})

stores.Action2.test2()
