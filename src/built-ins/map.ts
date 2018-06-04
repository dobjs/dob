import { globalState } from "../global-state";

const native: any & {
  [x: string]: any;
} =
  Map.prototype;
const masterKey = Symbol("Map master key");

const getters = ["has", "get"];
const iterators = ["forEach", "keys", "values", "entries", Symbol.iterator];
const all = ["set", "delete", "clear"].concat(getters, iterators as any);

interface IcustomObject {
  $raw: any;
  [x: string]: any;
}

export default function shim<T extends IcustomObject>(
  target: T & any,
  bindCurrentReaction: any,
  queueRunReactions: any,
  proxyValue: any
) {
  target.$raw = {};

  for (const method of all) {
    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target.$raw[method] = function() {
      native[method].apply(target, arguments);
    };
  }

  for (const getter of getters) {
    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target[getter] = function(key: string) {
      let value = native[getter].apply(this, arguments);

      globalState.event.emit("get", { target, key, value });

      value = proxyValue(this, key, value);

      bindCurrentReaction(this, key);

      return value;
    };
  }

  for (const iterator of iterators) {
    // tslint:disable-next-line:space-before-function-paren only-arrow-functions
    target[iterator] = function() {
      bindCurrentReaction(this, masterKey);
      return native[iterator].apply(this, arguments);
    };
  }

  // tslint:disable-next-line:space-before-function-paren only-arrow-functions
  target.set = function(key: string, value: any) {
    const oldValue = this.get(key);
    const result = native.set.apply(this, arguments);

    globalState.event.emit("set", { target, key, oldValue, value });

    if (oldValue !== value) {
      queueRunReactions(this, key);
      queueRunReactions(this, masterKey);
    }
    return result;
  };

  // tslint:disable-next-line:space-before-function-paren only-arrow-functions
  target.delete = function(key: string) {
    const has = this.has(key);
    const result = native.delete.apply(this, arguments);

    globalState.event.emit("deleteProperty", { target, key });

    if (has) {
      queueRunReactions(this, key);
      queueRunReactions(this, masterKey);
    }
    return result;
  };

  // tslint:disable-next-line:space-before-function-paren only-arrow-functions
  target.clear = function() {
    const size = this.size;
    const result = native.clear.apply(this, arguments);
    if (size) {
      queueRunReactions(this, masterKey);
    }
    return result;
  };

  Object.defineProperty(target, "size", {
    get: function get() {
      const proto = Object.getPrototypeOf(this);
      const size = Reflect.get(proto, "size", this);
      bindCurrentReaction(this, masterKey);
      return size;
    }
  });

  return target;
}
