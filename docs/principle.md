# 原理

我们将 `observe` 中回调函数称为：`observer`。

如果单纯的实现 `observable`，使用 proxy 的话很简单，可以完全监听对象的变化，难点在于如何在 `observe` 回调函数中执行依赖追踪，并当 `observable` 对象触发 `setter` 时，触发使用了此对象的回调。

我们必须依赖全局保存的变量才能做到这一点，因为 `observable` 与 `observe` 的过程是分开的。

要达到的效果时，每一个 `observer` 函数中访问到的对象，都要将所访问的 `target` 与 `key` 存储起来，当任何时候调用了这个对象的 `key`，我们拿到与其绑定的函数执行即可。

需要预定义的全局保存的变量：

| 变量名 | 类型 |  含义  |
| -------- | -------- |
| proxies | WeakMap | 所有代理对象都存储于此，当重复执行 `observable` 或访问对象子属性时，如果已经是 `proxy` 就从 `proxies` 中取出返回 |
| observers | WeakMap<object, Map<PropertyKey, Set<Observer>>> | 任何对象的 `key` 只要被 `get`，就会被记录在这里，同时记录当前的 `observer`，当任意对象被 `set` 时，根据此 map 查询所有绑定的 `observer` 并执行，就达到 `observe` 的效果了 |
| currentObserver | Observer | 当前的 `observer`。当执行 `observe` 时，当前 `observer` 指向其第一个回调函数，这样当代理被访问时，保证其绑定的 `observer` 是其当前所在的回调函数。 |
| queuedObservers | Set<Observer> | 执行队列中的 `observer`。