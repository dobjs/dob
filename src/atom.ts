import { globalState } from "./global-state"
import { endBatch, runReaction, startBatch } from "./observer"
import { Reaction } from "./reaction"
import { Func, noop } from "./utils"

export class Atom {
  /**
   * All reactions with this atom.
   */
  public reactions = new Set<Reaction>()

  private onBecomeObservedHandler: Func
  private onBecomeUnobservedHandler: Func

  private isBeingTracked = false

  constructor(onBecomeObservedHandler: Func = noop, onBecomeUnobservedHandler: Func = noop) {
    this.onBecomeObservedHandler = onBecomeObservedHandler
    this.onBecomeUnobservedHandler = onBecomeUnobservedHandler
  }

  /**
   * Report observe, will trigger onBecomeObservedHandler in the first time.
   */
  public reportObserved() {
    startBatch()

    if (globalState.currentReaction) {
      // Binding current reaction
      this.reactions.add(globalState.currentReaction)
    }

    if (!this.isBeingTracked) {
      this.isBeingTracked = true
      this.onBecomeObservedHandler()
    }

    endBatch()
  }

  /**
   * report changed, so will trigger all reactions.
   */
  public reportChanged() {
    this.reactions.forEach(reaction => {
      runReaction(reaction)
    })
  }

  public unobserve() {
    this.isBeingTracked = false
    this.reactions.clear()
    this.onBecomeUnobservedHandler()
  }
}
