# 原理

dob 只对外暴露了三个 api：`observable` `observe` `Action`，分别是 **动态化对象**、 **变化监听** 与 **懒追踪辅助函数**。

下面以开发角度描述实现思路，同时作为反思，如果有更优的思路，我会随时更新。

## 1. 术语解释

本库包含许多抽象概念，为了简化描述，使用固定单词指代，约定如下：

| 单词 | 含义 |
| -------- | -------- |
| observable | dob 提供的最重要功能，将对象动态化的函数 |
| observe | 监听其回调函数中**当前访问到的** observable 化的对象的修改，并在值变化时重新出发执行 |
| observer | 指代 observe 中的回调函数 |

## 2. 总体思路

如果单纯的实现 `observable`，使用 proxy 很简单，可以完全监听对象的变化，难点在于如何在 `observe` 中执行依赖追踪，并当 `observable` 对象触发 `set` 时，触发对应 `observe` 中的 `observer`。

每个 `observable` 对象触发 `get` 时，都将当前所在的 `object` + `key` 与当前 `observer` 对应关系存储起来，当其被 `set` 时，拿到对应的 `observer` 执行即可。

我们必须依赖持久化变量才能做到这一点，因为 `observable` 的 `set` 过程，与 `observer` 的 `get` 的过程是分开的。

## 3. 定义持久化变量

| 变量名 | 类型 |  含义  |
| -------- | -------- | --------- |
| proxies | WeakMap | 所有代理对象都存储于此，当重复执行 `observable` 或访问对象子属性时，如果已经是 `proxy` 就从 `proxies` 中取出返回 |
| observers | WeakMap<object, Map<PropertyKey, Set<Observer>>> | 任何对象的 `key` 只要被 `get`，就会被记录在这里，同时记录当前的 `observer`，当任意对象被 `set` 时，根据此 map 查询所有绑定的 `observer` 并执行，就达到 `observe` 的效果了 |
| currentObserver | Observer | 当前的 `observer`。当执行 `observe` 时，当前 `observer` 指向其第一个回调函数，这样当代理被访问时，保证其绑定的 `observer` 是其当前所在的回调函数。 |

## 4. 从 observable 函数开始

对于 `observable(obj)`，按照以下步骤分析：

### 4.1. 去重

如果传入的 `obj` 本身已是 `proxy`，也就是存在于 `proxies`，直接返回 `proxies.get(obj)`。这种情况考虑到可能将对象 `observable` 执行了多次。（`proxies` 保存原对象与代理各一份，保证传入的是已代理的原对象，还是代理本身，都可以被查找到）

### 4.2. new Proxy

如果没有重复，`new Proxy` 生成代理返作为返回值。代理涉及到三处监听处理：`get` `set` `deleteProperty`。

### 4.3. get 处理

```javascript
get(target, key, receiver)
```

先判断 `currentObserver` 是否为空，如果为空，说明是在 `observer` 之外访问了对象，此时不做理会。

如果 `currentObserver` 不为空，将 `object` + `key` -> `currentObserver` 的映射记录到 `observers` 对象中。同时为 `currentObserver.observedKeys` 添加当前的映射引用，当 `unobserve` 时，需要读取 `observer.observedKeys` 属性，将 `observers` 中所有此 `observer` 的依赖关系删除。

最后，如果 `get` 取的值不是对象(`typeof obj !== "object"`)，那么是基本类型，直接返回即可。如果是对象，那么：

1. 如果在 `proxies` 存在，直接返回 `proxy` 引用。eg： `const name = obj.name`，这时 `name` 变量也是一个代理，其依赖也可追踪。
2. 如果在 `proxies` 不存在，将这个对象重新按照如上流程处理一遍，**这就是惰性代理**，比如访问到 `a.b.c`，那么会分别将 `a` `b` `c` 各走一遍 get 处理，这样无论其中哪一环，都是代理对象，可追踪，相反，如果 `a` 对象还存在其他字段，因为没有被访问到，所以不会进行处理，其值也不是代理，因为没有访问的对象也没必要追踪。

### 4.4. set 处理

```javascript
set(target, key, value, receiver)
```

如果新值与旧值不同，或 `key === "length"` 时，就认为产生了变化，找到当前 `object` + `key` 对应的 `observers` 队列依次执行即可。有两个注意点：

1. 执行前先将当前执行的 `observer` 绑定关系清空：因为 `observer` 时会触发新一轮绑定，这样实现了条件的动态绑定。
2. 执行前设置 `currentObserver` 为当前 `observer`，再执行 `observer` 时就可以将 `set` 正确绑定上。

### 4.5 deleteProperty

删除属性时，直接触发对应 `observer`。

### 4.6 Map WeakMap Set WeakSet 的情况

这些类型的特点是有明确封装方法，其实更容易设置追踪，这次不使用 proxy，而是复写这些对象的方法，在 `get` `set` 中加上钩子。

## 5. observe 函数

立刻执行当前回调 `observer`，执行规则与 4.4 小节的 `observers` 队列执行机制相同。

有人会有疑惑，为什么 `observe` 要立即执行内部回调呢？如果初始化不不输出，结果可能会好看一些：

```typescript
import { observable, observe } from "dob"

const dynamicObj = observable({
    a: 1
})

observe(() => {
    console.log('a:', dynamicObj.a)
})

dynamicObj.a = 2
```

以上会输出两次，分别是 `a: 1` 和 `a: 2`。另外，可能会觉得这样与 react 结合，会不会导致初始化时增加不必要的渲染？

这两个都是很好的问题，但结论是：初始化执行是必要的：

1. 如果初始化不执行，就没有办法执行初始数据绑定，那么后续的赋值完全找不到对应的 `observer` 是什么（除非做静态分析，但稍稍复杂些就不可能了）。
2. 结合 react 时，通过生命周期 mixins 来覆写 `render` 函数，将初始化的 `observe` 绑定与后续 `render` 函数分离，达到**首次 render 是 `observe` 初始化触发，后续 render 依靠依赖追踪自动触发** 的效果，在 `dob-react` 章节会有深入介绍。

## 6. Action

`Action` 是用于写标准 action 的装饰器，有以下两种写法：

```typescript
@Action setUserName() {..}
Action(setUserName)
```

起作用是将回调函数中发生的变更临时存储起来，当执行完时统一触发，并且同一个 `observer` 的多次 `set` 行为只会触发一次，并且执行时，获取到的是最终值，所有值的中间变化过程都会被忽略。

比如: 当 `dynamicObj.a` 初始值为 1 时，下面的代码不会触发 `observer` 执行：

```typescript
Action(()=> {
  dynamicObj.a = 2
  dynamicObj.a = 1
})
```

## 7. 调用栈深度统计

要达到上面效果，需要额外定义一个持久化变量 `trackingDeep`，每次 `Action` 执行时，这个变量先自增 1，执行 `observer` 时，如果 `trackingDeep` 不为 0，就把 `observer` 存储在队列中，当回调函数执行完后，深度减 1，开始执行存储的队列，同样，如果深度不为 1 就跳过，深度为 0 就执行。

我们假象这种场景：

```typescript
class Test {
  @Action setUser(info) {
    this.userStore.account = info.account
    this.setName(info.name)
  }

  @Action setName(name) {
    this.userStore.name = name
  }
}
```

当调用 `setUser` 时，其内部又调用了 `setName`，那么执行 `setUser` 时，`trackingDeep` 为 1，之后又执行到 `setName` 使得 `trackingDeep` 变成 2，内层 `Action` 执行完毕，`trackingDeep` 变回 1，此时队列不会执行，调用栈回退到 `setName` 后，`trackingDeep` 终于变成 0，队列执行，此时`observer` 仅触发了一次。

> Tips: 这里有个优化点，当 `trackingDeep` 不为 0 时，终止 `dob` 的依赖收集行为。这么做的好处是，当 react render 函数中，同步调用 action 时，不会绑定到这个 action 用到的变量。

### 7.1 缺点

`Action` 的概念存在一个严重的缺点（但不致命），同时也是 `mobx` 库一直没有解决的问题，那就是对于异步 action 无可奈何（除非为异步 action 分段使用 `Action`，这也是 mobx 官方推荐的方式，也有 babel 插件来解决，但这样很 hack）。

我们思考如下代码：

```typescript
class Test {
  @Action async getUser() {
    this.isLoading = true
    const result = await fetch()
    this.isLoading = false
    this.user = result 
  }
}
```

首先我们不希望它是忽略中间态的，否则初始将 `isLoading` 设置为 true 就没有意义了。

比较好的途径是，将这个异步 action 触发的 `observer` 塞入到队列中，每当遇到 `await` 就执行并清空队列，同时还可以支持 `timeout` 设定，比如设置为 100ms 时，如果 fetch 函数在 100ms 内执行完毕，就不会执行之前的队列，达到肉眼无法识别的间隔内不触发 loading 的效果。

理想很美好，可惜难点不在如何实现如上的设定，而是**我们没办法将队列分隔开**，考虑如下代码：

```typescript
handleClick() {
  this.props.Test.getUser()
  this.props.Test.getArticle()
}
```

`getUser` 与 `getArticle` 都是异步的，如果我们将缓存队列共用一个，那么 `getArticle` 执行到 `await` 时，顺便会邪恶的把 `getUser` 队列中 `observer` 给执行了，纵使 `getUser` 的 `await` 还没有结束（可能出现 loading 在数据还没加载完成就消失）。

有人说，将 `getUser` 与 `getArticle` 队列分开不就行了吗？是的，但目前 javascript 还做不到这一点，见[此处讨论](https://github.com/mobxjs/mobx/issues/905)。无论是 `defineProperty` 还是 `proxy`，都无法在 `set` 触发时，知道自己是从哪个闭包中被触发的。只知道触发的对象，以及被访问的 key，是没办法将 `getUser` `getArticle`
放在不同队列执行 `observer` 的。

目前我的做法与 mobx 一样，`async` 函数会打破 `Action` 的庇护，失去了收集后统一执行的特性，但保证了程序的正确运行。目前的解决方法是，为同步区域再套一层 `Action`，或者干脆将异步与同步分开写！

> 说实话，这个问题被 redux 用概念巧妙规避了，我们必须将这个函数拆成两个 dispatch。回头想想，如果我们也这么做，也完全可以规避这个问题，拆成两个 action 即可！但我希望有一天，能找到完美的解决方法。
> 另外希望表达一点，redux 的成功在于定义了许多概念与规则，只要我们遵守，就能写出维护性很棒的代码，其实 oo 思想也是一样！我们在使用 oo 时，将对 fp 的耐心拿出来，一样能写出维护性很棒的代码。

## 8. dob-react

dob-react 是 dob 在 react 上的应用，类似于 mobx-react 相比于 mobx。实现思路与 mobx-react 很接近，但是简化了许多。

dob-react 只暴露了两个接口 `Provider` 与 `Connect`，分别用于 **数据初始化** 与 **绑定更新与依赖注入**

### 8.1 从 Provider 开始

Provider 将接收到的所有参数全局透传到组件，因此实现很简单，将接收到的所有字段存在 context 中即可。

### 8.2 Connect 的依赖注入

这个装饰器用于 react 组件，分别提供了绑定更新与依赖注入的功能。

由于 dob-react 是与 dob 结合使用的，因此会将全量 store 数据注入到 react 组件中，由于依赖追踪的特性，不会造成不必要的渲染。

注入通过高阶组件方式，从 context 中取出 Provider 阶段注入的值，直接灌给自组件即可，注意组件自身的 props 需要覆盖注入数据：

```typescript
export default function Connect(componentClass: any): any {
    return class InjectWrapper extends React.Component<any, any>{
        // 取 context
        static contextTypes = {
            dyStores: React.PropTypes.object
        }

        render() {
            return React.createElement(componentClass, {
                ...this.context.dyStores,
                ...this.props,
            })
        }
    }
}
```

### 8.3 Connect 的绑定更新

见如上代码，我们通过拿到当前子组件的实例：`componentClass.prototype || componentClass` 将其生命周期函数重写为，先执行自定义函数钩子，再执行其自身，而且自定义函数钩子绑定上当前 `this`，可以在自定义勾子修改当前实例的任意字段，后续重写 render 也是依赖此实现的。

#### 8.3.1 willMount 生命周期钩子

最重要阶段是在 willMount 生命周期完成的，因为对于 `observer` 来说，只要在初始化时绑定了引用，之后更新都是从 `observe` 中自动触发的。

整体思路是复写 render 方法：

1. 在第一次执行时，通过 `observe` 包裹住原始 render 方法执行，因此绑定了依赖，将此时 render 结果直接返回即可。
2. 非第一次执行，是由第一次执行时 `observe` 自动触发的（或者 state、props 传参变化，这些不管），此时可以确定是由数据流变动导致的刷新，因此可以调用 `componentWillReact` 生命周期。然后调用 `forceUpdate` 生命周期，因为重写了 render 的缘故，视图不会自动刷新。
3. 由 state、props 变化导致的刷新，只要返回原始 render 即可。

> 注意第一次调用时，无论如何会触发一次 `observer`，为了忽略此次渲染，我们设置一个是否渲染的 flag，当 observer 渲染了，普通 render 就不再执行，由此避免 `observe` 初始化必定执行一次带来初始渲染两次的问题。

#### 8.3.2 其他生命周期钩子

在 `componentWillUnmount` 时 `unobserve` 掉当前组件的依赖追踪，给 `shouldComponentUpdate` 加上 pureRender，以及在 `componentDidMount` 与 `componentDidUpdate` 时通知 devTools 刷新，这里与 mobx-react 实现思路完全一致。

## 9. 写在最后

最后给出 dob 的[项目地址](https://github.com/ascoders/dob)，欢迎提出建议和把玩。
