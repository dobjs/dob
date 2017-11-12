import { globalState } from "./global-state"
import { IBinder, IKeyBinder, inTrack } from "./utils"

type IFunc = (...args: any[]) => any

export class Reaction {
  private name: string

  // Run reaction's delay.
  private delay: number = null

  // Binders for this reaction.
  // Binder include callback, and it's detail info, like delay.
  private keyBinders = new Set<IKeyBinder>()

  // Callback for this reaction.
  private callback: IFunc

  constructor(name: string, callback: IFunc, delay?: number) {
    this.name = name
    this.callback = callback
    this.delay = delay
  }

  /**
   * The variables accessed in track are bound to the current reaction, which triggers binder's callback when the variables are modified.
   * @TODO: Current only support synchronization, do not support asynchronous!
   */
  public track(callback?: IFunc) {
    // If it is already in track, add this directly to the pendingTrack queue, and return.
    // When the lastest runObserver is executed, current pendingTrack will executed.
    if (inTrack()) {
      globalState.pendingTracks.add(this.track.bind(this, callback))
      return
    }

    /**
     * Run callback.
     */
    globalState.currentReaction = this
    // Clear bindings first.
    this.clearBinding()
    try {
      callback({
        debugId: globalState.currentDebugId
      })
    } finally {
      globalState.currentReaction = null
    }

    /**
     * Execute the rest of the track.
     */
    let currentRunCount = 0
    const MAX_RUN_COUNT = 1000
    // Copy pendingTracksqueue to prevent dead loop.
    // When the copy is finished, empty the origin queue, so that the execution is added to the clean new queue.
    const pendingTacksCopy = Array.from(globalState.pendingTracks)
    globalState.pendingTracks.clear()

    pendingTacksCopy.forEach(eachTack => {
      currentRunCount++

      if (currentRunCount >= MAX_RUN_COUNT) {
        // tslint:disable-next-line:no-console
        console.warn("The number of executions reaches the upper limit, there may be a dead cycle.")
        globalState.pendingTracks.clear()
        return
      }

      eachTack()
    })
  }

  /**
   * Destroy
   */
  public dispose() {
    this.clearBinding()
    this.callback = null
  }

  /**
   * Run reaction's callback.
   */
  public run() {
    if (this.callback) {
      this.callback()
    }
  }

  /**
   * Add binder.
   */
  public addBinder(keyBinder: IKeyBinder) {
    this.keyBinders.add(keyBinder)
  }

  /**
   * Clear bindings.
   */
  public clearBinding() {
    // Clear all binder which reference this.
    this.keyBinders.forEach(keyBinder => {
      keyBinder.delete(this)
    })

    // Clear self keyBinders.
    this.keyBinders.clear()
  }
}
