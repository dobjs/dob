import * as React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"
import * as TodoActions from "../actions"
import Header from "../components/header"
import MainSection from "../components/main-section"

const App = (props: any) => (
  <div>
    <Header addTodo={props.actions.addTodo} />
    <MainSection todos={props.todos} actions={props.actions} />
  </div>
)

const mapStateToProps = (state: any) => ({
  todos: state.todo.todos
})

const mapDispatchToProps = (dispatch: any) => ({
  actions: bindActionCreators(TodoActions as any, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
