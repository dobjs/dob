# Action

## 概念

`Action` 是为了减少依赖追踪触发次数，将所有变更收集起来，再合并触发。

## 作为函数使用

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

## 作为装饰器使用

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