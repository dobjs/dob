import { immutableDelete, immutableSet, registerChildsImmutable } from "../immutable"

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

export default function shim<T extends IcustomObject>(target: T & Map<any, any>, registerObserver: any, queueObservers: any, proxyResult: any) {
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
            result = proxyResult(this, key, result)

            registerObserver(this, key)

            return result
        }
    }

    for (const iterator of iterators) {
        // tslint:disable-next-line:space-before-function-paren only-arrow-functions
        target[iterator] = function () {
            registerObserver(this, masterKey)
            return native[iterator].apply(this, arguments)
        }
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments)

        if (oldValue !== value) {
            queueObservers(this, key)
            queueObservers(this, masterKey)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.delete = function (key: string) {
        const has = this.has(key)
        const result = native.delete.apply(this, arguments)

        if (has) {
            queueObservers(this, key)
            queueObservers(this, masterKey)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.clear = function () {
        const size = this.size
        const result = native.clear.apply(this, arguments)
        if (size) {
            queueObservers(this, masterKey)
        }
        return result
    }

    return target
}
