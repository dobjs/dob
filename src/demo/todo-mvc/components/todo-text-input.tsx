import * as classnames from "classnames"
import * as React from "react"

export default class TodoTextInput extends React.PureComponent<any, any> {
  public state = {
    text: this.props.text || ""
  }

  public handleSubmit = (e: any) => {
    const text = e.target.value.trim()
    if (e.which === 13) {
      this.props.onSave(text)
      if (this.props.newTodo) {
        this.setState({ text: "" })
      }
    }
  }

  public handleChange = (e: any) => {
    this.setState({ text: e.target.value })
  }

  public handleBlur = (e: any) => {
    if (!this.props.newTodo) {
      this.props.onSave(e.target.value)
    }
  }

  public render() {
    return (
      <input
        className={classnames({
          "edit": this.props.editing,
          "new-todo": this.props.newTodo
        })}
        type="text"
        placeholder={this.props.placeholder}
        autoFocus={true}
        value={this.state.text}
        onBlur={this.handleBlur}
        onChange={this.handleChange}
        onKeyDown={this.handleSubmit}
      />
    )
  }
}
