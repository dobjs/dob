import * as cloneDeep from "lodash.clonedeep"
import { globalState, IDebugChange, IDebugInfo } from "./global-state"
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
 * debug 入栈 action
 */
export function debugInAction(actionName: string) {
  const debugOutputBundleAction: IDebugInfo = {
    name: actionName,
    changeList: [],
    type: "action"
  }

  globalState.debugOutputActionMapBatchDeep.set(globalState.batchDeep, debugOutputBundleAction)
  globalState.currentDebugOutputAction = debugOutputBundleAction

  // 如果深度等于 1，生成唯一 id 给这个 action
  if (globalState.batchDeep === 1) {
    debugOutputBundleAction.id = getUniqueId()
    globalState.currentDebugId = debugOutputBundleAction.id
  }

  // 如果当前深度大于 1，就作为加到父级的 changeList
  if (globalState.batchDeep > 1) {
    globalState.debugOutputActionMapBatchDeep.get(globalState.batchDeep - 1).changeList.push({
      type: "action",
      action: debugOutputBundleAction
    })
  }
}

/**
 * debug 出栈 action
 */
export function debugOutAction() {
  // 每次出栈，都要更新 currentDebugOutputAction
  globalState.currentDebugOutputAction = globalState.debugOutputActionMapBatchDeep.get(globalState.batchDeep)

  if (!inAction()) {
    let cloneDebugInfo: IDebugInfo = null

    try {
      cloneDebugInfo = JSON.parse(JSON.stringify(globalState.debugOutputActionMapBatchDeep.get(1)))
    } catch (error) {
      return
    }

    // 如果完全出队列了，把存储的 debug 信息输出给 debug 事件，并清空 debug 信息
    globalState.event.emit("debug", cloneDebugInfo)
    globalState.currentDebugOutputAction = null
    globalState.debugOutputActionMapBatchDeep.clear()
    // 此时不能清空 globalState.currentDebugId = null，因为后续要传给 callback
    // action 与 debug 调用顺序：startBatch -> debugInAction -> ...multiple nested startBatch and endBatch -> debugOutAction -> reaction -> observe
  }
}

/**
 * 获取对象路径
 */
function getCallStack(target: object) {
  const callStack: PropertyKey[] = []

  if (!globalState.parentInfo.has(target)) { // 当前访问的对象就是顶层
    callStack.unshift(target.constructor.name)
  } else {
    let currentTarget: object = target
    let runCount = 0

    while (globalState.parentInfo.has(currentTarget)) {
      const parentInfo = globalState.parentInfo.get(currentTarget)

      // 添加调用队列
      callStack.unshift(parentInfo.key)

      // 如果父级没有父级了，给调用队列添加父级名称
      if (!globalState.parentInfo.has(parentInfo.parent)) {
        callStack.unshift(parentInfo.parent.constructor.name)
      }

      currentTarget = parentInfo.parent

      runCount++
      if (runCount >= 50) {
        break
      }
    }
  }

  return callStack
}

/**
 * 打印 diff 路径
 */
export function printDiff(target: object, key?: PropertyKey, oldValue?: any, value?: any) {
  const callStack = getCallStack(target)

  reportChange({
    type: "change",
    callStack,
    oldValue: cloneDeep(oldValue),
    key,
    value: cloneDeep(value)
  })
}

/**
 * 打印删除路径
 */
export function printDelete(target: object, key?: PropertyKey) {
  const callStack = getCallStack(target)

  reportChange({
    type: "delete",
    callStack,
    key,
  })
}

/**
 * 自定义打印
 */
export function printCustom(target: object, ...customMessage: any[]) {
  const callStack = getCallStack(target)

  reportChange({
    type: "custom",
    callStack,
    customMessage,
  })
}

/**
 * 通知修改
 */
function reportChange(change: IDebugChange) {
  if (globalState.currentDebugOutputAction) {
    globalState.currentDebugOutputAction.changeList.push(change)
  } else { // 脱离了 action 事件循环的孤立改动
    globalState.event.emit("debug", {
      id: getUniqueId(),
      name: null,
      changeList: [change],
      type: "isolated"
    })
  }
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
