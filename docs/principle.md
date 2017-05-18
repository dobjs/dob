# 原理

下面以开发角度描述实现思路，同时作为对代码实现的反思。

## 术语解释

本库包含许多抽象概念，为了简化描述，使用固定单词指代，约定如下：

| 单词 | 含义 |
| -------- | -------- |
| observable | dynamic-object 提供的最重要功能，将对象动态化的函数 |
| observe | 监听其回调函数中**当前访问到的** observable 化的对象的修改，并在值变化时重新出发执行 |
| observer | 指代 observe 中的回调函数 |

## 总体思路

如果单纯的实现 `observable`，使用 proxy 很简单，可以完全监听对象的变化，难点在于如何在 `observe` 中执行依赖追踪，并当 `observable` 对象触发 `set` 时，触发对应 `observe` 中的 `observer`。

每个 `observable` 对象触发 `get` 时，都将当前所在的 `object` + `key` 与当前 `observer` 对应关系存储起来，当其被 `set` 时，拿到对应的 `observer` 执行即可。

我们必须依赖持久化变量才能做到这一点，因为 `observable` 的 `set` 过程，与 `observer` 的 `get` 的过程是分开的。

## 定义持久化变量

| 变量名 | 类型 |  含义  |
| -------- | -------- | --------- |
| proxies | WeakMap | 所有代理对象都存储于此，当重复执行 `observable` 或访问对象子属性时，如果已经是 `proxy` 就从 `proxies` 中取出返回 |
| observers | WeakMap<object, Map<PropertyKey, Set<Observer>>> | 任何对象的 `key` 只要被 `get`，就会被记录在这里，同时记录当前的 `observer`，当任意对象被 `set` 时，根据此 map 查询所有绑定的 `observer` 并执行，就达到 `observe` 的效果了 |
| currentObserver | Observer | 当前的 `observer`。当执行 `observe` 时，当前 `observer` 指向其第一个回调函数，这样当代理被访问时，保证其绑定的 `observer` 是其当前所在的回调函数。 |

## 从 observable 函数下手

