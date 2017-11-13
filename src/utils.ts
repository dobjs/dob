import { globalState, IDebugChange, IDebugInfo } from "./global-state"
import { Reaction } from "./reaction"

export declare type Func = (...args: any[]) => any

/**
 * All binders for an object.
 */
export type IBinder = Map<PropertyKey, IKeyBinder>
export type IKeyBinder = Set<Reaction>

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
 * Empty func.
 */
// tslint:disable-next-line:no-empty
export const noop = () => { };

/**
 * Wether dob is in batch.
 */
export function inAction() {
  return globalState.batchDeep !== 0
}

/**
 * Is it currently in reaction?
 */
export function inTrack() {
  return !!globalState.currentReaction
}

/**
 * Get binder through object and key.
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

export function startDebug() {
  globalState.useDebug = true
}

export function stopDebug() {
  globalState.useDebug = false
}

export function useStrict() {
  globalState.strictMode = true
}

export function cancelStrict() {
  globalState.strictMode = false
}

/**
 * create unique id
 */
export function createUniqueId() {
  return globalState.uniqueIdCounter++
}
