import * as React from "react"
import { render } from "react-dom"
import App from "./containers/app"

import { connect, Provider } from "react-redux"
import { createReduxStore } from "../../index"

import Todo from "./stores/todo"

declare const require: any
// tslint:disable-next-line:no-var-requires
require("todomvc-app-css/index.css")

const { store, combineActions } = createReduxStore({
    todo: Todo
})

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("react-dom")
)
