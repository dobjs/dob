import { createReduxStore } from "../../../index"
import Todo from "./todo"

const { store, actions } = createReduxStore({
  todo: Todo
})

export { store, actions }
