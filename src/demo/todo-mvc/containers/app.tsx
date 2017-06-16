import * as React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"
import * as TodoActions from "../actions"
import Header from "../components/header"
import MainSection from "../components/main-section"
import { combineActions } from "../stores"

const App = (props: any) => (
  <div>
    <Header addTodoTask={props.actions.addTodoTask} />
    <MainSection todos={props.todos} actions={props.actions} />
  </div>
)

const mapStateToProps = (state: any) => ({
  todos: state.todo.todos
})

const mapDispatchToProps = (dispatch: any) => ({
  actions: bindActionCreators(combineActions.todo as any, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
