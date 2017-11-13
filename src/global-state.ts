import { Event } from "./event"
import { Reaction } from "./reaction"
import { Func } from "./utils"

const tag = "ascoders-dob"

const globalOrWindow = (typeof self === "object" && self.self === self && self) ||
  (typeof global === "object" && global.global === global && global) ||
  this

export interface IDebugInfo {
  /**
   * The only id of Action.
   */
  id?: number
  /**
   * The name of Action.
   */
  name?: string
  /**
   * Changes
   */
  changeList?: IDebugChange[]
  /**
   * Action or closure
   */
  type: string
}

export interface IDebugChange {
  /**
   * The type of change
   */
  type: string
  /**
   * Nest action call, only type is action.
   */
  action?: IDebugInfo
  callStack?: PropertyKey[]
  oldValue?: any
  value?: any
  /**
   * The key of the operation
   */
  key?: PropertyKey
}

class GlobalState {
  /**
   * All proxies
   * key: proxies and it's origin object.
   */
  public proxies = new WeakMap()
  /**
   * key: proxy
   * value: origin object
   */
  public originObjects = new WeakMap()
  /**
   * Store all the original objects and keys to be proxied.
   */
  public objectReactionBindings = new WeakMap<object, Map<PropertyKey, Set<Reaction>>>()
  public currentReaction: Reaction = null
  /**
   * Batch execution depth, such as each call runInAction in-depth +1, call -1, depth of 0 means that the implementation of the end.
   * When batchDeep == = 0, the operation queue is completed.
   */
  public batchDeep = 0
  public pendingReactions = new Set<Reaction>()
  /**
   * Ignore the observable symbol
   */
  public ignoreDynamicSymbol = Symbol()
  /**
   * Track Nested track, temporary cache down the track queue, waiting for the implementation of a track after the implementation.
   * Eg: observe(()=>{
   *  // ..
   *  observe(()=>{..})
   *  // ..
   * })
   * Special for nest react component.
   */
  public pendingTracks = new Set<Func>()
  public useDebug = false
  /**
   * The currently executing debugOutputAction object.
   */
  public currentDebugOutputAction: IDebugInfo = null
  /**
   * The root of each batchDeep debugOutputBundleAction.
   */
  public debugOutputActionMapBatchDeep = new Map<number, IDebugInfo>()
  /**
   * Object's parent information, for debug.
   */
  public parentInfo = new WeakMap<object, {
    parent: object
    key: PropertyKey
  }>()
  /**
   * Special for action name.
   */
  public currentDebugName: string = null
  public currentDebugId: number = null
  public strictMode = false
  public event = new Event()
  public uniqueIdCounter = 0
  /**
   * Debug get callstack max run count
   */
  public getCallstackMaxCount = 50
}

let globalState = new GlobalState()

if (globalOrWindow[tag]) {
  globalState = globalOrWindow[tag]
} else {
  globalOrWindow[tag] = globalState
}

export { globalState }
