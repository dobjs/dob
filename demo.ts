import { observe, observable, runInAction } from "./index"
import * as _ from "lodash"

const dynamicObject = observable({
    name: '小明'
})

function renderA() {
    console.log('renderA', dynamicObject.name)
}

function renderB() {
    console.log('renderB', dynamicObject.name)
    renderA()
}

observe(() => {
    renderA()
})

const signal = observe(() => {
    renderB()
})

signal.unobserve()

setTimeout(() => {
    dynamicObject.name = '小黑'
}, 1000)
