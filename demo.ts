import { observable, observe, Action } from "./index"

const dynamicObject = observable({
    a: 1
})

class Test {
    bind() {
        console.log(dynamicObject.a)
    }

    @Action run() {
        dynamicObject.a = 2
    }
}

observe(() => {
    new Test().bind()
})

new Test().run()
