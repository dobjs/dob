import * as React from "react"
import * as ReactDOM from "react-dom"
import { connect, Provider } from "react-redux"
import { applyMiddleware, combineReducers, compose, createStore } from "redux"
import { createReduxStore, getSnapshot, isObservable, observable, onSnapshot } from "../index"

import UserStore from "./user-store"

const { store, combineActions } = createReduxStore({
  user: UserStore
})

@connect((state: any, ownProps: any) => {
  return {
    name: state.user.name,
    articles: state.user.articles
  }
})
class App extends React.PureComponent<any, any> {
  public componentWillMount() {
    setTimeout(() => {
      this.props.dispatch(combineActions.user.setName("小李子"))
    }, 1000)
  }

  public render() {
    const Articles = this.props.articles.map((article: any, index: number) => {
      return (
        <div key={index}>{article.title}, {article.price}</div>
      )
    })

    return (
      <div>
        {this.props.name}
        {Articles}
      </div>
    )
  }
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("react-dom")
)
