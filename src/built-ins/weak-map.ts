const native: WeakMap<any, any> & {
    [x: string]: any
} = WeakMap.prototype

const getters = ["has", "get"]
const all = ["set", "delete"].concat(getters)

interface IcustomObject {
    $raw: any
    [x: string]: any
}

export default function shim<T extends IcustomObject>(target: T & WeakMap<any, any>, registerObserver: any, queueObservers: any, proxyResult: any) {
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

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.set = function (key: string, value: any) {
        const oldValue = this.get(key)
        const result = native.set.apply(this, arguments)
        if (oldValue !== value) {
            queueObservers(this, key)
        }
        return result
    }

    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
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
