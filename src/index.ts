import { inject, injectFactory as combineStores } from "dependency-inject"
import { Atom } from "./atom"
import { globalState, IDebugInfo } from "./global-state"
import { createReduxStore, getSnapshot, onSnapshot, Task } from "./immutable"
import { Action, isObservable, observable, observe, Static } from "./observer"
import { Reaction } from "./reaction"
import { cancelStrict, startDebug, stopDebug, useStrict } from "./utils"

const dobEvent = globalState.event

export {
    observable,
    observe,
    Action,

    isObservable,
    Static,

    getSnapshot,
    onSnapshot,

    createReduxStore,
    Task,

    Atom,

    Reaction,

    startDebug,
    stopDebug,
    IDebugInfo,

    useStrict,
    cancelStrict,

    inject,
    combineStores,

    globalState,
    dobEvent,
}
