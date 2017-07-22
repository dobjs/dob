# dynamic-object

<a href="https://travis-ci.org/ascoders/dynamic-object"><img src="https://img.shields.io/travis/ascoders/dynamic-object/master.svg?style=flat" alt="Build Status"></a>

`dynamic-object` 利用 `proxy` 完整实现了 `object.observer`。主要为 react 提供数据流功能。可以结合 `dynamic-react` 以 mutable 方式为 react 组织数据流；同时也支持融合 redux，结合 mutable 与 immutable 的优势，以 mutable 方式组织 store，以 immutable 方式更新数据。

> 功能与 [mobx](https://github.com/mobxjs/mobx) 很像，同时借鉴了 [nx-js](https://github.com/nx-js/observer-util) 实现理念。给力的地方在于，不支持 ie11 浏览器！非常激进，核心使用 `proxy`，抛弃兼容性换来的是超高的性能，以及完美的动态绑定。

核心用例：

```typescript
import { observable, observe } from "dob"

const dynamicObj = observable({
    a: 1
})

observe(() => {
    console.log("dynamicObj.a has changed to", dynamicObj.a) 
})
// output: dynamicObj.a has changed to 1

dynamicObj.a = 2
// output: `dynamicObj.a has changed to 2`
```

> [在线 Demo](https://jsfiddle.net/1q772uL0/17/)

## 安装

```bash
yarn add dob --save
```

> 新包名 dob 取代原先 dynamic-object
>
> dob = **d**ynamic-**ob**ject  = **d**ynamic-**ob**sverable

## 稳定性

目前通过了 100%（53个）[测试用例](https://github.com/ascoders/dynamic-object/blob/master/src/main.test.ts)

## 功能

### 结合 dynamic-react

以 mutable 方式管理数据流，vm 层使用 dynamic-react，只有使用到的变量发生变动，才会触发更新！

查看 [在线 Demo](https://jsfiddle.net/yp90Lep9/20/)，支持分型的 [分型 Demo](https://jsfiddle.net/g19ehhgu/9/)

- [快速入门](./docs/mutable-quick-start.md)

#### Api

`observable`、`observe`: 产生对象的代理、动态跟踪代理对象变化；`dynamic-react`: 将代理对象结合到 react 当中，自动、精确的更新组件；`Action`: 建议所有修改收敛在 action 中，且支持更新合并。

- [observable, observe](./docs/observable.md)
- [unobserbe](./docs/unobserve.md)
- [dynamic-react](./docs/dynamic-react.md)
- [Action](./docs/action.md)

### 结合 dependency-inject

以依赖注入的方式管理 store 与 action，直接查看 [在线 Demo](https://jsfiddle.net/bmea0pat/21/)，快速结合 [分型 demo](https://jsfiddle.net/ppt3ztx7/3/)

### 结合 react-redux

支持以 mutable 方式管理数据流，但 vm 层对接到 redux，虽然以可变方式修改数据，但会自动生成不可变数据！[在线 Demo](https://jsfiddle.net/56saqqvw/7/)

- [createReduxStore](./docs/createReduxStore.md)
- [task](./docs/task.md)

也可以 fork 本项目，`npm start` 就可以打开 [redux todoMVC](./src/demo/todo-mvc)！数据层依然是 mutable。

# unpkg

https://unpkg.com/dynamic-object@2.1.19/built/bundle.js

[实现原理解析](./docs/principle.md)
