import { globalState, printCustom, printDelete, printDiff, registerParentInfo } from "../utils"

const native: Set<any> & {
    [x: string]: any
} = Set.prototype
const masterValue = Symbol("Set master value")

const getters = ["has"]
const iterators = ["forEach", "keys", "values", "entries", Symbol.iterator]
const all = ["add", "delete", "clear"].concat(getters, iterators as any)

interface IcustomObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends IcustomObject>(target: T & Set<any>, bindCurrentReaction: any, queueRunReactions: any, proxyValue: any) {
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

    for (const iterator of iterators) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target[iterator] = function () {
            bindCurrentReaction(this, masterValue)
            return native[iterator].apply(this, arguments)
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
            queueRunReactions(this, masterValue)
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
            queueRunReactions(this, masterValue)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.clear = function () {
        const size = this.size
        const result = native.clear.apply(this, arguments)
        if (size) {
            queueRunReactions(this, masterValue)
        }
        return result
    }

    Object.defineProperty(target, "size", {
        get: function get() {
            const proto = Object.getPrototypeOf(this)
            const size = Reflect.get(proto, "size", this)
            bindCurrentReaction(this, masterValue)
            return size
        }
    })

    return target
}
