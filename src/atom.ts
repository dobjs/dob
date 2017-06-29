import { Func, noop } from "./utils"
/**
 * getter setter 控制器
 */
export class Atom {
  private onBecomeObservedHandler: Func
  private onBecomeUnobservedHandler: Func

  constructor(onBecomeObservedHandler: Func = noop, onBecomeUnobservedHandler: Func = noop) {
    this.onBecomeObservedHandler = onBecomeObservedHandler
    this.onBecomeUnobservedHandler = onBecomeUnobservedHandler
  }

  /**
   * 上报：响应变量被使用
   */
  public reportObserved() {
    //
  }

  /**
   * 上报：响应变量发生了修改
   */
  public reportChanged() {
    //
  }
}
