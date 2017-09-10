import builtIns from "./built-ins"
import { immutableDelete, immutableSet, initImmutable, registerChildsImmutable } from "./immutable"
import { Reaction } from "./reaction"
import { Func, getBinder, globalState, inAction, isPrimitive, printDelete, printDiff, registerParentInfo } from "./utils"

const MAX_RUN_COUNT = 1000

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
    dynamicObject = builtIn(obj, bindCurrentReaction, queueRunReactions, proxyValue)
  } else if (!builtIn) {
    dynamicObject = new Proxy(obj, {
      get(target, key, receiver) {
        let value = Reflect.get(target, key, receiver)

        if (globalState.useDebug) {
          registerParentInfo(target, key, value)
        }

        // 如果 key 是 $raw，或者在 Action 中，直接返回原始对象
        if (key === "$raw") {
          return target
        }

        // 将子元素注册到 immutable，子元素可以找到其根节点对象，以及路径
        registerChildsImmutable(target)

        bindCurrentReaction(target, key)

        value = proxyValue(target, key, value)

        return value
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
          if (globalState.useDebug) {
            printDiff(target, key, oldValue, value)
          }

          queueRunReactions<T>(target, key)
        }

        return result
      },

      deleteProperty(target, key) {
        const hasKey = Reflect.has(target, key)
        immutableDelete(target, key)

        const result = Reflect.deleteProperty(target, key)

        if (globalState.useDebug) {
          printDelete(target, key)
        }

        if (hasKey) {
          queueRunReactions(target, key)
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

  globalState.objectReactionBindings.set(obj, new Map())

  return dynamicObject
}

/**
 * 返回 get 获取的结果，如果已有 proxy 就使用 proxy 返回，否则 toObservable 递归
 */
function proxyValue(target: any, key: PropertyKey, value: any) {
  // 如果取值是 HTMLElement 对象，直接返回原对象，因为原生对象不能被封装
  if (typeof window !== "undefined" && value instanceof HTMLElement) {
    return value
  }

  // 如果取的值是对象，优先取代理对象
  const resultIsObject = typeof value === "object" && value
  const existProxy = resultIsObject && globalState.proxies.get(value)

  if (resultIsObject) {
    return existProxy || toObservable(value)
  }

  return value
}

/**
 * 队列执行属于 target 对象、key 字段绑定的 observer 函数
 * 队列执行的意思是，执行，但不一定立即执行，比如包在 runInAction 中函数触发时，就不会立刻执行
 * 而是在整个函数体执行完毕后，收集完了队列再统一执行一遍
 */
function queueRunReactions<T extends object>(target: T, key: PropertyKey) {
  const { keyBinder } = getBinder(target, key)

  Array.from(keyBinder).forEach(reaction => {
    if (inAction()) {
      // 在 Action 中，直接加入队列
      globalState.pendingReactions.add(reaction)
    } else {
      // 不在 Action 中，如果队列已经有值了，添加到队列并执行队列；如果队列无值，则直接执行
      if (globalState.pendingReactions.size === 0) {
        runReactionAsync(reaction)
      } else {
        globalState.pendingReactions.add(reaction)
        runPendingReactions()
      }
    }
  })
}

/**
 * 执行 observer
 */
export function runReactionAsync(reaction: Reaction) {
  reaction.run()
}

/**
 * 执行待执行的 observer 队列
 * 如果在 action 中，继续添加到 actionQueuedObservers
 * 如果不在 action 中，添加一个直接执行
 */
function runPendingReactions() {
  // 队列执行次数
  let currentRunCount = 0

  globalState.pendingReactions.forEach(observer => {
    currentRunCount++

    if (currentRunCount >= MAX_RUN_COUNT) {
      // tslint:disable-next-line:no-console
      console.warn("执行次数达到上限，可能存在死循环")
      globalState.pendingReactions.clear()
      return
    }

    runReactionAsync(observer)
  })

  // 清空执行 observe 队列
  globalState.pendingReactions.clear()
}

/**
 * 绑定当前 reaction
 */
function bindCurrentReaction<T extends object>(object: T, key: PropertyKey) {
  // 将监听添加到这个 key 上，必须不在 runInAction 中才会跟踪
  // inBatch 只要非 0，说明 runInAction 结束了
  if (!globalState.currentReaction || inAction()) {
    return
  }

  const { keyBinder } = getBinder(object, key)

  // 如果这个 key 还没有与当前 reaction 绑定，则绑定
  if (!keyBinder.has(globalState.currentReaction)) {
    keyBinder.add(globalState.currentReaction)
    globalState.currentReaction.addBinder(keyBinder)
  }
}

/**
 * 是否是可观察对象
 */
function isObservable<T extends object>(obj: T) {
  return (globalState.proxies.get(obj) === obj)
}

/**
 * 利用 reaction 做的快捷监听，callback 元素会被追踪，绑定的变量改动时，触发的依然是此 callback
 */
function observe(callback: Func, delay?: number) {
  const reaction = new Reaction("observe", () => {
    reaction.track(callback)
  }, delay)

  // 初始化就执行
  if (inAction()) {
    // 如果在 action 中，直接添加到队列，等 action 执行完后，会自动执行此队列的
    globalState.pendingReactions.add(reaction)
  } else {
    reaction.run()
  }

  return {
    unobserve: () => {
      reaction.dispose()
    }
  }
}

/**
 * 开始批量执行队列
 */
function startBatch() {
  if (globalState.useDebug) {
    // tslint:disable-next-line:no-console
    console.groupCollapsed(`Action ${globalState.currentDebugName}`)
  }

  if (globalState.inBatch === 0) {
    // 如果正在从 0 开始新的队列，清空原有队列
    globalState.pendingReactions = new Set()
  }

  globalState.inBatch++
}

/**
 * 结束批量执行队列
 */
function endBatch() {
  if (globalState.useDebug) {
    // tslint:disable-next-line:no-console
    console.groupEnd()
  }

  if (--globalState.inBatch === 0) {
    runPendingReactions()
  }
}

// ==============================================
// Action 系列 [start]
// ==============================================

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

/**
 * Action 装饰器，自带 runInAction 效果
 */
function actionDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const func = descriptor.value
  return {
    get() {
      return (...args: any[]) => {
        return runInAction(func.bind(this, ...args), propertyKey)
      }
    },
    set(newValue: any) {
      return newValue
    }
  }
}

/**
 * 在这里执行的方法，会在执行完后统一执行 observe
 * 注意：如果不用此方法包裹，同步执行代码会触发等同次数的 observe，而不会自动合并!
 * 同时，在此方法中使用到的变量不会触发依赖追踪！
 */
function runInAction(fn: () => any | Promise<any>, debugName?: string) {
  if (globalState.useDebug) {
    globalState.currentDebugName = debugName || null
  }

  startBatch()

  try {
    return fn()
  } finally {
    endBatch()
  }
}

// ==============================================
// Action 系列 [end]
// ==============================================

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
  Action,
  Static,
  startBatch,
  endBatch
}
