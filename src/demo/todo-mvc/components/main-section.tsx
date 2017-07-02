import * as React from "react"
import { SHOW_ACTIVE, SHOW_ALL, SHOW_COMPLETED } from "../const"
import Footer from "./footer"
import TodoItem from "./todo-item"

const TODO_FILTERS = {
  [SHOW_ALL]: () => true,
  [SHOW_ACTIVE]: (todo: any) => !todo.completed,
  [SHOW_COMPLETED]: (todo: any) => todo.completed
}

export default class MainSection extends React.PureComponent<any, any> {
  public state = { filter: SHOW_ALL }

  public handleClearCompleted = () => {
    this.props.actions.clearCompleted()
  }

  public handleShow = (filter: any) => {
    this.setState({ filter })
  }

  public renderToggleAll(completedCount: number) {
    const { todos, actions } = this.props
    if (todos.length > 0) {
      return (
        <input
          className="toggle-all"
          type="checkbox"
          checked={completedCount === todos.length}
          onChange={actions.completeAll}
        />
      )
    }
  }

  public renderFooter(completedCount: number) {
    const { todos } = this.props
    const { filter } = this.state
    const activeCount = todos.length - completedCount

    if (todos.length) {
      return (
        <Footer
          completedCount={completedCount}
          activeCount={activeCount}
          filter={filter}
          onClearCompleted={this.handleClearCompleted.bind(this)}
          onShow={this.handleShow.bind(this)}
        />
      )
    }
  }

  public render() {
    const { todos, actions } = this.props
    const { filter } = this.state

    const filteredTodos = todos.filter(TODO_FILTERS[filter])
    const completedCount = todos.reduce((count: number, todo: any) => (todo.completed ? count + 1 : count), 0)

    return (
      <section className="main">
        {this.renderToggleAll(completedCount)}
        <ul className="todo-list">
          {filteredTodos.map((todo: any) => <TodoItem key={todo.id} todo={todo} {...actions} />)}
        </ul>
        {this.renderFooter(completedCount)}
      </section>
    )
  }
}
