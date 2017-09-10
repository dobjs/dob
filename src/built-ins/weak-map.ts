import { globalState, printDelete, printDiff, registerParentInfo } from "../utils"

const native: WeakMap<any, any> & {
    [x: string]: any
} = WeakMap.prototype

const getters = ["has", "get"]
const all = ["set", "delete"].concat(getters)

interface IcustomObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends IcustomObject>(target: T & WeakMap<any, any>, bindCurrentReaction: any, queueRunReactions: any, proxyValue: any) {
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

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments)

        if (globalState.useDebug) {
            printDiff(target, key, oldValue, value)
        }

        if (oldValue !== value) {
            queueRunReactions(this, key)
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
        }
        return result
    }

    return target
}
