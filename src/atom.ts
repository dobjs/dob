import { endBatch, runObserver, startBatch } from "./observer"
import { Func, globalState, IObserver, noop } from "./utils"

/**
 * getter setter 控制器
 */
export class Atom {
  /**
   * 与这个 atom 相关的 observers
   */
  public observers = new Set<IObserver>()

  private onBecomeObservedHandler: Func
  private onBecomeUnobservedHandler: Func

  /**
   * 是否已经追踪了
   */
  private isBeingTracked = false

  constructor(onBecomeObservedHandler: Func = noop, onBecomeUnobservedHandler: Func = noop) {
    this.onBecomeObservedHandler = onBecomeObservedHandler
    this.onBecomeUnobservedHandler = onBecomeUnobservedHandler
  }

  /**
   * 上报：响应变量被使用，初始时触发 onBecomeObservedHandler
   */
  public reportObserved() {
    startBatch()

    if (globalState.currentObserver) {
      // 绑定上当前 observer
      this.observers.add(globalState.currentObserver)
    }

    if (!this.isBeingTracked) {
      this.isBeingTracked = true
      this.onBecomeObservedHandler()
    }

    endBatch()
  }

  /**
   * 上报：响应变量发生了修改，会重新触发 observe
   */
  public reportChanged() {
    startBatch()

    // 执行它
    this.observers.forEach(observer => {
      runObserver(observer)
    })

    endBatch()
  }

  /**
   * 取消 observe
   */
  public unobserve() {
    this.isBeingTracked = false
    this.onBecomeUnobservedHandler()
  }
}
