import { observable, observe } from "../../src"

const obj = observable({
  title: "hello"
})

observe(() => {
  // tslint:disable-next-line:no-console
  console.log(obj.title)
}, 1000)

obj.title = "hello1"
obj.title = "hello2"
obj.title = "hello3"

setTimeout(() => {
  obj.title = "hello4"

  setTimeout(() => {
    obj.title = "hello5"

    setTimeout(() => {
      obj.title = "hello6"

      setTimeout(() => {
        obj.title = "hello7"
      }, 900)
    }, 900)

  }, 10)
}, 900)
