import { createReduxStore } from "../../../index"
import Todo from "./todo"

const { store, combineActions } = createReduxStore({
  todo: Todo
})

export { store, combineActions }
