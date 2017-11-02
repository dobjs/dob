import { Action, combineStores, dobEvent, inject, isObservable, observable, observe } from "../../src"

// @observable
// class Store1 {
//   public age = 1
// }

// class Action1 {
//   @inject(Store1) private Store1: Store1

//   @Action public test1() {
//     this.Store1.age = 2
//   }
// }

// @observable
// class Store2 {
//   public name = "小明"
// }

// class Action2 {
//   @inject(Store2) private Store2: Store2
//   @inject(Store1) private Store1: Store1

//   public test2 = () => {
//     this.Store2.name = "小红"
//     this.Store1.age = 3
//   }
// }

// const stores = combineStores({
//   Store1,
//   Action1,
//   Store2,
//   Action2
// })

// observe(() => {
//   console.log("observe", stores.Store1.age, stores.Store2.name)
// })

// stores.Action2.test2()

@observable
class Test {
  public a = 1
  public b = 2
  get all() {
    console.log(666)
    return this.a + this.b
  }
}

const test = new Test();
const b = (test as any).__proto__
