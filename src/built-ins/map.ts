import { globalState } from "../global-state"
import { immutableDelete, immutableSet, registerChildsImmutable } from "../immutable"
import { printDelete, printDiff, registerParentInfo } from "../utils"

const native: Map<any, any> & {
    [x: string]: any
} = Map.prototype
const masterKey = Symbol("Map master key")

const getters = ["has", "get"]
const iterators = ["forEach", "keys", "values", "entries", Symbol.iterator]
const all = ["set", "delete", "clear"].concat(getters, iterators as any)

interface IcustomObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends IcustomObject>(target: T & Map<any, any>, bindCurrentReaction: any, queueRunReactions: any, proxyValue: any) {
    target.$raw = {}

    for (const method of all) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target.$raw[method] = function () {
            native[method].apply(target, arguments)
        }
    }

    for (const getter of getters) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target[getter] = function (key: string) {
            let result = native[getter].apply(this, arguments)

            if (globalState.useDebug) {
                registerParentInfo(target, key, result)
            }

            result = proxyValue(this, key, result)

            bindCurrentReaction(this, key)

            return result
        }
    }

    for (const iterator of iterators) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target[iterator] = function () {
            bindCurrentReaction(this, masterKey)
            return native[iterator].apply(this, arguments)
        }
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments)

        if (globalState.useDebug) {
            printDiff(target, key, oldValue, value)
        }

        if (oldValue !== value) {
            queueRunReactions(this, key)
            queueRunReactions(this, masterKey)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.delete = function (key: string) {
        const has = this.has(key)
        const result = native.delete.apply(this, arguments)

        if (globalState.useDebug) {
            printDelete(target, key)
        }

        if (has) {
            queueRunReactions(this, key)
            queueRunReactions(this, masterKey)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.clear = function () {
        const size = this.size
        const result = native.clear.apply(this, arguments)
        if (size) {
            queueRunReactions(this, masterKey)
        }
        return result
    }

    return target
}
