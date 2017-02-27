# DependencyInject

```typescript
import { Container, inject } from 'dependency-inject'

class Store {
    num = 1
}

class Action {
    @inject(Store)
    private store: Store

    setNum(num: number) {
        this.store.num = num
    }
}

// init store
const container = new Container()
container.set(Store, new Store())
container.set(Action, new Action())

// get data with injected
const store = container.get(Store)
const action = container.get(Action)

action.setNum(2)
console.log(store.num) // 2
```