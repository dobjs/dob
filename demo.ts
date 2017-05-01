import { observe, observable, isObservable, extendObservable, runInAction, Action } from './index'

const a = observable({
    aa: new Map<string, number[]>([["a", [1, 2, 3]]]),
})

observe(() => {
    console.log(a.aa.get("a").length)
})

const aaaa = a.aa.get("a")
aaaa.push(4)
