import { Reaction } from "./reaction"
import { Func } from "./utils"

const tag = "ascoders-dob"

const globalOrWindow = (typeof self === "object" && self.self === self && self) ||
  (typeof global === "object" && global.global === global && global) ||
  this

class GlobalState {
  /**
   * 存储所有代理
   * key：代理 + 原始对象
   */
  public proxies = new WeakMap()
  /**
   * 所有代理 -> 原始对象的映射
   */
  public originObjects = new WeakMap()
  /**
   * 存储所有要代理原始的对象
   * 以对象每个 key 存储监听事件
   */
  public objectReactionBindings = new WeakMap<object, Map<PropertyKey, Set<Reaction>>>()
  /**
   * 当前 reaction
   */
  public currentReaction: Reaction = null
  /**
   * 批量执行深入，比如每次调用 runInAction 深入 +1，调用完 -1，深入为 0 时表示执行完了
   * 当 inBatch === 0 时，表示操作队列完毕
   */
  public inBatch = 0
  /**
   * 所有 action 中等执行队列的集合
   */
  public pendingReactions = new Set<Reaction>()
  /**
   * 忽略动态对象的 symbol
   */
  public ignoreDynamicSymbol = Symbol()
  /**
   * track 嵌套 track 时，临时缓存下来的 track 队列，等待上一层 track 执行完后再执行
   */
  public pendingTacks = new Set<Func>()
  /**
   * 是否开启 debug
   */
  public useDebug = false
  /**
   * object 的父级信息
   */
  public parentInfo = new WeakMap<object, {
    parent: object
    key: PropertyKey
  }>()
  /**
   * 当前所在 debugName（由 decorator Action 触发）
   */
  public currentDebugName: string = null
  /**
   * 当前是否处于严格模式
   */
  public strictMode = false
}

let globalState = new GlobalState()

if (globalOrWindow[tag]) {
  globalState = globalOrWindow[tag]
} else {
  globalOrWindow[tag] = globalState
}

export { globalState }
