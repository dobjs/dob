const native: WeakSet<any> & {
    [x: string]: any
} = WeakSet.prototype

const getters = ['has']
const all = ['add', 'delete'].concat(getters)

interface customObject {
    $raw: any
    [x: string]: any
}

export default function shim <T extends customObject>(target: T & WeakSet<any>, registerObserver: any, queueObservers: any) {
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

    target.add = function (value: string) {
        if (!this.has(value)) {
            queueObservers(this, value)
        }
        return native.add.apply(this, arguments)
    }

    target.delete = function (value: string) {
        if (this.has(value)) {
            queueObservers(this, value)
        }
        return native.delete.apply(this, arguments)
    }

    return target
}
