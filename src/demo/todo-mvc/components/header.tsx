import * as React from "react"
import TodoTextInput from "./todo-text-input"

export default class Header extends React.PureComponent<any, any> {
  public handleSave = (text: string) => {
    if (text.length !== 0) {
      this.props.addTodoTask(text)
    }
  }

  public render() {
    return (
      <header className="header">
        <h1>todos</h1>
        <TodoTextInput newTodo onSave={this.handleSave} placeholder="What needs to be done?" />
      </header>
    )
  }
}
