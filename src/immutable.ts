import * as Immutable from "immutable"
import { applyMiddleware, combineReducers, compose, createStore } from "redux"
import { isObservable, originObjects, proxies } from "./observer"
import { isPrimitive } from "./utils"

declare const window: any

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
 * 初始化 immutable 对象
 */
export function initImmutable(obj: object) {
  // switch (obj.constructor) {
  //   case Array:
  //     immutables.set(obj, Immutable.fromJS(obj))
  //     break
  //   case Object:
  //     immutables.set(obj, Immutable.fromJS(obj))
  //     break
  // }
  immutables.set(obj, Immutable.fromJS(obj))
}

/**
 * 为对象子属性记录其根对象、访问路径
 * 当访问 setter 后，我们可以找到其根对象和路径，采取 immutable 更新
 */
export function registerChildsImmutable(obj: any) {
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
    throw Error(`${rootObj} 找不到根对象`)
  }

  const rootImmutableObj = immutables.get(rootObj)

  // TODO: 删除原值 value 的所有子属性，包括自己的 nodeInfos

  // 生成新的 immutable 对象
  const newImmutableObj = rootImmutableObj.setIn(paths, Immutable.fromJS(value))

  // 更新 immutable 对象
  immutables.set(rootObj, newImmutableObj)

  // 找到这个对象的 snapshotCallback 并触发
  if (proxies.has(rootObj)) {
    const proxy = proxies.get(rootObj)
    if (snapshots.has(proxy)) {
      const snapshot = snapshots.get(proxy)
      snapshot.forEach(each => {
        each(newImmutableObj.toJS())
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
    throw Error(`${rootObj} 找不到根对象`)
  }

  const rootImmutableObj = immutables.get(rootObj)

  // TODO: 删除原值 value 的所有子属性，包括自己的 nodeInfos

  // 生成新的 immutable 对象
  const newImmutableObj = rootImmutableObj.deleteIn(paths)

  // 更新 immutable 对象
  immutables.set(rootObj, newImmutableObj)

  // 找到这个对象的 snapshotCallback 并触发
  if (proxies.has(rootObj)) {
    const proxy = proxies.get(rootObj)
    if (snapshots.has(proxy)) {
      const snapshot = snapshots.get(proxy)
      snapshot.forEach(each => {
        each(newImmutableObj.toJS())
      })
    }
  }
}

/**
 * 监听对象快照
 */
export function onSnapshot<T extends object>(obj: T, callback: (snapshot?: T) => void) {
  if (!snapshots.has(obj)) {
    snapshots.set(obj, new Set())
  }

  const snapshot = snapshots.get(obj)
  snapshot.add(callback)
}

/**
 * 获取对象的快照
 */
export function getSnapshot(proxyObj: any) {
  const obj = originObjects.get(proxyObj)
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
    for (const field in storeInstance) {
      if (storeInstance.hasOwnProperty(field)) {
        const property = storeInstance[field]
        // 如果是 observable，说明这是个 store
        if (isObservable(property)) {
          observableStore = property
        }
      }
    }

    // 遍历 proto 获取所有 action
    // 将 action 执行的内容放在对应 reducer 中，并且 action 只 dispatch 不执行 observer
    Object.getOwnPropertyNames(Object.getPrototypeOf(storeInstance))
      .filter(methodName => methodName !== "constructor")
      .forEach(methodName => {
        const action = storeInstance[methodName]

        // 新增 actions，用来 dispatch
        actions[methodName] = (...args: any[]) => {
          return {
            type: key + "." + methodName,
            payload: args
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
  const store = enhancer ? createStore(rootReducer, composeEnhancers(applyMiddleware(enhancer))) : createStore(rootReducer, composeEnhancers())
  return {
    store,
    combineActions
  }
}
