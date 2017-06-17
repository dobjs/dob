const tag = "ascoders-dynamic-object"

export declare type Func = () => any

export interface IObserver {
  callback: Func
  observedKeys: Array<Set<IObserver>>
  // 是否仅观察一次
  once?: boolean
  // 取消观察对象，比取消观察队列更彻底
  unobserve?: Func
}

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
   * 所有代理 -> 原是对象的映射
   */
  public originObjects = new WeakMap()
  /**
   * 存储所有要代理原始的对象
   * 以对象每个 key 存储监听事件
   */
  public observers = new WeakMap<object, Map<PropertyKey, Set<IObserver>>>()
  /**
   * 当前 observer 对象
   */
  public currentObserver: IObserver = null
  /**
   * 当前 tracking
   */
  public currentTracking: Func | Promise<Func> = null
  /**
   * tracking 深入，比如每次调用 runInAction 深入增加 1，调用完 -1，深入为 0 时表示执行完了
   * 当 currentTracking 队列存在，且 trackingDeep === 0 时，表示操作队列完毕
   */
  public trackingDeep = 0
  /**
   * 所有 tracking 中队列的集合
   */
  public trackingQueuedObservers = new WeakMap<Func | Promise<Func>, Set<IObserver>>()
  /**
   * 忽略动态对象的 symbol
   */
  public ignoreDynamicSymbol = Symbol()
}

let globalState = new GlobalState()

if (globalOrWindow[tag]) {
  globalState = globalOrWindow[tag]
} else {
  globalOrWindow[tag] = globalState
}

export { globalState }
