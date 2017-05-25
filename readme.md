# 1. 简介

<a href="https://travis-ci.org/ascoders/dynamic-object"><img src="https://img.shields.io/travis/ascoders/dynamic-object/master.svg?style=flat" alt="Build Status"></a>

## 1.1. dynamic-object 是什么

[dynamic-object](https://github.com/ascoders/dynamic-object) 是对象包装工具，顾名思义，让对象“动态”化。

这个库的功能与 [mobx](https://github.com/mobxjs/mobx) 很像，同时借鉴了 [nx-js](https://github.com/nx-js/observer-util) 实现理念。给力的地方在于，不支持 ie11 浏览器！非常激进，核心使用 `proxy`，抛弃兼容性换来的是超高的性能，以及完美的动态绑定。

核心用例：

```typescript
import { observable, observe } from "dynamic-object"

const dynamicObj = observable({
    a: 1
})

observe(() => {
    console.log("dynamicObj.a has changed to", dynamicObj.a) 
})

dynamicObj.a = 2
```

控制台会输出两行：

`dynamicObj.a has changed to 1`

`dynamicObj.a has changed to 2`

第一行是初始化时的输出，第二行是 `dynamicObj.a = 2` 这个赋值语句触发后，由于 console.log 所在闭包函数访问到了 `dynamicObj.a`，导致函数再次被执行。

以上是这个库的核心功能，所有的一切都围绕这个功能展开。

## 1.2. 安装

```bash
yarn add dynamic-object --save
```

这个库导出的核心方法一共只有三个：

```typescript
import { observe, observable, Action } from "dynamic-object"
```

`observe` 与 `observable` 在核心用例有所介绍，后续有详细说明。

`Action` 可以作为函数或装饰器使用，作用是在函数体执行完后，统一触发一次 `observe`，是性能优化的必备工具。

## 1.3. 稳定性

目前通过了 100%（50个）[测试用例](https://github.com/ascoders/dynamic-object/blob/master/src/main.test.ts)

# 2. 核心 api - observable
 
`observable` 使用 proxy，返回对象代理，目的是监听对象的一举一动。

## 2.1. 功能

`observable` 支持 object、array、Map、WeakMap、Set、WeakSet，支持动态绑定、条件分支

### 2.1.1. 支持类型

`dynamic-object` 支持情况如下表：


| 类型 | 支持程度 |
| -------- | -------- |
| object     | 支持普通成员变量、嵌套成员变量，以及没有初始化的变量的访问、移除的依赖追踪     |
| array | 支持单值访问、push splice pop unshift map foreach reduce 等操作的依赖追踪 |
| Map | 支持 has, get, forEach, keys, values, entries, delete, clear，以及 value 为任意嵌套对象的依赖追踪 |
| WeakMap | 支持 has, delete，以及 value 为任意嵌套对象的依赖追踪 |
| Set | 支持 has, forEach, keys, values, entries, delete, clear，以及 value 为任意嵌套对象的依赖追踪 |
| WeakSet | 支持 has, delete，以及 value 为任意嵌套对象的依赖追踪 |


以下是例子：

```typescript
import { observable, observe } from "dynamic-object"

const dynamicObj = observable({
	testNestObj: {
		nickname: "bob"
	},
	testArray: [1, 2, 3],
	testMap: new Map(["foo", "is"])
})

observe(() => {
    console.log(
		dynamicObj.testNestObj.nickname + 
		dynamicObj.testMap.get("foo") +
		dynamicObj.testArray.length
	) 
})

dynamicObj.testNestObj.nickname = "john"
dynamicObj.testArray.push(4)
dynamicObj.testMap.set("foo", "has")
```

以上会输出 4 次 log，分别是：

`bob is 3`
`john is 3`
`bob is 4`
`bob has 4`

如果希望合并后三次输出，请使用 [Action](action)

### 2.1.2. 动态绑定

对于没有初始化的变量，也可以依赖追踪：

```typescript
import { observable, observe } from "dynamic-object"

const dynamicObj = observable({})

observe(() => {
    console.log("dynamicObj.a has changed to", dynamicObj.a) 
})

dynamicObj.a = 1
```

输出两条分别是：

`dynamicObj.a has changed to undefined`
`dynamicObj.a has changed to 1`

### 2.1.3. 条件分支

```typescript
import { observable, observe } from "dynamic-object"

const dynamicObj = observable({
    a: true,
    b: 1,
    c: 2
})

observe(() => {
    console.log("run")

    if (dynamicObj.a) {
        value = dynamicObj.b
    } else {
        value = dynamicObj.c
    }
})

dynamicObj.a = false
dynamicObj.b = 3
```

初始 `dynamicObj.a === true` 所以与 a,b 这两个属性绑定，当设置 a 为 false 后，转而与 a,c 这两个属性绑定，此时再修改 b 不会有效果。

## 2.2. 注意点
 
只有使用  `observable`  包裹的对象，才能在 `observe` 中生效绑定，比如下面的代码是无效的：

```typescript
import { observe } from "dynamic-object"

const obj = {
    a: 1
}

observe(() => {
    console.log("obj.a has changed to", obj.a) 
})

obj.a = 2
```

以上代码只会输出一行 `obj.a has changed to 1`，之后 `obj.a = 2` 的修改不会生效。

---

## 2.3. unobserve

可以中断对依赖追踪的监听。

### 2.3.1. 示例

```typescript
import { observe, observable } from 'dynamic-object'

const dynamicObj = observable({
    a: 1
})

const signal = observe(() => {
    console.log('dynamicObj.a change to', dynamicObj.a) 
})

signal.unobserve()
dynamicObj.a = 2
```

以上只会输出一个 `dynamicObj.a change to 1`，之后的 2 不会再输出了。

---

# 3. 核心 api -  Action

## 3.1. 概念

`Action` 是为了减少依赖追踪触发次数，将所有变更收集起来，再合并触发。

## 3.2. 作为函数使用

```typescript
import { observe, observable, Action } from 'dynamic-object'

const dynamicObj = observable({
    a: 1
})

observe(() => {
    console.log('dynamicObj.a change to', dynamicObj.a)
})

Action(()=> {
	dynamicObj.a = 2
    dynamicObj.a = 3
})
```

以上会输出两条信息：

`dynamicObj.a change to 1`
`dynamicObj.a change to 3`

可见有2次修改被合并了。

## 3.3. 作为装饰器使用

```typescript
import { observe, observable, Action } from 'dynamic-object'

const dynamicObj = observable({
    a: 1
})

observe(() => {
    console.log('dynamicObj.a change to', dynamicObj.a)
})

class CustomAction {
    @Action someAction() {
        dynamicObj.a = 2
        dynamicObj.a = 3
		this.otherAction()
	}
	
	@Action otherAction() {
		dynamicObj.a = 4
		dynamicObj.a = 5
	}
}

new CustomAction().someAction()
```

以上会输出两条信息：

`dynamicObj.a change to 1`
`dynamicObj.a change to 5`

可见有4次修改被合并了。

---

# 4. 核心 api -  dynamic-react

## 4.1. 概念
 
`dynamic-react` 是连接 `dynamic-object` 与 `react` 的桥梁。

## 4.2. 安装

```bash
yarn add dynamic-react --save
```

## 4.3. 快速入手
 
最简单的用法如下：
 
```javascript
import { Action } from 'dynamic-object'
import { Provider, Connect } from 'dynamic-react'

export class UserStore {
    name = 'bob'
}

export class UserAction {
    store = new UserStore()

    @Action setName (name: string) {
        this.store.name = name
    }
}

@Connect
class App extends React.Component {
    render() {
        return (
            <span>{this.props.store.name}</span>
        )
    }
}

const userAction = new UserAction()

ReactDOM.render(
    <Provider action={userAction} store={userAction.store}>
        <App />
    </Provider>
, document.getElementById('react-dom'))
```
 
例子中，`Provider` 接收了两个参数，分别是 `store` 与 `action`，分别被注入到 props 的 `props.store` 与 `props.action` 中，这么做只是为了标准化取数与改数。如果希望程序具有良好的可维护性，不要在 react 组件任何生命周期直接修改 `store`，所有修改请通过调用 `action` 完成。

`Provider` 会将传入的数据自动用 `observable` 包裹，因此当任何数据有更新时，使用的组件都会触发重渲染。

其实它会将所有参数注入到 `props` 中，因此也可以这么使用：

```typescript
const data = {
    a: "a",
    b: "b"
}

<Provider {...data} />
```

那么就可以在组件中如此访问属性：`this.props.a` `this.props.b` 了。
 
## 4.4. 使用依赖注入

使用依赖注入可以使数据流更加灵活，需要安装一个额外的包 `dependency-inject`：
 
```javascript
yarn add dependency-inject --save
```
 
先创建 `store.js`
 
```javascript
import { Action } from 'dynamic-object'
import { inject, Container } from 'dependency-inject'

export class UserStore {
    name = 'bob'
}

export class UserAction {
    @inject(Store) UserStore: Store

    @Action setName (name: string) {
        this.store.name = name
    }
}

const container = new Container()
container.set(UserStore, new UserStore())
container.set(UserAction, new UserAction())

export { container }
```

再创建 `app.js`

```javascript
import { Provider, Connect } from 'dynamic-react'
import { UserStore, UserAction, container } from './store'

@Connect
class App extends React.Component {
    componentWillMount () {
        this.props.action.setName('nick')
    }

    render() {
        return (
            <span>{this.props.name}</span>
        )
    }
}

ReactDOM.render(
    <Provider store={container.get(UserStore)} action={container.get(UserAction)}>
        <App />
    </Provider>
, document.getElementById('react-dom'))
```

以上比较适合大型项目开发，将 action store 单独抽离出来，通过依赖注入相互注入。

## 4.5. 特点

在 `@Connect` 时，不需要传入注入数据的名称，由于自动依赖收集的缘故，所有数据都会全量注入，但更新粒度会自动控制在最小，做到了方便开发，同时提升效率。

---