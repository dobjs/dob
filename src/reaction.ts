import { globalState } from "./global-state"
import { IBinder, IKeyBinder, inTrack } from "./utils"

type IFunc = (...args: any[]) => any

export class Reaction {
  private name: string

  // 执行延时
  private delay: number = null

  // 与自身绑定的对象列表
  private keyBinders = new Set<IKeyBinder>()

  // reaction 将触发的 callback
  private callback: IFunc

  constructor(name: string, callback: IFunc, delay?: number) {
    this.name = name
    this.callback = callback
    this.delay = delay
  }

  /**
   * 在 track 中访问的变量，都会与当前 reaction 绑定，当这些变量产生修改时，会触发
   * @TODO: 目前仅支持同步，还未找到支持异步的方案！
   */
  public track(callback?: IFunc) {
    // 如果已经在 track 中，那就在待执行队列直接新增一项，返回
    // 上一层 runObserver 执行完后会执行待执行队列
    if (inTrack()) {
      globalState.pendingTacks.add(this.track.bind(this, callback))
      return
    }

    /**
     * 执行 callback
     */
    globalState.currentReaction = this
    // 先清空所有绑定
    this.clearBinding()
    try {
      callback()
    } finally {
      globalState.currentReaction = null
    }

    /**
     * 执行 track 剩余队列
     */
    // 队列执行次数
    let currentRunCount = 0
    const MAX_RUN_COUNT = 1000
    // 复制一份队列，防止嵌套 observe 时，不断在 nestedObserverQueue 添加 observer 导致死循环
    // 复制完后，原队列清空，让执行时加在干净的新队列
    const pedingTacksCopy = Array.from(globalState.pendingTacks)
    globalState.pendingTacks.clear()

    pedingTacksCopy.forEach(eachTack => {
      currentRunCount++

      if (currentRunCount >= MAX_RUN_COUNT) {
        // tslint:disable-next-line:no-console
        console.warn("执行次数达到上限，可能存在死循环")
        globalState.pendingTacks.clear()
        return
      }

      eachTack()
    })
  }

  /**
   * 销毁
   */
  public dispose() {
    this.clearBinding()
    this.callback = null
  }

  /**
   * 触发 reaction 的 observe
   */
  public run() {
    // 简单的执行回调函数即可
    if (this.callback) {
      this.callback()
    }
  }

  /**
   * 添加绑定者（某 object 的 reactionsForKey）
   */
  public addBinder(keyBinder: IKeyBinder) {
    this.keyBinders.add(keyBinder)
  }

  /**
   * 清空绑定
   */
  public clearBinding() {
    // 清空所有 binder 对自己引用
    // 再清空存储的 binders
    this.keyBinders.forEach(keyBinder => {
      keyBinder.delete(this)
    })

    this.keyBinders.clear()
  }
}
