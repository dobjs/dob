import builtIns from "./built-ins"
import { globalState } from "./global-state"
import { Reaction } from "./reaction"
import { Func, getBinder, inAction, isPrimitive } from "./utils"

const MAX_RUN_COUNT = 1000

/**
 * Create observable wrapper.
 */
function createObservableObject<T extends object>(obj: T = {} as any): T {
  if (isPrimitive(obj)) {
    throw TypeError(`dob not support ${obj}, because it is a basic type.`)
  }

  if (globalState.proxies.has(obj)) {
    return globalState.proxies.get(obj)
  }

  // Proxy inert packaging.
  return toObservable(obj)
}

/**
 * Create observable decorator.
 */
function createObservableObjectDecorator(target: any) {
  function wrap(...args: any[]) {
    return createObservableObject(new target(...args))
  }
  return wrap as any
}

/**
 * Create observable object from origin object.
 */
function toObservable<T extends object>(obj: T): T {
  if (Object.getOwnPropertySymbols(obj).indexOf(globalState.ignoreDynamicSymbol) > -1) {
    // Ignore observable
    return obj
  }

  let dynamicObject: T

  const builtIn = builtIns.get(obj.constructor)
  if (typeof builtIn === "function" || typeof builtIn === "object") {
    // support: map weakMap set weakSet.
    dynamicObject = builtIn(obj, bindCurrentReaction, queueRunReactions, getProxyValue)
  } else if (!builtIn) {
    dynamicObject = new Proxy(obj, {
      get(target, key, receiver) {
        let value = Reflect.get(target, key, receiver)

        // Get origin object.
        if (key === "$raw") {
          return target
        }

        // Getter event.
        globalState.event.emit("get", { target, key, value })

        bindCurrentReaction(target, key)

        value = getProxyValue(target, key, value)

        return value
      },

      set(target, key, value, receiver) {
        const oldValue = Reflect.get(target, key, receiver)

        // If the new value is an object, the original object is preferentially taken.
        if (typeof value === "object" && value) {
          value = value.$raw || value
        }

        globalState.event.emit("set", { target, key, value, oldValue })

        const result = Reflect.set(target, key, value, receiver)

        // If the length of attribute changed, or the new value is different from the old value, trigger observer queue task.
        // This step should be done after `Reflect.set` to ensure that the trigger is using a new value.
        if (key === "length" || value !== oldValue) {
          queueRunReactions<T>(target, key)
        }

        return result
      },

      deleteProperty(target, key) {
        const hasKey = Reflect.has(target, key)

        globalState.event.emit("deleteProperty", { target, key })

        const result = Reflect.deleteProperty(target, key)

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
 * Ensure proxy value
 */
function getProxyValue(target: any, key: PropertyKey, value: any) {
  // If the value is a HTMLElement object, it returns directly to the original object, because the original object cannot be encapsulated.
  if (typeof window !== "undefined" && value instanceof HTMLElement) {
    return value
  }

  // If the value is an object, the proxy object is taken priority.
  const resultIsObject = typeof value === "object" && value
  const existProxy = resultIsObject && globalState.proxies.get(value)

  if (resultIsObject) {
    return existProxy || toObservable(value)
  }

  return value
}

/**
 * Run reactions for object's propertyKey.
 * If has running queue, reactions will be merged in it.
 */
function queueRunReactions<T extends object>(target: T, key: PropertyKey) {
  // If in strict mode, and not in the batch, throw error.
  if (globalState.strictMode && globalState.batchDeep === 0) {
    throw Error("You are not allowed to modify observable value out of Action.")
  }

  const { keyBinder } = getBinder(target, key)

  Array.from(keyBinder).forEach(reaction => {
    if (inAction()) {
      globalState.pendingReactions.add(reaction)
    } else {
      // Not in Action, added to the queue if the queue already has a value, or directly execute if the queue has no value.
      if (globalState.pendingReactions.size === 0) {
        runReaction(reaction)
      } else {
        globalState.pendingReactions.add(reaction)
        runPendingReactions()
      }
    }
  })
}

export function runReaction(reaction: Reaction) {
  reaction.run()
}

/**
 * Execute pending reaction queue.
 * If in action, continue adding to actionQueuedObservers.
 * If not in the action, add a direct implementation.
 */
function runPendingReactions() {
  // The number of queue executions.
  let currentRunCount = 0

  globalState.pendingReactions.forEach(observer => {
    currentRunCount++

    if (currentRunCount >= MAX_RUN_COUNT) {
      globalState.pendingReactions.clear()
      return
    }

    runReaction(observer)
  })

  // Clear pending reactions.
  globalState.pendingReactions.clear()
}

/**
 * Bind the current reaction
 */
function bindCurrentReaction<T extends object>(object: T, key: PropertyKey) {
  // Add listener to this key, which not be tracked in the runInAction
  // InBatch as long as non zero, that runInAction is over
  if (!globalState.currentReaction || inAction()) {
    return
  }

  const { keyBinder } = getBinder(object, key)

  // If this key is not bound with the current reaction, bind it.
  if (!keyBinder.has(globalState.currentReaction)) {
    keyBinder.add(globalState.currentReaction)
    globalState.currentReaction.addBinder(keyBinder)
  }
}

function isObservable<T extends object>(obj: T) {
  return (globalState.proxies.get(obj) === obj)
}

/**
 * Self run reactions
 */
function observe(callback: Func, delay?: number) {
  const reaction = new Reaction("observe", () => {
    reaction.track(callback)
  }, delay)

  // Run in initialization
  if (inAction()) {
    //  If in the action, directly added to the queue, such as the implementation of the action will automatically execute this queue.
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
 * Enter next batch.
 */
function startBatch() {
  if (globalState.batchDeep === 0) {
    // If starting a new queue from deep 0, clear the original queue.
    globalState.pendingReactions = new Set()
  }

  globalState.batchDeep++

  globalState.event.emit("startBatch", null)
}

/**
 * Exit the current batch.
 */
function endBatch() {
  if (--globalState.batchDeep === 0) {
    runPendingReactions()
  }

  globalState.event.emit("endBatch", null)
}

// ==============================================
// Action [start]
// ==============================================

function Action(fn: () => any | Promise<any>): void
function Action(target: any, propertyKey: string, descriptor: PropertyDescriptor): any
function Action(arg1: any, arg2?: any, arg3?: any) {
  if (arg2 === undefined) {
    return runInAction.call(this, arg1, arg1.name)
  }
  return actionDecorator.call(this, arg1, arg1.constructor.name + "." + arg2, arg3)
}

function actionDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const func = descriptor.value
  return {
    get() {
      return (...args: any[]) => {
        return runInAction(func.bind(this, ...args), propertyKey)
      }
    }
  }
}

function runInAction(fn: () => any | Promise<any>, debugName?: string) {
  globalState.event.emit("runInAction", debugName)

  startBatch()

  try {
    return fn()
  } finally {
    endBatch()
  }
}

// ==============================================
// Action [end]
// ==============================================

function observable<T>(target: T = {} as any): T {
  if (typeof target === "function") { // 挂在 class 的 decorator
    return createObservableObjectDecorator(target)
  } else {
    return createObservableObject(target as any) as T
  }
}

/**
 * The object will not listen, when use this decorator.
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
