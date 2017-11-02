import * as cloneDeep from "lodash.clonedeep"
import { globalState, IDebugChange, IDebugInfo } from "./global-state"
import { Reaction } from "./reaction"

export declare type Func = (...args: any[]) => any

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
 * 空函数
 */
// tslint:disable-next-line:no-empty
export const noop = () => { };

/**
 * 是否在 action 中
 */
export function inAction() {
  return globalState.batchDeep !== 0
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

/**
 * 生成随机唯一 id
 */
export function getUniqueId() {
  return globalState.uniqueIdCounter++
}
