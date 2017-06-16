# 简介

<a href="https://travis-ci.org/ascoders/dynamic-object"><img src="https://img.shields.io/travis/ascoders/dynamic-object/master.svg?style=flat" alt="Build Status"></a>

`dynamic-object` 利用 `proxy` 完整实现了 `object.observer`。主要为 react 提供数据流功能。可以结合 `dynamic-react` 以 mutable 方式为 react 组织数据流；同时也支持融合 redux，结合 mutable 与 immutable 的优势，以 mutable 方式组织 store，以 immutable 方式更新数据。

> 功能与 [mobx](https://github.com/mobxjs/mobx) 很像，同时借鉴了 [nx-js](https://github.com/nx-js/observer-util) 实现理念。给力的地方在于，不支持 ie11 浏览器！非常激进，核心使用 `proxy`，抛弃兼容性换来的是超高的性能，以及完美的动态绑定。

核心用例：

```typescript
import { observable, observe } from "dynamic-object"

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

## 安装

```bash
yarn add dynamic-object --save
```

## 稳定性

目前通过了 100%（50个）[测试用例](https://github.com/ascoders/dynamic-object/blob/master/src/main.test.ts)

## 功能

### 结合 dynamic-react

以 mutable 方式管理数据流，vm 层使用 dynamic-react，只有使用到的变量发生变动，才会触发更新！

- [快速入门](./docs/mutable-quick-start.md)

> 直接查看 [在线 Demo]() TODO

#### Api

`observable`、`observe`: 产生对象的代理、动态跟踪代理对象变化；`dynamic-react`: 将代理对象结合到 react 当中，自动、精确的更新组件；`Action`: 建议所有修改收敛在 action 中，且支持更新合并。

- [observable, observe](./docs/observable.md)
- [unobserbe](./docs/unobserve.md)
- [dynamic-react](./docs/dynamic-react.md)
- [Action](./docs/action.md)

> [代码原理解析](./docs/principle.md)

### 结合 react-redux

支持以 mutable 方式管理数据流，但 vm 层对接到 redux，虽然以可变方式修改数据，但会自动生成不可变数据！

> 直接查看 [在线 Demo]() TODO
