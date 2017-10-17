import { globalState } from "../global-state"
import { printCustom, printDelete, printDiff, registerParentInfo } from "../utils"

const native: WeakSet<any> & {
    [x: string]: any
} = WeakSet.prototype

const getters = ["has"]
const all = ["add", "delete"].concat(getters)

interface IcustomObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends IcustomObject>(target: T & WeakSet<any>, bindCurrentReaction: any, queueRunReactions: any, proxyValue: any) {
    target.$raw = {}

    for (const method of all) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target.$raw[method] = function () {
            native[method].apply(target, arguments)
        }
    }

    for (const getter of getters) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target[getter] = function (value: string) {
            let result = native[getter].apply(this, arguments)

            if (globalState.useDebug) {
                registerParentInfo(target, null, result)
            }

            result = proxyValue(this, value, result)

            bindCurrentReaction(this, value)

            return result
        }
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.add = function (value: string) {
        const has = this.has(value)
        const result = native.add.apply(this, arguments)

        if (globalState.useDebug) {
            printCustom(target, "add", value)
        }

        if (!has) {
            queueRunReactions(this, value)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.delete = function (value: string) {
        const has = this.has(value)
        const result = native.delete.apply(this, arguments)

        if (globalState.useDebug) {
            printCustom(target, "delete", value)
        }

        if (has) {
            queueRunReactions(this, value)
        }
        return result
    }

    return target
}
