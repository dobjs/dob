# unobserve

## 简介
可以中断对依赖追踪的监听。

## 示例

```typescript
import { observe, observable } from 'dob'

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