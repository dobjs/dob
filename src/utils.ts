import { globalState } from "./global-state"
import { Reaction } from "./reaction"

export declare type Func = (...args: any[]) => any

export declare interface IObjectType<T> {
  new(): T
}

export declare type ICombineActions<T> = {
  [P in keyof T]?: IObjectType<T[P]>
}

/**
 * 某个对象的所有绑定
 */
export type IBinder = Map<PropertyKey, IKeyBinder>
export type IKeyBinder = Set<Reaction>

/**
 * 是否是基本类型
 */
export function isPrimitive(value: any): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
    return true
  }

  return false
}

/**
 * redux thunk
 */
export const createThunkMiddleware = ({ dispatch, getState }: any) => (next: any) => (action: any) => {
  if (typeof action === "function") {
    return action(dispatch, getState)
  }

  return next(action)
}

/**
 * 空函数
 */
// tslint:disable-next-line:no-empty
export const noop = () => { };

/**
 * 是否在 action 中
 */
export function inAction() {
  return globalState.inBatch !== 0
}

/**
 * 是否在 track 中
 */
export function inTrack() {
  return !!globalState.currentReaction
}

/**
 * 找到某个对象、键值的 binder
 */
export function getBinder(object: any, key: PropertyKey) {
  let keysForObject = globalState.objectReactionBindings.get(object)

  if (!keysForObject) {
    keysForObject = new Map()
    globalState.objectReactionBindings.set(object, keysForObject)
  }

  let reactionsForKey = keysForObject.get(key)

  if (!reactionsForKey) {
    reactionsForKey = new Set()
    keysForObject.set(key, reactionsForKey)
  }

  return {
    binder: keysForObject,
    keyBinder: reactionsForKey,
  }
}

/**
 * 开启调试模式
 */
export function startDebug() {
  globalState.useDebug = true
}

/**
 * 关闭调试模式
 */
export function stopDebug() {
  globalState.useDebug = false
}

/**
 * 注册 parentInfo
 */
export function registerParentInfo(target: object, key: PropertyKey, value: any) {
  if (value !== null && typeof value === "object") {
    globalState.parentInfo.set(value, {
      parent: target,
      key
    })
  }
}

/**
 * 获取对象路径
 */
function getCallQueue(target: object) {
  const callQueue: PropertyKey[] = []

  if (!globalState.parentInfo.has(target)) { // 当前访问的对象就是顶层
    callQueue.unshift(target.constructor.name)
  } else {
    let currentTarget: object = target
    let runCount = 0

    while (globalState.parentInfo.has(currentTarget)) {
      const parentInfo = globalState.parentInfo.get(currentTarget)

      // 添加调用队列
      callQueue.unshift(parentInfo.key)

      // 如果父级没有父级了，给调用队列添加父级名称
      if (!globalState.parentInfo.has(parentInfo.parent)) {
        callQueue.unshift(parentInfo.parent.constructor.name)
      }

      currentTarget = parentInfo.parent

      runCount++
      if (runCount >= 50) {
        break
      }
    }
  }

  return callQueue
}

/**
 * 打印 diff 路径
 */
export function printDiff(target: object, key?: PropertyKey, oldValue?: any, value?: any) {
  const callQueue = getCallQueue(target)

  let oldValueFormatted = ""
  try {
    oldValueFormatted = JSON.stringify(oldValue, null, 2)
  } catch (error) {
    oldValueFormatted = oldValue.toString()
  }

  let newValueFormatted = ""
  try {
    newValueFormatted = JSON.stringify(value, null, 2)
  } catch (error) {
    newValueFormatted = value.toString()
  }

  // tslint:disable-next-line:no-console
  console.log(`${callQueue.join(".")}.${key}: %c${oldValueFormatted}%c ${newValueFormatted}`, `
      text-decoration: line-through;
      color: #999;
    `, `
      color: green;
    `)
}

/**
 * 打印删除路径
 */
export function printDelete(target: object, key?: PropertyKey) {
  const callQueue = getCallQueue(target)

  // tslint:disable-next-line:no-console
  console.log(`${callQueue.join(".")}%c.${key}`, `
    text-decoration: line-through;
    color: #999;
  `)
}

/**
 * 自定义打印
 */
export function printCustom(target: object, ...customMessage: any[]) {
  const callQueue = getCallQueue(target)
  // tslint:disable-next-line:no-console
  console.log(callQueue.join("."), ...customMessage)
}

/**
 * 设置处于严格模式
 */
export function useStrict() {
  globalState.strictMode = true
}

/**
 * 取消严格模式
 */
export function cancelStrict() {
  globalState.strictMode = false
}
