import { Action, Atom, IObserver, observable, observe } from "../../index"

export function isPromiseLike<T>(result: PromiseLike<T> | T): result is PromiseLike<T> {
  return result && typeof (result as any).then === "function";
}

/**
 * The type returned by the `computedAsync` function. Represents the current `value`. Accessing
 * the value inside a reaction will automatically listen to it, just like an `observable` or
 * `computed`. The `busy` property is `true` when the asynchronous function is currently running.
 */
export interface IComputedAsyncValue<T> {
  /** The current value (observable) */
  readonly value: T;
  readonly status: {
    /** True if an async evaluation is in progress */
    readonly busy: boolean;
    /** True if Promise was rejected */
    readonly failed: boolean;
    /** The error from the rejected promise, or undefined */
    readonly error: any;
  }
}

export interface IComputedAsyncOptions<T> {
  readonly init: T;
  readonly fetch: () => PromiseLike<T> | T;
  readonly delay?: number;
  readonly revert?: boolean;
  readonly name?: string;
  readonly error?: (error: any) => T;
  readonly rethrow?: boolean;
}

class ComputedAsync<T> implements IComputedAsyncValue<T> {

  public status = observable({
    busy: false,
    failed: false,
    error: null
  })

  private atom: Atom;
  private cachedValue: T;
  private version = 0;
  private monitor: IObserver;

  constructor(private options: IComputedAsyncOptions<T>) {
    this.atom = new Atom(() => this.wake(), () => this.sleep());
    this.cachedValue = options.init;
  }

  private wake() {
    this.sleep();

    this.monitor = observe(() => this.observe(), this.options.delay)
  }

  private observe(): void {
    const thisVersion = ++this.version;

    if (this.options.revert) {
      this.cachedValue = this.options.init;
      this.atom.reportChanged();
    }

    const current = <P>(f: (arg: P) => void) => (arg: P) => {
      if (this.version === thisVersion) {
        f(arg)
      }
    };

    try {
      const possiblePromise = this.options.fetch();
      if (!isPromiseLike(possiblePromise)) {
        this.stopped(false, undefined, possiblePromise);
      } else {
        this.starting();
        possiblePromise.then(
          current((v: T) => this.stopped(false, undefined, v)),
          current((e: any) => this.handleError(e)));
      }
    } catch (x) {
      this.handleError(x);
    }
  }

  @Action private starting() {
    this.status.busy = true;
  }

  @Action private stopped(f: boolean, e: any, v: T) {
    this.status.busy = false;
    this.status.failed = f;
    this.status.error = e;

    if (v !== this.cachedValue) {
      this.cachedValue = v;
      this.atom.reportChanged();
    }
  }

  private handleError(e: any) {
    let newValue = this.options.init;

    if (this.options.error) {
      try {
        newValue = this.options.error(e);
      } catch (x) {
        //
      }
    }

    this.stopped(true, e, newValue);
  }

  private sleep() {

    const monitor = this.monitor;
    this.monitor = undefined;

    if (monitor) {
      monitor.unobserve()
    }
  }

  get value() {
    this.atom.reportObserved();

    if (this.status.failed && this.options.rethrow) {
      throw this.status.error;
    }

    return this.cachedValue;
  }
}

export function computedAsync<T>(
  init: T,
  fetch: () => PromiseLike<T> | T,
  delay?: number): IComputedAsyncValue<T>;

export function computedAsync<T>(
  options: IComputedAsyncOptions<T>
): IComputedAsyncValue<T>;

export function computedAsync<T>(
  init: T | IComputedAsyncOptions<T>,
  fetch?: () => PromiseLike<T> | T,
  delay?: number
) {
  if (arguments.length === 1) {
    return new ComputedAsync<T>(init as IComputedAsyncOptions<T>);
  }

  return new ComputedAsync<T>({
    init: init as T,
    fetch: fetch!,
    delay
  });
}
