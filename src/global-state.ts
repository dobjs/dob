import { Event } from "./event"
import { Reaction } from "./reaction"
import { Func } from "./utils"

const tag = "ascoders-dob"

const globalOrWindow = (typeof self === "object" && self.self === self && self) ||
  (typeof global === "object" && global.global === global && global) ||
  this

export interface IDebugInfo {
  /**
   * 唯一 id，只有根节点 action 拥有
   */
  id?: number
  /**
   * action 名称
   */
  name?: string
  /**
   * 当前 action 的修改列表
   */
  changeList?: Array<{
    /**
     * 修改类型
     */
    type: string
    /**
     * 调用栈
     */
    callStack: PropertyKey[]
    /**
     * 旧值
     */
    oldValue?: any
    /**
     * 新值
     */
    value?: any
    /**
     * 删除类型时，删除的 key
     */
    deleteKey?: PropertyKey
    /**
     * 自定义输出
     */
    customMessage?: any[]
  }>
  /**
   * 子 action
   */
  childs?: IDebugInfo[]
}

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
   * 当 batchDeep === 0 时，表示操作队列完毕
   */
  public batchDeep = 0
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
   * 当前正在操作的 debugOutputAction 对象，这样在修改值的时候，直接操作其 changeList 队列即可
   */
  public currentDebugOutputAction: IDebugInfo = null
  /**
   * 各 batchDeep 的根 debugOutputBundleAction
   */
  public debugOutputActionMapBatchDeep = new Map<number, IDebugInfo>()
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
   * 当前所在 debugId
   */
  public currentDebugId: number = null
  /**
   * 当前是否处于严格模式
   */
  public strictMode = false
  /**
   * 事件
   */
  public event = new Event()
  /**
   * 唯一 id 计数器
   */
  public uniqueIdCounter = 0
}

let globalState = new GlobalState()

if (globalOrWindow[tag]) {
  globalState = globalOrWindow[tag]
} else {
  globalOrWindow[tag] = globalState
}

export { globalState }
