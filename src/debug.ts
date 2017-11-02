import * as cloneDeep from "lodash.clonedeep"
import { globalState, IDebugChange, IDebugInfo } from "./global-state"
import { Reaction } from "./reaction"
import { getUniqueId, inAction } from "./utils"

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
 * get 时存储 parentInfo
 */
globalState.event.on("get", info => {
  if (!globalState.useDebug) {
    return
  }

  if (info.value !== null && typeof info.value === "object") {
    globalState.parentInfo.set(info.value, {
      parent: info.target,
      key: info.key
    })
  }
})

/**
 * runInAction 时存储当前 Action 的 debugName
 */
globalState.event.on("runInAction", debugName => {
  if (!globalState.useDebug) {
    return
  }

  globalState.currentDebugName = debugName || null
})

/**
 * debug 入栈 action
 */
globalState.event.on("startBatch", () => {
  if (!globalState.useDebug) {
    return
  }

  const debugOutputBundleAction: IDebugInfo = {
    name: globalState.currentDebugName,
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
})

/**
 * debug 出栈 action
 */
globalState.event.on("endBatch", () => {
  if (!globalState.useDebug) {
    return
  }

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
})

/**
 * 打印 diff 路径
 */
globalState.event.on("set", info => {
  if (!globalState.useDebug) {
    return
  }

  const callStack = getCallStack(info.target)

  reportChange({
    type: "change",
    callStack,
    oldValue: cloneDeep(info.oldValue),
    key: info.key,
    value: cloneDeep(info.value)
  })
})

/**
 * 打印删除路径
 */
globalState.event.on("deleteProperty", info => {
  if (!globalState.useDebug) {
    return
  }

  const callStack = getCallStack(info.target)

  reportChange({
    type: "delete",
    callStack,
    key: info.key,
  })
})
