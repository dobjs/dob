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
const queuedObservers = new Set<Observer>()
/**
 * 当前 observer 对象
 */
let currentObserver: Observer = null
/**
 * 当前 tracking
 */
let currentTracking: Function | Promise<Function> = null
/**
 * tracking 深入，比如每次调用 runInAction 深入增加 1，调用完 -1，深入为 0 时表示执行完了
 * 当 currentTracking 队列存在，且 trackingDeep === 0 时，表示操作队列完毕
 */
let trackingDeep = 0
/**
 * 所有 tracking 中队列的集合
 */
let trackingQueuedObservers = new WeakMap<Function | Promise<Function>, Set<Observer>>()

export interface Observer {
    callback: Function
    observedKeys: Array<Set<Observer>>
    // 是否仅观察一次
    once?: boolean
    // 取消观察对象，比取消观察队列更彻底
    unobserve?: Function
}

/**
 * 获取可观察的对象
 */
function observable<T extends object>(obj: T = {} as T): T & { $raw: T } {
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
        dynamicObject = builtIn(obj, registerObserver, queueRunObservers, proxyResult)
    } else if (!builtIn) {
        dynamicObject = new Proxy(obj, {
            get(target, key, receiver) {
                // 如果 key 是 $raw，直接返回原始对象
                if (key === '$raw') {
                    return target
                }

                // 将监听添加到这个 key 上，必须不在 runInAction 中才会跟踪
                if (currentObserver && !currentTracking) {
                    registerObserver(target, key)
                }

                let result = Reflect.get(target, key, receiver)
                result = proxyResult(target, key, result)

                return result
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
 * 返回 get 获取的结果，如果已有 proxy 就使用 proxy 返回，否则 toObservable 递归
 */
function proxyResult(target: any, key: PropertyKey, result: any) {
    // 如果取值是 HTMLElement 对象，直接返回原对象，因为原生对象不能被封装
    if (typeof window !== "undefined" && result instanceof HTMLElement) {
        return result
    }

    // 如果取的值是对象，优先取代理对象
    const resultIsObject = typeof result === 'object' && result
    const existProxy = resultIsObject && proxies.get(result)

    if (resultIsObject) {
        return existProxy || toObservable(result)
    }

    return result
}

/**
 * 队列执行属于 target 对象、key 字段绑定的 observer 函数
 * 队列执行的意思是，执行，但不一定立即执行，比如包在 runInAction 中函数触发时，就不会立刻执行
 * 而是在整个函数体执行完毕后，收集完了队列再统一执行一遍
 */
function queueRunObservers<T extends object>(target: T, key: PropertyKey) {
    const observersForKey = observers.get(target).get(key)
    if (observersForKey) {
        // observersForKey.forEach 过程中会被修改，所以 Array.From 一下防止死循环
        Array.from(observersForKey).forEach(observer => {
            queueRunObserver(observer)
        })
    }
}

/**
 * 将 observer 添加到队列中
 * 为什么要单独列出来，因为 observe 时会先执行一次当前 observe，调用的就是此函数
 */
function queueRunObserver(observer: Observer) {
    if (!currentTracking) {
        // 在普通执行队列中添加
        // 为 Set 类型，不会添加重复的 observer
        queuedObservers.add(observer)

        // 执行普通队列 
        runObserver()
    } else {
        // 在 tracking 中，添加到其队列
        // 之后不会像普通队列一样执行，而是等 runInAction 调用 fn 完毕后统一执行
        const nowTrackingQueuedObservers = trackingQueuedObservers.get(currentTracking)
        nowTrackingQueuedObservers.add(observer)
    }
}

/**
 * 执行普通队列
 */
function runObserver() {
    queuedObservers.forEach(observer => {
        if (observer.callback) {
            try {
                // 先把这个 observer 从所有绑定的 target -> key 中清空
                clearBindings(observer)

                currentObserver = observer

                // 这里会放访问到当前 observer callback 函数内所有对象的 getter 方法，之后会调用 registerObserver 给访问到的 target -> key 绑定当前的 observer
                observer.callback()
            } finally {
                currentObserver = null
            }
        }
    })

    // 清空执行 observe 队列    
    queuedObservers.clear()
}

/**
 * 执行跟踪队列
 */
function runTrackingObserver() {
    if (trackingDeep !== 0) {
        return
    }

    const nowTrackingQueuedObservers = trackingQueuedObservers.get(currentTracking)

    if (!nowTrackingQueuedObservers) {
        return
    }

    nowTrackingQueuedObservers.forEach(observer => {
        if (observer.callback) {
            try {
                currentObserver = observer
                observer.callback.apply(null)
            } finally {
                currentObserver = null
            }
        }
    })

    // 清空执行 observe 队列    
    nowTrackingQueuedObservers.clear()
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

            // 给当前 currentObserver 对象添加引用，方便 unobserver 的时候，直接遍历 observedKeys，从中删除自己的 observer 引用
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
 * 清空 observer 当前所有绑定
 */
function clearBindings(observer: Observer) {
    if (typeof observer === 'object') {
        if (observer.observedKeys) {
            observer.observedKeys.forEach(observersForKey => {
                observersForKey.delete(observer)
            })
        }
        observer.observedKeys = []
    }
}

/**
 * 取消观察
 */
function unobserve(observer: Observer) {
    if (typeof observer === 'object') {
        clearBindings(observer)
        observer.callback = observer.observedKeys = undefined
    }
}

/**
 * 观察
 */
function observe(callback: Function, ...observeProxies: any[]) {
    const observer: Observer = {
        callback,
        // 存储哪些 target -> key 的 map 对象绑定了当前 observe，便于取消时的查找
        observedKeys: [],
        unobserve: () => unobserve(observer)
    }
    queueRunObserver(observer)
    return observer
}

/**
 * extend 一个可观察对象
 */
function extendObservable<T, P>(originObj: T, targetObj: P) {
    return runInAction(() => Object.assign(originObj, targetObj))
}

/**
 * 在这里执行的方法，会在执行完后统一执行 observe
 * 注意：如果不用此方法包裹，同步执行代码会触发等同次数的 observe，而不会自动合并!
 * 同时，在此方法中使用到的变量不会触发依赖追踪！
 * @todo: 目前仅支持同步，还未找到支持异步的方案！
 */
function runInAction(fn: () => any | Promise<any>) {
    trackingDeep += 1

    if (trackingDeep === 1) {
        // 目前会忽略所有嵌套 tracking（runInAction 内调用 runInAction），deep 为 1 时表示时第一个 tracking 调用
        // TODO: 当调用 await 时立刻执行队列，再继续积攒队列执行，让所有异步队列分隔开执行
        currentTracking = fn
        trackingQueuedObservers.set(fn, new Set())
    }

    const result = fn()

    trackingDeep -= 1

    // 执行跟踪的队列
    runTrackingObserver()

    // 清空队列
    if (trackingDeep === 0) {
        currentTracking = null
        trackingQueuedObservers.delete(fn)
    }

    return result

    // if (typeof result === 'object' && result.then) {
    //     // result 为 async，或者返回了 promise
    //     return result.then((promiseResult: any) => {
    //         // 执行跟踪的队列
    //         runTrackingObserver()

    //         // 清空队列
    //         currentTracking = null
    //         trackingQueuedObservers.delete(fn)

    //         return promiseResult
    //     })
    // } else {
    //     // 执行跟踪的队列
    //     runTrackingObserver()

    //     // 清空队列
    //     currentTracking = null
    //     trackingQueuedObservers.delete(fn)

    //     return result
    // }
}

/**
 * Action 装饰器，自带 runInAction 效果
 */
function Action(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const func = descriptor.value
    return {
        get() {
            return (...args: any[]) => {
                return runInAction(func.bind(this, ...args))
            }
        },
        set(newValue: any) {
            return newValue
        }
    }
}
export { observable, observe, isObservable, extendObservable, runInAction, Action }