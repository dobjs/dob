import { observe, observable, runInAction } from "./index"
import * as _ from "lodash"

const dynamicObj = observable({
    a: true,
    b: 1,
    c: 2
})

observe(() => {
    if (dynamicObj.a) {
        console.log(dynamicObj.b)
    } else {
        console.log(dynamicObj.c)
    }
})

dynamicObj.a = false
dynamicObj.b = 3
