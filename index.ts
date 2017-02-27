import builtIns from './built-ins'

/**
 * 存储所有代理
 * key：代理 + 原始对象
 */
const proxies = new WeakMap()
/**
 * 存储所有要代理原始的对象
 * 以对象每个 key 存储监听事件
 */
const observers = new WeakMap<object, Map<PropertyKey, Set<Observer>>>()
/**
 * 待执行的观察队列
 */
const queuedObservers = new Set()
/**
 * 是否执行队列中
 */
let queued = false
/**
 * queueObserver 函数生成的 observer 对象
 */
let currentObserver: Observer = null

export interface Observer {
    callback: Function
    proxies: any
    observedKeys: Array<Set<Observer>>
    // 是否仅观察一次
    once?: boolean
    // 取消观察队列
    unqueue?: Function
    // 取消观察对象，比取消观察队列更彻底
    unobserve?: Function
}

/**
 * 获取可观察的对象
 */
function observable<T extends object>(obj: T = {} as T): T {
    return proxies.get(obj) || toObservable(obj)
}

/**
 * 生成可观察的对象
 */
function toObservable<T extends object>(obj: T): T {
    let dynamicObject: T

    const builtIn = builtIns.get(obj.constructor)
    if (typeof builtIn === 'function' || typeof builtIn === 'object') {
        // 处理 map weakMap set weakSet
        dynamicObject = builtIn(obj, registerObserver, queueObservers)
    } else if (!builtIn) {
        dynamicObject = new Proxy(obj, {
            get(target, key, receiver) {
                // 如果 key 是 $raw，直接返回原始对象
                if (key === '$raw') {
                    return target
                }

                const result = Reflect.get(target, key, receiver)

                // 如果取的值是对象，优先取代理对象
                const resultIsObject = typeof result === 'object' && result
                const existProxy = resultIsObject && proxies.get(result)

                // 将监听添加到这个 key 上
                if (currentObserver) {
                    registerObserver(target, key)
                    if (resultIsObject) {
                        return existProxy || toObservable(result)
                    }
                }

                return existProxy || result
            },

            set(target, key, value, receiver) {
                // 如果改动了 length 属性，或者新值与旧值不同，触发可观察队列任务
                if (key === 'length' || value !== Reflect.get(target, key, receiver)) {
                    queueObservers<T>(target, key)
                }

                // 如果新值是对象，优先取原始对象
                if (typeof value === 'object' && value) {
                    value = value.$raw || value
                }

                return Reflect.set(target, key, value, receiver)
            },

            deleteProperty(target, key) {
                if (Reflect.has(target, key)) {
                    queueObservers(target, key)
                }
                return Reflect.deleteProperty(target, key)
            }
        })
    } else {
        dynamicObject = obj
    }

    proxies.set(obj, dynamicObject)
    proxies.set(dynamicObject, dynamicObject)

    observers.set(obj, new Map())

    return dynamicObject
}

/**
 * 执行可观察队列任务
 */
function queueObservers<T extends object>(target: T, key: PropertyKey) {
    const observersForKey = observers.get(target).get(key)
    if (observersForKey) {
        observersForKey.forEach(queueObserver)
    }
}

/**
 * 异步执行观察
 */
function queueObserver(observer: Observer) {
    queuedObservers.add(observer)

    if (!queued) {
        queued = true
        Promise.resolve().then(() => {
            queuedObservers.forEach(observer => {
                if (observer.callback) {
                    if (observer.once) {
                        observer.callback.apply(null, observer.proxies)
                        unobserve(observer)
                    } else {
                        try {
                            currentObserver = observer
                            observer.callback.apply(null, observer.proxies)
                        } finally {
                            currentObserver = null
                        }
                    }
                }
            })
            queuedObservers.clear()
            queued = false
        })
    }
}

/**
 * 注册监听函数
 * observers 存储了全局要监听的对象和用户定义的回调函数，这个函数将
 * 当前 observer（queueObserver触发） 注册到 observers 对应的 key 中。
 */
function registerObserver<T extends object>(target: T, key: PropertyKey) {
    if (currentObserver) {
        const observersForTarget = observers.get(target)
        let observersForKey = observersForTarget.get(key)

        // 如果没有定义这个 key 的 observer 集合，初始化一个新的
        if (!observersForKey) {
            observersForKey = new Set()
            observersForTarget.set(key, observersForKey)
        }

        // 如果不包含当前 observer，将它添加进去
        if (!observersForKey.has(currentObserver)) {
            observersForKey.add(currentObserver)
            currentObserver.observedKeys.push(observersForKey)
        }
    }
}

/**
 * 是否是可观察对象
 */
function isObservable<T extends object>(obj: T) {
    return (proxies.get(obj) === obj)
}

/**
 * 取消观察队列
 */
function unqueue(observer: Observer) {
    queuedObservers.delete(observer)
}

/**
 * 取消观察对象
 */
function unobserve(observer: Observer) {
    if (typeof observer === 'object') {
        if (observer.observedKeys) {
            observer.observedKeys.forEach(observersForKey => {
                observersForKey.delete(observer)
            })
        }
        observer.callback = observer.proxies = observer.observedKeys = undefined
    }
}

/**
 * 观察
 */
function observe(callback: Function, ...observeProxies: any[]) {
    const observer: Observer = {
        callback,
        proxies: observeProxies,
        observedKeys: [],
        unqueue: () => unqueue(observer),
        unobserve: () => unobserve(observer)
    }
    queueObserver(observer)
    return observer
}

/**
 * extend 一个可观察对象
 */
function extendObservable<T, P>(originObj: T, targetObj: P): T {
    return Object.assign(originObj, targetObj)
}

export { observable, observe, isObservable, extendObservable }