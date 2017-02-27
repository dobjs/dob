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

export default function shim <T extends customObject>(target: T & Map<any, any>, registerObserver: any, queueObservers: any) {
    target.$raw = {}

    for (let method of all) {
        target.$raw[method] = function () {
            native[method].apply(target, arguments)
        }
    }

    for (let getter of getters) {
        target[getter] = function (key: string) {
            registerObserver(this, key)
            return native[getter].apply(this, arguments)
        }
    }

    for (let iterator of iterators) {
        target[iterator] = function () {
            registerObserver(this, masterKey)
            return native[iterator].apply(this, arguments)
        }
    }

    target.set = function (key: string, value: any) {
        if (this.get(key) !== value) {
            queueObservers(this, key)
            queueObservers(this, masterKey)
        }
        return native.set.apply(this, arguments)
    }

    target.delete = function (key: string) {
        if (this.has(key)) {
            queueObservers(this, key)
            queueObservers(this, masterKey)
        }
        return native.delete.apply(this, arguments)
    }

    target.clear = function () {
        if (this.size) {
            queueObservers(this, masterKey)
        }
        return native.clear.apply(this, arguments)
    }

    return target
}
