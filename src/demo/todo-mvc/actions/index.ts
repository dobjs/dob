import * as types from "../constants/action-types"

export const addTodo = (text: string) => ({ type: types.ADD_TODO, text })
export const deleteTodo = (id: number) => ({ type: types.DELETE_TODO, id })
export const editTodo = (id: number, text: string) => ({ type: types.EDIT_TODO, id, text })
export const completeTodo = (id: number) => ({ type: types.COMPLETE_TODO, id })
export const completeAll = () => ({ type: types.COMPLETE_ALL })
export const clearCompleted = () => ({ type: types.CLEAR_COMPLETED })
