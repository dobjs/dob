import { globalState } from "../global-state"

const native: WeakMap<any, any> & {
    [x: string]: any
} = WeakMap.prototype

const getters = ["has", "get"]
const all = ["set", "delete"].concat(getters)

interface IcustomObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends IcustomObject>(
    target: T & WeakMap<any, any>,
    bindCurrentReaction: any,
    queueRunReactions: any,
    proxyValue: any
) {
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
            let value = native[getter].apply(this, arguments)

            globalState.event.emit("get", { target, key: null, value })

            value = proxyValue(this, key, value)

            bindCurrentReaction(this, key)

            return value
        }
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments as any) as any

        globalState.event.emit("set", { target, key, oldValue, value })

        if (oldValue !== value) {
            queueRunReactions(this, key)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.delete = function (key: string) {
        const has = this.has(key)
        const result = native.delete.apply(this, arguments as any) as any

        globalState.event.emit("deleteProperty", { target, key })

        if (has) {
            queueRunReactions(this, key)
        }
        return result
    }

    return target
}
