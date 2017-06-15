import { observable } from "../../../index"

export default class TODO {
    private store = observable({
        todos: [{
            text: "learn Redux",
            completed: false,
            id: 0
        }]
    })

    public findTodoById(id: number) {
        return this.store.todos.find(todo => todo.id === id)
    }

    public addTodo(text: string) {
        const id = this.store.todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1
        this.store.todos.unshift({
            id,
            text,
            completed: false
        })
    }

    public deleteTodo(id: number) {
        const findIndex = this.store.todos.findIndex(todo => todo.id === id)
        if (findIndex !== -1) {
            this.store.todos.splice(findIndex, 1)
        }
    }

    public editTodo(id: number, text: string) {
        this.findTodoById(id).text = text
    }

    public completeTodo(id: number) {
        const todo = this.findTodoById(id)
        todo.completed = !todo.completed
    }

    public completeAll() {
        const areAllMarked = this.store.todos.every(todo => todo.completed)
        this.store.todos.forEach(todo => (todo.completed = !areAllMarked))
    }

    public clearCompleted() {
        this.store.todos = this.store.todos.filter(todo => todo.completed === false)
    }
}
