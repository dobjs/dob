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
 * 是否在 runInAction 中
 */
let isInAction = false
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
        dynamicObject = builtIn(obj, registerObserver, queueRunObservers)
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
                // 旧值
                const oldValue = Reflect.get(target, key, receiver)

                // 如果新值是对象，优先取原始对象
                if (typeof value === 'object' && value) {
                    value = value.$raw || value
                }

                const result = Reflect.set(target, key, value, receiver)

                // 如果改动了 length 属性，或者新值与旧值不同，触发可观察队列任务
                // 这一步要在 Reflect.set 之后，确保触发时使用的是新值
                if (key === 'length' || value !== oldValue) {
                    queueRunObservers<T>(target, key)
                }

                return result
            },

            deleteProperty(target, key) {
                const hasKey = Reflect.has(target, key)

                const result = Reflect.deleteProperty(target, key)

                if (hasKey) {
                    queueRunObservers(target, key)
                }

                return result
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
 * 队列执行属于 target 对象、key 字段绑定的 observer 函数
 * 队列执行的意思是，执行，但不一定立即执行，比如包在 runInAction 中函数触发时，就不会立刻执行
 * 而是在整个函数体执行完毕后，收集完了队列再统一执行一遍
 */
function queueRunObservers<T extends object>(target: T, key: PropertyKey) {
    const observersForKey = observers.get(target).get(key)
    if (observersForKey) {
        observersForKey.forEach(queueRunObserver)
    }
}

/**
 * 将 observer 添加到队列中
 * 为什么要单独列出来，因为 observe 时会先执行一次当前 observe，调用的就是此函数
 */
function queueRunObserver(observer: Observer) {
    // 为 Set 类型，不会添加重复的 observer
    queuedObservers.add(observer)

    // 执行队列 
    runObserver()
}

/**
 * 执行当前队列中的 observe
 */
function runObserver() {
    if (isInAction) {
        return
    }

    queuedObservers.forEach(observer => {
        if (observer.callback) {
            try {
                currentObserver = observer
                observer.callback.apply(null, observer.proxies)
            } finally {
                currentObserver = null
            }
        }
    })

    // 清空执行 observe 队列    
    queuedObservers.clear()
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
        unobserve: () => unobserve(observer)
    }
    queueRunObserver(observer)
    return observer
}

/**
 * extend 一个可观察对象
 */
function extendObservable<T, P>(originObj: T, targetObj: P): T {
    return runInAction(() => Object.assign(originObj, targetObj))
}

/**
 * 在这里执行的方法，会在执行完后统一执行 observe
 * 注意：如果不用此方法包裹，同步执行代码会触发等同次数的 observe，而不会自动合并!
 */
function runInAction(fn: Function) {
    isInAction = true
    const result = fn()
    isInAction = false
    runObserver()

    return result
}

/**
 * Action 装饰器，自带 runInAction 效果
 */
function Action(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const func = descriptor.value
    return {
        get() {
            return (...args: any[]) => {
                return runInAction(func.bind(this, args))
                // TODO: support async function
                // return Promise.resolve(func.apply(this, args)).catch(error => {
                //     errorHandler && errorHandler(error)
                // })
            }
        },
        set(newValue: any) {
            return newValue
        }
    }
}
export { observable, observe, isObservable, extendObservable, runInAction, Action }