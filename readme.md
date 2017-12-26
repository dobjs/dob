# Dob &middot; [![CircleCI Status](https://img.shields.io/travis/dobjs/dob/master.svg?style=flat)](https://travis-ci.org/dobjs/dob) [![npm version](https://img.shields.io/npm/v/dob.svg?style=flat)](https://www.npmjs.com/package/dob) [![code coverage](https://img.shields.io/codecov/c/github/dobjs/dob/master.svg)](https://codecov.io/github/dobjs/dob)

<p align="center">
    <img src="https://avatars1.githubusercontent.com/u/32093464?s=400&u=d360e449a9d59cf7422100349711ab0e0389d06a&v=4" height=100/>
    <h3 align="center">dob</h3>
    <p align="center">
        <i>
            Dob is a tool for monitoring object changes. Using <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy">Proxy</a>.
        </i>
    <p>
    <p align="center">
        <i>
            <a target="_blank" href="https://dobjs.github.io/dob-docs/">Online Docs</a>.
        </i>
    </p>
</p>

## Examples

There are some [demo](https://jsfiddle.net/1q772uL0/20/) on fiddle. Here's the simplest:

```typescript
import { observable, observe } from "dob"

const obj = observable({ a: 1 })

observe(() => {
    console.log("obj.a has changed to", obj.a)
}) // <· obj.a has changed to 1

obj.a = 2 // <· obj.a has changed to 2
```

You can enjoy the benefits of proxy, for example `obj.a = { b: 5 }` is effective.

## Use in react

```typescript
import { Action, observable, combineStores, inject } from 'dob'
import { Provider, Connect } from 'dob-react'

@observable
export class UserStore {
    name = 'bob'
}

export class UserAction {
    @inject(UserStore) private UserStore: UserStore;

    @Action setName () {
        this.store.name = 'lucy'
    }
}

@Connect
class App extends React.Component {
    render() {
        return (
            <span onClick={this.props.UserAction.setName}>
                {this.props.UserStore.name}
            </span>
        )
    }
}

ReactDOM.render(
    <Provider {
        ...combineStores({
            UserStore,
            UserAction
        })
    }>
        <App />
    </Provider>
, document.getElementById('react-dom'))
```

> Use `inject` to pick stores in action, do not `new UserStore()`, it's terrible for later maintenance.

## Project Examples

- [dob-react simple example](https://github.com/ascoders/dob-example)
- [dob-react hackernews](https://github.com/dobjs/dob-react-hackernews)
- [dob-react todoMVC](https://github.com/dobjs/dob-react-todomvc)
- [dob-react complex online web editor](https://github.com/ascoders/gaea-editor)
- [dob-redux todoMVC](https://github.com/dobjs/dob-redux-todomvc)

## Ecosystem

- [dob-react](https://github.com/dobjs/dob-react) - Connect dob to react! Here is a basic [demo](https://jsfiddle.net/yp90Lep9/21/), and here is a [demo](https://jsfiddle.net/g19ehhgu/11/) with fractal. [Quick start](./docs/dob-react.md).
- [dob-react-devtools](https://github.com/dobjs/dob-react-devtools) - Devtools for dob-react, with action and ui two way binding.
- [dob-redux](https://github.com/dobjs/dob-redux) - You can use both dob and Redux by using it! Enjoy the type and convenience of dob, and the ecology of Redux.
- [dob-refect](https://github.com/dobjs/dob-refetch) - Auto fetch, away from the trouble of `componentDidUpdate`.

## Note

### Dependency injection does not support circular references

Do not allow circular dependencies between store and action, It's impossible to do like this:

```typescript
class A {
    @inject(B) b
}
class B {
    @inject(A) a
}
```

## Inspired

- [mobx](https://github.com/mobxjs/mobx)
- [nx-js](https://github.com/nx-js/observer-util)