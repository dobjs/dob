import * as React from "react"
import { render } from "react-dom"
import { connect, Provider } from "react-redux"

import App from "./containers/app"

import { store } from "./stores"

declare const require: any
// tslint:disable-next-line:no-var-requires
require("todomvc-app-css/index.css")

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("react-dom")
)
