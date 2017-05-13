const native: WeakSet<any> & {
    [x: string]: any
} = WeakSet.prototype

const getters = ['has']
const all = ['add', 'delete'].concat(getters)

interface customObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends customObject>(target: T & WeakSet<any>, registerObserver: any, queueObservers: any, proxyResult: any) {
    target.$raw = {}

    for (let method of all) {
        target.$raw[method] = function () {
            native[method].apply(target, arguments)
        }
    }

    for (let getter of getters) {
        target[getter] = function (value: string) {
            let result = native[getter].apply(this, arguments)
            result = proxyResult(this, value, result)

            registerObserver(this, value)

            return result
        }
    }

    target.add = function (value: string) {
        const has = this.has(value)
        const result = native.add.apply(this, arguments)
        if (!has) {
            queueObservers(this, value)
        }
        return result
    }

    target.delete = function (value: string) {
        const has = this.has(value)
        const result = native.delete.apply(this, arguments)
        if (has) {
            queueObservers(this, value)
        }
        return result
    }

    return target
}
