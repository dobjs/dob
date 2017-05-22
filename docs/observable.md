# observable

# 概念
 
`observable` 使用 proxy，返回对象代理，目的是监听对象的一举一动。

## 功能

`observable` 支持 object、array、Map、WeakMap、Set、WeakSet，支持动态绑定、条件分支

### 支持类型

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

### 动态绑定

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

### 条件分支

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

## 注意点
 
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