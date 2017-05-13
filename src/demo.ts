import { observable, observe, Action, Static } from "./index"

class Store {
  obj = Static({
    a: 1
  })

  aa() { }
  c = 5
}

const instance = new Store()

class Test {
  bind() {
    console.log(instance.obj.a)
  }

  @Action run() {
    instance.obj.a = 2
  }
}

observe(() => {
  new Test().bind()
})

new Test().run()
