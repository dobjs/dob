const native: WeakMap<any, any> & {
    [x: string]: any
} = WeakMap.prototype

const getters = ['has', 'get']
const all = ['set', 'delete'].concat(getters)

interface customObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends customObject>(target: T & WeakMap<any, any>, registerObserver: any, queueObservers: any) {
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

    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments)
        if (oldValue !== value) {
            queueObservers(this, key)
        }
        return result
    }

    target.delete = function (key: string) {
        const has = this.has(key)
        const result = native.delete.apply(this, arguments)
        if (has) {
            queueObservers(this, key)
        }
        return result
    }

    return target
}
