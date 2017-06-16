# 快速入门
 
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
 
## 使用依赖注入

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
    @inject(UserStore) userStore: UserStore

    @Action setName (name: string) {
        this.userStore.name = name
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

在 `@Connect` 时，不需要传入注入数据的名称，由于自动依赖收集的缘故，所有数据都会全量注入，但更新粒度会自动控制在最小，做到了方便开发，同时提升效率。
