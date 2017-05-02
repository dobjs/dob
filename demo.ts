import { observe, observable, Action } from "./index"

const dynamicObj = observable([1, 2, 3, 4, 5, 6])

observe(() => {
    dynamicObj.map(num => {
        num
    })
    console.log(dynamicObj)
})

class A {
    @Action run() {
        this.a()
        dynamicObj.splice(3, 0, 9)
    }

    @Action a() {

    }
}

new A().run()
