import { observable, observe, Action, Static } from "./index"  

let array: any = [1, 2, 3, 4];

array.name = "alibaba";

const obj = observable(array)

observe(() => {
  console.log(obj.length)
})

obj.push(3)
console.log("console", obj.name)
