const native: Set<any> & {
    [x: string]: any
} = Set.prototype
const masterValue = Symbol('Set master value')

const getters = ['has']
const iterators = ['forEach', 'keys', 'values', 'entries', Symbol.iterator]
const all = ['set', 'delete', 'clear'].concat(getters, iterators as any)

interface customObject {
    $raw: any
    [x: string]: any
}

export default function shim <T extends customObject>(target: T & Set<any>, registerObserver: any, queueObservers: any) {
    target.$raw = {}

    for (let method of all) {
        target.$raw[method] = function () {
            native[method].apply(target, arguments)
        }
    }

    for (let getter of getters) {
        target[getter] = function (value: string) {
            registerObserver(this, value)
            return native[getter].apply(this, arguments)
        }
    }

    for (let iterator of iterators) {
        target[iterator] = function () {
            registerObserver(this, masterValue)
            return native[iterator].apply(this, arguments)
        }
    }

    target.add = function (value: string) {
        if (!this.has(value)) {
            queueObservers(this, value)
            queueObservers(this, masterValue)
        }
        return native.add.apply(this, arguments)
    }

    target.delete = function (value: string) {
        if (this.has(value)) {
            queueObservers(this, value)
            queueObservers(this, masterValue)
        }
        return native.delete.apply(this, arguments)
    }

    target.clear = function () {
        if (this.size) {
            queueObservers(this, masterValue)
        }
        return native.clear.apply(this, arguments)
    }

    return target
}
