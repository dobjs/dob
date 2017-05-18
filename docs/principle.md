# 原理

下面以开发角度描述实现思路，同时作为对代码实现的反思。

## 1 术语解释

本库包含许多抽象概念，为了简化描述，使用固定单词指代，约定如下：

| 单词 | 含义 |
| -------- | -------- |
| observable | dynamic-object 提供的最重要功能，将对象动态化的函数 |
| observe | 监听其回调函数中**当前访问到的** observable 化的对象的修改，并在值变化时重新出发执行 |
| observer | 指代 observe 中的回调函数 |

## 2 总体思路

如果单纯的实现 `observable`，使用 proxy 很简单，可以完全监听对象的变化，难点在于如何在 `observe` 中执行依赖追踪，并当 `observable` 对象触发 `set` 时，触发对应 `observe` 中的 `observer`。

每个 `observable` 对象触发 `get` 时，都将当前所在的 `object` + `key` 与当前 `observer` 对应关系存储起来，当其被 `set` 时，拿到对应的 `observer` 执行即可。

我们必须依赖持久化变量才能做到这一点，因为 `observable` 的 `set` 过程，与 `observer` 的 `get` 的过程是分开的。

## 3 定义持久化变量

| 变量名 | 类型 |  含义  |
| -------- | -------- | --------- |
| proxies | WeakMap | 所有代理对象都存储于此，当重复执行 `observable` 或访问对象子属性时，如果已经是 `proxy` 就从 `proxies` 中取出返回 |
| observers | WeakMap<object, Map<PropertyKey, Set<Observer>>> | 任何对象的 `key` 只要被 `get`，就会被记录在这里，同时记录当前的 `observer`，当任意对象被 `set` 时，根据此 map 查询所有绑定的 `observer` 并执行，就达到 `observe` 的效果了 |
| currentObserver | Observer | 当前的 `observer`。当执行 `observe` 时，当前 `observer` 指向其第一个回调函数，这样当代理被访问时，保证其绑定的 `observer` 是其当前所在的回调函数。 |

## 4 从 observable 函数下手

对于 `observable(obj)`，按照以下步骤分析：

### 4.1 去重

如果传入的 `obj` 本身已是 `proxy`，也就是存在于 `proxies`，直接返回 `proxies.get(obj)`。这种情况考虑到可能将对象 `observable` 执行了多次。（`proxies` 保存原对象与代理各一份，保证传入的是已代理的原对象，还是代理本身，都可以被查找到）

### 4.2 new Proxy

如果没有重复，`new Proxy` 生成代理返作为返回值。代理涉及到三处监听处理：`get` `set` `deleteProperty`。

### 4.3 get 处理

先判断 `currentObserver` 是否为空，如果为空，说明是在 `observer` 之外访问了对象，此时不做理会。

如果 `currentObserver` 不为空，将 `object` + `key` -> `currentObserver` 的映射记录到 `observers` 对象中。同时为 `currentObserver.observedKeys` 添加当前的映射引用，当 `unobserve` 时，需要读取 `observer.observedKeys` 属性，将 `observers` 中所有此 `observer` 的依赖关系删除。

最后，如果 `get` 取的值不是对象(`typeof obj !== "object"`)，那么是基本类型，直接返回即可。如果是对象，那么：

1. 如果在 `proxies` 存在，直接返回 `proxy` 引用。eg： `const name = obj.name`，这时 `name` 变量也是一个代理，其依赖也可追踪。
2. 如果在 `proxies` 不存在，将这个对象重新按照如上流程处理一遍，**这就是惰性代理**，比如访问到 `a.b.c`，那么会分别将 `a` `b` `c` 各走一遍 get 处理，这样无论其中哪一环，都是代理对象，可追踪，相反，如果 `a` 对象还存在其他字段，因为没有被访问到，所以不会进行处理，其值也不是代理，因为没有访问的对象也没必要追踪。

### 4.4 set 处理