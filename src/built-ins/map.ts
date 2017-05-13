const native: Map<any, any> & {
    [x: string]: any
} = Map.prototype
const masterKey = Symbol('Map master key')

const getters = ['has', 'get']
const iterators = ['forEach', 'keys', 'values', 'entries', Symbol.iterator]
const all = ['set', 'delete', 'clear'].concat(getters, iterators as any)

interface customObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends customObject>(target: T & Map<any, any>, registerObserver: any, queueObservers: any, proxyResult: any) {
    target.$raw = {}

    for (let method of all) {
        target.$raw[method] = function () {
            native[method].apply(target, arguments)
        }
    }

    for (let getter of getters) {
        target[getter] = function (key: string) {
            let result = native[getter].apply(this, arguments)
            result = proxyResult(this, key, result)

            registerObserver(this, key)

            return result
        }
    }

    for (let iterator of iterators) {
        target[iterator] = function () {
            registerObserver(this, masterKey)
            return native[iterator].apply(this, arguments)
        }
    }

    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments)
        if (oldValue !== value) {
            queueObservers(this, key)
            queueObservers(this, masterKey)
        }
        return result
    }

    target.delete = function (key: string) {
        const has = this.has(key)
        const result = native.delete.apply(this, arguments)
        if (has) {
            queueObservers(this, key)
            queueObservers(this, masterKey)
        }
        return result
    }

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
