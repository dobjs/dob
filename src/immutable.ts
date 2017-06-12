import * as Immutable from "immutable"
import { proxies } from "./index"
import { isPrimitive } from "./utils"

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
  switch (obj.constructor) {
    case Array:
      immutables.set(obj, Immutable.fromJS(obj))
      break
    case Object:
      immutables.set(obj, Immutable.fromJS(obj))
      break
  }
}

/**
 * 为对象子属性记录其根对象、访问路径
 * 当访问 setter 后，我们可以找到其根对象和路径，采取 immutable 更新
 */
export function registerChildsImmutable(obj: any) {
  // 根节点对象
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

  const rootImmutableObj = immutables.get(rootObj)
  const newImmutableObj = rootImmutableObj.setIn(paths, value)

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
