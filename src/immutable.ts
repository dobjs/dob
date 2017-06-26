import * as Immutable from "immutable"
import { applyMiddleware, combineReducers, compose, createStore } from "redux"
import { isObservable } from "./observer"
import { createThunkMiddleware, globalState, isPrimitive } from "./utils"

declare const window: any

declare interface IObjectType<T> {
  new (): T
}

/**
 * observable 包裹的对象，对应 immutable 结构
 */
const immutables = new Map<object, Immutable.Map<string, any> | Immutable.List<any>>()

/**
 * 每一个字对象，存储其根节点以及路径
 */
const nodeInfos = new Map<object, {
  rootObject: object
  paths: string[]
}>()

/**
 * 存储所有 observer 对象对应的 callback
 */
const snapshots = new Map<any, Set<any>>()

/**
 * 标记为 async method
 */
const asyncSymbol = Symbol()

/**
 * 初始化 immutable 对象
 */
export function initImmutable(obj: object) {
  if (immutables.has(obj)) {
    return
  }

  switch (obj.constructor) {
    case Array:
      immutables.set(obj, Immutable.fromJS(obj))
      break
    case Object:
      immutables.set(obj, Immutable.fromJS(obj))
      break
    default: // 剩下自定义 class new 出来的，需要特殊处理才能解析
      immutables.set(obj, Immutable.fromJS(JSON.parse(JSON.stringify(obj))))
  }
}

/**
 * 为对象子属性记录其根对象、访问路径
 * 当访问 setter 后，我们可以找到其根对象和路径，采取 immutable 更新
 */
export function registerChildsImmutable(obj: any) {
  // 先认为根对象就是自己
  let rootObj = obj

  Object.keys(obj).forEach(key => {
    // 当前对象的路径
    let paths: string[] = []

    // 先判断自身是否有父元素
    if (nodeInfos.has(obj)) {
      const nodeInfo = nodeInfos.get(obj)
      rootObj = nodeInfo.rootObject
      paths = nodeInfo.paths.slice()
    }

    const child = obj[key]

    // 不处理基本类型
    if (isPrimitive(child)) {
      return
    }

    paths.push(key)

    nodeInfos.set(child, {
      rootObject: rootObj,
      paths
    })
  })
}

/**
 * 注销某个 object 的 nodeInfos 数据
 */
function removeNodeInfo(obj: any) {
  if (isPrimitive(obj)) {
    return
  }

  nodeInfos.delete(obj)
}

/**
 * 当任何对象触发 set 时
 */
export function immutableSet(target: any, key: PropertyKey, value: any) {
  let rootObj = target
  let paths = [key.toString()]

  // 如果找到了，说明修改的是叶子元素
  if (nodeInfos.has(target)) {
    const nodeInfo = nodeInfos.get(target)
    rootObj = nodeInfo.rootObject
    paths = nodeInfo.paths.concat(key.toString())
  }

  if (!immutables.has(rootObj)) {
    // 找不到根对象，说明很可能是没有使用 createReduxStore 注册，那就不管了
    return
  }

  const rootImmutableObj = immutables.get(rootObj)

  // TODO: 删除原值 value 的所有子属性，包括自己的 nodeInfos

  // 生成新的 immutable 对象
  const newImmutableObj = rootImmutableObj.setIn(paths, Immutable.fromJS(value))

  // 更新 immutable 对象
  immutables.set(rootObj, newImmutableObj)

  // 找到这个对象的 snapshotCallback 并触发
  if (globalState.proxies.has(rootObj)) {
    const proxy = globalState.proxies.get(rootObj)
    if (snapshots.has(proxy)) {
      const snapshot = snapshots.get(proxy)
      const objectJs = newImmutableObj.toJS()
      snapshot.forEach(each => {
        each(objectJs)
      })
    }
  }
}

/**
 * 当触发任何对象 delete 时
 */
export function immutableDelete(target: any, key: PropertyKey) {
  let rootObj = target
  let paths = [key.toString()]

  // 如果找到了，说明修改的是叶子元素
  if (nodeInfos.has(target)) {
    const nodeInfo = nodeInfos.get(target)
    rootObj = nodeInfo.rootObject
    paths = nodeInfo.paths.concat(key.toString())
  }

  if (!immutables.has(rootObj)) {
    // 找不到根对象，说明很可能是没有使用 createReduxStore 注册，那就不管了
    return
  }

  const rootImmutableObj = immutables.get(rootObj)

  // TODO: 删除原值 value 的所有子属性，包括自己的 nodeInfos

  // 生成新的 immutable 对象
  const newImmutableObj = rootImmutableObj.deleteIn(paths)

  // 更新 immutable 对象
  immutables.set(rootObj, newImmutableObj)

  // 找到这个对象的 snapshotCallback 并触发
  if (globalState.proxies.has(rootObj)) {
    const proxy = globalState.proxies.get(rootObj)
    if (snapshots.has(proxy)) {
      const snapshot = snapshots.get(proxy)
      const objectJs = newImmutableObj.toJS()
      snapshot.forEach(each => {
        each(objectJs)
      })
    }
  }
}

/**
 * 监听对象快照
 */
export function onSnapshot<T extends object>(proxy: T, callback: (snapshot?: T) => void) {
  const obj = globalState.originObjects.get(proxy)

  if (!obj) {
    throw Error("请传入 observable 函数返回的对象")
  }

  // 初始化 immutable，从此只要这个对象变动，就会生成新 immutable
  initImmutable(obj)

  if (!snapshots.has(proxy)) {
    snapshots.set(proxy, new Set())
  }

  const snapshot = snapshots.get(proxy)
  snapshot.add(callback)
}

/**
 * 获取对象的快照
 */
export function getSnapshot(proxyObj: any) {
  const obj = globalState.originObjects.get(proxyObj)
  return immutables.get(obj).toJS()
}

/**
 * 创建 redux store
 */
export function createReduxStore(stores: { [name: string]: any }, enhancer?: any) {
  const combineActions: {
    [namespace: string]: any
  } = {}

  const reducers = Object.keys(stores).reduce((allReducers, key) => {
    const storeClass = stores[key]
    const storeInstance = new storeClass()

    // 用来 dispatch 的 actions
    const actions: {
      [methodName: string]: any
    } = {}

    // class 中的 store
    let observableStore: any = null

    // 直接遍历获取 store
    window.xx = storeInstance
    for (const field in storeInstance) {
      if (storeInstance.hasOwnProperty(field)) {
        const value = storeInstance[field]

        // 如果是 observable，说明这是个 store
        if (isObservable(value)) {
          observableStore = value
          const obj = globalState.originObjects.get(value)
          // 初始化 immutable，从此只要这个对象变动，就会生成新 immutable
          initImmutable(obj)
        }
      }
    }

    // 遍历 proto 获取所有 action
    // 将 action 执行的内容放在对应 reducer 中，并且 action 只 dispatch 不执行 observer
    Object.getOwnPropertyNames(Object.getPrototypeOf(storeInstance))
      .filter(methodName => methodName !== "constructor")
      .forEach(methodName => {
        if (storeInstance[asyncSymbol] && storeInstance[asyncSymbol].has(methodName)) { // 异步函数
          // 对于异步函数，是有副作用的，这里不能修改 store，修改了会报错
          // 直接执行没有问题，需要 return
          actions[methodName] = storeInstance[methodName]
        } else { // 同步函数
          // 新增 actions，用来 dispatch
          actions[methodName] = (...args: any[]) => {
            return {
              type: key + "." + methodName,
              payload: args
            }
          }
        }
      })

    combineActions[key] = actions

    // ... 用法是为了取消引用问题，因为直接修改原对象，初始状态应该是个快照
    allReducers[key] = (state = { ...observableStore }, action: any) => {
      if (action.type.indexOf(".") === -1) {
        return state
      }

      // 从 type 剥离出 methodName
      const types = action.type.split(".")
      types.shift()
      const methodName = types.join(".")

      // 如果不在 actions 中，就忽略
      if (!Object.keys(actions).find(actionMethodName => methodName === actionMethodName)) {
        return state
      }

      // 执行 action 中当前方法，此时会生成快照
      storeInstance[methodName].apply(storeInstance, action.payload)

      // 返回快照
      return getSnapshot(observableStore)
    }
    return allReducers
  }, {} as any)

  const rootReducer = combineReducers(reducers)

  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
  const store = enhancer ?
    createStore(rootReducer, composeEnhancers(applyMiddleware(enhancer, createThunkMiddleware))) :
    createStore(rootReducer, composeEnhancers(applyMiddleware(createThunkMiddleware)))

  return {
    store,
    combineActions
  }
}

/**
 * 标记 method 为 async
 */
export const Task = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  if (!target[asyncSymbol]) {
    target[asyncSymbol] = new Set()
  }

  target[asyncSymbol].add(propertyKey)
}
