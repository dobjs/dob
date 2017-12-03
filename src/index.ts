import { inject, injectFactory as combineStores } from "dependency-inject"
import { Atom } from "./atom"
import "./debug"
import { Event } from "./event"
import { globalState, IDebugInfo } from "./global-state"
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

    Event
}
