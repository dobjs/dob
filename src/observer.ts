import builtIns from "./built-ins"
import { immutableDelete, immutableSet, initImmutable, registerChildsImmutable } from "./immutable"
import { Func, globalState, IObserver, isPrimitive } from "./utils"

/**
 * ========================
 * 函数
 * ========================
 */

/**
 * 获取可观察的对象
 */
function observableObject<T extends object>(obj: T = {} as any): T {
  if (isPrimitive(obj)) {
    throw Error(`${obj} 是基本类型，dob 仅支持非基本类型`)
  }

  if (globalState.proxies.has(obj)) {
    return globalState.proxies.get(obj)
  }

  // proxy 惰性封装
  return toObservable(obj)
}

/**
 * 将 class 改造为可观察对象
 */
function observableObjectDecorator(target: any) {
  function wrap() {
    return observableObject(new target())
  }
  return wrap as any
}

/**
 * 生成可观察的对象
 */
function toObservable<T extends object>(obj: T): T {
  if (Object.getOwnPropertySymbols(obj).indexOf(globalState.ignoreDynamicSymbol) > -1) {
    // 如果对象忽略了动态化，直接返回
    return obj
  }

  let dynamicObject: T

  const builtIn = builtIns.get(obj.constructor)
  if (typeof builtIn === "function" || typeof builtIn === "object") {
    // 处理 map weakMap set weakSet
    dynamicObject = builtIn(obj, registerObserver, queueRunObservers, proxyResult)
  } else if (!builtIn) {
    dynamicObject = new Proxy(obj, {
      get(target, key, receiver) {
        // 如果 key 是 $raw，或者在 Action 中，直接返回原始对象
        if (key === "$raw") {
          return target
        }

        // 将子元素注册到 immutable，子元素可以找到其根节点对象，以及路径
        registerChildsImmutable(target)

        registerObserver(target, key)

        let result = Reflect.get(target, key, receiver)
        result = proxyResult(target, key, result)

        return result
      },

      set(target, key, value, receiver) {
        // 旧值
        const oldValue = Reflect.get(target, key, receiver)

        // 如果新值是对象，优先取原始对象
        if (typeof value === "object" && value) {
          value = value.$raw || value
        }

        immutableSet(target, key, value)

        const result = Reflect.set(target, key, value, receiver)

        // 如果改动了 length 属性，或者新值与旧值不同，触发可观察队列任务
        // 这一步要在 Reflect.set 之后，确保触发时使用的是新值
        if (key === "length" || value !== oldValue) {
          queueRunObservers<T>(target, key)
        }

        return result
      },

      deleteProperty(target, key) {
        const hasKey = Reflect.has(target, key)
        immutableDelete(target, key)

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

  globalState.proxies.set(obj, dynamicObject)
  globalState.proxies.set(dynamicObject, dynamicObject)
  globalState.originObjects.set(dynamicObject, obj)

  globalState.observers.set(obj, new Map())

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
  const resultIsObject = typeof result === "object" && result
  const existProxy = resultIsObject && globalState.proxies.get(result)

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
  const observersForKey = globalState.observers.get(target).get(key)
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
function queueRunObserver(observer: IObserver) {
  if (globalState.inBatch === 0) {
    runObserver(observer)
  } else {
    // 在 tracking 中，添加到其队列
    // 之后不会像普通队列一样执行，而是等 runInAction 调用 fn 完毕后统一执行
    globalState.queuedObservers.add(observer)
  }
}

/**
 * 执行 observer
 */
export function runObserver(observer: IObserver) {
  if (observer.callback) {
    if (observer.delay === undefined || observer.delay === null) {
      // 如果没有延迟，立刻执行
      runObserverCallback(observer)
    } else {
      if (observer.timeout) {
        clearTimeout(observer.timeout)
      }

      observer.timeout = setTimeout(() => {
        runObserverCallback(observer)
      }, observer.delay)
    }
  }
}

/**
 * 执行 observer callback
 */
function runObserverCallback(observer: IObserver) {
  // 先把这个 observer 从所有绑定的 target -> key 中清空
  clearBindings(observer)
  globalState.currentObserver = observer

  try {
    // 这里会放访问到当前 observer callback 函数内所有对象的 getter 方法，之后会调用 registerObserver 给访问到的 target -> key 绑定当前的 observer
    observer.callback()
  } finally {
    globalState.currentObserver = null
  }
}

/**
 * 注册监听函数
 * observers 存储了全局要监听的对象和用户定义的回调函数，这个函数将
 * 当前 observer（queueObserver触发） 注册到 observers 对应的 key 中。
 */
function registerObserver<T extends object>(target: T, key: PropertyKey) {
  // 将监听添加到这个 key 上，必须不在 runInAction 中才会跟踪
  // inBatch 只要非 0，说明 runInAction 结束了
  if (!globalState.currentObserver || globalState.inBatch !== 0) {
    return
  }

  const observersForTarget = globalState.observers.get(target)
  let observersForKey = observersForTarget.get(key)

  // 如果没有定义这个 key 的 observer 集合，初始化一个新的
  if (!observersForKey) {
    observersForKey = new Set()
    observersForTarget.set(key, observersForKey)
  }

  // 如果不包含当前 observer，将它添加进去
  if (!observersForKey.has(globalState.currentObserver)) {
    observersForKey.add(globalState.currentObserver)

    // 给当前 currentObserver 对象添加引用，方便 unobserver 的时候，直接遍历 observedKeys，从中删除自己的 observer 引用
    globalState.currentObserver.observedKeys.push(observersForKey)
  }
}

/**
 * 是否是可观察对象
 */
function isObservable<T extends object>(obj: T) {
  return (globalState.proxies.get(obj) === obj)
}

/**
 * 清空 observer 当前所有绑定
 */
function clearBindings(observer: IObserver) {
  if (typeof observer === "object") {
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
function unobserve(observer: IObserver) {
  if (typeof observer === "object") {
    clearBindings(observer)
    observer.callback = observer.observedKeys = undefined
  }
}

/**
 * 观察
 * TODO: delay 如果非 null 或 undefined，表示这个 observe 不会在数据变更后立刻执行，而是在一定时间内 hold 所有修改，之后再执行，比较适合在其中发请求，比如 autoComplete
 */
function observe(callback: Func, delay?: number) {
  const observer: IObserver = {
    callback,
    // 存储哪些 target -> key 的 map 对象绑定了当前 observe，便于取消时的查找
    observedKeys: [],
    unobserve: () => unobserve(observer),
    delay
  }
  queueRunObserver(observer)
  return observer
}

/**
 * extend 一个可观察对象
 */
function extendObservable<T, P>(originObj: T, targetObj: P) {
  // tslint:disable-next-line:prefer-object-spread
  return runInAction(() => Object.assign(originObj, targetObj))
}

/**
 * 在这里执行的方法，会在执行完后统一执行 observe
 * 注意：如果不用此方法包裹，同步执行代码会触发等同次数的 observe，而不会自动合并!
 * 同时，在此方法中使用到的变量不会触发依赖追踪！
 * @todo: 目前仅支持同步，还未找到支持异步的方案！
 */
function runInAction(fn: () => any | Promise<any>) {
  startBatch()

  try {
    return fn()
  } finally {
    endBatch()
  }

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
 * 开始批量执行队列
 */
function startBatch() {
  if (globalState.inBatch === 0) {
    // 如果正在从 0 开始新的队列，清空原有队列
    globalState.queuedObservers = new Set()
  }

  globalState.inBatch++
}

/**
 * 结束批量执行队列
 */
function endBatch() {
  if (--globalState.inBatch === 0) {
    // 执行跟踪的队列
    globalState.queuedObservers.forEach(observer => {
      runObserver(observer)
    })

    // 清空执行 observe 队列
    globalState.queuedObservers.clear()
  }
}

/**
 * Action 装饰器，自带 runInAction 效果
 */
function actionDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
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

/**
 * action 方法，支持 decorator 与 函数
 */
function Action(fn: () => any | Promise<any>): void
function Action(target: any, propertyKey: string, descriptor: PropertyDescriptor): any
function Action(arg1: any, arg2?: any, arg3?: any) {
  if (arg2 === undefined) {
    return runInAction.call(this, arg1)
  }
  return actionDecorator.call(this, arg1, arg2, arg3)
}

function observable<T>(target: T = {} as any): T {
  if (typeof target === "function") { // 挂在 class 的 decorator
    return observableObjectDecorator(target)
  } else {  // 包裹变量的
    return observableObject(target as any) as T
  }
}

/**
 * Static，使装饰的对象不会监听
 */
function Static<T extends object>(obj: T): T {
  Object.defineProperty(obj, globalState.ignoreDynamicSymbol, {
    value: true
  })
  return obj
}

export {
  observable,
  observe,
  isObservable,
  extendObservable,
  Action,
  Static,
  startBatch,
  endBatch
}
