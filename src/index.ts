import { Atom } from "./atom"
import { createReduxStore, getSnapshot, onSnapshot, Task } from "./immutable"
import { Action, extendObservable, isObservable, observable, observe, Static } from "./observer"
import { IObserver } from "./utils"

// async function load() {
//     // tslint:disable-next-line:no-unused-expression
//     const aaa = await import ("./aaa")
//     console.log(123, aaa)
// }

// load()

export {
    observable,
    observe,
    Action,

    isObservable,
    Static,
    extendObservable,

    getSnapshot,
    onSnapshot,

    createReduxStore,
    Task,

    Atom,

    /** interface */
    IObserver
}
