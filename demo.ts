import { observe, observable, isObservable, extendObservable, runInAction, Action } from './index'

let runCount = 0
let num = 0

const dynamicObj = observable({
    a: 0,
    b: 1
})

observe(() => {
    // use a
    num = dynamicObj.a
    runCount++
})

runInAction(function () {
    console.log(this)
    dynamicObj.a = 1
})

// runInAction(async () => {
//     dynamicObj.a = 1
//     await Promise.resolve()
//     dynamicObj.a = 2
//     dynamicObj.a = 3
//     dynamicObj.a = 4
//     dynamicObj.a = 5
// })

// runInAction(() => {
//     dynamicObj.a = 6
// })

// runInAction(async () => {
//     dynamicObj.a = 7
//     await Promise.resolve()
//     dynamicObj.a = 8
//     dynamicObj.a = 9
//     dynamicObj.a = 10
//     dynamicObj.a = 11
// })