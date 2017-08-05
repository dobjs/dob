import { IObserver } from "./utils";
const tag = "ascoders-dob"

export declare type Func = () => any

export declare interface IObjectType<T> {
  new(): T
}

export declare type ICombineActions<T> = {
  [P in keyof T]?: IObjectType<T[P]>
}

export interface IObserver {
  callback: Func
  observedKeys: Array<Set<IObserver>>
  /**
   * 不再监听的函数
   */
  unobserve?: Func
  /**
   * 延迟执行 callback
   */
  delay?: number
  /**
   * 延时执行的 timeout
   */
  timeout?: any
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
   * 批量执行深入，比如每次调用 runInAction 深入 +1，调用完 -1，深入为 0 时表示执行完了
   * 当 inBatch === 0 时，表示操作队列完毕
   */
  public inBatch = 0
  /**
   * 所有 action 中等执行队列的集合
   */
  public observerQueue = new Set<IObserver>()
  /**
   * 忽略动态对象的 symbol
   */
  public ignoreDynamicSymbol = Symbol()
  /**
   * observe 嵌套 observe 时，临时缓存下来的 observer 队列，等待上一层 observe 执行完后再执行
   */
  public nestedObserverQueue = new Set<IObserver>()
}

let globalState = new GlobalState()

if (globalOrWindow[tag]) {
  globalState = globalOrWindow[tag]
} else {
  globalOrWindow[tag] = globalState
}

export { globalState }

/**
 * 空函数
 */
// tslint:disable-next-line:no-empty
export const noop = () => { };
