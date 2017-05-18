# 简介

<a href="https://travis-ci.org/ascoders/dynamic-object"><img src="https://img.shields.io/travis/ascoders/dynamic-object/master.svg?style=flat" alt="Build Status"></a>

## dynamic-object 是什么

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

## 安装

```bash
yarn add dynamic-object --save
```

这个库导出的核心方法一共只有三个：

```typescript
import { observe, observable, Action } from "dynamic-object"
```

`observe` 与 `observable` 在核心用例有所介绍，后续有详细说明。

`Action` 可以作为函数或装饰器使用，作用是在函数体执行完后，统一触发一次 `observe`，是性能优化的必备工具。

## 稳定性

目前通过了 100%（50个）[测试用例](https://github.com/ascoders/dynamic-object/blob/master/src/main.test.ts)

---