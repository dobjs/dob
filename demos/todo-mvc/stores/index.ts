import { createReduxStore } from "../../../src"
import Todo from "./todo"

const { store, actions } = createReduxStore({
  todo: Todo
})

export { store, actions }
