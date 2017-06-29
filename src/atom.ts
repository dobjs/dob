import { Func, noop } from "./utils"
/**
 * getter setter 控制器
 */
export class Atom {
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
    if (!this.isBeingTracked) {
      this.isBeingTracked = true
      this.onBecomeObservedHandler()
    }
  }

  /**
   * 上报：响应变量发生了修改，会重新触发 observe
   */
  public reportChanged() {
    //
  }

  /**
   * 取消 observe
   */
  public unobserve() {
    this.isBeingTracked = false
    this.onBecomeUnobservedHandler()
  }
}
