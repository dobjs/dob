import * as classnames from "classnames"
import * as React from "react"
import TodoTextInput from "./todo-text-input"

export default class TodoItem extends React.PureComponent<any, any> {
  public state = {
    editing: false
  }

  public handleDoubleClick = () => {
    this.setState({ editing: true })
  }

  public handleSave = (id: number, text: string) => {
    if (text.length === 0) {
      this.props.deleteTodo(id)
    } else {
      this.props.editTodo(id, text)
    }
    this.setState({ editing: false })
  }

  public render() {
    const { todo, completeTodo, deleteTodo } = this.props

    let element
    if (this.state.editing) {
      element = (
        <TodoTextInput
          text={todo.text}
          editing={this.state.editing}
          onSave={(text: string) => this.handleSave(todo.id, text)}
        />
      )
    } else {
      element = (
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={todo.completed}
            onChange={() => completeTodo(todo.id)}
          />
          <label onDoubleClick={this.handleDoubleClick}>
            {todo.text}
          </label>
          <button className="destroy" onClick={() => deleteTodo(todo.id)} />
        </div>
      )
    }

    return (
      <li
        className={classnames({
          completed: todo.completed,
          editing: this.state.editing
        })}
      >
        {element}
      </li>
    )
  }
}
