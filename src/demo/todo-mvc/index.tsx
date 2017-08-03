// import * as React from "react"
// import { render } from "react-dom"
// import { Provider } from "react-redux"

// import App from "./containers/app"

// import { store } from "./stores"

// declare const require: any
// // tslint:disable-next-line:no-var-requires
// require("todomvc-app-css/index.css")

// render(
//     <Provider store={store}>
//         <App />
//     </Provider>,
//     document.getElementById("react-dom")
// )

// import { autorun, observable } from "mobx"
import { observable, observe } from "../../index"

const obj = observable({
    a: "1",
    b: "2",
    c: "3",
    d: "4"
})

// observe(() => {
//     console.log(obj.a)

//     observe(() => {
//         console.log(obj.b)
//     })

//     observe(() => {
//         console.log(obj.c)
//     })

//     console.log(obj.d)
// })

// obj.b = "2-1"
