import * as classnames from "classnames"
import * as React from "react"
import { SHOW_ACTIVE, SHOW_ALL, SHOW_COMPLETED } from "../const"

const FILTER_TITLES = {
  [SHOW_ALL]: "All",
  [SHOW_ACTIVE]: "Active",
  [SHOW_COMPLETED]: "Completed"
}

export default class Footer extends React.PureComponent<any, any> {
  public renderTodoCount() {
    const { activeCount } = this.props
    const itemWord = activeCount === 1 ? "item" : "items"

    return (
      <span className="todo-count">
        <strong>{activeCount || "No"}</strong> {itemWord} left
            </span>
    )
  }

  public renderFilterLink(filter: any) {
    const title = FILTER_TITLES[filter]
    const { filter: selectedFilter, onShow } = this.props

    return (
      <a
        className={classnames({ selected: filter === selectedFilter })}
        style={{ cursor: "pointer" }}
        onClick={() => onShow(filter)}
      >
        {title}
      </a>
    )
  }

  public renderClearButton() {
    const { completedCount, onClearCompleted } = this.props
    if (completedCount > 0) {
      return (
        <button className="clear-completed" onClick={onClearCompleted}>
          Clear completed
                </button>
      )
    }
  }

  public render() {
    return (
      <footer className="footer">
        {this.renderTodoCount()}
        <ul className="filters">
          {[SHOW_ALL, SHOW_ACTIVE, SHOW_COMPLETED].map(filter =>
            <li key={filter}>
              {this.renderFilterLink(filter)}
            </li>
          )}
        </ul>
        {this.renderClearButton()}
      </footer>
    )
  }
}
