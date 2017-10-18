import { IDebugInfo } from "../global-state"
export declare type EventType = number | string

/**
 * 事件
 */
export interface IEvent {
  callback: (context?: any) => void
}

export type ICallback = (context?: any) => void

export class Event {
  // 所有事件
  private events: Map<EventType, IEvent[]> = new Map()

  /**
   * 订阅事件
   */
  public on(eventType: "debug", callback: (context?: IDebugInfo) => void): void
  public on(eventType: EventType, callback: ICallback): void {
    const event: IEvent = {
      callback
    }

    if (this.events.get(eventType)) {
      // 存在, push 一个事件监听
      this.events.get(eventType).push(event)
    } else {
      // 不存在, 赋值
      this.events.set(eventType, [event])
    }
  }

  /**
   * 取消订阅
   */
  public off(eventType: EventType, callback: ICallback) {
    if (!this.events.get(eventType)) {
      return false
    }

    const events = this.events.get(eventType).filter(event => {
      return event.callback !== callback
    })

    this.events.set(eventType, events)

    return true
  }

  /**
   * 广播事件
   */
  public emit(eventType: EventType, context?: any) {
    if (!eventType || !this.events.get(eventType)) {
      return false
    }

    this.events.get(eventType).forEach(event => {
      event.callback(context)
    })
  }
}
