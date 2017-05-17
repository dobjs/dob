# dynamic-react

## 概念
 
`dynamic-react` 是连接 `dynamic-object` 与 `react` 的桥梁。

## 安装

```bash
yarn add dynamic-react --save
```

## 快速入手
 
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
 
`Provider` 接收两个参数，分别是 `store` 与 `action`，所以只支持标准的 MVP 写法。
 
通过 `store` 传入的变量，会注入到 `this.props.store` 中；
通过 `action` 传入的变量，会注入到 `this.props.action` 中；
 
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

## 特点

在 `@Connect` 时，不需要传入注入数据的名称，由于自动依赖收集的缘故，所有数据都会全量注入，但更新粒度会自动控制在最小，做到了方便开发，同时提升效率。

---